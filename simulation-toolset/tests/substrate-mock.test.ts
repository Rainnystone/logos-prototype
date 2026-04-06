import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import type {
  StorylineRepositoryFile,
  StorylineRecord,
  StorylineVariant,
} from '@/types/storyline-repository';
import type {
  RuntimeSessionsFile,
  RuntimeSession,
  RuntimeCheckpoint,
} from '@/types/runtime-sessions';
import type {
  StateSnapshot,
  RelationshipLayer,
} from '@/types';
import type {
  MockKernel,
  ScriptedMode,
} from '@simulation/mock-kernel';
import {
  createMockKernel,
} from '@simulation/mock-kernel';
import {
  SubstrateMock,
  ActiveStorylineContext,
  StorylineMutationResult,
  createSubstrateMock,
} from '@simulation/substrate-mock';
import {
  MockFixtureBuilder,
  createMockFixtureBuilder,
} from '@simulation/mock-fixture-builder';

/**
 * Tests for SubstrateMock - storyline substrate layer operations.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 4.1-4.4
 */

// Helper to create minimal runtime sessions
function createEmptyRuntimeSessions(): RuntimeSessionsFile {
  return {
    version: 1,
    activeSessionId: null,
    sessionsById: {},
  };
}

// Helper to create a minimal session
function createMinimalSession(sessionId: string): RuntimeSession {
  return {
    sessionId,
    lifecycle: 'awaiting_start',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    headCheckpointId: null,
    activeCheckpointId: null,
    orderedCheckpointIds: [],
    checkpointsById: {},
    lastStableRelationshipLayer: {
      highlightedDeltasText: '',
      stableBackgroundText: '',
    },
  };
}

// Helper to create a minimal checkpoint
function createMinimalCheckpoint(checkpointId: string, ordinal: number): RuntimeCheckpoint {
  return {
    checkpointId,
    acceptedBeatOrdinal: ordinal,
    sceneId: 'scene_test',
    phaseIndex: 1,
    beatIndex: 1,
    roundId: 'round_test',
    acceptedTranscript: {
      playerInput: 'test input',
      beatText: 'test beat',
    },
    stateSnapshot: {
      sceneState: {
        sceneId: 'scene_test',
        currentPhaseIndex: 1,
        currentBeatIndexInPhase: 1,
        mainAxis: 'test-axis',
        endLine: 'test-end',
        alpha: 'test-alpha',
        beta: 'test-beta',
      },
      roundState: {
        phaseGoal: 'test-goal',
        currentVolume: 'Med',
        currentRouter: 'test-router',
        verbLexicon: ['observe'],
        historyWindow: [],
      },
      generationState: {
        directorNoteSummary: 'test summary',
        promptObject: {},
        currentBeatText: 'test beat',
        currentOptions: [],
      },
      evaluationState: {
        auditAnswers: [],
        blockingFailures: [],
        retryCount: 0,
        rewriteFeedback: null,
      },
    },
    lastStableRelationshipLayer: {
      highlightedDeltasText: '',
      stableBackgroundText: '',
    },
    createdAt: new Date().toISOString(),
  };
}

// Helper to create a default state snapshot
function createDefaultStateSnapshot(): StateSnapshot {
  return {
    sceneState: {
      sceneId: 'scene_001',
      currentPhaseIndex: 1,
      currentBeatIndexInPhase: 1,
      mainAxis: 'test-axis',
      endLine: 'test-end',
      alpha: 'test-alpha',
      beta: 'test-beta',
    },
    roundState: {
      phaseGoal: 'test-goal',
      currentVolume: 'Med',
      currentRouter: 'test-router',
      verbLexicon: ['observe'],
      historyWindow: [],
    },
    generationState: {
      directorNoteSummary: 'test summary',
      promptObject: {},
      currentBeatText: 'test beat',
      currentOptions: [],
    },
    evaluationState: {
      auditAnswers: [],
      blockingFailures: [],
      retryCount: 0,
      rewriteFeedback: null,
    },
  };
}

// Helper to create a default relationship layer
function createDefaultRelationshipLayer(): RelationshipLayer {
  return {
    highlightedDeltasText: '',
    stableBackgroundText: '',
  };
}

describe('SubstrateMock', () => {
  let kernel: MockKernel;
  let substrate: SubstrateMock;

  beforeEach(() => {
    kernel = createMockKernel('test-package');
    substrate = createSubstrateMock(kernel);
  });

  afterEach(async () => {
    await kernel.cleanup();
  });

  // ============================================================================
  // resolveActiveStorylineContext
  // ============================================================================

  describe('resolveActiveStorylineContext', () => {
    it('returns legacy context when repository is null and forWrite=false', async () => {
      const context = await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: false,
      });

      expect(context.isLegacyImplicit).toBe(true);
      expect(context.repository).toBeNull();
      expect(context.storyline.storylineId).toBe('storyline_main');
      expect(context.storyline.variantId).toBe('variant_main');
      expect(context.variant.workspaceRoot).toBe('.');
    });

    it('bootstraps repository when forWrite=true and repository is null', async () => {
      const context = await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      expect(context.isLegacyImplicit).toBe(false);
      expect(context.repository).not.toBeNull();
      expect(context.repository!.activeStorylineId).toBe('storyline_main');
      expect(context.storyline.storylineId).toBe('storyline_main');
      expect(context.storyline.variantId).toBe('variant_main');
      expect(context.variant.workspaceRoot).toBe('variants/variant_main');
      expect(context.session).not.toBeNull();
    });

    it('returns explicit context when repository exists', async () => {
      // Bootstrap first
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      // Now resolve for read
      const context = await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: false,
      });

      expect(context.isLegacyImplicit).toBe(false);
      expect(context.repository).not.toBeNull();
    });

    it('records operation in trace with layer=substrate', async () => {
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: false,
      });

      const trace = kernel.getTrace();
      expect(trace.length).toBe(1);
      expect(trace[0]!.layer).toBe('substrate');
      expect(trace[0]!.operation).toBe('resolve_active_storyline_context');
    });
  });

  // ============================================================================
  // switchActiveStoryline
  // ============================================================================

  describe('switchActiveStoryline', () => {
    beforeEach(async () => {
      // Bootstrap with a second storyline
      const builder = createMockFixtureBuilder(kernel);
      await builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);
    });

    it('switches to target storyline', async () => {
      const result = await substrate.switchActiveStoryline({
        packageName: 'test-package',
        storylineId: 'storyline_alt',
      });

      expect(result.storyline.storylineId).toBe('storyline_alt');
      expect(result.repository.activeStorylineId).toBe('storyline_alt');
    });

    it('throws if storylineId does not exist', async () => {
      await expect(
        substrate.switchActiveStoryline({
          packageName: 'test-package',
          storylineId: 'nonexistent',
        }),
      ).rejects.toThrow();
    });

    it('updates runtimeSessions.activeSessionId to match storyline', async () => {
      const result = await substrate.switchActiveStoryline({
        packageName: 'test-package',
        storylineId: 'storyline_alt',
      });

      const state = kernel.getState();
      expect(state.runtimeSessions.activeSessionId).toBe(result.storyline.activeSessionId);
    });

    it('records operation in trace', async () => {
      await substrate.switchActiveStoryline({
        packageName: 'test-package',
        storylineId: 'storyline_alt',
      });

      const trace = kernel.getTrace();
      const op = trace.find((e) => e.operation === 'switch_active_storyline');
      expect(op).toBeDefined();
      expect(op!.layer).toBe('substrate');
    });
  });

  // ============================================================================
  // createStorylineFromSource
  // ============================================================================

  describe('createStorylineFromSource', () => {
    beforeEach(async () => {
      // Bootstrap with initial storyline
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      // Add a checkpoint so we can create from source
      await substrate.executeStorylineRuntimeSessionCommand({
        packageName: 'test-package',
        command: {
          kind: 'record_accepted_beat',
          payload: {
            acceptedBeatOrdinal: 1,
            sceneId: 'scene_001',
            phaseIndex: 1,
            beatIndex: 1,
            roundId: 'round_001',
            acceptedTranscript: {
              playerInput: 'test',
              beatText: 'test beat',
            },
            stateSnapshot: {
              sceneState: {
                sceneId: 'scene_001',
                currentPhaseIndex: 1,
                currentBeatIndexInPhase: 1,
                mainAxis: 'test-axis',
                endLine: 'test-end',
                alpha: 'test-alpha',
                beta: 'test-beta',
              },
              roundState: {
                phaseGoal: 'test-goal',
                currentVolume: 'Med',
                currentRouter: 'test-router',
                verbLexicon: ['observe'],
                historyWindow: [],
              },
              generationState: {
                directorNoteSummary: 'test summary',
                promptObject: {},
                currentBeatText: 'test beat',
                currentOptions: [],
              },
              evaluationState: {
                auditAnswers: [],
                blockingFailures: [],
                retryCount: 0,
                rewriteFeedback: null,
              },
            },
          },
        },
      });
    });

    it('creates new storyline from source', async () => {
      const result = await substrate.createStorylineFromSource({
        packageName: 'test-package',
        sourceStorylineId: 'storyline_main',
        name: 'New Branch',
      });

      expect(result.storyline.name).toBe('New Branch');
      expect(result.storyline.storylineId).not.toBe('storyline_main');
      expect(result.storyline.sourceCheckpointId).not.toBeNull();
      expect(result.variant.variantId).not.toBe('variant_main');
      expect(result.session.sessionId).not.toBeNull();
    });

    it('throws if source storyline does not exist', async () => {
      await expect(
        substrate.createStorylineFromSource({
          packageName: 'test-package',
          sourceStorylineId: 'nonexistent',
          name: 'New Branch',
        }),
      ).rejects.toThrow();
    });

    it('throws if source headCheckpointId is null', async () => {
      // Create a storyline with null headCheckpointId
      const state = kernel.getState();
      const timestamp = new Date().toISOString();

      const newStoryline: StorylineRecord = {
        storylineId: 'storyline_null_head',
        name: 'Null Head',
        status: 'active',
        sourceCheckpointId: null,
        headCheckpointId: null,
        variantId: 'variant_main',
        activeSessionId: 'session_test',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      kernel._testSetState({
        ...state,
        storylineRepository: {
          ...state.storylineRepository!,
          storylinesById: {
            ...state.storylineRepository!.storylinesById,
            storyline_null_head: newStoryline,
          },
        },
      });

      await expect(
        substrate.createStorylineFromSource({
          packageName: 'test-package',
          sourceStorylineId: 'storyline_null_head',
          name: 'New Branch',
        }),
      ).rejects.toThrow('headCheckpointId is null');
    });

    it('creates variant workspace copy', async () => {
      const result = await substrate.createStorylineFromSource({
        packageName: 'test-package',
        sourceStorylineId: 'storyline_main',
        name: 'New Branch',
      });

      const state = kernel.getState();
      expect(state.variantsById[result.variant.variantId]).toBeDefined();
    });

    it('creates session starting from source headCheckpoint', async () => {
      const result = await substrate.createStorylineFromSource({
        packageName: 'test-package',
        sourceStorylineId: 'storyline_main',
        name: 'New Branch',
      });

      // Session should have headCheckpointId set
      expect(result.session.headCheckpointId).not.toBeNull();
    });

    it('records operation in trace', async () => {
      await substrate.createStorylineFromSource({
        packageName: 'test-package',
        sourceStorylineId: 'storyline_main',
        name: 'New Branch',
      });

      const trace = kernel.getTrace();
      const op = trace.find((e) => e.operation === 'create_storyline_from_source');
      expect(op).toBeDefined();
    });
  });

  // ============================================================================
  // branchStorylineFromCheckpoint
  // ============================================================================

  describe('branchStorylineFromCheckpoint', () => {
    let checkpointId: string;

    beforeEach(async () => {
      // Bootstrap with initial storyline and a checkpoint
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      // Add a checkpoint to the session
      const state = kernel.getState();
      const sessionId = state.storylineRepository!.storylinesById['storyline_main']!.activeSessionId;
      checkpointId = 'checkpoint_test_001';

      const checkpoint = createMinimalCheckpoint(checkpointId, 1);
      const session = state.runtimeSessions.sessionsById[sessionId]!;

      kernel._testSetState({
        ...state,
        runtimeSessions: {
          ...state.runtimeSessions,
          sessionsById: {
            ...state.runtimeSessions.sessionsById,
            [sessionId]: {
              ...session,
              orderedCheckpointIds: [checkpointId],
              checkpointsById: { [checkpointId]: checkpoint },
              headCheckpointId: checkpointId,
              activeCheckpointId: checkpointId,
            },
          },
        },
        storylineRepository: {
          ...state.storylineRepository!,
          storylinesById: {
            ...state.storylineRepository!.storylinesById,
            storyline_main: {
              ...state.storylineRepository!.storylinesById['storyline_main']!,
              headCheckpointId: checkpointId,
            },
          },
        },
      });
    });

    it('creates new storyline from checkpoint', async () => {
      const result = await substrate.branchStorylineFromCheckpoint({
        packageName: 'test-package',
        sourceStorylineId: 'storyline_main',
        checkpointId: checkpointId,
        name: 'Branch From Beat',
      });

      expect(result.storyline.name).toBe('Branch From Beat');
      expect(result.storyline.sourceCheckpointId).toBe(checkpointId);
      expect(result.storyline.headCheckpointId).toBe(checkpointId);
    });

    it('throws if checkpoint not in source storyline session', async () => {
      await expect(
        substrate.branchStorylineFromCheckpoint({
          packageName: 'test-package',
          sourceStorylineId: 'storyline_main',
          checkpointId: 'nonexistent_checkpoint',
          name: 'Invalid Branch',
        }),
      ).rejects.toThrow();
    });

    it('throws if source storyline does not exist', async () => {
      await expect(
        substrate.branchStorylineFromCheckpoint({
          packageName: 'test-package',
          sourceStorylineId: 'nonexistent',
          checkpointId: checkpointId,
          name: 'Invalid Branch',
        }),
      ).rejects.toThrow();
    });

    it('creates new variant workspace', async () => {
      const result = await substrate.branchStorylineFromCheckpoint({
        packageName: 'test-package',
        sourceStorylineId: 'storyline_main',
        checkpointId: checkpointId,
        name: 'Branch',
      });

      const state = kernel.getState();
      expect(state.variantsById[result.variant.variantId]).toBeDefined();
      expect(result.variant.variantId).not.toBe('variant_main');
    });

    it('creates new session starting from checkpoint', async () => {
      const result = await substrate.branchStorylineFromCheckpoint({
        packageName: 'test-package',
        sourceStorylineId: 'storyline_main',
        checkpointId: checkpointId,
        name: 'Branch',
      });

      expect(result.session.headCheckpointId).toBe(checkpointId);
    });

    it('records operation in trace', async () => {
      await substrate.branchStorylineFromCheckpoint({
        packageName: 'test-package',
        sourceStorylineId: 'storyline_main',
        checkpointId: checkpointId,
        name: 'Branch',
      });

      const trace = kernel.getTrace();
      const op = trace.find((e) => e.operation === 'branch_storyline_from_checkpoint');
      expect(op).toBeDefined();
    });
  });

  // ============================================================================
  // updateStorylineDisplayName
  // ============================================================================

  describe('updateStorylineDisplayName', () => {
    beforeEach(async () => {
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });
    });

    it('updates storyline display name', async () => {
      const result = await substrate.updateStorylineDisplayName({
        packageName: 'test-package',
        storylineId: 'storyline_main',
        nextDisplayName: 'Renamed Line',
      });

      expect(result.storyline.name).toBe('Renamed Line');
    });

    it('throws for empty display name', async () => {
      await expect(
        substrate.updateStorylineDisplayName({
          packageName: 'test-package',
          storylineId: 'storyline_main',
          nextDisplayName: '',
        }),
      ).rejects.toThrow('empty');
    });

    it('returns unchanged if name is same', async () => {
      const before = kernel.getState().storylineRepository!.storylinesById['storyline_main']!;

      const result = await substrate.updateStorylineDisplayName({
        packageName: 'test-package',
        storylineId: 'storyline_main',
        nextDisplayName: before.name,
      });

      // updatedAt should remain unchanged (same name, no mutation)
      expect(result.storyline.name).toBe(before.name);
    });

    it('throws if storyline does not exist', async () => {
      await expect(
        substrate.updateStorylineDisplayName({
          packageName: 'test-package',
          storylineId: 'nonexistent',
          nextDisplayName: 'New Name',
        }),
      ).rejects.toThrow();
    });

    it('does not affect runtimeSessions', async () => {
      const before = kernel.getState().runtimeSessions;

      await substrate.updateStorylineDisplayName({
        packageName: 'test-package',
        storylineId: 'storyline_main',
        nextDisplayName: 'New Name',
      });

      const after = kernel.getState().runtimeSessions;
      // activeSessionId should be unchanged
      expect(after.activeSessionId).toBe(before.activeSessionId);
    });

    it('records operation in trace', async () => {
      await substrate.updateStorylineDisplayName({
        packageName: 'test-package',
        storylineId: 'storyline_main',
        nextDisplayName: 'New Name',
      });

      const trace = kernel.getTrace();
      const op = trace.find((e) => e.operation === 'update_storyline_display_name');
      expect(op).toBeDefined();
    });
  });

  // ============================================================================
  // ensureStorylineAwareActiveSession
  // ============================================================================

  describe('ensureStorylineAwareActiveSession', () => {
    beforeEach(async () => {
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });
    });

    it('returns session bound to active storyline', async () => {
      const result = await substrate.ensureStorylineAwareActiveSession({
        packageName: 'test-package',
      });

      expect(result.session).not.toBeNull();
      expect(result.storyline.activeSessionId).toBe(result.session.sessionId);
    });

    it('throws if repository is null', async () => {
      // Reset to null repository
      kernel.reset();

      // This should throw because we can't ensure session for legacy implicit context
      await expect(
        substrate.ensureStorylineAwareActiveSession({
          packageName: 'test-package',
        }),
      ).rejects.toThrow();
    });

    it('records operation in trace', async () => {
      await substrate.ensureStorylineAwareActiveSession({
        packageName: 'test-package',
      });

      const trace = kernel.getTrace();
      const op = trace.find((e) => e.operation === 'ensure_storyline_aware_active_session');
      expect(op).toBeDefined();
    });
  });

  // ============================================================================
  // executeStorylineRuntimeSessionCommand
  // ============================================================================

  describe('executeStorylineRuntimeSessionCommand', () => {
    beforeEach(async () => {
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });
    });

    describe('ensure_active_session', () => {
      it('returns active session id', async () => {
        const result = await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: { kind: 'ensure_active_session' },
        });

        expect(result.activeSessionId).not.toBeNull();
      });

      it('records operation in trace', async () => {
        await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: { kind: 'ensure_active_session' },
        });

        const trace = kernel.getTrace();
        const op = trace.find((e) => e.operation === 'execute_storyline_runtime_session_command');
        expect(op).toBeDefined();
        expect((op!.input as { command: { kind: string } }).command.kind).toBe('ensure_active_session');
      });
    });

    describe('record_accepted_beat', () => {
      it('creates checkpoint and updates head', async () => {
        const result = await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: {
            kind: 'record_accepted_beat',
            payload: {
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_001',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_001',
              acceptedTranscript: {
                playerInput: 'test',
                beatText: 'test beat',
              },
              stateSnapshot: createDefaultStateSnapshot(),
            },
          },
        });

        expect(result.activeCheckpointId).not.toBeNull();
        expect(result.activeSessionId).not.toBeNull();

        // Verify storyline head updated
        const state = kernel.getState();
        const storyline = state.storylineRepository!.storylinesById[state.storylineRepository!.activeStorylineId]!;
        expect(storyline.headCheckpointId).toBe(result.activeCheckpointId);
      });

      it('appends checkpoint to session orderedCheckpointIds', async () => {
        await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: {
            kind: 'record_accepted_beat',
            payload: {
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_001',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_001',
              acceptedTranscript: {
                playerInput: 'test',
                beatText: 'test beat',
              },
              stateSnapshot: createDefaultStateSnapshot(),
            },
          },
        });

        const state = kernel.getState();
        const sessionId = state.storylineRepository!.storylinesById['storyline_main']!.activeSessionId;
        const session = state.runtimeSessions.sessionsById[sessionId]!;

        expect(session.orderedCheckpointIds.length).toBe(1);
        expect(session.activeCheckpointId).toBe(session.orderedCheckpointIds[0]);
      });

      it('records operation in trace', async () => {
        await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: {
            kind: 'record_accepted_beat',
            payload: {
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_001',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_001',
              acceptedTranscript: {
                playerInput: 'test',
                beatText: 'test beat',
              },
              stateSnapshot: createDefaultStateSnapshot(),
            },
          },
        });

        const trace = kernel.getTrace();
        const op = trace.find((e) => e.operation === 'execute_storyline_runtime_session_command');
        expect(op).toBeDefined();
      });
    });

    describe('finalize_relationship_layer', () => {
      let sessionId: string;
      let checkpointId: string;

      beforeEach(async () => {
        // First record a beat to have a checkpoint
        const result = await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: {
            kind: 'record_accepted_beat',
            payload: {
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_001',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_001',
              acceptedTranscript: {
                playerInput: 'test',
                beatText: 'test beat',
              },
              stateSnapshot: createDefaultStateSnapshot(),
            },
          },
        });

        sessionId = result.activeSessionId;
        checkpointId = result.activeCheckpointId!;
      });

      it('finalizes relationship layer for checkpoint', async () => {
        const result = await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: {
            kind: 'finalize_relationship_layer',
            payload: {
              sessionId: sessionId,
              checkpointId: checkpointId,
              relationshipLayer: createDefaultRelationshipLayer(),
            },
          },
        });

        expect(result.activeSessionId).toBe(sessionId);
        expect(result.activeCheckpointId).toBe(checkpointId);
      });

      it('throws if sessionId mismatches active storyline', async () => {
        await expect(
          substrate.executeStorylineRuntimeSessionCommand({
            packageName: 'test-package',
            command: {
              kind: 'finalize_relationship_layer',
              payload: {
                sessionId: 'wrong_session',
                checkpointId: checkpointId,
                relationshipLayer: createDefaultRelationshipLayer(),
              },
            },
          }),
        ).rejects.toThrow();
      });

      it('throws if checkpointId not in session', async () => {
        await expect(
          substrate.executeStorylineRuntimeSessionCommand({
            packageName: 'test-package',
            command: {
              kind: 'finalize_relationship_layer',
              payload: {
                sessionId: sessionId,
                checkpointId: 'wrong_checkpoint',
                relationshipLayer: createDefaultRelationshipLayer(),
              },
            },
          }),
        ).rejects.toThrow();
      });

      it('records operation in trace', async () => {
        await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: {
            kind: 'finalize_relationship_layer',
            payload: {
              sessionId: sessionId,
              checkpointId: checkpointId,
              relationshipLayer: createDefaultRelationshipLayer(),
            },
          },
        });

        const trace = kernel.getTrace();
        const op = trace.find((e) => e.operation === 'execute_storyline_runtime_session_command');
        expect(op).toBeDefined();
      });
    });

    describe('reset_workbench', () => {
      beforeEach(async () => {
        // Ensure we have an active session
        await substrate.ensureStorylineAwareActiveSession({
          packageName: 'test-package',
        });
      });

      it('creates new session and preserves old', async () => {
        const stateBefore = kernel.getState();
        const oldSessionId = stateBefore.storylineRepository!.storylinesById['storyline_main']!.activeSessionId;

        const result = await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: { kind: 'reset_workbench' },
        });

        expect(result.activeSessionId).not.toBe(oldSessionId);

        // Old session should still exist
        const stateAfter = kernel.getState();
        expect(stateAfter.runtimeSessions.sessionsById[oldSessionId]).toBeDefined();
      });

      it('sets new session lifecycle to awaiting_start', async () => {
        const result = await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: { kind: 'reset_workbench' },
        });

        const state = kernel.getState();
        const newSession = state.runtimeSessions.sessionsById[result.activeSessionId]!;
        expect(newSession.lifecycle).toBe('awaiting_start');
      });

      it('updates storyline headCheckpointId to null', async () => {
        await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: { kind: 'reset_workbench' },
        });

        const state = kernel.getState();
        const storyline = state.storylineRepository!.storylinesById['storyline_main']!;
        expect(storyline.headCheckpointId).toBeNull();
      });

      it('updates storyline activeSessionId to new session', async () => {
        const result = await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: { kind: 'reset_workbench' },
        });

        const state = kernel.getState();
        const storyline = state.storylineRepository!.storylinesById['storyline_main']!;
        expect(storyline.activeSessionId).toBe(result.activeSessionId);
      });

      it('updates runtimeSessions.activeSessionId to new session', async () => {
        const result = await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: { kind: 'reset_workbench' },
        });

        const state = kernel.getState();
        expect(state.runtimeSessions.activeSessionId).toBe(result.activeSessionId);
      });

      it('records operation in trace', async () => {
        await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: { kind: 'reset_workbench' },
        });

        const trace = kernel.getTrace();
        const op = trace.find((e) => e.operation === 'execute_storyline_runtime_session_command');
        expect(op).toBeDefined();
      });
    });
  });

  // ============================================================================
  // Legacy Bootstrap Behavior
  // ============================================================================

  describe('legacy bootstrap behavior', () => {
    it('bootstrap creates storyline_main with variant_main', async () => {
      const context = await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      expect(context.repository!.activeStorylineId).toBe('storyline_main');
      expect(context.storyline.storylineId).toBe('storyline_main');
      expect(context.variant.variantId).toBe('variant_main');
      expect(context.variant.workspaceRoot).toBe('variants/variant_main');
    });

    it('bootstrap creates session with awaiting_start lifecycle', async () => {
      const context = await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      expect(context.session!.lifecycle).toBe('awaiting_start');
    });

    it('bootstrap creates variant workspace in variantsById', async () => {
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      const state = kernel.getState();
      expect(state.variantsById['variant_main']).toBeDefined();
    });
  });

  // ============================================================================
  // Scripted Mode Integration
  // ============================================================================

  describe('scripted mode integration', () => {
    it('scriptNext(success) bypasses operation', async () => {
      kernel.scriptNext({ kind: 'success' });

      const result = await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: false,
      });

      // When scripted success, we get { kind: 'success' } output, not actual context
      const trace = kernel.getTrace();
      expect(trace[0]!.mode).toEqual({ kind: 'success' });
      expect(trace[0]!.output).toEqual({ kind: 'success' });
    });

    it('scriptNext(error) throws and records error', async () => {
      kernel.scriptNext({ kind: 'error', message: 'Test error' });

      await expect(
        substrate.resolveActiveStorylineContext({
          packageName: 'test-package',
          forWrite: false,
        }),
      ).rejects.toThrow('Test error');

      const trace = kernel.getTrace();
      expect(trace[0]!.error).toBe('Test error');
    });
  });
});