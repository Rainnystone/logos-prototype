import { SECTION_IDS, type SaveRequest, type SaveResult } from '@/authoring/contracts';
import * as authoringStatus from '@/authoring/persistence/authoring-status';
import {
  ensureStoryPackageExists,
  persistWorldBaseDraft,
  readWorldBaseDraftContents,
  restoreWorldBaseDraft,
} from '@/authoring/persistence/repository';
import {
  createSaveAppliedResult,
  createSaveAppliedWithWarningsResult,
  createSaveBlockedResult,
  createSaveFailedResult,
} from '@/authoring/persistence/save-results';
import { reloadStoryPackage } from '@/authoring/persistence/reload';
import type { StoryPackage } from '@/types';

const supportedSectionIds = new Set<SaveRequest['sectionId']>(SECTION_IDS);
const supportedSaveSources = new Set<SaveRequest['source']>(['page', 'coordinator', 'repair']);
const supportedModuleScopes = new Set<NonNullable<SaveRequest['moduleScope']>>([
  'light-cone',
  'director-note-additions',
  'auditor-question-set',
  'beat-volume-definitions',
  'router-profile-set',
]);

const supportedDeterministicWriteSections = new Set<SaveRequest['sectionId']>([SECTION_IDS[0]]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSaveRequest(input: SaveRequest): { request: SaveRequest; issues: readonly string[] } {
  const issues: string[] = [];
  const rawInput = isPlainObject(input) ? input : ({} as Record<string, unknown>);
  const requestId =
    typeof rawInput.requestId === 'string'
      ? rawInput.requestId
      : (issues.push('requestId must be a string.'), '');
  const packageName =
    typeof rawInput.packageName === 'string'
      ? rawInput.packageName
      : (issues.push('packageName must be a string.'), '');
  const sectionId =
    typeof rawInput.sectionId === 'string'
      ? (rawInput.sectionId as SaveRequest['sectionId'])
      : (issues.push('sectionId must be a string.'), '' as SaveRequest['sectionId']);
  const source =
    typeof rawInput.source === 'string'
      ? (rawInput.source as SaveRequest['source'])
      : (issues.push('source must be a string.'), 'page');
  const moduleScope =
    rawInput.moduleScope === undefined
      ? undefined
      : typeof rawInput.moduleScope === 'string'
        ? (rawInput.moduleScope as NonNullable<SaveRequest['moduleScope']>)
        : (issues.push('moduleScope must be a string when provided.'), undefined);
  const dryRun =
    rawInput.dryRun === undefined
      ? false
      : typeof rawInput.dryRun === 'boolean'
        ? rawInput.dryRun
        : (issues.push('dryRun must be a boolean when provided.'), false);
  const rawPayload = rawInput.payload as unknown;
  const payload: {
    uiFields?: Record<string, unknown>;
    patchCandidates?: readonly Record<string, unknown>[];
  } = {};

  if (!isPlainObject(rawPayload)) {
    issues.push('payload must be an object.');
    return {
      request: {
        ...input,
        payload,
      },
      issues,
    };
  }

  if ('uiFields' in rawPayload) {
    if (isPlainObject(rawPayload.uiFields)) {
      payload.uiFields = { ...rawPayload.uiFields };
    } else {
      issues.push('uiFields must be an object when provided.');
    }
  }

  if ('patchCandidates' in rawPayload) {
    if (Array.isArray(rawPayload.patchCandidates)) {
      const sanitizedPatchCandidates: Array<Record<string, unknown>> = [];
      for (const candidate of rawPayload.patchCandidates) {
        if (isPlainObject(candidate)) {
          sanitizedPatchCandidates.push({ ...candidate });
        } else {
          issues.push('patchCandidates must contain object candidates.');
        }
      }

      if (sanitizedPatchCandidates.length > 0) {
        payload.patchCandidates = sanitizedPatchCandidates;
      }
    } else {
      issues.push('patchCandidates must be an array when provided.');
    }
  }

  return {
    request: {
      requestId,
      packageName,
      sectionId,
      source,
      ...(moduleScope ? { moduleScope } : {}),
      ...(dryRun ? { dryRun } : {}),
      payload: payload as SaveRequest['payload'],
    },
    issues,
  };
}

function validateSaveRequest(request: SaveRequest): readonly string[] {
  const issues: string[] = [];

  if (!supportedSectionIds.has(request.sectionId)) {
    issues.push(`Unsupported section "${request.sectionId}".`);
  }

  if (!supportedSaveSources.has(request.source)) {
    issues.push(`Unsupported save source "${request.source}".`);
  }

  if (request.moduleScope && !supportedModuleScopes.has(request.moduleScope)) {
    issues.push(`Unsupported moduleScope "${request.moduleScope}".`);
  }

  if (request.moduleScope && request.sectionId !== 'control-modules') {
    issues.push('moduleScope is only valid for control-modules saves.');
  }

  if (request.sectionId === 'control-modules' && !request.moduleScope) {
    issues.push('moduleScope is required for control-modules saves.');
  }

  if (!request.requestId.trim()) {
    issues.push('requestId is required.');
  }

  if (!request.packageName.trim()) {
    issues.push('packageName is required.');
  }

  return issues;
}

function extractWorldBaseMainCharactersDraft(request: SaveRequest): string | null {
  const uiFields = request.payload.uiFields;
  if (uiFields && typeof uiFields.mainCharacters === 'string') {
    return uiFields.mainCharacters;
  }

  const patchCandidates = request.payload.patchCandidates ?? [];
  const patchCandidate = patchCandidates.find((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return false;
    }

    const recordCandidate = candidate as Record<string, unknown>;
    return (
      recordCandidate.type === 'replace' &&
      recordCandidate.path === 'mainCharacters' &&
      typeof recordCandidate.value === 'string'
    );
  });

  if (!patchCandidate || typeof patchCandidate !== 'object' || Array.isArray(patchCandidate)) {
    return null;
  }

  return (patchCandidate as Record<string, unknown>).value as string;
}

export async function saveSectionDraft(input: SaveRequest): Promise<SaveResult> {
  const { request, issues: payloadIssues } = normalizeSaveRequest(input);
  const validationIssues = [...payloadIssues, ...validateSaveRequest(request)];

  if (validationIssues.length > 0) {
    return createSaveBlockedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: false,
      },
      validationIssues,
    );
  }

  if (!supportedDeterministicWriteSections.has(request.sectionId)) {
    return createSaveBlockedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: false,
      },
      [`Deterministic write path for "${request.sectionId}" is not available in Task 1.`],
    );
  }

  const nextMainCharacters = extractWorldBaseMainCharactersDraft(request);
  if (nextMainCharacters === null) {
    return createSaveBlockedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: false,
      },
      ['No deterministic world-base update was provided.'],
    );
  }

  if (request.dryRun) {
    try {
      await ensureStoryPackageExists(request.packageName);
      const reloadedSectionState = await reloadStoryPackage(request.packageName);

      return createSaveAppliedWithWarningsResult(
        {
          requestId: request.requestId,
          packageName: request.packageName,
          sectionId: request.sectionId,
          showLocally: true,
          showInGlobalDiagnostics: false,
        },
        reloadedSectionState,
        ['dryRun completed without writing files.'],
        [],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return createSaveFailedResult(
        {
          requestId: request.requestId,
          packageName: request.packageName,
          sectionId: request.sectionId,
          showLocally: true,
          showInGlobalDiagnostics: true,
        },
        message,
      );
    }
  }

  try {
    await ensureStoryPackageExists(request.packageName);
    const originalWorldBaseContents = await readWorldBaseDraftContents(request.packageName);
    let changedFiles: readonly string[];
    let reloadedSectionState: StoryPackage;

    try {
      changedFiles = await persistWorldBaseDraft(request.packageName, nextMainCharacters);
      reloadedSectionState = await reloadStoryPackage(request.packageName);
    } catch (writeOrReloadError) {
      await restoreWorldBaseDraft(request.packageName, originalWorldBaseContents);
      throw writeOrReloadError;
    }

    try {
      await authoringStatus.writeAuthoringStatus(request.packageName, {
        hasSuccessfulSave: true,
        lastSavedAt: new Date().toISOString(),
        lastSavedRequestId: request.requestId,
        lastEditedSection: request.sectionId,
      });

      return createSaveAppliedResult(
        {
          requestId: request.requestId,
          packageName: request.packageName,
          sectionId: request.sectionId,
          showLocally: true,
          showInGlobalDiagnostics: false,
        },
        reloadedSectionState,
        [...changedFiles, 'authoring-state.json'],
      );
    } catch (markerError) {
      const markerMessage =
        markerError instanceof Error ? markerError.message : String(markerError);

      return createSaveAppliedWithWarningsResult(
        {
          requestId: request.requestId,
          packageName: request.packageName,
          sectionId: request.sectionId,
          showLocally: true,
          showInGlobalDiagnostics: true,
        },
        reloadedSectionState,
        [`Authoring status marker write failed: ${markerMessage}`],
        changedFiles,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return createSaveFailedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: true,
      },
      message,
    );
  }
}
