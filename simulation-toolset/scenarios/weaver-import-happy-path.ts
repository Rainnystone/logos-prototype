import { createScriptedAdapter } from '@simulation/scripted-adapter';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import { createTempStoryPackage } from '@simulation/temp-package';

export function createWeaverImportHappyPathScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'weaver-import-happy-path',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');

      try {
        const adapter = createScriptedAdapter({
          weaverImport: [
            {
              sourceSummary: 'An explorer ventures into unknown territory.',
              importSummary: 'World base and cast extracted from source text.',
              openingHook: 'An explorer ventures into unknown territory.',
              worldBase: { settingSummary: 'An adventure setting with unknown territory.' },
              coreCast: [],
              antagonists: [],
              npcCharacters: [],
              locations: [],
              warnings: [],
              unresolvedGaps: [],
            },
          ],
        });

        const result = await adapter.weaverImport!({
          sourceText: 'An explorer ventures into unknown territory.',
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
          name: 'weaver-import-returned-source-summary',
          pass: result.sourceSummary === 'An explorer ventures into unknown territory.',
        });
        recorder.recordAssertion({
          name: 'weaver-import-returned-world-base',
          pass: typeof result.worldBase === 'object' && result.worldBase !== null,
        });
        recorder.recordAssertion({
          name: 'adapter-trace-recorded-weaver-import',
          pass: operations.length === 1 && firstOp != null && firstOp.operation === 'weaverImport' && firstOp.outcome === 'result',
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            sourceSummary: result.sourceSummary,
            importSummary: result.importSummary,
            openingHook: result.openingHook,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}
