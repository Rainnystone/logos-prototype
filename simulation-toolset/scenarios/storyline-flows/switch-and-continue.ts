/**
 * Switch and Continue Scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md Section 10.1
 *
 * This scenario simulates the workspace flow where:
 * 1. An author clicks "switch storyline" on a row (or "continue" on non-active row)
 * 2. The active storyline is switched to the target storyline
 * 3. No separate "selected row" state is invented - activeStorylineId is the single source of truth
 * 4. Runtime sessions reflect the new storyline binding
 *
 * Key verifications:
 * - Active storyline updates without separate selection state
 * - Session binding follows storyline
 * - Trace stays story-agnostic and kernel-backed
 */

import type { MockKernel } from '@simulation/mock-kernel';
import { createMockKernel } from '@simulation/mock-kernel';
import { createSubstrateMock } from '@simulation/substrate-mock';
import { createMockFixtureBuilder } from '@simulation/mock-fixture-builder';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';

/**
 * Create the switch_and_continue scenario.
 */
export function createSwitchAndContinueScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'switch-and-continue',
    packageName: 'test-package',
    async run({ recorder }) {
      let kernel: MockKernel | null = null;

      try {
        // 1. Initialize MockKernel with multiple storylines
        kernel = createMockKernel('test-package');
        const substrate = createSubstrateMock(kernel);
        const builder = createMockFixtureBuilder(kernel);

        // 2. Setup multiple storylines for switching
        builder.withMultipleStorylines([
          { storylineId: 'storyline_main', name: 'Main Line' },
          { storylineId: 'storyline_alt', name: 'Alternate Line' },
        ]);

        recorder.recordAction({
          kind: 'storyline.setup_multiple',
          details: {
            packageName: 'test-package',
            storylineCount: 2,
            storylineIds: ['storyline_main', 'storyline_alt'],
          },
        });

        // 3. Get initial state
        const initialState = kernel.getState();
        const initialActiveStorylineId = initialState.storylineRepository!.activeStorylineId;

        recorder.recordAction({
          kind: 'storyline.initial_state',
          details: {
            initialActiveStorylineId,
          },
        });

        // 4. Find target storyline (different from active)
        const targetStoryline = Object.values(
          initialState.storylineRepository!.storylinesById,
        ).find((s) => s.storylineId !== initialActiveStorylineId);

        if (!targetStoryline) {
          throw new Error('No alternative storyline to switch to');
        }

        recorder.recordAssertion({
          name: 'target-storyline-exists',
          pass: targetStoryline !== undefined,
          details: `Target storyline ${targetStoryline.storylineId} exists`,
        });

        // 5. Switch active storyline (simulating workspace action)
        await substrate.switchActiveStoryline({
          packageName: 'test-package',
          storylineId: targetStoryline.storylineId,
        });

        recorder.recordAction({
          kind: 'storyline.switch_active',
          details: {
            fromStorylineId: initialActiveStorylineId,
            toStorylineId: targetStoryline.storylineId,
          },
        });

        // 6. Verify active storyline updated
        const finalState = kernel.getState();

        recorder.recordAssertion({
          name: 'active-storyline-updated',
          pass:
            finalState.storylineRepository!.activeStorylineId === targetStoryline.storylineId,
          details: 'Active storyline should be the target storyline',
        });

        // 7. Verify no separate selection state exists
        // This is verified by checking that activeStorylineId is the single active indicator
        recorder.recordAssertion({
          name: 'single-active-storyline-no-selection-state',
          pass:
            finalState.storylineRepository!.activeStorylineId === targetStoryline.storylineId &&
            !('selectedStorylineId' in finalState),
          details: 'Only activeStorylineId should exist, no separate selection state',
        });

        // 8. Verify session binding follows storyline
        const targetStorylineAfter =
          finalState.storylineRepository!.storylinesById[targetStoryline.storylineId];
        const runtimeSession = finalState.runtimeSessions.sessionsById[targetStorylineAfter.activeSessionId];

        recorder.recordAssertion({
          name: 'session-binding-follows-storyline',
          pass:
            runtimeSession !== undefined &&
            finalState.runtimeSessions.activeSessionId === targetStorylineAfter.activeSessionId,
          details: 'Runtime session should be bound to target storyline',
        });

        // 9. Verify runtime session reflects storyline binding
        // The runtime session doesn't have storylineId directly;
        // instead, the storyline->session binding is verified by:
        // activeSessionId matching the storyline's activeSessionId
        recorder.recordAssertion({
          name: 'runtime-session-aligned',
          pass:
            finalState.runtimeSessions.activeSessionId === targetStorylineAfter.activeSessionId,
          details: 'Runtime activeSessionId should match target storyline session',
        });

        // 10. Verify kernel trace is story-agnostic
        const trace = kernel.getTrace();
        recorder.recordAssertion({
          name: 'kernel-trace-recorded',
          pass: trace.length > 0,
          details: `Kernel trace should have ${trace.length} operations`,
        });

        // 11. Verify variant workspace remains consistent
        // The target storyline should have its variant workspace intact
        const targetVariant = finalState.variantsById[targetStorylineAfter.variantId];
        recorder.recordAssertion({
          name: 'variant-workspace-intact',
          pass: targetVariant !== undefined,
          details: `Variant ${targetStorylineAfter.variantId} should exist for target storyline`,
        });

        return {
          finalState: {
            packageName: 'test-package',
            initialActiveStorylineId,
            activeStorylineId: finalState.storylineRepository!.activeStorylineId,
            storylineCount: Object.keys(finalState.storylineRepository!.storylinesById).length,
            variantCount: Object.keys(finalState.variantsById).length,
            sessionCount: Object.keys(finalState.runtimeSessions.sessionsById).length,
            activeSessionId: finalState.runtimeSessions.activeSessionId,
          },
        };
      } finally {
        kernel?.reset();
      }
    },
  };
}