import { describe, expect, it, beforeEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';

import {
  createSessionSimulator,
  createKernelSessionSimulator,
  type RestoreResult,
  type ResetResult,
  type KernelSessionSimulator,
} from '@simulation/session-simulator';
import { createTempStoryPackage, type TempStoryPackageFixture } from '@simulation/temp-package';
import { resetWorkbench, readFile } from '@/runtime-sessions/repository';
import { createMockKernel } from '@simulation/mock-kernel';
import { createMockFixtureBuilder } from '@simulation/mock-fixture-builder';

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

describe('session simulator', () => {
  describe('createSessionSimulator', () => {
    it('creates simulator with package name', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      const simulator = await createSessionSimulator(fixture.packageName);

      expect(simulator).toBeDefined();
      expect(simulator.packageName).toBe(fixture.packageName);

      await fixture.cleanup();
    });
  });

  describe('attemptRestore', () => {
    it('returns restore result with session state', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      // Create a runtime-sessions.json with an active session
      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_restore_01',
        sessionsById: {
          sess_restore_01: {
            sessionId: 'sess_restore_01',
            lifecycle: 'in_progress',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T01:00:00.000Z',
            headCheckpointId: 'ckpt_restore_01',
            activeCheckpointId: 'ckpt_restore_01',
            orderedCheckpointIds: ['ckpt_restore_01'],
            checkpointsById: {
              ckpt_restore_01: {
                checkpointId: 'ckpt_restore_01',
                acceptedBeatOrdinal: 1,
                sceneId: 'scene-001',
                phaseIndex: 1,
                beatIndex: 1,
                roundId: 'round-001',
                acceptedTranscript: {
                  playerInput: 'player action',
                  beatText: 'narrative response',
                },
                stateSnapshot: createMinimalStateSnapshot(),
                lastStableRelationshipLayer: {
                  highlightedDeltasText: 'delta',
                  stableBackgroundText: 'background',
                },
                createdAt: '2026-04-04T01:00:00.000Z',
              },
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'delta',
              stableBackgroundText: 'background',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const simulator = await createSessionSimulator(fixture.packageName);
      const result = await simulator.attemptRestore();

      expect(result).toBeDefined();
      expect(result.restored).toBe(true);
      expect(result.session).not.toBeNull();
      expect(result.session!.sessionId).toBe('sess_restore_01');
      expect(result.session!.lifecycle).toBe('in_progress');
      expect(result.session!.checkpointCount).toBe(1);
      expect(result.activeCheckpoint).not.toBeNull();
      expect(result.activeCheckpoint!.checkpointId).toBe('ckpt_restore_01');

      await fixture.cleanup();
    });

    it('returns restore result with awaiting_start lifecycle', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      // Create a runtime-sessions.json with awaiting_start session
      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_awaiting_01',
        sessionsById: {
          sess_awaiting_01: {
            sessionId: 'sess_awaiting_01',
            lifecycle: 'awaiting_start',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T00:00:00.000Z',
            headCheckpointId: null,
            activeCheckpointId: null,
            orderedCheckpointIds: [],
            checkpointsById: {},
            lastStableRelationshipLayer: {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const simulator = await createSessionSimulator(fixture.packageName);
      const result = await simulator.attemptRestore();

      expect(result).toBeDefined();
      expect(result.restored).toBe(true);
      expect(result.session!.lifecycle).toBe('awaiting_start');
      expect(result.session!.checkpointCount).toBe(0);
      expect(result.activeCheckpoint).toBeNull();

      await fixture.cleanup();
    });
  });

  describe('reset', () => {
    it('creates new session and preserves old session', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      // Create an active session with checkpoint history
      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_old_01',
        sessionsById: {
          sess_old_01: {
            sessionId: 'sess_old_01',
            lifecycle: 'in_progress',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T01:00:00.000Z',
            headCheckpointId: 'ckpt_old_01',
            activeCheckpointId: 'ckpt_old_01',
            orderedCheckpointIds: ['ckpt_old_01'],
            checkpointsById: {
              ckpt_old_01: {
                checkpointId: 'ckpt_old_01',
                acceptedBeatOrdinal: 1,
                sceneId: 'scene-001',
                phaseIndex: 1,
                beatIndex: 1,
                roundId: 'round-001',
                acceptedTranscript: {
                  playerInput: 'input',
                  beatText: 'text',
                },
                stateSnapshot: createMinimalStateSnapshot(),
                lastStableRelationshipLayer: {
                  highlightedDeltasText: 'old delta',
                  stableBackgroundText: 'old background',
                },
                createdAt: '2026-04-04T01:00:00.000Z',
              },
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'old delta',
              stableBackgroundText: 'old background',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const simulator = await createSessionSimulator(fixture.packageName);
      const result = await simulator.reset();

      expect(result).toBeDefined();
      expect(result.oldSessionId).toBe('sess_old_01');
      expect(result.newSessionId).not.toBe('sess_old_01');

      // Verify new session properties
      expect(result.newSession.lifecycle).toBe('awaiting_start');
      expect(result.newSession.orderedCheckpointIds).toEqual([]);
      expect(result.newSession.checkpointsById).toEqual({});
      expect(result.newSession.headCheckpointId).toBeNull();
      expect(result.newSession.activeCheckpointId).toBeNull();

      // Verify old session is preserved
      expect(result.preservedOldSession).not.toBeNull();
      expect(result.preservedOldSession!.sessionId).toBe('sess_old_01');
      expect(result.preservedOldSession!.lifecycle).toBe('in_progress');
      expect(result.preservedOldSession!.orderedCheckpointIds).toEqual(['ckpt_old_01']);

      // Verify file state
      const file = await readFile(fixture.packageName);
      expect(file).not.toBeNull();
      expect(file!.activeSessionId).toBe(result.newSessionId);
      expect(file!.sessionsById[result.oldSessionId!]).toBeDefined();
      expect(file!.sessionsById[result.newSessionId]).toBeDefined();

      await fixture.cleanup();
    });

    it('creates new session when no previous session exists', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      // Ensure no runtime-sessions.json exists
      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      await fs.unlink(sessionsPath).catch(() => undefined);

      const simulator = await createSessionSimulator(fixture.packageName);
      const result = await simulator.reset();

      expect(result).toBeDefined();
      expect(result.oldSessionId).toBeNull();
      expect(result.newSessionId).toBeDefined();
      expect(result.newSession.lifecycle).toBe('awaiting_start');
      expect(result.preservedOldSession).toBeNull();

      // Verify file state
      const file = await readFile(fixture.packageName);
      expect(file).not.toBeNull();
      expect(file!.activeSessionId).toBe(result.newSessionId);

      await fixture.cleanup();
    });
  });

  describe('verifyStaleRefreshProtection', () => {
    it('verifies isolation when refresh targets old session after reset', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      // Create an active session
      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_stale_01',
        sessionsById: {
          sess_stale_01: {
            sessionId: 'sess_stale_01',
            lifecycle: 'in_progress',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T01:00:00.000Z',
            headCheckpointId: 'ckpt_stale_01',
            activeCheckpointId: 'ckpt_stale_01',
            orderedCheckpointIds: ['ckpt_stale_01'],
            checkpointsById: {
              ckpt_stale_01: {
                checkpointId: 'ckpt_stale_01',
                acceptedBeatOrdinal: 1,
                sceneId: 'scene-001',
                phaseIndex: 1,
                beatIndex: 1,
                roundId: 'round-001',
                acceptedTranscript: {
                  playerInput: 'input',
                  beatText: 'text',
                },
                stateSnapshot: createMinimalStateSnapshot(),
                lastStableRelationshipLayer: {
                  highlightedDeltasText: 'stale delta',
                  stableBackgroundText: 'stale background',
                },
                createdAt: '2026-04-04T01:00:00.000Z',
              },
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'stale delta',
              stableBackgroundText: 'stale background',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const simulator = await createSessionSimulator(fixture.packageName);

      // Reset creates new session
      const resetResult = await simulator.reset();
      const oldSessionId = resetResult.oldSessionId!;
      const newSessionId = resetResult.newSessionId;

      // Simulate a "stale refresh" that tries to update the old session
      // (In real scenario, gossipelog would try to finalize relationship layer on old checkpoint)
      const fileBeforeRefresh = await readFile(fixture.packageName);

      // Simulate stale refresh by modifying old session's checkpoint relationship layer
      // This should NOT affect the new session
      const staleCheckpoint = fileBeforeRefresh!.sessionsById[oldSessionId]!.checkpointsById['ckpt_stale_01'];
      if (staleCheckpoint) {
        // Manually simulate what a stale gossipelog refresh would attempt
        // In real implementation, gossipelog might try to finalize the old checkpoint
        const updatedOldData = {
          ...fileBeforeRefresh!,
          sessionsById: {
            ...fileBeforeRefresh!.sessionsById,
            [oldSessionId]: {
              ...fileBeforeRefresh!.sessionsById[oldSessionId]!,
              checkpointsById: {
                ...fileBeforeRefresh!.sessionsById[oldSessionId]!.checkpointsById,
                ['ckpt_stale_01']: {
                  ...staleCheckpoint,
                  lastStableRelationshipLayer: {
                    highlightedDeltasText: 'STALE UPDATE',
                    stableBackgroundText: 'STALE BACKGROUND UPDATE',
                  },
                },
              },
            },
          },
        };
        await fs.writeFile(sessionsPath, JSON.stringify(updatedOldData, null, 2), 'utf8');
      }

      // Verify protection: new session should not be affected
      const result = await simulator.verifyStaleRefreshProtection({
        targetSessionId: oldSessionId,
        newSessionId,
      });

      expect(result.isProtected).toBe(true);
      expect(result.newSessionUnaffected).toBe(true);
      expect(result.activeSessionId).toBe(newSessionId);

      // New session should still be awaiting_start with no checkpoints
      const fileAfter = await readFile(fixture.packageName);
      const newSessionAfter = fileAfter!.sessionsById[newSessionId];
      expect(newSessionAfter!.lifecycle).toBe('awaiting_start');
      expect(newSessionAfter!.orderedCheckpointIds).toEqual([]);

      await fixture.cleanup();
    });

    it('returns unprotected when active session was incorrectly modified', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      // Create an active session
      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_unprotected_01',
        sessionsById: {
          sess_unprotected_01: {
            sessionId: 'sess_unprotected_01',
            lifecycle: 'in_progress',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T01:00:00.000Z',
            headCheckpointId: null,
            activeCheckpointId: null,
            orderedCheckpointIds: [],
            checkpointsById: {},
            lastStableRelationshipLayer: {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const simulator = await createSessionSimulator(fixture.packageName);

      // In this test, we simulate the case where something incorrectly
      // modifies the active session (which would be a bug in the system)
      const currentSessionId = 'sess_unprotected_01';

      // Corrupt the session by adding unexpected state
      const corruptedData = {
        ...sessionData,
        sessionsById: {
          sess_unprotected_01: {
            ...sessionData.sessionsById.sess_unprotected_01,
            lifecycle: 'complete', // Unexpected modification
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'UNEXPECTED MODIFICATION',
              stableBackgroundText: 'corrupted',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(corruptedData, null, 2), 'utf8');

      const result = await simulator.verifyStaleRefreshProtection({
        targetSessionId: 'nonexistent_session',
        newSessionId: currentSessionId,
      });

      // Since active session was modified, protection failed
      expect(result.newSessionUnaffected).toBe(false);

      await fixture.cleanup();
    });
  });

  // ============================================================================
  // Kernel-backed SessionSimulator Tests (Task 5)
  // ============================================================================

  describe('createKernelSessionSimulator', () => {
    let kernel: ReturnType<typeof createMockKernel>;

    beforeEach(() => {
      kernel = createMockKernel('test-package-kernel');
    });

    it('creates simulator bound to MockKernel', async () => {
      const simulator = createKernelSessionSimulator({ kernel });

      expect(simulator).toBeDefined();
      expect(simulator.packageName).toBe('test-package-kernel');
      expect(simulator.getKernel()).toBe(kernel);
    });

    it('attemptRestore reads from kernel state', async () => {
      // Build fixture state in kernel
      const builder = createMockFixtureBuilder(kernel);
      builder.withSession({ sessionId: 'sess_kernel_01', lifecycle: 'awaiting_start', isActive: true });

      const simulator = createKernelSessionSimulator({ kernel });
      const result = await simulator.attemptRestore();

      expect(result.restored).toBe(true);
      expect(result.session).not.toBeNull();
      expect(result.session!.sessionId).toBe('sess_kernel_01');
      expect(result.session!.lifecycle).toBe('awaiting_start');
    });

    it('attemptRestore returns null when no sessions in kernel', async () => {
      const simulator = createKernelSessionSimulator({ kernel });
      const result = await simulator.attemptRestore();

      expect(result.restored).toBe(false);
      expect(result.session).toBeNull();
      expect(result.activeCheckpoint).toBeNull();
    });

    it('reset creates new session in kernel state', async () => {
      // Setup initial session
      const builder = createMockFixtureBuilder(kernel);
      builder
        .withSession({ sessionId: 'sess_old', lifecycle: 'in_progress', isActive: true })
        .withCheckpoint({ sessionId: 'sess_old', checkpointId: 'ckpt_01', acceptedBeatOrdinal: 1 });

      const simulator = createKernelSessionSimulator({ kernel });
      const result = await simulator.reset();

      expect(result.oldSessionId).toBe('sess_old');
      expect(result.newSessionId).toBeDefined();
      expect(result.newSessionId).not.toBe('sess_old');
      expect(result.newSession.lifecycle).toBe('awaiting_start');

      // Verify kernel state
      const state = kernel.getState();
      expect(state.runtimeSessions.activeSessionId).toBe(result.newSessionId);
      expect(state.runtimeSessions.sessionsById['sess_old']).toBeDefined(); // Old session preserved
    });

    it('verifyStaleRefreshProtection works with kernel state', async () => {
      const builder = createMockFixtureBuilder(kernel);
      builder.withSession({ sessionId: 'sess_new', lifecycle: 'awaiting_start', isActive: true });

      const simulator = createKernelSessionSimulator({ kernel });

      const result = await simulator.verifyStaleRefreshProtection({
        targetSessionId: 'sess_old',
        newSessionId: 'sess_new',
      });

      expect(result.isProtected).toBe(true);
      expect(result.newSessionUnaffected).toBe(true);
      expect(result.activeSessionId).toBe('sess_new');
    });
  });
});