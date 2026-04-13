import { describe, expect, it, beforeEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';

import { observe, getTrace, clearTrace } from '@simulation/edit-continuity-observer';
import { createTempStoryPackage } from '@simulation/temp-package';
import { stripStorylineSubstrate } from '@simulation/gossipelog-v2-helpers';

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

describe('edit continuity observer', () => {
  describe('observe', () => {
    it('returns active view for package with session and relationship content', async () => {
      const fixture = await createTempStoryPackage('sample-scene');
      await stripStorylineSubstrate(fixture.packagePath);

      // Create a runtime-sessions.json with an active session that has relationship content
      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_active_01',
        sessionsById: {
          sess_active_01: {
            sessionId: 'sess_active_01',
            lifecycle: 'in_progress',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T01:00:00.000Z',
            headCheckpointId: 'ckpt_active_01',
            activeCheckpointId: 'ckpt_active_01',
            orderedCheckpointIds: ['ckpt_active_01'],
            checkpointsById: {
              ckpt_active_01: {
                checkpointId: 'ckpt_active_01',
                acceptedBeatOrdinal: 1,
                sceneId: 'scene-001',
                phaseIndex: 1,
                beatIndex: 1,
                roundId: 'round-001',
                acceptedTranscript: {
                  playerInput: 'test input',
                  beatText: 'test beat text',
                },
                stateSnapshot: createMinimalStateSnapshot(),
                lastStableRelationshipLayer: {
                  highlightedDeltasText: 'checkpoint delta',
                  stableBackgroundText: 'checkpoint background',
                },
                createdAt: '2026-04-04T01:00:00.000Z',
              },
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'session highlighted',
              stableBackgroundText: 'session stable',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const result = await observe(fixture.packageName);

      expect(result).not.toBeNull();
      expect(result!.kind).toBe('active');
      expect(result!.hasActiveSession).toBe(true);
      expect(result!.relationshipSummary).toBe('session highlighted / session stable');
      // Key assertion: raw checkpoints are NOT exposed
      expect(result!.exposesRawCheckpoints).toBe(false);

      await fixture.cleanup();
    });

    it('returns active view with checkpoint relationship when session layer is empty', async () => {
      const fixture = await createTempStoryPackage('sample-scene');
      await stripStorylineSubstrate(fixture.packagePath);

      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_cp_rel_01',
        sessionsById: {
          sess_cp_rel_01: {
            sessionId: 'sess_cp_rel_01',
            lifecycle: 'in_progress',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T01:00:00.000Z',
            headCheckpointId: 'ckpt_cp_01',
            activeCheckpointId: 'ckpt_cp_01',
            orderedCheckpointIds: ['ckpt_cp_01'],
            checkpointsById: {
              ckpt_cp_01: {
                checkpointId: 'ckpt_cp_01',
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
                  highlightedDeltasText: 'checkpoint highlighted',
                  stableBackgroundText: 'checkpoint stable',
                },
                createdAt: '2026-04-04T01:00:00.000Z',
              },
            },
            // Session-level layer is empty
            lastStableRelationshipLayer: {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const result = await observe(fixture.packageName);

      expect(result).not.toBeNull();
      expect(result!.kind).toBe('active');
      expect(result!.hasActiveSession).toBe(true);
      expect(result!.relationshipSummary).toBe('checkpoint highlighted / checkpoint stable');
      expect(result!.exposesRawCheckpoints).toBe(false);

      await fixture.cleanup();
    });

    it('verifies raw checkpointsById is not exposed in the view', async () => {
      const fixture = await createTempStoryPackage('sample-scene');
      await stripStorylineSubstrate(fixture.packagePath);

      // Create a session with multiple checkpoints to ensure there's data that could be exposed
      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_multi_ckpt',
        sessionsById: {
          sess_multi_ckpt: {
            sessionId: 'sess_multi_ckpt',
            lifecycle: 'in_progress',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T02:00:00.000Z',
            headCheckpointId: 'ckpt_02',
            activeCheckpointId: 'ckpt_02',
            orderedCheckpointIds: ['ckpt_01', 'ckpt_02'],
            checkpointsById: {
              ckpt_01: {
                checkpointId: 'ckpt_01',
                acceptedBeatOrdinal: 1,
                sceneId: 'scene-001',
                phaseIndex: 1,
                beatIndex: 1,
                roundId: 'round-001',
                acceptedTranscript: {
                  playerInput: 'first input',
                  beatText: 'first beat text',
                },
                stateSnapshot: createMinimalStateSnapshot(),
                lastStableRelationshipLayer: {
                  highlightedDeltasText: '',
                  stableBackgroundText: '',
                },
                createdAt: '2026-04-04T01:00:00.000Z',
              },
              ckpt_02: {
                checkpointId: 'ckpt_02',
                acceptedBeatOrdinal: 2,
                sceneId: 'scene-001',
                phaseIndex: 1,
                beatIndex: 2,
                roundId: 'round-002',
                acceptedTranscript: {
                  playerInput: 'second input',
                  beatText: 'second beat text',
                },
                stateSnapshot: createMinimalStateSnapshot(),
                lastStableRelationshipLayer: {
                  highlightedDeltasText: 'second highlighted',
                  stableBackgroundText: 'second stable',
                },
                createdAt: '2026-04-04T02:00:00.000Z',
              },
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'session highlighted',
              stableBackgroundText: 'session stable',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const result = await observe(fixture.packageName);

      // The trace explicitly confirms that raw checkpoints are not exposed
      expect(result).not.toBeNull();
      expect(result!.exposesRawCheckpoints).toBe(false);
      // The view should have active session data but NOT raw checkpoint map
      expect(result!.kind).toBe('active');
      expect(result!.hasActiveSession).toBe(true);

      await fixture.cleanup();
    });
  });

  describe('getTrace', () => {
    beforeEach(() => {
      clearTrace();
    });

    it('accumulates edit continuity observations', async () => {
      const fixture = await createTempStoryPackage('sample-scene');
      await stripStorylineSubstrate(fixture.packagePath);

      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_trace_01',
        sessionsById: {
          sess_trace_01: {
            sessionId: 'sess_trace_01',
            lifecycle: 'in_progress',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T01:00:00.000Z',
            headCheckpointId: 'ckpt_trace_01',
            activeCheckpointId: 'ckpt_trace_01',
            orderedCheckpointIds: ['ckpt_trace_01'],
            checkpointsById: {
              ckpt_trace_01: {
                checkpointId: 'ckpt_trace_01',
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
                  highlightedDeltasText: 'highlighted',
                  stableBackgroundText: 'stable',
                },
                createdAt: '2026-04-04T01:00:00.000Z',
              },
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'highlighted',
              stableBackgroundText: 'stable',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      // First observation
      await observe(fixture.packageName);

      const trace = getTrace();

      expect(trace.editContinuity.length).toBe(1);
      expect(trace.editContinuity[0]!.kind).toBe('active');
      expect(trace.editContinuity[0]!.exposesRawCheckpoints).toBe(false);

      await fixture.cleanup();
    });

    it('returns empty arrays before any observations', () => {
      const trace = getTrace();

      expect(trace.editContinuity).toEqual([]);
    });
  });
});