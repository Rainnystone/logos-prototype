import type { StoryPackage } from '@/types';

export type SectionId =
  | 'worldbase-cast'
  | 'scene-phase-authoring'
  | 'control-modules'
  | 'package-wiring-validation';

export type SaveSource = 'page' | 'coordinator' | 'repair';

export type ModuleScope =
  | 'light-cone'
  | 'director-note-additions'
  | 'auditor-question-set'
  | 'beat-volume-definitions'
  | 'router-profile-set';

export interface SectionPatchCandidate {
  readonly [key: string]: unknown;
}

export interface SaveRequestPayload {
  readonly uiFields?: Record<string, unknown>;
  readonly patchCandidates?: readonly SectionPatchCandidate[];
}

export interface SaveRequest {
  readonly requestId: string;
  readonly packageName: string;
  readonly sectionId: SectionId;
  readonly source: SaveSource;
  readonly payload: SaveRequestPayload;
  readonly moduleScope?: ModuleScope;
  readonly dryRun?: boolean;
}

export type SaveResultKind =
  | 'save_applied'
  | 'save_applied_with_warnings'
  | 'save_blocked'
  | 'save_failed';

export interface RuntimeImpactSummary {
  readonly changedFiles: readonly string[];
}

export interface SaveResultBase {
  readonly requestId: string;
  readonly packageName: string;
  readonly sectionId: SectionId;
  readonly showLocally: boolean;
  readonly showInGlobalDiagnostics: boolean;
}

export interface SaveAppliedResult extends SaveResultBase {
  readonly kind: 'save_applied';
  readonly reloadedSectionState: StoryPackage;
  readonly runtimeImpactSummary: RuntimeImpactSummary;
  readonly warnings?: readonly string[];
  readonly nextSuggestedAction?: string;
  readonly blockingIssues?: readonly string[];
}

export interface SaveAppliedWithWarningsResult extends SaveResultBase {
  readonly kind: 'save_applied_with_warnings';
  readonly reloadedSectionState: StoryPackage;
  readonly runtimeImpactSummary: RuntimeImpactSummary;
  readonly warnings: readonly string[];
  readonly nextSuggestedAction?: string;
  readonly blockingIssues?: readonly string[];
}

export interface SaveBlockedResult extends SaveResultBase {
  readonly kind: 'save_blocked';
  readonly blockingIssues: readonly string[];
  readonly warnings?: readonly string[];
  readonly nextSuggestedAction?: string;
}

export interface SaveFailedResult extends SaveResultBase {
  readonly kind: 'save_failed';
  readonly errorMessage: string;
  readonly warnings?: readonly string[];
  readonly nextSuggestedAction?: string;
}

export type SaveResult =
  | SaveAppliedResult
  | SaveAppliedWithWarningsResult
  | SaveBlockedResult
  | SaveFailedResult;
