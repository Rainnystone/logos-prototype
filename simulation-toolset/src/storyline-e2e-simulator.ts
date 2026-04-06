/**
 * StorylineE2ESimulator - complete human workflow simulation.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 6
 *
 * StorylineE2ESimulator provides:
 * - Complete flow execution (create, branch, switch, rename, legacy bootstrap, runtime)
 * - Record/Replay via serialized trace
 * - State verification for assertions
 */

import type { MockKernel, OperationTraceEntry } from './mock-kernel';
import { createSubstrateMock } from './substrate-mock';
import { createMockFixtureBuilder } from './mock-fixture-builder';
import { createStorylineObserver, type StateAssertion } from './storyline-observer';
import type { SerializedFlowTrace, SerializedE2EFlowId } from './serialized-trace';
import type { StateSnapshot, RelationshipLayer } from '@/types';

// ============================================================================
// Public Types
// ============================================================================

/**
 * E2E Flow identifiers.
 */
export type E2EFlow = SerializedE2EFlowId;

/**
 * Flow execution result.
 */
export interface FlowResult {
  flowId: E2EFlow;
  success: boolean;
  operations: OperationTraceEntry[];
  finalState: unknown;
  error?: string;
}

/**
 * Replay result.
 */
export interface ReplayResult {
  success: boolean;
  operationsMatched: boolean;
  stateMatched: boolean;
  errors: string[];
}

/**
 * State summary for quick overview.
 */
export interface StateSummary {
  packageName: string;
  storylineCount: number;
  variantCount: number;
  sessionCount: number;
  activeStorylineId: string | null;
  activeSessionId: string | null;
}

// ============================================================================
// StorylineE2ESimulator Interface
// ============================================================================

export interface StorylineE2ESimulator {
  /**
   * Get the underlying MockKernel.
   */
  getKernel(): MockKernel;

  /**
   * Setup initial state.
   */
  setup(): Promise<void>;

  /**
   * Teardown and cleanup.
   */
  teardown(): Promise<void>;

  /**
   * Run a complete E2E flow.
   */
  runFlow(flow: E2EFlow): Promise<FlowResult>;

  /**
   * Record a flow and return serialized trace.
   */
  recordFlow(flow: E2EFlow): Promise<SerializedFlowTrace>;

  /**
   * Replay a recorded flow.
   */
  replayFlow(trace: SerializedFlowTrace): Promise<ReplayResult>;

  /**
   * Verify a state assertion.
   */
  verifyState(assertion: StateAssertion): boolean;

  /**
   * Get quick state summary.
   */
  getSummary(): StateSummary;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a default state snapshot for testing.
 */
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

// ============================================================================
// Implementation
// ============================================================================

export function createStorylineE2ESimulator(kernel: MockKernel): StorylineE2ESimulator {
  const substrate = createSubstrateMock(kernel);
  const builder = createMockFixtureBuilder(kernel);
  const observer = createStorylineObserver(kernel);

  // ========================================================================
  // Private Flow Implementations (defined as local functions)
  // ========================================================================

  async function runCreateFromSourceFlow(): Promise<void> {
    // 1. Get initial state
    const state = kernel.getState();

    // Verify we have a storyline with headCheckpointId
    if (!state.storylineRepository) {
      throw new Error('No repository exists for create_from_source flow');
    }

    const activeStoryline =
      state.storylineRepository.storylinesById[state.storylineRepository.activeStorylineId];
    if (!activeStoryline?.headCheckpointId) {
      throw new Error('Active storyline has no headCheckpointId');
    }

    // 2. Create from source
    const storylineCount = Object.keys(state.storylineRepository.storylinesById).length;
    const created = await substrate.createStorylineFromSource({
      packageName: state.packageName,
      sourceStorylineId: activeStoryline.storylineId,
      name: `故事线 ${storylineCount + 1}`,
    });

    // 3. Switch to new storyline
    await substrate.switchActiveStoryline({
      packageName: state.packageName,
      storylineId: created.storyline.storylineId,
    });
  }

  async function runBranchFromCheckpointFlow(): Promise<void> {
    const state = kernel.getState();

    if (!state.storylineRepository) {
      throw new Error('No repository exists for branch_from_checkpoint flow');
    }

    const activeStoryline =
      state.storylineRepository.storylinesById[state.storylineRepository.activeStorylineId];
    if (!activeStoryline) {
      throw new Error('No active storyline');
    }

    // Get a checkpoint from the session
    const session = state.runtimeSessions.sessionsById[activeStoryline.activeSessionId];
    if (!session || session.orderedCheckpointIds.length === 0) {
      throw new Error('No checkpoints available for branching');
    }

    // Use the first checkpoint (or middle one if available)
    const checkpointIndex = Math.floor(session.orderedCheckpointIds.length / 2);
    const checkpointId = session.orderedCheckpointIds[checkpointIndex]!;

    // Branch from checkpoint
    const storylineCount = Object.keys(state.storylineRepository.storylinesById).length;
    const checkpoint = session.checkpointsById[checkpointId];
    const displayName = checkpoint
      ? `故事线 ${storylineCount + 1} · 从 Beat ${checkpoint.acceptedBeatOrdinal} 分出`
      : `故事线 ${storylineCount + 1}`;

    const branched = await substrate.branchStorylineFromCheckpoint({
      packageName: state.packageName,
      sourceStorylineId: activeStoryline.storylineId,
      checkpointId,
      name: displayName,
    });

    // Switch to new storyline
    await substrate.switchActiveStoryline({
      packageName: state.packageName,
      storylineId: branched.storyline.storylineId,
    });
  }

  async function runSwitchAndContinueFlow(): Promise<void> {
    const state = kernel.getState();

    if (!state.storylineRepository) {
      throw new Error('No repository exists for switch_and_continue flow');
    }

    // Find a different storyline to switch to
    const storylines = Object.values(state.storylineRepository.storylinesById);
    const targetStoryline = storylines.find(
      (s) => s.storylineId !== state.storylineRepository!.activeStorylineId,
    );

    if (!targetStoryline) {
      throw new Error('No alternative storyline to switch to');
    }

    // Switch to target
    await substrate.switchActiveStoryline({
      packageName: state.packageName,
      storylineId: targetStoryline.storylineId,
    });
  }

  async function runRenameAndVerifyFlow(): Promise<void> {
    const state = kernel.getState();

    if (!state.storylineRepository) {
      throw new Error('No repository exists for rename_and_verify flow');
    }

    const activeStoryline =
      state.storylineRepository.storylinesById[state.storylineRepository.activeStorylineId];
    if (!activeStoryline) {
      throw new Error('No active storyline');
    }

    // Rename
    await substrate.updateStorylineDisplayName({
      packageName: state.packageName,
      storylineId: activeStoryline.storylineId,
      nextDisplayName: 'Renamed Storyline',
    });
  }

  async function runLegacyBootstrapFlow(): Promise<void> {
    // Resolve context for write (triggers bootstrap)
    const context = await substrate.resolveActiveStorylineContext({
      packageName: kernel.getState().packageName,
      forWrite: true,
    });

    // Verify bootstrap created default structures
    if (!context.repository) {
      throw new Error('Bootstrap failed: no repository created');
    }

    if (!context.session) {
      throw new Error('Bootstrap failed: no session created');
    }
  }

  async function runFullRuntimeFlow(): Promise<void> {
    let state = kernel.getState();

    if (!state.storylineRepository) {
      throw new Error('No repository exists for full_storyline_runtime_flow');
    }

    const activeStoryline =
      state.storylineRepository.storylinesById[state.storylineRepository.activeStorylineId];
    if (!activeStoryline) {
      throw new Error('No active storyline');
    }

    // 1. Create storyline from source
    const storylineCount = Object.keys(state.storylineRepository.storylinesById).length;
    const created = await substrate.createStorylineFromSource({
      packageName: state.packageName,
      sourceStorylineId: activeStoryline.storylineId,
      name: `故事线 ${storylineCount + 1}`,
    });

    // 2. Switch to new storyline
    await substrate.switchActiveStoryline({
      packageName: state.packageName,
      storylineId: created.storyline.storylineId,
    });

    // 3. Ensure session
    await substrate.ensureStorylineAwareActiveSession({
      packageName: state.packageName,
    });

    // 4. Record a beat (runtime advancement)
    await substrate.executeStorylineRuntimeSessionCommand({
      packageName: state.packageName,
      command: {
        kind: 'record_accepted_beat',
        payload: {
          acceptedBeatOrdinal: 1,
          sceneId: 'scene_001',
          phaseIndex: 1,
          beatIndex: 1,
          roundId: 'round_001',
          acceptedTranscript: {
            playerInput: 'test input',
            beatText: 'test beat',
          },
          stateSnapshot: createDefaultStateSnapshot(),
        },
      },
    });

    // 5. Verify head checkpoint updated
    state = kernel.getState();
    const updatedStoryline =
      state.storylineRepository!.storylinesById[state.storylineRepository!.activeStorylineId];
    if (!updatedStoryline?.headCheckpointId) {
      throw new Error('Head checkpoint not updated after recording beat');
    }

    // 6. Branch from the new checkpoint
    const branched = await substrate.branchStorylineFromCheckpoint({
      packageName: state.packageName,
      sourceStorylineId: updatedStoryline.storylineId,
      checkpointId: updatedStoryline.headCheckpointId,
      name: `故事线 ${storylineCount + 2}`,
    });

    // 7. Verify branch has copied variant (get fresh state)
    state = kernel.getState();
    if (!state.variantsById[branched.variant.variantId]) {
      throw new Error('Branch variant not created');
    }

    // 8. Verify branch session starts from checkpoint
    if (branched.session.headCheckpointId !== updatedStoryline.headCheckpointId) {
      throw new Error('Branch session does not start from checkpoint');
    }
  }

  // ========================================================================
  // Public Interface
  // ========================================================================

  return {
    getKernel(): MockKernel {
      return kernel;
    },

    async setup(): Promise<void> {
      // Initial state is set by MockKernel constructor
      // No additional setup needed
    },

    async teardown(): Promise<void> {
      kernel.reset();
    },

    async runFlow(flow: E2EFlow): Promise<FlowResult> {
      let success = false;
      let error: string | undefined;

      try {
        switch (flow) {
          case 'create_from_source_and_continue': {
            await runCreateFromSourceFlow();
            success = true;
            break;
          }

          case 'branch_from_checkpoint_flow': {
            await runBranchFromCheckpointFlow();
            success = true;
            break;
          }

          case 'switch_and_continue': {
            await runSwitchAndContinueFlow();
            success = true;
            break;
          }

          case 'rename_and_verify': {
            await runRenameAndVerifyFlow();
            success = true;
            break;
          }

          case 'legacy_bootstrap_flow': {
            await runLegacyBootstrapFlow();
            success = true;
            break;
          }

          case 'full_storyline_runtime_flow': {
            await runFullRuntimeFlow();
            success = true;
            break;
          }

          default: {
            // TypeScript exhaustiveness check
            const _exhaustive: never = flow;
            error = `Unknown flow: ${flow}`;
          }
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        success = false;
      }

      const result: FlowResult = {
        flowId: flow,
        success,
        operations: kernel.getTrace(),
        finalState: kernel.getState(),
      };
      if (error !== undefined) {
        result.error = error;
      }
      return result;
    },

    async recordFlow(flow: E2EFlow): Promise<SerializedFlowTrace> {
      // Run the flow without resetting - the caller is responsible for setup
      await this.runFlow(flow);

      // Export trace
      const exported = kernel.exportTrace();

      // Override flowId with the actual flow
      return {
        ...exported,
        flowId: flow,
      };
    },

    async replayFlow(trace: SerializedFlowTrace): Promise<ReplayResult> {
      const errors: string[] = [];
      let operationsMatched = true;
      let stateMatched = true;

      try {
        // Import trace
        kernel.importTrace(trace);

        // Verify operations count matches
        const currentTrace = kernel.getTrace();
        if (currentTrace.length !== trace.operations.length) {
          operationsMatched = false;
          errors.push(
            `Operations count mismatch: expected ${trace.operations.length}, got ${currentTrace.length}`,
          );
        }

        // Verify final state has expected properties
        const state = kernel.getState();
        if (state.packageName !== trace.packageName) {
          stateMatched = false;
          errors.push(
            `Package name mismatch: expected ${trace.packageName}, got ${state.packageName}`,
          );
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }

      return {
        success: errors.length === 0,
        operationsMatched,
        stateMatched,
        errors,
      };
    },

    verifyState(assertion: StateAssertion): boolean {
      return observer.verifyStateAssertion(assertion);
    },

    getSummary(): StateSummary {
      const state = kernel.getState();
      const observerSummary = observer.getSummary();

      return {
        packageName: state.packageName,
        storylineCount: observerSummary.storylineCount,
        variantCount: observerSummary.variantCount,
        sessionCount: observerSummary.sessionCount,
        activeStorylineId: observerSummary.activeStorylineId,
        activeSessionId: observerSummary.activeSessionId,
      };
    },
  };
}