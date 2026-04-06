import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';

import { createMockKernel } from '@simulation/mock-kernel';
import { createSubstrateMock } from '@simulation/substrate-mock';
import { createMockFixtureBuilder } from '@simulation/mock-fixture-builder';
import { createStorylineObserver } from '@simulation/storyline-observer';

/**
 * Create a branch from checkpoint flow scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-1-storyline-substrate-design.md Section 9.3-9.4
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md Section 8.3
 *
 * This scenario verifies:
 * - Branching from a reachable checkpoint creates a new storyline rooted at that checkpoint
 * - The new storyline has sourceCheckpointId and headCheckpointId set to the selected checkpoint
 * - The new storyline's session starts from that checkpoint
 * - The new storyline receives a copied variant workspace
 */
export function createBranchFromCheckpointFlowScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'branch_from_checkpoint_flow',
    packageName: 'test-package',

    async run({ recorder }) {
      // Create kernel and helpers
      const kernel = createMockKernel('test-package');
      const substrate = createSubstrateMock(kernel);
      const builder = createMockFixtureBuilder(kernel);
      const observer = createStorylineObserver(kernel);

      // Build initial state with a storyline that has multiple checkpoints
      const result = builder.buildStoryline({
        storylineId: 'storyline_main',
        name: 'Main Line',
        withCheckpoints: [1, 2, 3, 4, 5],
      });

      const sourceStorylineId = result.storylineId;
      const sourceSessionId = result.sessionId;

      // Get a checkpoint from the middle of the session (not the head)
      const session = kernel.getState().runtimeSessions.sessionsById[sourceSessionId];
      const checkpointIds = session?.orderedCheckpointIds ?? [];
      const selectedCheckpointId = checkpointIds[2]; // Third checkpoint (ordinal 3)

      if (!selectedCheckpointId) {
        throw new Error('No checkpoint found for branching');
      }

      // Record initial state
      recorder.recordAction({
        kind: 'storyline.branch_from_checkpoint',
        operation: 'resolve_source',
        details: {
          sourceStorylineId,
          selectedCheckpointId,
          totalCheckpoints: checkpointIds.length,
        },
      });

      // Verify checkpoint is reachable from source storyline
      recorder.recordAssertion({
        name: 'checkpoint-reachable-from-source',
        pass: !!session?.checkpointsById[selectedCheckpointId],
        details: {
          checkpointId: selectedCheckpointId,
          sessionId: sourceSessionId,
        },
      });

      // Execute branch from checkpoint
      const branchResult = await substrate.branchStorylineFromCheckpoint({
        packageName: 'test-package',
        sourceStorylineId,
        checkpointId: selectedCheckpointId,
        name: 'Branched from Checkpoint 3',
      });

      // Record action
      recorder.recordAction({
        kind: 'storyline.branch_from_checkpoint',
        operation: 'branched',
        details: {
          newStorylineId: branchResult.storyline.storylineId,
          newVariantId: branchResult.variant.variantId,
          newSessionId: branchResult.session.sessionId,
        },
      });

      // Verify new storyline created
      recorder.recordAssertion({
        name: 'storyline-created-from-checkpoint',
        pass: branchResult.storyline.storylineId !== sourceStorylineId,
        details: {
          sourceStorylineId,
          newStorylineId: branchResult.storyline.storylineId,
        },
      });

      // Verify sourceCheckpointId set correctly
      recorder.recordAssertion({
        name: 'source-checkpoint-id-set',
        pass: branchResult.storyline.sourceCheckpointId === selectedCheckpointId,
        details: {
          expected: selectedCheckpointId,
          actual: branchResult.storyline.sourceCheckpointId,
        },
      });

      // Verify headCheckpointId set correctly
      recorder.recordAssertion({
        name: 'head-checkpoint-id-set',
        pass: branchResult.storyline.headCheckpointId === selectedCheckpointId,
        details: {
          expected: selectedCheckpointId,
          actual: branchResult.storyline.headCheckpointId,
        },
      });

      // Verify variant copied from source
      const sourceStoryline = kernel.getState().storylineRepository?.storylinesById[sourceStorylineId];
      const sourceVariantId = sourceStoryline?.variantId;
      recorder.recordAssertion({
        name: 'variant-copied-from-source',
        pass: branchResult.variant.variantId !== sourceVariantId,
        details: {
          sourceVariantId,
          newVariantId: branchResult.variant.variantId,
        },
      });

      // Verify new session rooted at checkpoint
      recorder.recordAssertion({
        name: 'session-rooted-at-checkpoint',
        pass: branchResult.session.headCheckpointId === selectedCheckpointId,
        details: {
          expected: selectedCheckpointId,
          actual: branchResult.session.headCheckpointId,
        },
      });

      // Verify checkpoint copied to new session
      recorder.recordAssertion({
        name: 'checkpoint-copied-to-new-session',
        pass: !!branchResult.session.checkpointsById[selectedCheckpointId],
        details: {
          checkpointId: selectedCheckpointId,
          sessionHasCheckpoint: !!branchResult.session.checkpointsById[selectedCheckpointId],
        },
      });

      // Capture final state before cleanup
      const summary = observer.getSummary();

      // Cleanup
      kernel.cleanup();

      return {
        finalState: {
          storylineCount: summary.storylineCount,
          variantCount: summary.variantCount,
          sessionCount: summary.sessionCount,
          activeStorylineId: summary.activeStorylineId,
          activeSessionId: summary.activeSessionId,
        },
      };
    },
  };
}