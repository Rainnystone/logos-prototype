import type { SimulationScenario } from '@simulation/contracts';

export function createWeaverImportPartialScenario(): SimulationScenario {
  return {
    scenarioId: 'weaver-import-partial',
    packageName: 'simulation-weaver-import-partial',
    steps: [
      { kind: 'create-temp-package' },
      { kind: 'weaver-import', sourceText: 'A vague text with little structure.' },
      { kind: 'assert-payload-has-warnings' },
      { kind: 'assert-scaffold-defaults-fill-gaps' },
      { kind: 'cleanup-temp-package' },
    ],
  };
}
