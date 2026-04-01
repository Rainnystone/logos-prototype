import { loadStoryPackage } from '@/engine/story-loader';

import { observeGossipelogCycle } from '@simulation/gossipelog-observer';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import { createTempStoryPackage } from '@simulation/temp-package';

export function createAdapterFailureScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'adapter-failure',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');

      try {
        const storyPackage = await loadStoryPackage(fixture.packageName);
        const lastStableRelationshipLayer = {
          highlightedDeltasText: 'stable delta',
          stableBackgroundText: 'stable background',
        };
        const adapter = createScriptedAdapter({
          gossipelogUpdate: [
            {
              involvedRoleIds: [storyPackage.worldBase.hero.characterId],
              invocationNoOp: true,
              edgeUpdates: [],
            },
          ],
          gossipelogInjection: [
            {
              kind: 'error',
              message: 'gossipelog injection failed',
            },
          ],
        });
        const result = await observeGossipelogCycle({
          adapter,
          storyPackageName: fixture.packageName,
          storyPackage,
          acceptedBeatText: 'accepted beat text',
          roundId: 'round-failure-0001',
          lastStableRelationshipLayer,
        });

        recorder.recordAction({
          kind: 'agent.observe.failure',
        });
        recorder.recordAgentTrace({
          highlightedDeltasText: result.agentTrace.relationshipLayer.highlightedDeltasText,
          stableBackgroundText: result.agentTrace.relationshipLayer.stableBackgroundText,
          usedFallbackSource: result.agentTrace.usedFallbackSource,
          usedFallbackLayer: result.agentTrace.usedFallbackLayer,
        });
        recorder.recordAssertion({
          name: 'fallback-layer-used',
          pass: result.agentTrace.usedFallbackLayer === 'last-stable-layer',
        });
        recorder.recordAssertion({
          name: 'stable-layer-preserved',
          pass:
            result.agentTrace.relationshipLayer.stableBackgroundText ===
            lastStableRelationshipLayer.stableBackgroundText,
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            usedFallbackLayer: result.agentTrace.usedFallbackLayer,
            stableBackgroundText: result.agentTrace.relationshipLayer.stableBackgroundText,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}
