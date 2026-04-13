import { existsSync } from 'node:fs';
import path from 'node:path';

import type { WeaverImportResponse } from '@/engine/types/adapter-interface';

import { observeGossipelogBootstrap } from '@simulation/bootstrap-observer';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import { createTempStoryPackage } from '@simulation/temp-package';

const CLEAN_WEAVER_IMPORT_RESPONSE: WeaverImportResponse = {
  sourceSummary: 'A story that triggers a bootstrap fallback.',
  importSummary: 'Imported with some gaps requiring fallback.',
  openingHook: 'The hero hesitates.',
  worldBase: {},
  coreCast: [],
  antagonists: [],
  npcCharacters: [],
  locations: [],
  warnings: ['Incomplete world data.'],
  unresolvedGaps: ['Missing antagonist motivation.'],
};

export function createBootstrapFallbackScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'bootstrap-fallback',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');

      try {
        // Phase 1: Weaver import via scripted adapter
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
          sourceText: 'A story that triggers a bootstrap fallback.',
          resolvedReferences: [],
        });

        recorder.recordAction({
          kind: 'weaver.import',
          details: {
            sourceSummary: importResult.sourceSummary,
          },
        });

        // Phase 2: Bootstrap observer (will return fallback_pending due to mock)
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
          kind: 'gossipelog.bootstrap-force-fail',
        });
        recorder.recordAgentTrace(observation.agentTrace);
        recorder.recordAssertion({
          name: 'bootstrap-outcome-fallback-pending',
          pass: observation.agentTrace.outcome === 'fallback-pending',
        });

        // Assert package still exists after bootstrap failure
        const packageStillExists = existsSync(fixture.packagePath);
        recorder.recordAssertion({
          name: 'package-still-exists-after-fallback',
          pass: packageStillExists,
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            bootstrapOutcome: observation.agentTrace.outcome,
            bootstrapStatus: observation.bootstrapStatus,
            packageStillExists,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}
