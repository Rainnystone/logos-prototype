import type { WeaverImportResponse } from '@/engine/types/adapter-interface';

import { observeGossipelogBootstrap } from '@simulation/bootstrap-observer';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import { createTempStoryPackage } from '@simulation/temp-package';

const CLEAN_WEAVER_IMPORT_RESPONSE: WeaverImportResponse = {
  sourceSummary: 'A complete story with characters and locations.',
  importSummary: 'Imported successfully with full world data.',
  openingHook: 'The hero enters the scene.',
  worldBase: {},
  coreCast: [],
  antagonists: [],
  npcCharacters: [],
  locations: [],
  warnings: [],
  unresolvedGaps: [],
};

export function createWeaverImportBootstrapScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'weaver-import-bootstrap',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');

      try {
        // Phase 1: Weaver import via scripted adapter (clean payload)
        const adapter = createScriptedAdapter({
          weaverImport: [CLEAN_WEAVER_IMPORT_RESPONSE],
          gossipelogUpdate: [
            {
              involvedRoleIds: [],
              invocationNoOp: true,
              memoryUpdates: [],
            },
          ],
          gossipelogInjection: [
            {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
          ],
        });

        const importResult = await adapter.weaverImport!({
          sourceText: 'A complete story with characters.',
          resolvedReferences: [],
        });

        recorder.recordAction({
          kind: 'weaver.import',
          details: {
            sourceSummary: importResult.sourceSummary,
          },
        });

        // Phase 2: Bootstrap observer
        const weaverSummary = {
          schemaVersion: 1 as const,
          sourceKind: 'text_import' as const,
          lastRunAt: new Date().toISOString(),
          sourceSummary: importResult.sourceSummary,
          importSummary: importResult.importSummary,
          warnings: importResult.warnings,
          unresolvedGaps: importResult.unresolvedGaps,
          warningCount: importResult.warnings.length,
          unresolvedGapCount: importResult.unresolvedGaps.length,
          bootstrapStatus: 'pending' as const,
        };

        const observation = await observeGossipelogBootstrap({
          storyPackageName: fixture.packageName,
          weaverSummary,
          adapter,
        });

        recorder.recordAction({
          kind: 'gossipelog.bootstrap',
        });
        recorder.recordAgentTrace(observation.agentTrace);
        recorder.recordAssertion({
          name: 'bootstrap-outcome-succeeded',
          pass: observation.agentTrace.outcome === 'succeeded',
        });
        recorder.recordAssertion({
          name: 'bootstrap-status-in-trace-details',
          pass: observation.agentTrace.details?.bootstrapStatus === 'succeeded',
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            bootstrapOutcome: observation.agentTrace.outcome,
            bootstrapStatus: observation.bootstrapStatus,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}
