import type { SimulationScenario } from '@simulation/contracts';

export function createBootstrapFallbackScenario(): SimulationScenario {
  return {
    scenarioId: 'bootstrap-fallback',
    packageName: 'simulation-bootstrap-fallback',
    steps: [
      { kind: 'create-temp-package' },
      { kind: 'gossipelog-bootstrap-force-fail' },
      { kind: 'assert-bootstrap-fallback-pending' },
      { kind: 'assert-package-still-exists' },
      { kind: 'cleanup-temp-package' },
    ],
  };
}
