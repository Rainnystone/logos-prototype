import { loadStoryPackage } from '@/engine/story-loader';
import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import type { RuntimeSessionStore } from '@/engine/orchestrator';
import {
  ensureActiveSession,
  recordAcceptedBeat,
  finalizeRelationshipLayer,
} from '@/runtime-sessions/repository';

import { observeGossipelogCycle } from '@simulation/gossipelog-observer';
import { createPlayerSimulator } from '@simulation/player-simulator';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
import { createTempStoryPackage } from '@simulation/temp-package';
import { readSession, readCheckpoint } from '@simulation/session-observer';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';

/**
 * Creates a RuntimeSessionStore that wraps the repository functions
 * for use in simulation scenarios.
 */
function createRepositoryBackedSessionStore(packageName: string): RuntimeSessionStore {
  return {
    async ensureActiveSession() {
      const session = await ensureActiveSession(packageName);
      return { activeSessionId: session.sessionId };
    },
    async recordAcceptedBeat(input) {
      await recordAcceptedBeat(input);
    },
    async finalizeRelationshipLayer(input) {
      await finalizeRelationshipLayer(input);
    },
  };
}

function disableAuditQuestions(storyPackage: Awaited<ReturnType<typeof loadStoryPackage>>): Awaited<ReturnType<typeof loadStoryPackage>> {
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

export function createRelationshipFinalizationScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'relationship-finalization',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');

      try {
        const storyPackage = disableAuditQuestions(await loadStoryPackage(fixture.packageName));

        // Create adapter with gossipelog support
        const adapter = createScriptedAdapter({
          collapse: [{ alpha: 'alpha-init', beta: 'beta-init', inferenceTrace: 'collapse-trace' }],
          route: [{ routerName: 'investigation', inferenceTrace: 'route-trace' }],
          generate: [{ beatText: 'beat-1', options: ['a', 'b', 'c', 'd'] }],
          gossipelogUpdate: [
            {
              involvedRoleIds: [storyPackage.worldBase.hero.characterId],
              invocationNoOp: true,
              edgeUpdates: [],
            },
          ],
          gossipelogInjection: [
            {
              highlightedDeltasText: 'finalized deltas',
              stableBackgroundText: 'finalized stable background',
            },
          ],
        });

        // Create runtime session store backed by repository
        const runtimeSessionStore = createRepositoryBackedSessionStore(fixture.packageName);

        // Create player simulator with runtime session persistence
        const player = await createPlayerSimulator({
          packageName: fixture.packageName,
          adapter,
          storyPackageOverride: storyPackage,
          runtimeSessionStore,
        });

        // Initialize scene and run a beat
        await player.initScene();
        const beat = await player.runBeat('opening action');

        recorder.recordAction({
          kind: 'player.runBeat',
          details: {
            beatText: beat.beatResult.beatText,
          },
        });
        recorder.recordRuntimeTrace({
          accepted: beat.trace.accepted,
          forceAccepted: beat.trace.forceAccepted,
          beatText: beat.beatResult.beatText,
          currentBeatIndexInPhase: beat.trace.currentBeatIndexInPhase,
        });
        recorder.recordAssertion({
          name: 'player-beat-accepted',
          pass: beat.trace.accepted,
        });

        // Wait for gossipelog finalization to complete
        // The orchestrator schedules relationship refresh asynchronously
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Read session state using SessionObserver
        const sessionObservation = await readSession(fixture.packageName);

        recorder.recordAssertion({
          name: 'session-exists',
          pass: sessionObservation !== null,
        });

        if (!sessionObservation) {
          throw new Error('Session observation failed: no session found');
        }

        recorder.recordAssertion({
          name: 'session-has-active-checkpoint',
          pass: sessionObservation.activeCheckpointId !== null,
        });

        // Read checkpoint layer
        let checkpointObservation = null;
        if (sessionObservation.activeCheckpointId) {
          checkpointObservation = await readCheckpoint(
            fixture.packageName,
            sessionObservation.activeCheckpointId,
          );
        }

        recorder.recordAssertion({
          name: 'checkpoint-exists',
          pass: checkpointObservation !== null,
        });

        // Run a direct gossipelog cycle to verify it works with the session
        const directCycleResult = await observeGossipelogCycle({
          adapter,
          storyPackageName: fixture.packageName,
          storyPackage,
          acceptedBeatText: beat.beatResult.beatText,
          roundId: 'round-finalization-001',
        });

        recorder.recordAction({
          kind: 'agent.observe',
        });
        recorder.recordAgentTrace(directCycleResult.agentTrace);

        // Agent cycle ran (even if no-op, it completed)
        recorder.recordAssertion({
          name: 'agent-cycle-ran',
          pass: directCycleResult.agentTrace.stage === 'cycle',
          details: `Agent stage: ${directCycleResult.agentTrace.stage}`,
        });

        // Verify session-level layer content after finalization
        const sessionAfterFinalization = await readSession(fixture.packageName);

        recorder.recordAssertion({
          name: 'session-finalization-target-correct',
          pass: sessionAfterFinalization?.sessionId === sessionObservation.sessionId,
          details: `Session ID should remain consistent after finalization`,
        });

        // Get the checkpoint layer after finalization
        let checkpointAfterFinalization = null;
        if (sessionAfterFinalization?.activeCheckpointId) {
          checkpointAfterFinalization = await readCheckpoint(
            fixture.packageName,
            sessionAfterFinalization.activeCheckpointId,
          );
        }

        recorder.recordAssertion({
          name: 'checkpoint-finalization-target-correct',
          pass: checkpointAfterFinalization?.checkpointId === sessionAfterFinalization?.activeCheckpointId,
          details: `Checkpoint ID should match active checkpoint`,
        });

        // For convergence verification, we need to read the relationship layers
        // from the raw file since SessionObserver doesn't expose layer content
        const { readFile } = await import('@/runtime-sessions/repository');
        const sessionsFile = await readFile(fixture.packageName);

        let sessionLayerText = '';
        let checkpointLayerText = '';

        if (sessionsFile && sessionsFile.activeSessionId) {
          const activeSession = sessionsFile.sessionsById[sessionsFile.activeSessionId];
          if (activeSession) {
            sessionLayerText = activeSession.lastStableRelationshipLayer.stableBackgroundText;

            if (activeSession.activeCheckpointId) {
              const activeCheckpoint = activeSession.checkpointsById[activeSession.activeCheckpointId];
              if (activeCheckpoint) {
                checkpointLayerText = activeCheckpoint.lastStableRelationshipLayer.stableBackgroundText;
              }
            }
          }
        }

        // Verify convergence: session-level and checkpoint-level layers should match
        recorder.recordAssertion({
          name: 'layers-converged',
          pass: sessionLayerText === checkpointLayerText && sessionLayerText.length > 0,
          details: `Session layer: "${sessionLayerText}", Checkpoint layer: "${checkpointLayerText}"`,
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            activeSessionId: sessionAfterFinalization?.sessionId ?? null,
            activeCheckpointId: sessionAfterFinalization?.activeCheckpointId ?? null,
            sessionLayerText,
            checkpointLayerText,
            beatText: beat.beatResult.beatText,
            stableBackgroundText: directCycleResult.agentTrace.stableBackgroundText,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}