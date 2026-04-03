import path from 'node:path';
import fs from 'node:fs/promises';

import { readFile } from '@/runtime-sessions/repository';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import { createSessionSimulator } from '@simulation/session-simulator';
import { createTempStoryPackage, type TempStoryPackageFixture } from '@simulation/temp-package';
import { readSession } from '@simulation/session-observer';

/**
 * Minimal valid StateSnapshot for test fixtures.
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
 * Creates a runtime session file with an active session containing accepted beats.
 */
async function createActiveSessionWithAcceptedBeats(
  fixture: TempStoryPackageFixture,
  sessionId: string,
): Promise<void> {
  const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
  const sessionData = {
    version: 1,
    activeSessionId: sessionId,
    sessionsById: {
      [sessionId]: {
        sessionId,
        lifecycle: 'in_progress',
        createdAt: '2026-04-04T00:00:00.000Z',
        updatedAt: '2026-04-04T01:00:00.000Z',
        headCheckpointId: 'ckpt_reset_01',
        activeCheckpointId: 'ckpt_reset_01',
        orderedCheckpointIds: ['ckpt_reset_01'],
        checkpointsById: {
          ckpt_reset_01: {
            checkpointId: 'ckpt_reset_01',
            acceptedBeatOrdinal: 1,
            sceneId: 'scene-001',
            phaseIndex: 1,
            beatIndex: 1,
            roundId: 'round-001',
            acceptedTranscript: {
              playerInput: 'player action before reset',
              beatText: 'narrative response before reset',
            },
            stateSnapshot: createMinimalStateSnapshot(),
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'pre-reset delta',
              stableBackgroundText: 'pre-reset background',
            },
            createdAt: '2026-04-04T01:00:00.000Z',
          },
        },
        lastStableRelationshipLayer: {
          highlightedDeltasText: 'pre-reset delta',
          stableBackgroundText: 'pre-reset background',
        },
      },
    },
  };
  await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');
}

export function createSessionResetScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'session-reset',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');

      try {
        // Setup: Create active session with accepted beats
        const oldSessionId = 'sess_reset_old_01';
        await createActiveSessionWithAcceptedBeats(fixture, oldSessionId);

        recorder.recordAction({
          kind: 'session.setup',
          details: {
            sessionId: oldSessionId,
            lifecycle: 'in_progress',
            checkpointCount: 1,
          },
        });

        // Verify initial state
        const sessionBeforeReset = await readSession(fixture.packageName);
        recorder.recordAssertion({
          name: 'initial-session-active',
          pass: sessionBeforeReset !== null && sessionBeforeReset.sessionId === oldSessionId,
          details: 'Session should be active before reset',
        });

        // Create simulator and perform reset
        const simulator = await createSessionSimulator(fixture.packageName);
        const resetResult = await simulator.reset();

        recorder.recordAction({
          kind: 'session.reset',
          details: {
            oldSessionId: resetResult.oldSessionId,
            newSessionId: resetResult.newSessionId,
          },
        });

        // Assertion 1: Reset creates new session with different ID
        recorder.recordAssertion({
          name: 'reset-created-new-session',
          pass: resetResult.newSessionId !== resetResult.oldSessionId,
          details: `New session ID "${resetResult.newSessionId}" should differ from old "${resetResult.oldSessionId}"`,
        });

        // Assertion 2: Old session is preserved in sessionsById
        recorder.recordAssertion({
          name: 'old-session-preserved',
          pass:
            resetResult.preservedOldSession !== null &&
            resetResult.preservedOldSession.sessionId === oldSessionId &&
            resetResult.preservedOldSession.lifecycle === 'in_progress',
          details: 'Old session should be preserved in sessionsById with original lifecycle',
        });

        // Assertion 3: New session has awaiting_start lifecycle
        recorder.recordAssertion({
          name: 'new-session-awaiting-start',
          pass: resetResult.newSession.lifecycle === 'awaiting_start',
          details: `New session lifecycle should be "awaiting_start"`,
        });

        // Assertion 4: New session has no checkpoints
        recorder.recordAssertion({
          name: 'new-session-no-checkpoints',
          pass:
            resetResult.newSession.orderedCheckpointIds.length === 0 &&
            resetResult.newSession.checkpointsById !== undefined &&
            Object.keys(resetResult.newSession.checkpointsById).length === 0 &&
            resetResult.newSession.headCheckpointId === null &&
            resetResult.newSession.activeCheckpointId === null,
          details: 'New session should have no checkpoints',
        });

        // Verify file state after reset
        const fileAfterReset = await readFile(fixture.packageName);
        recorder.recordAssertion({
          name: 'file-active-session-updated',
          pass:
            fileAfterReset !== null &&
            fileAfterReset.activeSessionId === resetResult.newSessionId,
          details: 'File activeSessionId should point to new session',
        });

        recorder.recordAssertion({
          name: 'file-contains-both-sessions',
          pass:
            fileAfterReset !== null &&
            fileAfterReset.sessionsById[oldSessionId] !== undefined &&
            fileAfterReset.sessionsById[resetResult.newSessionId] !== undefined,
          details: 'File should contain both old and new sessions',
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            oldSessionId: resetResult.oldSessionId,
            newSessionId: resetResult.newSessionId,
            resetPerformed: true,
            oldSessionPreserved: resetResult.preservedOldSession !== null,
            newSessionLifecycle: resetResult.newSession.lifecycle,
            newSessionCheckpointCount: resetResult.newSession.orderedCheckpointIds.length,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}