import { SECTION_IDS, type SaveRequest, type SaveResult } from '@/authoring/contracts';
import * as authoringStatus from '@/authoring/persistence/authoring-status';
import {
  ensureStoryPackageExists,
  persistScenePhaseDraft,
  persistWorldBaseDraft,
  readPhasePlansDraftContents,
  readSceneDraftContents,
  readWorldBaseDraftContents,
  restoreScenePhaseDraft,
  restoreWorldBaseDraft,
} from '@/authoring/persistence/repository';
import {
  createSaveAppliedResult,
  createSaveAppliedWithWarningsResult,
  createSaveBlockedResult,
  createSaveFailedResult,
} from '@/authoring/persistence/save-results';
import { reloadStoryPackage } from '@/authoring/persistence/reload';
import {
  renderScenePhaseAuthoring,
  validateScenePhaseAuthoringDraft,
  type ScenePhaseAuthoringDraft,
} from '@/authoring/sections/scene-phase-authoring';
import { renderWorldBase, type WorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';
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

const supportedDeterministicWriteSections = new Set<SaveRequest['sectionId']>([
  SECTION_IDS[0],
  SECTION_IDS[1],
]);

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
        requestId,
        packageName,
        sectionId,
        source,
        ...(moduleScope ? { moduleScope } : {}),
        ...(dryRun ? { dryRun } : {}),
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

function isStringField(value: unknown): value is string {
  return typeof value === 'string';
}

function extractWorldBaseCastDraft(
  request: SaveRequest,
): Partial<WorldBaseCastDraft> | null {
  const uiFields = request.payload.uiFields;

  if (!uiFields) {
    return null;
  }

  const mainCharacters = isStringField(uiFields.mainCharacters) ? uiFields.mainCharacters : undefined;
  const npcCharacters = isStringField(uiFields.npcCharacters) ? uiFields.npcCharacters : undefined;
  const locationPatch = isStringField(uiFields.locationPatch) ? uiFields.locationPatch : undefined;

  if (mainCharacters === undefined && npcCharacters === undefined && locationPatch === undefined) {
    return null;
  }

  return {
    ...(mainCharacters !== undefined ? { mainCharacters } : {}),
    ...(npcCharacters !== undefined ? { npcCharacters } : {}),
    ...(locationPatch !== undefined ? { locationPatch } : {}),
  };
}

function extractScenePhaseAuthoringDraft(
  request: SaveRequest,
): ScenePhaseAuthoringDraft | null {
  const uiFields = request.payload.uiFields;

  if (!uiFields) {
    return null;
  }

  const sceneSpec = uiFields.sceneSpec;
  const phasePlans = uiFields.phasePlans;

  if (!isPlainObject(sceneSpec) || !Array.isArray(phasePlans)) {
    return null;
  }

  const normalizedPhasePlans = phasePlans
    .filter((phase) => isPlainObject(phase))
    .map((phase) => ({
      ...(isStringField(phase.phaseId) ? { phaseId: phase.phaseId } : {}),
      phaseName: isStringField(phase.phaseName) ? phase.phaseName : '',
      phaseGoal: isStringField(phase.phaseGoal) ? phase.phaseGoal : '',
      ...(isStringField(phase.phaseEndPoint) ? { phaseEndPoint: phase.phaseEndPoint } : {}),
      gradientType: isStringField(phase.gradientType)
        ? (phase.gradientType as ScenePhaseAuthoringDraft['phasePlans'][number]['gradientType'])
        : 'Steady',
      ...(isStringField(phase.routerHint) ? { routerHint: phase.routerHint } : {}),
      ...(isStringField(phase.notes) ? { notes: phase.notes } : {}),
    }));

  return {
    sceneSpec: {
      sceneName: isStringField(sceneSpec.sceneName) ? sceneSpec.sceneName : '',
      openingSituation: isStringField(sceneSpec.openingSituation) ? sceneSpec.openingSituation : '',
      mainAxis: isStringField(sceneSpec.mainAxis) ? sceneSpec.mainAxis : '',
      endLine: isStringField(sceneSpec.endLine) ? sceneSpec.endLine : '',
      openingHook: isStringField(sceneSpec.openingHook) ? sceneSpec.openingHook : '',
      samplePurpose: isStringField(sceneSpec.samplePurpose) ? sceneSpec.samplePurpose : '',
    },
    phasePlans: normalizedPhasePlans,
  };
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
  const nextWorldBaseDraft = extractWorldBaseCastDraft(request);
  const nextScenePhaseDraft = extractScenePhaseAuthoringDraft(request);

  if (
    request.sectionId === 'worldbase-cast' &&
    nextMainCharacters === null &&
    nextWorldBaseDraft === null
  ) {
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

  if (request.sectionId === 'scene-phase-authoring' && nextScenePhaseDraft === null) {
    return createSaveBlockedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: false,
      },
      ['No deterministic scene-phase update was provided.'],
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
    const currentStoryPackage = await reloadStoryPackage(request.packageName);
    let changedFiles: readonly string[];
    let reloadedSectionState: StoryPackage;

    try {
      if (request.sectionId === 'worldbase-cast') {
        const originalWorldBaseContents = await readWorldBaseDraftContents(request.packageName);

        try {
          const nextWorldBase =
            nextWorldBaseDraft !== null
              ? renderWorldBase(currentStoryPackage.worldBase, nextWorldBaseDraft)
              : {
                  ...currentStoryPackage.worldBase,
                  mainCharacters: nextMainCharacters ?? currentStoryPackage.worldBase.mainCharacters,
                };

          changedFiles = await persistWorldBaseDraft(request.packageName, nextWorldBase);
          reloadedSectionState = await reloadStoryPackage(request.packageName);
        } catch (writeOrReloadError) {
          await restoreWorldBaseDraft(request.packageName, originalWorldBaseContents);
          throw writeOrReloadError;
        }
      } else {
        const originalSceneContents = await readSceneDraftContents(request.packageName);
        const originalPhasePlansContents = await readPhasePlansDraftContents(request.packageName);
        const routerOptions = currentStoryPackage.routerProfiles.map((profile) => profile.routerName);
        const scenePhaseIssues = validateScenePhaseAuthoringDraft(nextScenePhaseDraft!, routerOptions);

        if (scenePhaseIssues.length > 0) {
          return createSaveBlockedResult(
            {
              requestId: request.requestId,
              packageName: request.packageName,
              sectionId: request.sectionId,
              showLocally: true,
              showInGlobalDiagnostics: false,
            },
            scenePhaseIssues,
          );
        }

        try {
          const renderedScenePhase = renderScenePhaseAuthoring(currentStoryPackage, nextScenePhaseDraft!);
          changedFiles = await persistScenePhaseDraft(
            request.packageName,
            renderedScenePhase.sceneSpec,
            renderedScenePhase.phasePlans,
          );
          reloadedSectionState = await reloadStoryPackage(request.packageName);
        } catch (writeOrReloadError) {
          await restoreScenePhaseDraft(
            request.packageName,
            originalSceneContents,
            originalPhasePlansContents,
          );
          throw writeOrReloadError;
        }
      }
    } catch (earlyResult) {
      if (typeof earlyResult === 'object' && earlyResult !== null && 'kind' in earlyResult) {
        return earlyResult as SaveResult;
      }
      throw earlyResult;
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
