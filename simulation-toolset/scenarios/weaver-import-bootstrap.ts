import type { SimulationScenario } from '@simulation/contracts';

export function createWeaverImportBootstrapScenario(): SimulationScenario {
  return {
    scenarioId: 'weaver-import-bootstrap',
    packageName: 'simulation-weaver-import-bootstrap',
    steps: [
      { kind: 'create-temp-package' },
      { kind: 'weaver-import', sourceText: 'A complete story with characters.' },
      { kind: 'gossipelog-bootstrap' },
      { kind: 'assert-bootstrap-succeeded' },
      { kind: 'cleanup-temp-package' },
    ],
  };
}
