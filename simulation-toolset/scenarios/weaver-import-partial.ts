import { createScriptedAdapter } from '@simulation/scripted-adapter';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import { createTempStoryPackage } from '@simulation/temp-package';

export function createWeaverImportPartialScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'weaver-import-partial',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');

      try {
        const adapter = createScriptedAdapter({
          weaverImport: [
            {
              sourceSummary: 'Vague text with little structure.',
              importSummary: 'Minimal extraction with gaps.',
              openingHook: 'A vague text with little structure.',
              worldBase: {},
              coreCast: [],
              antagonists: [],
              npcCharacters: [],
              locations: [],
              warnings: ['No clear protagonist.', 'Setting ambiguous.'],
              unresolvedGaps: ['Missing world setting.'],
            },
          ],
        });

        const result = await adapter.weaverImport!({
          sourceText: 'A vague text with little structure.',
          resolvedReferences: [],
        });

        const operations = adapter.getTrace().operations;
        const firstOp = operations[0];

        recorder.recordAction({
          kind: 'weaver.import',
          details: {
            packageName: fixture.packageName,
          },
        });
        recorder.recordAdapterTrace({
          operation: firstOp ? firstOp.operation : 'weaverImport',
          outcome: firstOp ? firstOp.outcome : 'missing',
        });
        recorder.recordAssertion({
          name: 'payload-has-warnings',
          pass: result.warnings.length === 2,
          details: {
            warningCount: result.warnings.length,
          },
        });
        recorder.recordAssertion({
          name: 'payload-has-unresolved-gaps',
          pass: result.unresolvedGaps.length === 1,
          details: {
            unresolvedGapCount: result.unresolvedGaps.length,
          },
        });
        recorder.recordAssertion({
          name: 'scaffold-defaults-fill-gaps',
          pass: typeof result.worldBase === 'object' && result.worldBase !== null
            && result.coreCast.length === 0
            && result.antagonists.length === 0
            && result.npcCharacters.length === 0
            && result.locations.length === 0,
          details: {
            hasWorldBase: typeof result.worldBase === 'object' && result.worldBase !== null,
            coreCastEmpty: result.coreCast.length === 0,
            antagonistsEmpty: result.antagonists.length === 0,
            npcCharactersEmpty: result.npcCharacters.length === 0,
            locationsEmpty: result.locations.length === 0,
          },
        });
        recorder.recordAssertion({
          name: 'adapter-trace-recorded-weaver-import',
          pass: operations.length === 1 && firstOp != null && firstOp.operation === 'weaverImport' && firstOp.outcome === 'result',
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            warningCount: result.warnings.length,
            unresolvedGapCount: result.unresolvedGaps.length,
            hasScaffoldDefaults: typeof result.worldBase === 'object' && result.worldBase !== null
              && result.coreCast.length === 0
              && result.antagonists.length === 0
              && result.npcCharacters.length === 0
              && result.locations.length === 0,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}
