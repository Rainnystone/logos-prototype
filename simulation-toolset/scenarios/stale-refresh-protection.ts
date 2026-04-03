import path from 'node:path';
import fs from 'node:fs/promises';

import { loadStoryPackage } from '@/engine/story-loader';
import { readFile, ensureActiveSession } from '@/runtime-sessions/repository';

import { createScriptedAdapter } from '@simulation/scripted-adapter';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import { createSessionSimulator } from '@simulation/session-simulator';
import { createTempStoryPackage } from '@simulation/temp-package';
import { observeGossipelogCycle } from '@simulation/gossipelog-observer';

/**
 * Creates a minimal valid StateSnapshot for test fixtures.
 */
function createMinimalStateSnapshot(): {
  sceneState: {
    sceneId: string;
    currentPhaseIndex: number;
    currentBeatIndexInPhase: number;
    mainAxis: string;
    endLine: string;
    alpha: string;
    beta: string;
  };
  roundState: {
    phaseGoal: string;
    currentVolume: 'Low' | 'Med' | 'High';
    currentRouter: string;
    verbLexicon: string[];
    historyWindow: { role: 'system' | 'user' | 'assistant'; content: string }[];
  };
  generationState: {
    directorNoteSummary: string;
    promptObject: Record<string, unknown>;
    currentBeatText: string | null;
    currentOptions: string[];
  };
  evaluationState: {
    auditAnswers: boolean[];
    blockingFailures: string[];
    retryCount: number;
    rewriteFeedback: string | null;
  };
} {
  return {
    sceneState: {
      sceneId: 'scene-001',
      currentPhaseIndex: 1,
      currentBeatIndexInPhase: 1,
      mainAxis: 'test axis',
      endLine: 'test end line',
      alpha: 'test alpha',
      beta: 'test beta',
    },
    roundState: {
      phaseGoal: 'test goal',
      currentVolume: 'Med',
      currentRouter: 'router-001',
      verbLexicon: ['look', 'talk'],
      historyWindow: [],
    },
    generationState: {
      directorNoteSummary: 'test summary',
      promptObject: {},
      currentBeatText: null,
      currentOptions: [],
    },
    evaluationState: {
      auditAnswers: [true, true, true],
      blockingFailures: [],
      retryCount: 0,
      rewriteFeedback: null,
    },
  };
}

/**
 * S4 Stale Refresh Protection Scenario
 *
 * This scenario tests that when a gossipelog refresh is pending (delayed),
 * and a reset occurs before the refresh completes, the new session is
 * unaffected when the stale refresh finally completes. The old session
 * checkpoint may be finalized (allowed) but should not affect the new session.
 *
 * Flow:
 * 1. Create temp package and ensure an active session exists
 * 2. Simulate beat acceptance by creating a checkpoint in the session
 * 3. Start delayed gossipelogUpdate (pending refresh)
 * 4. Reset workbench during pending refresh
 * 5. Allow gossipelogUpdate to complete (stale refresh)
 * 6. Verify new session is unaffected
 * 7. Verify old session checkpoint may be finalized (allowed behavior)
 */
export function createStaleRefreshProtectionScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'stale-refresh-protection',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');

      try {
        const storyPackage = await loadStoryPackage(fixture.packageName);

        // Step 1: Ensure an active session exists
        // This simulates the state where a beat was already accepted
        const initialSession = await ensureActiveSession(fixture.packageName);

        recorder.recordAction({
          kind: 'session.ensure',
          details: {
            sessionId: initialSession.sessionId,
            lifecycle: initialSession.lifecycle,
          },
        });

        // Step 2: Simulate beat acceptance by creating a checkpoint
        // We manually add a checkpoint to the session file
        const testCheckpointId = 'ckpt_stale_test_01';
        const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');

        const fileBeforeCheckpoint = await readFile(fixture.packageName);
        if (fileBeforeCheckpoint === null || fileBeforeCheckpoint.activeSessionId === null) {
          throw new Error('Expected active session to exist');
        }

        const timestamp = new Date().toISOString();
        const checkpointData = {
          checkpointId: testCheckpointId,
          acceptedBeatOrdinal: 1,
          sceneId: 'scene-001',
          phaseIndex: 1,
          beatIndex: 1,
          roundId: 'round-001',
          acceptedTranscript: {
            playerInput: 'player action for stale test',
            beatText: 'narrative response for stale test',
          },
          stateSnapshot: createMinimalStateSnapshot(),
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'initial delta',
            stableBackgroundText: 'initial background',
          },
          createdAt: timestamp,
        };

        const sessionWithCheckpoint = {
          ...fileBeforeCheckpoint.sessionsById[fileBeforeCheckpoint.activeSessionId],
          lifecycle: 'in_progress',
          updatedAt: timestamp,
          headCheckpointId: testCheckpointId,
          activeCheckpointId: testCheckpointId,
          orderedCheckpointIds: [testCheckpointId],
          checkpointsById: {
            [testCheckpointId]: checkpointData,
          },
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'initial delta',
            stableBackgroundText: 'initial background',
          },
        };

        const fileWithCheckpoint = {
          ...fileBeforeCheckpoint,
          sessionsById: {
            ...fileBeforeCheckpoint.sessionsById,
            [fileBeforeCheckpoint.activeSessionId]: sessionWithCheckpoint,
          },
        };

        await fs.writeFile(sessionsPath, JSON.stringify(fileWithCheckpoint, null, 2), 'utf8');

        recorder.recordAction({
          kind: 'checkpoint.simulated',
          details: {
            checkpointId: testCheckpointId,
            sessionId: fileBeforeCheckpoint.activeSessionId,
          },
        });

        // Step 3: Create session simulator for this package
        const sessionSimulator = await createSessionSimulator(fixture.packageName);

        // Read the current state with checkpoint
        const fileWithCheckpointRead = await readFile(fixture.packageName);
        const activeSessionIdWithCheckpoint = fileWithCheckpointRead?.activeSessionId ?? null;

        recorder.recordAction({
          kind: 'scenario.setup',
          details: {
            activeSessionIdWithCheckpoint,
            testCheckpointId,
          },
        });

        // Step 4: Create adapter with delayed gossipelogUpdate to simulate pending refresh
        // The delay allows us to trigger a reset before the refresh completes
        const adapter = createScriptedAdapter({
          gossipelogUpdate: [
            {
              kind: 'delay',
              delayMs: 100, // 100ms delay to allow reset to occur
              value: {
                involvedRoleIds: [storyPackage.worldBase.hero.characterId],
                invocationNoOp: true,
                edgeUpdates: [],
              },
            },
          ],
          gossipelogInjection: [
            {
              highlightedDeltasText: 'stale refresh delta',
              stableBackgroundText: 'stale refresh background',
            },
          ],
        });

        // Step 5: Start the gossipelog cycle (which will trigger the delayed gossipelogUpdate)
        // We don't await this yet - we want to reset while it's pending
        const gossipelogPromise = observeGossipelogCycle({
          adapter,
          storyPackageName: fixture.packageName,
          storyPackage,
          acceptedBeatText: 'accepted beat text for stale refresh test',
          roundId: 'round-stale-refresh-0001',
        });

        recorder.recordAction({
          kind: 'gossipelog.cycle.started',
          details: {
            pendingRefresh: true,
          },
        });

        // Step 6: While the gossipelogUpdate is delayed (pending), execute reset
        // This creates a new session and makes the old session inactive
        const resetResult = await sessionSimulator.reset();

        recorder.recordAction({
          kind: 'session.reset',
          details: {
            oldSessionId: resetResult.oldSessionId,
            newSessionId: resetResult.newSessionId,
          },
        });

        recorder.recordAssertion({
          name: 'reset-created-new-session',
          pass: resetResult.newSessionId !== resetResult.oldSessionId,
          details: 'Reset should create a new session distinct from the old one',
        });

        recorder.recordAssertion({
          name: 'reset-preserved-old-session',
          pass: resetResult.preservedOldSession !== null,
          details: 'Old session should be preserved in sessionsById',
        });

        recorder.recordAssertion({
          name: 'old-session-has-checkpoint',
          pass: (resetResult.preservedOldSession?.orderedCheckpointIds?.length ?? 0) > 0,
          details: 'Old session should have the checkpoint we created',
        });

        // Step 7: Now wait for the gossipelog cycle to complete
        // This represents the stale refresh completing after reset
        const gossipelogResult = await gossipelogPromise;

        recorder.recordAction({
          kind: 'gossipelog.cycle.completed',
          details: {
            outcome: gossipelogResult.agentTrace.outcome,
          },
        });

        recorder.recordAgentTrace(gossipelogResult.agentTrace);

        // Verify the adapter trace shows delayed operation
        const adapterTrace = adapter.getTrace();
        const delayedGossipelogUpdate = adapterTrace.operations.find(
          (op) => op.operation === 'gossipelogUpdate' && op.outcome === 'delayed',
        );

        recorder.recordAssertion({
          name: 'gossipelogUpdate-was-delayed',
          pass: delayedGossipelogUpdate !== undefined,
          details: 'The gossipelogUpdate should have been delayed to simulate pending refresh',
        });

        for (const operation of adapterTrace.operations) {
          recorder.recordAdapterTrace({
            operation: operation.operation,
            outcome: operation.outcome,
            ...(operation.error ? { error: operation.error } : {}),
            ...(operation.delayMs ? { delayMs: operation.delayMs } : {}),
          });
        }

        // Step 8: Verify stale refresh protection using the session simulator
        const protectionResult = await sessionSimulator.verifyStaleRefreshProtection({
          targetSessionId: resetResult.oldSessionId ?? 'unknown-old-session',
          newSessionId: resetResult.newSessionId,
        });

        recorder.recordAction({
          kind: 'stale-refresh.protection-verified',
          details: {
            isProtected: protectionResult.isProtected,
            newSessionUnaffected: protectionResult.newSessionUnaffected,
            activeSessionId: protectionResult.activeSessionId,
          },
        });

        recorder.recordAssertion({
          name: 'stale-refresh-protection-verified',
          pass: protectionResult.isProtected,
          details: protectionResult.details ?? 'New session should be protected from stale refresh',
        });

        recorder.recordAssertion({
          name: 'new-session-unaffected',
          pass: protectionResult.newSessionUnaffected,
          details: 'New session should be in awaiting_start state with no checkpoints',
        });

        recorder.recordAssertion({
          name: 'active-session-is-new-session',
          pass: protectionResult.activeSessionId === resetResult.newSessionId,
          details: 'Active session should still be the new session after stale refresh',
        });

        // Step 9: Verify that the old session checkpoint could be finalized (allowed behavior)
        // This is acceptable as long as it doesn't affect the new session
        const fileAfter = await readFile(fixture.packageName);
        const oldSessionAfter = fileAfter?.sessionsById[resetResult.oldSessionId ?? ''];

        // Check if the old session still exists and may have been updated
        // This is allowed - the stale refresh can finalize the old checkpoint
        const oldSessionPreserved = oldSessionAfter !== undefined;

        recorder.recordAssertion({
          name: 'old-session-preserved',
          pass: oldSessionPreserved,
          details: 'Old session should still exist in sessionsById after stale refresh',
        });

        recorder.recordAssertion({
          name: 'old-session-finalization-allowed',
          pass: oldSessionPreserved,
          details: 'Old session checkpoint may be finalized by stale refresh (allowed)',
        });

        // Final verification: ensure new session is truly unaffected
        const newSessionAfter = fileAfter?.sessionsById[resetResult.newSessionId];
        const newSessionUnaffectedFinal =
          newSessionAfter?.lifecycle === 'awaiting_start' &&
          newSessionAfter?.orderedCheckpointIds.length === 0 &&
          newSessionAfter?.headCheckpointId === null &&
          newSessionAfter?.activeCheckpointId === null;

        recorder.recordAssertion({
          name: 'final-new-session-unaffected',
          pass: newSessionUnaffectedFinal,
          details: 'Final check: new session should be awaiting_start with no checkpoints',
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            oldSessionId: resetResult.oldSessionId,
            newSessionId: resetResult.newSessionId,
            isProtected: protectionResult.isProtected,
            newSessionUnaffected: protectionResult.newSessionUnaffected,
            activeSessionId: protectionResult.activeSessionId,
            gossipelogOutcome: gossipelogResult.agentTrace.outcome,
            oldSessionPreserved,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}