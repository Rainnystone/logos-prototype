import type { ModuleScope, SaveRequest, SaveResult } from '@/authoring/contracts';
import { createSaveBlockedResult } from '@/authoring/persistence/save-results';

export interface CoordinatorActorInput {
  readonly rawText?: string;
  readonly normalizedText?: string;
  readonly uiFields?: Record<string, unknown>;
  readonly source: 'chat' | 'form' | 'migration';
}

export interface CoordinatorInvocation {
  readonly requestId: string;
  readonly packageName: string;
  readonly activeSection:
    | 'worldbase-cast'
    | 'scene-phase-authoring'
    | 'control-modules'
    | 'package-wiring-validation';
  readonly actorInput: CoordinatorActorInput;
  readonly moduleScope?: ModuleScope;
  readonly dryRun?: boolean;
}

export interface CoordinatorRunResult {
  readonly saveResult: SaveResult;
  readonly coordinatorSummary: string;
  readonly usedRepair: boolean;
}

function createCoordinatorLocalBlockedResult(
  input: CoordinatorInvocation,
  blockingIssue: string,
): SaveResult {
  return createSaveBlockedResult(
    {
      requestId: input.requestId,
      packageName: input.packageName,
      sectionId:
        input.activeSection === 'package-wiring-validation'
          ? 'package-wiring-validation'
          : input.activeSection,
      showLocally: true,
      showInGlobalDiagnostics: false,
    },
    [blockingIssue],
  );
}

export function buildCoordinatorSaveRequest(
  input: CoordinatorInvocation,
): SaveRequest | CoordinatorRunResult {
  if (input.activeSection === 'package-wiring-validation') {
    return {
      saveResult: createCoordinatorLocalBlockedResult(
        input,
        'The diagnostics dashboard is read-only. Return to an editable section before saving.',
      ),
      coordinatorSummary:
        'The page helper cannot write from the diagnostics dashboard. Return to one of the editable sections first.',
      usedRepair: false,
    };
  }

  if (!input.actorInput.uiFields) {
    return {
      saveResult: createCoordinatorLocalBlockedResult(
        input,
        'Current page fields are required before the page helper can retry this save.',
      ),
      coordinatorSummary:
        'The page helper needs the current page fields before it can retry this save.',
      usedRepair: false,
    };
  }

  if (input.activeSection === 'control-modules' && !input.moduleScope) {
    return {
      saveResult: createCoordinatorLocalBlockedResult(
        input,
        'An active control module is required before the page helper can retry this save.',
      ),
      coordinatorSummary:
        'The page helper needs the active control module before it can retry this save.',
      usedRepair: false,
    };
  }

  return {
    requestId: input.requestId,
    packageName: input.packageName,
    sectionId: input.activeSection,
    source: 'coordinator',
    payload: {
      uiFields: input.actorInput.uiFields,
    },
    ...(input.moduleScope ? { moduleScope: input.moduleScope } : {}),
    ...(input.dryRun ? { dryRun: input.dryRun } : {}),
  };
}

export function summarizeCoordinatorResult(
  result: SaveResult,
  usedRepair: boolean,
): string {
  if (result.kind === 'save_applied') {
    return usedRepair
      ? 'The page helper repaired the current section and saved it through the shared save path.'
      : 'The page helper saved the current section through the shared save path.';
  }

  if (result.kind === 'save_applied_with_warnings') {
    const warningText = result.warnings?.join(' ') ?? 'Review the remaining warnings.';
    return usedRepair
      ? `The page helper repaired the current section and saved it, but there are still warnings. ${warningText}`
      : `The page helper saved the current section, but there are still warnings. ${warningText}`;
  }

  if (result.kind === 'save_failed') {
    return 'The page helper reached the shared save path, but the section still failed to save.';
  }

  return usedRepair
    ? 'The page helper retried the section but could not repair the blocking issue.'
    : 'The page helper kept the request local and could not repair the blocking issue.';
}
