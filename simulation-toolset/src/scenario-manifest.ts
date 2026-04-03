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
    scenarioId: 'adapter-failure',
    title: 'Adapter Failure',
    tags: ['sidecar', 'fallback', 'adapter'],
  },
  {
    scenarioId: 'stale-refresh-protection',
    title: 'Stale Refresh Protection',
    tags: ['session', 'continuity', 'reset', 'gossipelog'],
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
