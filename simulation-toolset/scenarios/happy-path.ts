import { loadStoryPackage } from '@/engine/story-loader';
import type { StoryPackage } from '@/types';

import { createAuthorSimulator } from '@simulation/author-simulator';
import { observeGossipelogCycle } from '@simulation/gossipelog-observer';
import { createPlayerSimulator } from '@simulation/player-simulator';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';

function disableAuditQuestions(storyPackage: StoryPackage): StoryPackage {
  return {
    ...storyPackage,
    auditQuestionSet: {
      ...storyPackage.auditQuestionSet,
      selectionPolicy: {
        default: [],
      },
    },
  };
}

export function createHappyPathScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'happy-path',
    packageName: 'sample-scene',
    async run({ recorder }) {
      let author: Awaited<ReturnType<typeof createAuthorSimulator>> | null = null;

      try {
        author = await createAuthorSimulator('sample-scene');
        const authorResult = await author.saveWorldBaseCast({
          hero: {
            name: 'Simulation Hero',
          },
        });

        recorder.recordAction({
          kind: 'author.save',
          details: {
            packageName: author.packageName,
          },
        });
        recorder.recordAuthoringTrace({
          sectionId: authorResult.trace.sectionId,
          resultKind: authorResult.trace.resultKind,
          changedFiles: [...authorResult.trace.changedFiles],
        });
        recorder.recordAssertion({
          name: 'author-save-applied',
          pass: authorResult.saveResult.kind === 'save_applied',
        });

        const runtimeStoryPackage = disableAuditQuestions(
          await loadStoryPackage(author.packageName),
        );
        const playerAdapter = createScriptedAdapter({
          collapse: [{ alpha: 'alpha-init', beta: 'beta-init', inferenceTrace: 'collapse-trace' }],
          route: [{ routerName: 'investigation', inferenceTrace: 'route-trace' }],
          generate: [{ beatText: 'beat-1', options: ['a', 'b', 'c', 'd'] }],
        });
        const player = await createPlayerSimulator(
          author.packageName,
          playerAdapter,
          runtimeStoryPackage,
        );

        await player.initScene();
        const beat = await player.runBeat('opening action');
        const playerOperations = playerAdapter.getTrace().operations;
        const auditorInvoked = playerOperations.some((item) => item.operation === 'audit');

        recorder.recordAction({
          kind: 'player.runBeat',
          details: {
            beatText: beat.beatResult.beatText,
            auditorInvoked,
          },
        });
        recorder.recordRuntimeTrace({
          accepted: beat.trace.accepted,
          forceAccepted: beat.trace.forceAccepted,
          beatText: beat.beatResult.beatText,
          currentBeatIndexInPhase: beat.trace.currentBeatIndexInPhase,
        });
        for (const operation of playerOperations) {
          recorder.recordAdapterTrace({
            operation: operation.operation,
            outcome: operation.outcome,
            ...(operation.error ? { error: operation.error } : {}),
          });
        }
        recorder.recordAssertion({
          name: 'player-beat-accepted',
          pass: beat.trace.accepted,
        });
        recorder.recordAssertion({
          name: 'auditor-skipped-when-no-questions-selected',
          pass: !auditorInvoked,
          details: 'selectionPolicy.default = [] should bypass the audit step',
        });

        const agentStoryPackage = await loadStoryPackage(author.packageName);
        const agentAdapter = createScriptedAdapter({
          gossipelogUpdate: [
            {
              involvedRoleIds: [agentStoryPackage.worldBase.hero.characterId],
              invocationNoOp: true,
              edgeUpdates: [],
            },
          ],
          gossipelogInjection: [
            {
              highlightedDeltasText: '',
              stableBackgroundText: 'stable background',
            },
          ],
        });
        const agentResult = await observeGossipelogCycle({
          adapter: agentAdapter,
          storyPackageName: author.packageName,
          storyPackage: agentStoryPackage,
          acceptedBeatText: beat.beatResult.beatText,
          roundId: 'round-happy-0001',
        });

        recorder.recordAction({
          kind: 'agent.observe',
        });
        recorder.recordAgentTrace({
          highlightedDeltasText: agentResult.agentTrace.relationshipLayer.highlightedDeltasText,
          stableBackgroundText: agentResult.agentTrace.relationshipLayer.stableBackgroundText,
          usedFallbackSource: agentResult.agentTrace.usedFallbackSource,
          usedFallbackLayer: agentResult.agentTrace.usedFallbackLayer,
        });
        recorder.recordAssertion({
          name: 'agent-layer-produced',
          pass: agentResult.agentTrace.relationshipLayer.stableBackgroundText === 'stable background',
        });

        return {
          finalState: {
            packageName: author.packageName,
            heroName: authorResult.reloadedStoryPackage.worldBase.hero.name,
            beatText: beat.beatResult.beatText,
            auditorInvoked,
            stableBackgroundText: agentResult.agentTrace.relationshipLayer.stableBackgroundText,
          },
        };
      } finally {
        await author?.cleanup();
      }
    },
  };
}
