import { type SaveRequest, type SaveResult } from '@/authoring/contracts';
import * as authoringStatus from '@/authoring/persistence/authoring-status';
import {
  ensureStoryPackageExists,
  extractWorldBaseDraftUpdate,
  persistWorldBaseDraft,
} from '@/authoring/persistence/repository';
import {
  createSaveAppliedResult,
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

function normalizeSaveRequest(input: SaveRequest): SaveRequest {
  const payload: SaveRequest['payload'] = {
    ...(input.payload.uiFields ? { uiFields: { ...input.payload.uiFields } } : {}),
    ...(input.payload.patchCandidates
      ? {
          patchCandidates: input.payload.patchCandidates.map((candidate) => ({ ...candidate })),
        }
      : {}),
  };

  return {
    ...input,
    payload,
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

  if (!request.requestId.trim()) {
    issues.push('requestId is required.');
  }

  if (!request.packageName.trim()) {
    issues.push('packageName is required.');
  }

  return issues;
}

export async function saveSectionDraft(input: SaveRequest): Promise<SaveResult> {
  const request = normalizeSaveRequest(input);
  const validationIssues = validateSaveRequest(request);

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

  try {
    await ensureStoryPackageExists(request.packageName);
    const changedFiles = await persistWorldBaseDraft(request);
    const reloadedSectionState = await reloadStoryPackage(request.packageName);

    const appliedBase = createSaveAppliedResult(
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

    try {
      await authoringStatus.writeAuthoringStatus(request.packageName, {
        hasSuccessfulSave: true,
        lastSavedAt: new Date().toISOString(),
        lastSavedRequestId: request.requestId,
        lastEditedSection: request.sectionId,
      });

      return appliedBase;
    } catch (markerError) {
      const markerMessage =
        markerError instanceof Error ? markerError.message : String(markerError);

      return {
        ...appliedBase,
        kind: 'save_applied_with_warnings',
        warnings: [`Authoring status marker write failed: ${markerMessage}`],
        showInGlobalDiagnostics: true,
      };
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
