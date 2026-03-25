import type {
  RuntimeImpactSummary,
  SaveAppliedResult,
  SaveAppliedWithWarningsResult,
  SaveBlockedResult,
  SaveFailedResult,
  SaveResult,
  SaveResultBase,
} from '@/authoring/contracts';
import type { StoryPackage } from '@/types';

export const SAVE_RESULT_KINDS = [
  'save_applied',
  'save_applied_with_warnings',
  'save_blocked',
  'save_failed',
] as const;

function createBaseResult(base: SaveResultBase): SaveResultBase {
  return {
    ...base,
  };
}

function createRuntimeImpactSummary(changedFiles: readonly string[]): RuntimeImpactSummary {
  return {
    changedFiles: [...changedFiles],
  };
}

export function createSaveAppliedResult(
  base: SaveResultBase,
  reloadedSectionState: StoryPackage,
  changedFiles: readonly string[] = ['authoring-state.json'],
): SaveAppliedResult {
  return {
    ...createBaseResult(base),
    kind: 'save_applied',
    reloadedSectionState,
    runtimeImpactSummary: createRuntimeImpactSummary(changedFiles),
    showLocally: true,
    showInGlobalDiagnostics: false,
  };
}

export function createSaveAppliedWithWarningsResult(
  base: SaveResultBase,
  reloadedSectionState: StoryPackage,
  warnings: readonly string[],
  changedFiles: readonly string[] = ['authoring-state.json'],
): SaveAppliedWithWarningsResult {
  return {
    ...createBaseResult(base),
    kind: 'save_applied_with_warnings',
    reloadedSectionState,
    runtimeImpactSummary: createRuntimeImpactSummary(changedFiles),
    warnings: [...warnings],
    showLocally: true,
    showInGlobalDiagnostics: true,
  };
}

export function createSaveBlockedResult(
  base: SaveResultBase,
  blockingIssues: readonly string[],
  warnings: readonly string[] = [],
): SaveBlockedResult {
  return {
    ...createBaseResult(base),
    kind: 'save_blocked',
    blockingIssues: [...blockingIssues],
    warnings: [...warnings],
    showLocally: true,
    showInGlobalDiagnostics: false,
  };
}

export function createSaveFailedResult(
  base: SaveResultBase,
  errorMessage: string,
  warnings: readonly string[] = [],
): SaveFailedResult {
  return {
    ...createBaseResult(base),
    kind: 'save_failed',
    errorMessage,
    warnings: [...warnings],
    showLocally: true,
    showInGlobalDiagnostics: true,
  };
}

export function isSuccessfulSaveResult(
  result: SaveResult,
): result is SaveAppliedResult | SaveAppliedWithWarningsResult {
  return result.kind === 'save_applied' || result.kind === 'save_applied_with_warnings';
}
