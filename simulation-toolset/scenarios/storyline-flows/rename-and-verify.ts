import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';

import { createMockKernel } from '@simulation/mock-kernel';
import { createSubstrateMock } from '@simulation/substrate-mock';
import { createMockFixtureBuilder } from '@simulation/mock-fixture-builder';
import { createStorylineObserver } from '@simulation/storyline-observer';

/**
 * Create a rename and verify scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md Section 9.2
 *
 * This scenario verifies:
 * - Renaming only changes storyline name and updatedAt
 * - Renaming does NOT change: storylineId, variantId, activeSessionId, checkpoint ids
 * - Renaming does NOT affect runtime-sessions.json
 * - Renaming does NOT affect variant workspace files
 */
export function createRenameAndVerifyScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'rename_and_verify',
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

      const storylineId = result.storylineId;
      const originalName = result.name;
      const newName = 'Renamed Line';

      // Capture initial state for comparison
      const initialState = kernel.getState();
      const initialStoryline = initialState.storylineRepository?.storylinesById[storylineId];
      const initialVariantId = initialStoryline?.variantId;
      const initialSessionId = initialStoryline?.activeSessionId;
      const initialHeadCheckpointId = initialStoryline?.headCheckpointId;
      const initialSourceCheckpointId = initialStoryline?.sourceCheckpointId;
      const initialUpdatedAt = initialStoryline?.updatedAt;
      const initialSession = initialState.runtimeSessions.sessionsById[initialSessionId ?? ''];
      const initialCheckpointCount = initialSession?.orderedCheckpointIds.length ?? 0;
      const initialLifecycle = initialSession?.lifecycle;

      // Record initial state
      recorder.recordAction({
        kind: 'storyline.update_display_name',
        details: {
          operation: 'resolve_initial',
          storylineId,
          originalName,
          newName,
        },
      });

      // Execute rename
      const renameResult = await substrate.updateStorylineDisplayName({
        packageName: 'test-package',
        storylineId,
        nextDisplayName: newName,
      });

      // Record action
      recorder.recordAction({
        kind: 'storyline.update_display_name',
        details: {
          operation: 'renamed',
          storylineId,
          oldName: originalName,
          newName: renameResult.storyline.name,
        },
      });

      // Verify name updated
      recorder.recordAssertion({
        name: 'storyline-name-updated',
        pass: renameResult.storyline.name === newName,
        details: {
          expected: newName,
          actual: renameResult.storyline.name,
        },
      });

      // Verify updatedAt changed
      recorder.recordAssertion({
        name: 'updated-at-changed',
        pass: renameResult.storyline.updatedAt !== initialUpdatedAt,
        details: {
          initialUpdatedAt,
          newUpdatedAt: renameResult.storyline.updatedAt,
        },
      });

      // Verify storylineId preserved
      recorder.recordAssertion({
        name: 'storyline-id-preserved',
        pass: renameResult.storyline.storylineId === storylineId,
        details: {
          expected: storylineId,
          actual: renameResult.storyline.storylineId,
        },
      });

      // Verify variantId preserved
      recorder.recordAssertion({
        name: 'variant-id-preserved',
        pass: renameResult.storyline.variantId === initialVariantId,
        details: {
          expected: initialVariantId,
          actual: renameResult.storyline.variantId,
        },
      });

      // Verify activeSessionId preserved
      recorder.recordAssertion({
        name: 'active-session-id-preserved',
        pass: renameResult.storyline.activeSessionId === initialSessionId,
        details: {
          expected: initialSessionId,
          actual: renameResult.storyline.activeSessionId,
        },
      });

      // Verify headCheckpointId preserved
      recorder.recordAssertion({
        name: 'head-checkpoint-id-preserved',
        pass: renameResult.storyline.headCheckpointId === initialHeadCheckpointId,
        details: {
          expected: initialHeadCheckpointId,
          actual: renameResult.storyline.headCheckpointId,
        },
      });

      // Verify sourceCheckpointId preserved
      recorder.recordAssertion({
        name: 'source-checkpoint-id-preserved',
        pass: renameResult.storyline.sourceCheckpointId === initialSourceCheckpointId,
        details: {
          expected: initialSourceCheckpointId,
          actual: renameResult.storyline.sourceCheckpointId,
        },
      });

      // Verify session checkpoint count preserved
      const finalSession = kernel.getState().runtimeSessions.sessionsById[initialSessionId ?? ''];
      recorder.recordAssertion({
        name: 'session-checkpoint-count-preserved',
        pass: (finalSession?.orderedCheckpointIds.length ?? 0) === initialCheckpointCount,
        details: {
          expected: initialCheckpointCount,
          actual: finalSession?.orderedCheckpointIds.length,
        },
      });

      // Verify session lifecycle preserved
      recorder.recordAssertion({
        name: 'session-lifecycle-preserved',
        pass: finalSession?.lifecycle === initialLifecycle,
        details: {
          expected: initialLifecycle,
          actual: finalSession?.lifecycle,
        },
      });

      // Verify variant workspace preserved
      const variantState = kernel.getState().variantsById[initialVariantId ?? ''];
      recorder.recordAssertion({
        name: 'variant-workspace-preserved',
        pass: !!variantState,
        details: {
          variantId: initialVariantId,
          hasVariantState: !!variantState,
        },
      });

      // Test no-op rename (same name)
      const noOpResult = await substrate.updateStorylineDisplayName({
        packageName: 'test-package',
        storylineId,
        nextDisplayName: newName, // Same name
      });

      recorder.recordAssertion({
        name: 'no-op-rename-succeeds',
        pass: noOpResult.storyline.name === newName,
        details: {
          name: newName,
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
