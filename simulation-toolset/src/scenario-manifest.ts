export type SimulationScenarioManifestEntry = {
  readonly scenarioId: string;
  readonly title: string;
  readonly tags: readonly string[];
};

/**
 * Storyline flow identifiers.
 * These correspond to SerializedE2EFlowId in the shared trace contracts.
 */
export type StorylineFlowId =
  | 'create_from_source_and_continue'
  | 'branch_from_checkpoint_flow'
  | 'switch_and_continue'
  | 'rename_and_verify'
  | 'legacy_bootstrap_flow'
  | 'full_storyline_runtime_flow';

/**
 * Storyline flow manifest entry.
 */
export type StorylineFlowManifestEntry = {
  readonly flowId: StorylineFlowId;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
};

const BUILT_IN_SCENARIO_MANIFEST: readonly SimulationScenarioManifestEntry[] = [
  {
    scenarioId: 'happy-path',
    title: 'Happy Path',
    tags: ['authoring', 'runtime', 'adapter', 'sidecar'],
  },
  {
    scenarioId: 'validation-failure',
    title: 'Validation Failure',
    tags: ['authoring', 'validation'],
  },
  {
    scenarioId: 'validation-success',
    title: 'Validation Success',
    tags: ['authoring', 'validation'],
  },
  {
    scenarioId: 'adapter-failure',
    title: 'Adapter Failure',
    tags: ['sidecar', 'fallback', 'adapter'],
  },
  {
    scenarioId: 'session-checkpoint-persistence',
    title: 'Session Checkpoint Persistence',
    tags: ['session', 'continuity', 'checkpoint'],
  },
  {
    scenarioId: 'session-restore',
    title: 'Session Restore',
    tags: ['session', 'continuity', 'restore'],
  },
  {
    scenarioId: 'session-reset',
    title: 'Session Reset',
    tags: ['session', 'continuity', 'reset'],
  },
  {
    scenarioId: 'stale-refresh-protection',
    title: 'Stale Refresh Protection',
    tags: ['session', 'continuity', 'reset', 'gossipelog'],
  },
  {
    scenarioId: 'relationship-finalization',
    title: 'Relationship Finalization',
    tags: ['session', 'continuity', 'gossipelog', 'checkpoint'],
  },
  {
    scenarioId: 'edit-continuity-view',
    title: 'Edit Continuity View',
    tags: ['session', 'continuity', 'edit', 'bounded-view'],
  },
  {
    scenarioId: 'gossipelog-v2-memory-update',
    title: 'Gossipelog v2 Memory Update',
    tags: ['gossipelog', 'v2', 'memory-update'],
  },
  {
    scenarioId: 'gossipelog-v2-anchor-validation',
    title: 'Gossipelog v2 Anchor Validation',
    tags: ['gossipelog', 'v2', 'anchor', 'fallback'],
  },
  {
    scenarioId: 'gossipelog-v2-reference-resolution',
    title: 'Gossipelog v2 Reference Resolution',
    tags: ['gossipelog', 'v2', 'reference'],
  },
] as const;

/**
 * Built-in storyline flow manifest.
 * Reference: SerializedE2EFlowId in serialized-trace.ts
 */
const BUILT_IN_STORYLINE_FLOW_MANIFEST: readonly StorylineFlowManifestEntry[] = [
  {
    flowId: 'create_from_source_and_continue',
    title: 'Create from Source and Continue',
    description: 'Create a new storyline from a source package and continue play',
    tags: ['storyline', 'create', 'source'],
  },
  {
    flowId: 'branch_from_checkpoint_flow',
    title: 'Branch from Checkpoint',
    description: 'Branch a new storyline from an existing checkpoint',
    tags: ['storyline', 'branch', 'checkpoint'],
  },
  {
    flowId: 'switch_and_continue',
    title: 'Switch and Continue',
    description: 'Switch to an existing storyline and continue play',
    tags: ['storyline', 'switch'],
  },
  {
    flowId: 'rename_and_verify',
    title: 'Rename and Verify',
    description: 'Rename a storyline and verify workspace consistency',
    tags: ['storyline', 'rename', 'workspace'],
  },
  {
    flowId: 'legacy_bootstrap_flow',
    title: 'Legacy Bootstrap',
    description: 'Bootstrap from legacy runtime-sessions file without storyline repository',
    tags: ['storyline', 'legacy', 'bootstrap'],
  },
  {
    flowId: 'full_storyline_runtime_flow',
    title: 'Full Storyline Runtime Flow',
    description: 'Complete runtime flow with storyline context',
    tags: ['storyline', 'runtime', 'e2e'],
  },
] as const;

export function listBuiltInScenarioManifestEntries(): readonly SimulationScenarioManifestEntry[] {
  return [...BUILT_IN_SCENARIO_MANIFEST];
}

export function getScenarioManifestEntry(
  scenarioId: string,
): SimulationScenarioManifestEntry | undefined {
  return BUILT_IN_SCENARIO_MANIFEST.find((entry) => entry.scenarioId === scenarioId);
}

/**
 * List all built-in storyline flow manifest entries.
 */
export function listBuiltInStorylineFlowManifestEntries(): readonly StorylineFlowManifestEntry[] {
  return [...BUILT_IN_STORYLINE_FLOW_MANIFEST];
}

/**
 * Get a specific storyline flow manifest entry by flow ID.
 */
export function getStorylineFlowManifestEntry(
  flowId: StorylineFlowId,
): StorylineFlowManifestEntry | undefined {
  return BUILT_IN_STORYLINE_FLOW_MANIFEST.find((entry) => entry.flowId === flowId);
}
