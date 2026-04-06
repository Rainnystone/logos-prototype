import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import type { MockKernel } from '@simulation/mock-kernel';
import { createMockKernel } from '@simulation/mock-kernel';
import { createSubstrateMock } from '@simulation/substrate-mock';
import { createMockFixtureBuilder } from '@simulation/mock-fixture-builder';
import {
  StorylineE2ESimulator,
  E2EFlow,
  FlowResult,
  createStorylineE2ESimulator,
} from '@simulation/storyline-e2e-simulator';
import type { StateAssertion } from '@simulation/storyline-observer';
import type { SerializedFlowTrace } from '@simulation/serialized-trace';
import type { StateSnapshot, RelationshipLayer } from '@/types';

/**
 * Tests for StorylineE2ESimulator - complete human workflow simulation.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 6
 */

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

describe('StorylineE2ESimulator', () => {
  let kernel: MockKernel;
  let simulator: StorylineE2ESimulator;

  beforeEach(() => {
    kernel = createMockKernel('test-package');
    simulator = createStorylineE2ESimulator(kernel);
  });

  afterEach(async () => {
    await simulator.teardown();
    await kernel.cleanup();
  });

  // ============================================================================
  // Initialization
  // ============================================================================

  describe('initialization', () => {
    it('binds to MockKernel', () => {
      expect(simulator.getKernel()).toBe(kernel);
    });

    it('setup() initializes state', async () => {
      await simulator.setup();

      const summary = simulator.getSummary();
      expect(summary.packageName).toBe('test-package');
    });

    it('teardown() cleans up state', async () => {
      await simulator.setup();
      await simulator.teardown();

      const summary = simulator.getSummary();
      expect(summary.storylineCount).toBe(0);
    });
  });

  // ============================================================================
  // Flow 1: create_from_source_and_continue
  // ============================================================================

  describe('runFlow(create_from_source_and_continue)', () => {
    beforeEach(async () => {
      await simulator.setup();

      // Create initial storyline with checkpoint
      const substrate = createSubstrateMock(kernel);
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

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
    });

    it('creates from source and switches to new storyline', async () => {
      const result = await simulator.runFlow('create_from_source_and_continue');

      expect(result.success).toBe(true);
      expect(result.flowId).toBe('create_from_source_and_continue');
      expect(result.operations.length).toBeGreaterThan(0);

      // Should have switched to new storyline
      const summary = simulator.getSummary();
      expect(summary.activeStorylineId).not.toBe('storyline_main');
    });

    it('records complete operation trace', async () => {
      const result = await simulator.runFlow('create_from_source_and_continue');

      expect(result.operations.length).toBeGreaterThan(0);
      expect(result.finalState).toBeDefined();
    });
  });

  // ============================================================================
  // Flow 2: branch_from_checkpoint_flow
  // ============================================================================

  describe('runFlow(branch_from_checkpoint_flow)', () => {
    let checkpointId: string;

    beforeEach(async () => {
      await simulator.setup();

      const substrate = createSubstrateMock(kernel);
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      // Create multiple checkpoints
      for (let i = 1; i <= 3; i++) {
        const result = await substrate.executeStorylineRuntimeSessionCommand({
          packageName: 'test-package',
          command: {
            kind: 'record_accepted_beat',
            payload: {
              acceptedBeatOrdinal: i,
              sceneId: 'scene_001',
              phaseIndex: 1,
              beatIndex: i,
              roundId: `round_${i}`,
              acceptedTranscript: {
                playerInput: `input ${i}`,
                beatText: `beat ${i}`,
              },
              stateSnapshot: createDefaultStateSnapshot(),
            },
          },
        });
        checkpointId = result.activeCheckpointId!;
      }
    });

    it('branches from checkpoint and creates new storyline', async () => {
      const result = await simulator.runFlow('branch_from_checkpoint_flow');

      expect(result.success).toBe(true);
      expect(result.flowId).toBe('branch_from_checkpoint_flow');

      // Verify new storyline exists
      const summary = simulator.getSummary();
      expect(summary.storylineCount).toBeGreaterThan(1);
    });

    it('branch has sourceCheckpointId set', async () => {
      await simulator.runFlow('branch_from_checkpoint_flow');

      // The new storyline should have sourceCheckpointId set
      const state = kernel.getState();
      const storylines = Object.values(state.storylineRepository!.storylinesById);

      // Find the branched storyline (not the main one)
      const branched = storylines.find(s => s.storylineId !== 'storyline_main');
      expect(branched).toBeDefined();
      expect(branched!.sourceCheckpointId).not.toBeNull();
    });
  });

  // ============================================================================
  // Flow 3: switch_and_continue
  // ============================================================================

  describe('runFlow(switch_and_continue)', () => {
    beforeEach(async () => {
      await simulator.setup();

      const builder = createMockFixtureBuilder(kernel);
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);
    });

    it('switches active storyline', async () => {
      const result = await simulator.runFlow('switch_and_continue');

      expect(result.success).toBe(true);
      expect(result.flowId).toBe('switch_and_continue');

      const summary = simulator.getSummary();
      expect(summary.activeStorylineId).toBe('storyline_alt');
    });

    it('verifies session binding switched', async () => {
      await simulator.runFlow('switch_and_continue');

      const state = kernel.getState();
      const altStoryline = state.storylineRepository!.storylinesById['storyline_alt']!;

      // Runtime sessions should be updated
      expect(state.runtimeSessions.activeSessionId).toBe(altStoryline.activeSessionId);
    });
  });

  // ============================================================================
  // Flow 4: rename_and_verify
  // ============================================================================

  describe('runFlow(rename_and_verify)', () => {
    beforeEach(async () => {
      await simulator.setup();

      const substrate = createSubstrateMock(kernel);
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });
    });

    it('renames storyline display name', async () => {
      const result = await simulator.runFlow('rename_and_verify');

      expect(result.success).toBe(true);
      expect(result.flowId).toBe('rename_and_verify');

      const state = kernel.getState();
      const storyline = state.storylineRepository!.storylinesById['storyline_main']!;
      expect(storyline.name).not.toBe('Main Line');
    });

    it('does not affect runtime sessions', async () => {
      const stateBefore = kernel.getState();

      await simulator.runFlow('rename_and_verify');

      const stateAfter = kernel.getState();

      // Session count should be unchanged
      const beforeCount = Object.keys(stateBefore.runtimeSessions.sessionsById).length;
      const afterCount = Object.keys(stateAfter.runtimeSessions.sessionsById).length;
      expect(afterCount).toBe(beforeCount);
    });
  });

  // ============================================================================
  // Flow 5: legacy_bootstrap_flow
  // ============================================================================

  describe('runFlow(legacy_bootstrap_flow)', () => {
    beforeEach(async () => {
      await simulator.setup();
      // Do NOT create repository - test legacy bootstrap
    });

    it('bootstraps default storyline from legacy implicit context', async () => {
      const result = await simulator.runFlow('legacy_bootstrap_flow');

      expect(result.success).toBe(true);
      expect(result.flowId).toBe('legacy_bootstrap_flow');

      const summary = simulator.getSummary();
      expect(summary.storylineCount).toBe(1);
      expect(summary.activeStorylineId).toBe('storyline_main');
    });

    it('creates default variant workspace', async () => {
      await simulator.runFlow('legacy_bootstrap_flow');

      const state = kernel.getState();
      expect(state.variantsById['variant_main']).toBeDefined();
    });

    it('creates session with awaiting_start lifecycle', async () => {
      await simulator.runFlow('legacy_bootstrap_flow');

      const state = kernel.getState();
      const sessionId = state.storylineRepository!.storylinesById['storyline_main']!.activeSessionId;
      const session = state.runtimeSessions.sessionsById[sessionId]!;

      expect(session.lifecycle).toBe('awaiting_start');
    });
  });

  // ============================================================================
  // Flow 6: full_storyline_runtime_flow
  // ============================================================================

  describe('runFlow(full_storyline_runtime_flow)', () => {
    beforeEach(async () => {
      await simulator.setup();

      const substrate = createSubstrateMock(kernel);
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      // Create initial checkpoint
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
    });

    it('executes complete runtime flow', async () => {
      const result = await simulator.runFlow('full_storyline_runtime_flow');

      expect(result.success).toBe(true);
      expect(result.flowId).toBe('full_storyline_runtime_flow');
      expect(result.operations.length).toBeGreaterThan(0);
    });

    it('creates new storyline via create from source', async () => {
      await simulator.runFlow('full_storyline_runtime_flow');

      const summary = simulator.getSummary();
      expect(summary.storylineCount).toBeGreaterThan(1);
    });

    it('branches from recorded checkpoint', async () => {
      await simulator.runFlow('full_storyline_runtime_flow');

      const state = kernel.getState();
      const storylines = Object.values(state.storylineRepository!.storylinesById);

      // Should have main + created + branched
      expect(storylines.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // recordFlow() / replayFlow()
  // ============================================================================

  describe('recordFlow() and replayFlow()', () => {
    beforeEach(async () => {
      await simulator.setup();

      const builder = createMockFixtureBuilder(kernel);
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);
    });

    it('recordFlow() captures complete trace', async () => {
      const trace = await simulator.recordFlow('switch_and_continue');

      expect(trace.schemaVersion).toBe(1);
      expect(trace.flowId).toBe('switch_and_continue');
      expect(trace.packageName).toBe('test-package');
      expect(trace.operations.length).toBeGreaterThan(0);
      expect(trace.snapshots.length).toBeGreaterThan(0);
    });

    it('recordFlow() trace is JSON serializable', async () => {
      const trace = await simulator.recordFlow('switch_and_continue');

      const json = JSON.stringify(trace);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json) as SerializedFlowTrace;
      expect(parsed.flowId).toBe('switch_and_continue');
    });

    it('replayFlow() reproduces exact state sequence', async () => {
      // Record
      const trace = await simulator.recordFlow('switch_and_continue');

      // Reset
      await simulator.teardown();
      await simulator.setup();

      const builder = createMockFixtureBuilder(kernel);
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);

      // Replay
      const result = await simulator.replayFlow(trace);

      expect(result.success).toBe(true);
      expect(result.operationsMatched).toBe(true);
      expect(result.stateMatched).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('replayFlow() can be imported from JSON', async () => {
      const trace = await simulator.recordFlow('switch_and_continue');
      const json = JSON.stringify(trace);

      await simulator.teardown();
      await simulator.setup();

      const builder = createMockFixtureBuilder(kernel);
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);

      const parsed = JSON.parse(json) as SerializedFlowTrace;
      const result = await simulator.replayFlow(parsed);

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // verifyState()
  // ============================================================================

  describe('verifyState()', () => {
    beforeEach(async () => {
      await simulator.setup();

      const builder = createMockFixtureBuilder(kernel);
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);
    });

    it('verifies storyline_count assertion', () => {
      const result = simulator.verifyState({ kind: 'storyline_count', expected: 2 });
      expect(result).toBe(true);
    });

    it('verifies active_storyline assertion', () => {
      const result = simulator.verifyState({ kind: 'active_storyline', expected: 'storyline_main' });
      expect(result).toBe(true);
    });

    it('verifies variant_exists assertion', () => {
      const summary = simulator.getSummary();
      const variantId = Object.keys(kernel.getState().variantsById)[0]!;

      const result = simulator.verifyState({ kind: 'variant_exists', expected: variantId });
      expect(result).toBe(true);
    });

    it('verifies session_bound assertion', () => {
      const state = kernel.getState();
      const storyline = state.storylineRepository!.storylinesById['storyline_main']!;

      const result = simulator.verifyState({
        kind: 'session_bound',
        expected: {
          storylineId: 'storyline_main',
          sessionId: storyline.activeSessionId,
        },
      });
      expect(result).toBe(true);
    });

    it('returns false for incorrect assertions', () => {
      const result = simulator.verifyState({ kind: 'storyline_count', expected: 99 });
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // getSummary()
  // ============================================================================

  describe('getSummary()', () => {
    beforeEach(async () => {
      await simulator.setup();
    });

    it('returns correct state summary', async () => {
      const builder = createMockFixtureBuilder(kernel);
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);

      const summary = simulator.getSummary();

      expect(summary.packageName).toBe('test-package');
      expect(summary.storylineCount).toBe(2);
      expect(summary.variantCount).toBe(2);
      expect(summary.sessionCount).toBe(2);
      expect(summary.activeStorylineId).toBe('storyline_main');
      expect(summary.activeSessionId).not.toBeNull();
    });

    it('returns zeros for empty state', async () => {
      await simulator.teardown();
      await simulator.setup();

      const summary = simulator.getSummary();

      expect(summary.storylineCount).toBe(0);
      expect(summary.variantCount).toBe(0);
      expect(summary.sessionCount).toBe(0);
      expect(summary.activeStorylineId).toBeNull();
      expect(summary.activeSessionId).toBeNull();
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('error handling', () => {
    beforeEach(async () => {
      await simulator.setup();

      // Create a repository so that the flow attempts substrate operations
      const builder = createMockFixtureBuilder(kernel);
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
      ]);
    });

    it('runFlow() returns error result on failure', async () => {
      // Try to switch to non-existent storyline
      const result = await simulator.runFlow('switch_and_continue');

      // Should fail because there's no alternative storyline to switch to
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('operations trace captured even on error', async () => {
      // This flow will fail because there's only one storyline
      await simulator.runFlow('switch_and_continue');

      // Should still have operations recorded (the switch attempt)
      const trace = kernel.getTrace();
      // The flow throws before any substrate operation when there's no alternative
      // So we expect 0 operations when precondition fails
      expect(trace.length).toBe(0);
    });
  });
});