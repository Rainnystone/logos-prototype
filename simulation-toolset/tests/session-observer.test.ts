import { describe, expect, it, beforeEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';

import { readSession, readCheckpoint, getTrace, clearTrace } from '@simulation/session-observer';
import { createTempStoryPackage } from '@simulation/temp-package';

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

describe('session observer', () => {
  describe('readSession', () => {
    it('returns null when no runtime-sessions.json exists', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      // Ensure no runtime-sessions.json exists
      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      await fs.unlink(sessionsPath).catch(() => undefined);

      const result = await readSession(fixture.packageName);

      expect(result).toBeNull();

      await fixture.cleanup();
    });

    it('returns session observation when file exists with active session', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      // Create a runtime-sessions.json with an active session that has relationship content
      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_test_01',
        sessionsById: {
          sess_test_01: {
            sessionId: 'sess_test_01',
            lifecycle: 'awaiting_start',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T00:00:00.000Z',
            headCheckpointId: null,
            activeCheckpointId: null,
            orderedCheckpointIds: [],
            checkpointsById: {},
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'some deltas',
              stableBackgroundText: 'some background',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const result = await readSession(fixture.packageName);

      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe('sess_test_01');
      expect(result!.lifecycle).toBe('awaiting_start');
      expect(result!.checkpointCount).toBe(0);
      expect(result!.activeCheckpointId).toBeNull();
      expect(result!.relationshipSource).toBe('session');

      await fixture.cleanup();
    });

    it('returns session observation with checkpoints', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      // Create a runtime-sessions.json with checkpoints
      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_test_02',
        sessionsById: {
          sess_test_02: {
            sessionId: 'sess_test_02',
            lifecycle: 'in_progress',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T01:00:00.000Z',
            headCheckpointId: 'ckpt_01',
            activeCheckpointId: 'ckpt_01',
            orderedCheckpointIds: ['ckpt_01'],
            checkpointsById: {
              ckpt_01: {
                checkpointId: 'ckpt_01',
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

      const result = await readSession(fixture.packageName);

      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe('sess_test_02');
      expect(result!.lifecycle).toBe('in_progress');
      expect(result!.checkpointCount).toBe(1);
      expect(result!.activeCheckpointId).toBe('ckpt_01');

      await fixture.cleanup();
    });

    it('returns empty relationship source when session has empty layer', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_test_03',
        sessionsById: {
          sess_test_03: {
            sessionId: 'sess_test_03',
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

      const result = await readSession(fixture.packageName);

      expect(result).not.toBeNull();
      expect(result!.relationshipSource).toBe('empty');

      await fixture.cleanup();
    });

    it('returns checkpoint relationship source when checkpoint has content but session is empty', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_test_04',
        sessionsById: {
          sess_test_04: {
            sessionId: 'sess_test_04',
            lifecycle: 'in_progress',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T01:00:00.000Z',
            headCheckpointId: 'ckpt_rel_01',
            activeCheckpointId: 'ckpt_rel_01',
            orderedCheckpointIds: ['ckpt_rel_01'],
            checkpointsById: {
              ckpt_rel_01: {
                checkpointId: 'ckpt_rel_01',
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
                  highlightedDeltasText: 'checkpoint delta',
                  stableBackgroundText: 'checkpoint background',
                },
                createdAt: '2026-04-04T01:00:00.000Z',
              },
            },
            // Session-level layer is empty, but checkpoint has content
            lastStableRelationshipLayer: {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const result = await readSession(fixture.packageName);

      expect(result).not.toBeNull();
      expect(result!.relationshipSource).toBe('checkpoint');

      await fixture.cleanup();
    });
  });

  describe('readCheckpoint', () => {
    it('returns null when checkpoint does not exist', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_test_05',
        sessionsById: {
          sess_test_05: {
            sessionId: 'sess_test_05',
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

      const result = await readCheckpoint(fixture.packageName, 'nonexistent_checkpoint');

      expect(result).toBeNull();

      await fixture.cleanup();
    });

    it('returns checkpoint observation when checkpoint exists', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

      const sessionsPath = path.join(fixture.packagePath, 'runtime-sessions.json');
      const sessionData = {
        version: 1,
        activeSessionId: 'sess_test_06',
        sessionsById: {
          sess_test_06: {
            sessionId: 'sess_test_06',
            lifecycle: 'in_progress',
            createdAt: '2026-04-04T00:00:00.000Z',
            updatedAt: '2026-04-04T01:00:00.000Z',
            headCheckpointId: 'ckpt_02',
            activeCheckpointId: 'ckpt_02',
            orderedCheckpointIds: ['ckpt_02'],
            checkpointsById: {
              ckpt_02: {
                checkpointId: 'ckpt_02',
                acceptedBeatOrdinal: 2,
                sceneId: 'scene-001',
                phaseIndex: 1,
                beatIndex: 2,
                roundId: 'round-002',
                acceptedTranscript: {
                  playerInput: 'player action',
                  beatText: 'narrative response',
                },
                stateSnapshot: createMinimalStateSnapshot(),
                lastStableRelationshipLayer: {
                  highlightedDeltasText: 'delta text',
                  stableBackgroundText: 'background text',
                },
                createdAt: '2026-04-04T01:00:00.000Z',
              },
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'delta text',
              stableBackgroundText: 'background text',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      const result = await readCheckpoint(fixture.packageName, 'ckpt_02');

      expect(result).not.toBeNull();
      expect(result!.checkpointId).toBe('ckpt_02');
      expect(result!.acceptedBeatOrdinal).toBe(2);
      expect(result!.phaseIndex).toBe(1);
      expect(result!.beatIndex).toBe(2);
      expect(result!.hasTranscript).toBe(true);
      expect(result!.hasStateSnapshot).toBe(true);

      await fixture.cleanup();
    });
  });

  describe('getTrace', () => {
    beforeEach(() => {
      clearTrace();
    });

    it('accumulates session observations', async () => {
      const fixture = await createTempStoryPackage('sample-scene');

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
                  highlightedDeltasText: '',
                  stableBackgroundText: '',
                },
                createdAt: '2026-04-04T01:00:00.000Z',
              },
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
          },
        },
      };
      await fs.writeFile(sessionsPath, JSON.stringify(sessionData, null, 2), 'utf8');

      // First read
      await readSession(fixture.packageName);

      // Second read (checkpoint)
      await readCheckpoint(fixture.packageName, 'ckpt_trace_01');

      const trace = getTrace();

      expect(trace.sessions.length).toBe(1);
      expect(trace.checkpoints.length).toBe(1);
      expect(trace.sessions[0]!.sessionId).toBe('sess_trace_01');
      expect(trace.checkpoints[0]!.checkpointId).toBe('ckpt_trace_01');

      await fixture.cleanup();
    });

    it('returns empty arrays before any observations', () => {
      const trace = getTrace();

      expect(trace.sessions).toEqual([]);
      expect(trace.checkpoints).toEqual([]);
    });
  });
});