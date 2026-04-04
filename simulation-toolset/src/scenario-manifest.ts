export type SimulationScenarioManifestEntry = {
  readonly scenarioId: string;
  readonly title: string;
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
] as const;

export function listBuiltInScenarioManifestEntries(): readonly SimulationScenarioManifestEntry[] {
  return [...BUILT_IN_SCENARIO_MANIFEST];
}

export function getScenarioManifestEntry(
  scenarioId: string,
): SimulationScenarioManifestEntry | undefined {
  return BUILT_IN_SCENARIO_MANIFEST.find((entry) => entry.scenarioId === scenarioId);
}
