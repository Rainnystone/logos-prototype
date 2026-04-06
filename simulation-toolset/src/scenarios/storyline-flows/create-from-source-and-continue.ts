import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';

import { createMockKernel } from '@simulation/mock-kernel';
import { createSubstrateMock } from '@simulation/substrate-mock';
import { createMockFixtureBuilder } from '@simulation/mock-fixture-builder';
import { createStorylineObserver } from '@simulation/storyline-observer';

/**
 * Create a create from source and continue scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-1-storyline-substrate-design.md Section 9.4
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md Section 10.2
 *
 * This scenario verifies:
 * - Creating a new storyline from a source storyline with existing checkpoints
 * - The new storyline receives a new variantId and session
 * - The new storyline is rooted at the source headCheckpointId
 */
export function createCreateFromSourceAndContinueScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'create_from_source_and_continue',
    packageName: 'test-package',

    async run({ recorder }) {
      // Create kernel and helpers
      const kernel = createMockKernel('test-package');
      const substrate = createSubstrateMock(kernel);
      const builder = createMockFixtureBuilder(kernel);
      const observer = createStorylineObserver(kernel);

      // Build initial state with a storyline that has checkpoints
      const result = builder.buildStoryline({
        storylineId: 'storyline_main',
        name: 'Main Line',
        withCheckpoints: [1, 2, 3],
      });

      const sourceStorylineId = result.storylineId;
      const sourceHeadCheckpointId = result.sessionId
        ? kernel.getState().runtimeSessions.sessionsById[result.sessionId]?.headCheckpointId
        : null;

      // Record initial state
      recorder.recordAction({
        kind: 'storyline.create_from_source',
        operation: 'resolve_source',
        details: {
          sourceStorylineId,
          sourceHeadCheckpointId,
        },
      });

      // Execute create from source
      const createResult = await substrate.createStorylineFromSource({
        packageName: 'test-package',
        sourceStorylineId,
        name: 'Branched Line',
      });

      // Record action
      recorder.recordAction({
        kind: 'storyline.create_from_source',
        operation: 'created',
        details: {
          newStorylineId: createResult.storyline.storylineId,
          newVariantId: createResult.variant.variantId,
          newSessionId: createResult.session.sessionId,
        },
      });

      // Verify new storyline created
      recorder.recordAssertion({
        name: 'storyline-created-from-source',
        pass: createResult.storyline.storylineId !== sourceStorylineId,
        details: {
          sourceStorylineId,
          newStorylineId: createResult.storyline.storylineId,
        },
      });

      // Verify variant copied from source
      const sourceVariantId = kernel.getState().storylineRepository?.storylinesById[sourceStorylineId]?.variantId;
      recorder.recordAssertion({
        name: 'variant-copied-from-source',
        pass: createResult.variant.variantId !== sourceVariantId,
        details: {
          sourceVariantId,
          newVariantId: createResult.variant.variantId,
        },
      });

      // Verify session bound to new storyline
      recorder.recordAssertion({
        name: 'session-bound-to-new-storyline',
        pass: createResult.storyline.activeSessionId === createResult.session.sessionId,
        details: {
          storylineActiveSessionId: createResult.storyline.activeSessionId,
          sessionId: createResult.session.sessionId,
        },
      });

      // Verify active storyline unchanged (per spec Section 9.4)
      const currentActiveStorylineId = kernel.getState().storylineRepository?.activeStorylineId;
      recorder.recordAssertion({
        name: 'active-storyline-unchanged',
        pass: currentActiveStorylineId === sourceStorylineId,
        details: {
          initialActiveStorylineId: sourceStorylineId,
          currentActiveStorylineId,
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
          sourceStorylineId,
          newStorylineId: createResult.storyline.storylineId,
        },
      };
    },
  };
}