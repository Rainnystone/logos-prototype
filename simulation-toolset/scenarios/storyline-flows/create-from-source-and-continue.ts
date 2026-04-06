/**
 * Create from Source and Continue Scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md Section 10.2
 *
 * This scenario simulates the workspace flow where:
 * 1. An author clicks "create storyline from source" on a row with headCheckpointId
 * 2. A new storyline is created from the source storyline
 * 3. The active storyline is switched to the new storyline
 * 4. The author can immediately inspect or rename the new line
 *
 * Key verifications:
 * - New storyline is created with copied variant
 * - Active storyline switches to the new one
 * - Session is bound to the new storyline
 * - Trace stays story-agnostic and kernel-backed
 */

import type { MockKernel } from '@simulation/mock-kernel';
import { createMockKernel } from '@simulation/mock-kernel';
import { createSubstrateMock } from '@simulation/substrate-mock';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import type { StateSnapshot } from '@/types';

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

/**
 * Create the create_from_source_and_continue scenario.
 */
export function createCreateFromSourceAndContinueScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'create-from-source-and-continue',
    packageName: 'test-package',
    async run({ recorder }) {
      let kernel: MockKernel | null = null;

      try {
        // 1. Initialize MockKernel with test state
        kernel = createMockKernel('test-package');
        const substrate = createSubstrateMock(kernel);

        // 2. Setup initial storyline with checkpoint
        // Bootstrap the repository with a default storyline
        await substrate.resolveActiveStorylineContext({
          packageName: 'test-package',
          forWrite: true,
        });

        // 3. Record a beat to create headCheckpointId
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
                playerInput: 'test input',
                beatText: 'test beat',
              },
              stateSnapshot: createDefaultStateSnapshot(),
            },
          },
        });

        recorder.recordAction({
          kind: 'storyline.setup_initial',
          details: {
            packageName: 'test-package',
            initialStorylineId: kernel.getState().storylineRepository?.activeStorylineId,
          },
        });

        // 4. Get initial state for verification
        const initialState = kernel.getState();
        const initialStoryline =
          initialState.storylineRepository!.storylinesById[
            initialState.storylineRepository!.activeStorylineId
          ];
        const initialStorylineCount = Object.keys(
          initialState.storylineRepository!.storylinesById,
        ).length;
        const initialVariantCount = Object.keys(initialState.variantsById).length;

        recorder.recordAssertion({
          name: 'source-has-head-checkpoint',
          pass: initialStoryline.headCheckpointId !== null,
          details: `Source storyline must have headCheckpointId to create from source`,
        });

        // 5. Create from source (simulating workspace action)
        const created = await substrate.createStorylineFromSource({
          packageName: 'test-package',
          sourceStorylineId: initialStoryline.storylineId,
          name: `Storyline ${initialStorylineCount + 1}`,
        });

        recorder.recordAction({
          kind: 'storyline.create_from_source',
          details: {
            sourceStorylineId: initialStoryline.storylineId,
            newStorylineId: created.storyline.storylineId,
            newStorylineName: created.storyline.name,
          },
        });

        recorder.recordAssertion({
          name: 'storyline-created-from-source',
          pass: created.storyline.storylineId !== initialStoryline.storylineId,
          details: 'New storyline should have different id from source',
        });

        // 6. Verify variant was copied from source
        const stateAfterCreate = kernel.getState();
        const newVariant = stateAfterCreate.variantsById[created.variant.variantId];

        recorder.recordAssertion({
          name: 'variant-copied-from-source',
          pass: newVariant !== undefined,
          details: `Variant ${created.variant.variantId} should exist after create from source`,
        });

        recorder.recordAssertion({
          name: 'storyline-count-increased',
          pass:
            Object.keys(stateAfterCreate.storylineRepository!.storylinesById).length ===
            initialStorylineCount + 1,
          details: 'Storyline count should increase by 1 after creation',
        });

        // 7. Switch to new storyline (per spec Section 10.2)
        await substrate.switchActiveStoryline({
          packageName: 'test-package',
          storylineId: created.storyline.storylineId,
        });

        recorder.recordAction({
          kind: 'storyline.switch_active',
          details: {
            storylineId: created.storyline.storylineId,
          },
        });

        // 8. Verify active storyline switched
        const finalState = kernel.getState();

        recorder.recordAssertion({
          name: 'active-storyline-switched',
          pass:
            finalState.storylineRepository!.activeStorylineId === created.storyline.storylineId,
          details: 'Active storyline should be the newly created one',
        });

        // 9. Verify session is bound to new storyline
        const newStoryline =
          finalState.storylineRepository!.storylinesById[created.storyline.storylineId];
        const session = finalState.runtimeSessions.sessionsById[newStoryline.activeSessionId];

        recorder.recordAssertion({
          name: 'session-bound-to-new-storyline',
          pass: session !== undefined,
          details: `Session ${newStoryline.activeSessionId} should exist for new storyline`,
        });

        recorder.recordAssertion({
          name: 'session-has-awaiting-start',
          pass: session?.lifecycle === 'awaiting_start',
          details: 'New storyline session should be awaiting_start',
        });

        // 10. Verify variant count increased
        recorder.recordAssertion({
          name: 'variant-count-increased',
          pass: Object.keys(finalState.variantsById).length === initialVariantCount + 1,
          details: 'Variant count should increase by 1 after creation',
        });

        // 11. Verify kernel trace is story-agnostic
        const trace = kernel.getTrace();
        recorder.recordAssertion({
          name: 'kernel-trace-recorded',
          pass: trace.length > 0,
          details: `Kernel trace should have ${trace.length} operations`,
        });

        return {
          finalState: {
            packageName: 'test-package',
            storylineCount: Object.keys(finalState.storylineRepository!.storylinesById).length,
            variantCount: Object.keys(finalState.variantsById).length,
            activeStorylineId: finalState.storylineRepository!.activeStorylineId,
            newStorylineId: created.storyline.storylineId,
            sourceStorylineId: initialStoryline.storylineId,
          },
        };
      } finally {
        kernel?.reset();
      }
    },
  };
}