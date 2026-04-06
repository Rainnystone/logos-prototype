import { describe, expect, it } from 'vitest';

import {
  SerializedStateSnapshotSchema,
  SerializedOperationTraceSchema,
  SerializedFlowTraceSchema,
  SerializedScriptedModeSchema,
  SerializedMockKernelStateSchema,
} from '@simulation/serialized-trace';

/**
 * Tests for frozen storyline trace contracts (Phase 6 MockKernel stack).
 *
 * These schemas define the serialization format for:
 * - MockKernel state snapshots
 * - Operation trace entries (for record/replay)
 * - E2E flow traces
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 3.2
 */

describe('SerializedScriptedModeSchema', () => {
  it('validates success mode', () => {
    const mode = { kind: 'success' };
    const result = SerializedScriptedModeSchema.safeParse(mode);
    expect(result.success).toBe(true);
  });

  it('validates failure mode', () => {
    const mode = { kind: 'failure', reason: 'some reason' };
    const result = SerializedScriptedModeSchema.safeParse(mode);
    expect(result.success).toBe(true);
  });

  it('validates error mode', () => {
    const mode = { kind: 'error', message: 'error message' };
    const result = SerializedScriptedModeSchema.safeParse(mode);
    expect(result.success).toBe(true);
  });

  it('validates validation_error mode', () => {
    const mode = { kind: 'validation_error', fields: ['field1', 'field2'] };
    const result = SerializedScriptedModeSchema.safeParse(mode);
    expect(result.success).toBe(true);
  });

  it('validates conflict mode', () => {
    const mode = { kind: 'conflict', details: 'conflict details' };
    const result = SerializedScriptedModeSchema.safeParse(mode);
    expect(result.success).toBe(true);
  });

  it('validates stale_state mode', () => {
    const mode = { kind: 'stale_state', expectedVersion: 5 };
    const result = SerializedScriptedModeSchema.safeParse(mode);
    expect(result.success).toBe(true);
  });

  it('validates timeout mode', () => {
    const mode = { kind: 'timeout', delayMs: 1000 };
    const result = SerializedScriptedModeSchema.safeParse(mode);
    expect(result.success).toBe(true);
  });

  it('validates delayed mode', () => {
    const mode = { kind: 'delayed', delayMs: 500 };
    const result = SerializedScriptedModeSchema.safeParse(mode);
    expect(result.success).toBe(true);
  });

  it('rejects unknown mode kind', () => {
    const mode = { kind: 'unknown' };
    const result = SerializedScriptedModeSchema.safeParse(mode);
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const mode = { kind: 'failure' }; // missing reason
    const result = SerializedScriptedModeSchema.safeParse(mode);
    expect(result.success).toBe(false);
  });
});

describe('SerializedOperationTraceSchema', () => {
  it('validates complete operation trace entry', () => {
    const entry = {
      sequenceId: 1,
      timestamp: '2026-04-06T10:00:00.000Z',
      layer: 'substrate',
      operation: 'switch_active_storyline',
      input: { packageName: 'test-package', storylineId: 'storyline-001' },
      output: { success: true },
      stateBefore: 'snap-001',
      stateAfter: 'snap-002',
    };
    const result = SerializedOperationTraceSchema.safeParse(entry);
    expect(result.success).toBe(true);
  });

  it('validates operation trace with scripted mode', () => {
    const entry = {
      sequenceId: 2,
      timestamp: '2026-04-06T10:01:00.000Z',
      layer: 'route',
      operation: 'create_from_source',
      input: { sourceStorylineId: 'storyline-001' },
      output: null,
      stateBefore: 'snap-002',
      stateAfter: 'snap-003',
      mode: { kind: 'error', message: 'simulated error' },
    };
    const result = SerializedOperationTraceSchema.safeParse(entry);
    expect(result.success).toBe(true);
  });

  it('validates operation trace with error', () => {
    const entry = {
      sequenceId: 3,
      timestamp: '2026-04-06T10:02:00.000Z',
      layer: 'runtime',
      operation: 'record_accepted_beat',
      input: { beatOrdinal: 5 },
      output: null,
      stateBefore: 'snap-003',
      stateAfter: 'snap-003',
      error: 'Checkpoint creation failed',
    };
    const result = SerializedOperationTraceSchema.safeParse(entry);
    expect(result.success).toBe(true);
  });

  it('rejects invalid layer value', () => {
    const entry = {
      sequenceId: 1,
      timestamp: '2026-04-06T10:00:00.000Z',
      layer: 'invalid_layer',
      operation: 'test',
      input: {},
      output: {},
      stateBefore: 'snap-001',
      stateAfter: 'snap-002',
    };
    const result = SerializedOperationTraceSchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const entry = {
      sequenceId: 1,
      // missing timestamp
      layer: 'substrate',
      operation: 'test',
      input: {},
      output: {},
      stateBefore: 'snap-001',
      stateAfter: 'snap-002',
    };
    const result = SerializedOperationTraceSchema.safeParse(entry);
    expect(result.success).toBe(false);
  });
});

describe('SerializedMockKernelStateSchema', () => {
  it('validates complete state snapshot', () => {
    const state = {
      packageName: 'test-package',
      storylineRepository: {
        version: 1,
        activeStorylineId: 'storyline-main',
        storylinesById: {
          'storyline-main': {
            storylineId: 'storyline-main',
            name: 'Main Storyline',
            status: 'active',
            sourceCheckpointId: null,
            headCheckpointId: 'ckpt-001',
            variantId: 'variant-main',
            activeSessionId: 'sess-001',
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T01:00:00.000Z',
          },
        },
        variantsById: {
          'variant-main': {
            variantId: 'variant-main',
            workspaceRoot: 'variants/variant-main',
            createdFromStorylineId: null,
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
          },
        },
      },
      runtimeSessions: {
        version: 1,
        activeSessionId: 'sess-001',
        sessionsById: {
          'sess-001': {
            sessionId: 'sess-001',
            lifecycle: 'in_progress',
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T01:00:00.000Z',
            headCheckpointId: 'ckpt-001',
            activeCheckpointId: 'ckpt-001',
            orderedCheckpointIds: ['ckpt-001'],
            checkpointsById: {
              'ckpt-001': {
                checkpointId: 'ckpt-001',
                acceptedBeatOrdinal: 1,
                sceneId: 'scene-001',
                phaseIndex: 1,
                beatIndex: 1,
                roundId: 'round-001',
                acceptedTranscript: {
                  playerInput: 'input',
                  beatText: 'text',
                },
                stateSnapshot: {
                  sceneState: {
                    sceneId: 'scene-001',
                    currentPhaseIndex: 1,
                    currentBeatIndexInPhase: 1,
                    mainAxis: 'axis',
                    endLine: 'end',
                    alpha: 'alpha',
                    beta: 'beta',
                  },
                  roundState: {
                    phaseGoal: 'goal',
                    currentVolume: 'Med',
                    currentRouter: 'router-001',
                    verbLexicon: ['verb'],
                    historyWindow: [],
                  },
                  generationState: {
                    directorNoteSummary: 'summary',
                    promptObject: {},
                    currentBeatText: null,
                    currentOptions: [],
                  },
                  evaluationState: {
                    auditAnswers: [true],
                    blockingFailures: [],
                    retryCount: 0,
                    rewriteFeedback: null,
                  },
                },
                lastStableRelationshipLayer: {
                  highlightedDeltasText: '',
                  stableBackgroundText: '',
                },
                createdAt: '2026-04-06T01:00:00.000Z',
              },
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
          },
        },
      },
    };
    const result = SerializedMockKernelStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it('validates state snapshot with null storylineRepository (legacy mode)', () => {
    const state = {
      packageName: 'test-package',
      storylineRepository: null,
      runtimeSessions: {
        version: 1,
        activeSessionId: null,
        sessionsById: {},
      },
    };
    const result = SerializedMockKernelStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it('rejects missing packageName', () => {
    const state = {
      // missing packageName
      storylineRepository: null,
      runtimeSessions: {
        version: 1,
        activeSessionId: null,
        sessionsById: {},
      },
    };
    const result = SerializedMockKernelStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });
});

describe('SerializedFlowTraceSchema', () => {
  it('validates complete flow trace', () => {
    const trace = {
      schemaVersion: 1,
      flowId: 'create_from_source_and_continue',
      packageName: 'test-package',
      operations: [
        {
          sequenceId: 1,
          timestamp: '2026-04-06T10:00:00.000Z',
          layer: 'substrate',
          operation: 'load_workspace_view',
          input: {},
          output: {},
          stateBefore: 'snap-001',
          stateAfter: 'snap-002',
        },
        {
          sequenceId: 2,
          timestamp: '2026-04-06T10:01:00.000Z',
          layer: 'route',
          operation: 'create_from_source',
          input: { sourceStorylineId: 'storyline-001' },
          output: { storylineId: 'storyline-002' },
          stateBefore: 'snap-002',
          stateAfter: 'snap-003',
        },
      ],
      snapshots: [
        {
          snapshotId: 'snap-001',
          state: {
            packageName: 'test-package',
            storylineRepository: null,
            runtimeSessions: {
              version: 1,
              activeSessionId: null,
              sessionsById: {},
            },
          },
        },
        {
          snapshotId: 'snap-002',
          state: {
            packageName: 'test-package',
            storylineRepository: null,
            runtimeSessions: {
              version: 1,
              activeSessionId: null,
              sessionsById: {},
            },
          },
        },
      ],
    };
    const result = SerializedFlowTraceSchema.safeParse(trace);
    expect(result.success).toBe(true);
  });

  it('validates flow trace with empty operations', () => {
    const trace = {
      schemaVersion: 1,
      flowId: 'legacy_bootstrap_flow',
      packageName: 'test-package',
      operations: [],
      snapshots: [],
    };
    const result = SerializedFlowTraceSchema.safeParse(trace);
    expect(result.success).toBe(true);
  });

  it('rejects invalid flowId', () => {
    const trace = {
      schemaVersion: 1,
      flowId: 'invalid_flow',
      packageName: 'test-package',
      operations: [],
      snapshots: [],
    };
    const result = SerializedFlowTraceSchema.safeParse(trace);
    expect(result.success).toBe(false);
  });

  it('rejects invalid schemaVersion', () => {
    const trace = {
      schemaVersion: 0, // must be positive
      flowId: 'create_from_source_and_continue',
      packageName: 'test-package',
      operations: [],
      snapshots: [],
    };
    const result = SerializedFlowTraceSchema.safeParse(trace);
    expect(result.success).toBe(false);
  });
});

describe('SerializedStateSnapshotSchema', () => {
  it('validates state snapshot with snapshotId', () => {
    const snapshot = {
      snapshotId: 'snap-001',
      state: {
        packageName: 'test-package',
        storylineRepository: null,
        runtimeSessions: {
          version: 1,
          activeSessionId: null,
          sessionsById: {},
        },
      },
    };
    const result = SerializedStateSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(true);
  });

  it('rejects snapshot without snapshotId', () => {
    const snapshot = {
      // missing snapshotId
      state: {
        packageName: 'test-package',
        storylineRepository: null,
        runtimeSessions: {
          version: 1,
          activeSessionId: null,
          sessionsById: {},
        },
      },
    };
    const result = SerializedStateSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });
});