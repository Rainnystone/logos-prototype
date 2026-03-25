import { type SaveRequest, type SaveResult } from '@/authoring/contracts';
import * as authoringStatus from '@/authoring/persistence/authoring-status';
import {
  ensureStoryPackageExists,
  extractWorldBaseDraftUpdate,
  persistWorldBaseDraft,
} from '@/authoring/persistence/repository';
import {
  createSaveAppliedResult,
  createSaveAppliedWithWarningsResult,
  createSaveBlockedResult,
  createSaveFailedResult,
} from '@/authoring/persistence/save-results';
import { reloadStoryPackage } from '@/authoring/persistence/reload';

const supportedSectionIds = new Set<SaveRequest['sectionId']>([
  'worldbase-cast',
  'scene-phase-authoring',
  'control-modules',
  'package-wiring-validation',
]);

const supportedDeterministicWriteSections = new Set<SaveRequest['sectionId']>(['worldbase-cast']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSaveRequest(input: SaveRequest): { request: SaveRequest; issues: readonly string[] } {
  const issues: string[] = [];
  const rawPayload = input.payload as unknown;
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
      ...input,
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

  if (extractWorldBaseDraftUpdate(request) === null) {
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
    return createSaveBlockedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: false,
      },
      ['dryRun completed without writing files.'],
    );
  }

  try {
    await ensureStoryPackageExists(request.packageName);
    const changedFiles = await persistWorldBaseDraft(request);
    const reloadedSectionState = await reloadStoryPackage(request.packageName);

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
