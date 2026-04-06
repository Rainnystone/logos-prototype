import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';

import { createMockKernel } from '@simulation/mock-kernel';
import { createSubstrateMock } from '@simulation/substrate-mock';
import { createMockFixtureBuilder } from '@simulation/mock-fixture-builder';
import { createStorylineObserver } from '@simulation/storyline-observer';

/**
 * Create a switch and continue scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md Section 10.1
 *
 * This scenario verifies:
 * - Switching a storyline updates the active storyline without inventing a separate selected-row state
 * - The resulting trace stays story-agnostic and kernel-backed
 */
export function createSwitchAndContinueScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'switch_and_continue',
    packageName: 'test-package',

    run({ recorder }) {
      // Create kernel and helpers
      const kernel = createMockKernel('test-package');
      const substrate = createSubstrateMock(kernel);
      const builder = createMockFixtureBuilder(kernel);
      const observer = createStorylineObserver(kernel);

      // Build initial state with multiple storylines
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);

      const initialActiveStorylineId = kernel.getState().storylineRepository?.activeStorylineId ?? '';
      const targetStorylineId = initialActiveStorylineId === 'storyline_main'
        ? 'storyline_alt'
        : 'storyline_main';

      // Record initial state
      recorder.recordAction({
        kind: 'storyline.switch_active',
        operation: 'resolve_initial',
        details: {
          initialActiveStorylineId,
          targetStorylineId,
        },
      });

      // Execute switch
      substrate.switchActiveStoryline({
        packageName: 'test-package',
        storylineId: targetStorylineId,
      });

      // Record action
      recorder.recordAction({
        kind: 'storyline.switch_active',
        operation: 'switched',
        details: {
          newActiveStorylineId: targetStorylineId,
        },
      });

      // Verify active storyline updated
      const newActiveStorylineId = kernel.getState().storylineRepository?.activeStorylineId ?? '';
      recorder.recordAssertion({
        name: 'active-storyline-updated',
        pass: newActiveStorylineId === targetStorylineId,
        details: {
          expected: targetStorylineId,
          actual: newActiveStorylineId,
        },
      });

      // Verify session binding follows storyline switch
      const storyline = kernel.getState().storylineRepository?.storylinesById[targetStorylineId];
      const activeSessionId = kernel.getState().runtimeSessions.activeSessionId;
      recorder.recordAssertion({
        name: 'session-binding-follows-storyline',
        pass: storyline?.activeSessionId === activeSessionId,
        details: {
          storylineSessionId: storyline?.activeSessionId,
          activeSessionId,
        },
      });

      // Capture state summary for assertions
      const summary = observer.getSummary();

      // Verify single active storyline (no separate selection state)
      recorder.recordAssertion({
        name: 'single-active-storyline-no-selection-state',
        pass: summary.activeStorylineId === targetStorylineId,
        details: {
          activeStorylineId: summary.activeStorylineId,
        },
      });

      // Verify runtime session aligned
      recorder.recordAssertion({
        name: 'runtime-session-aligned',
        pass: kernel.getState().runtimeSessions.activeSessionId === storyline?.activeSessionId,
        details: {
          runtimeActiveSessionId: kernel.getState().runtimeSessions.activeSessionId,
          storylineActiveSessionId: storyline?.activeSessionId,
        },
      });

      // Cleanup
      kernel.cleanup();

      return {
        finalState: {
          storylineCount: summary.storylineCount,
          variantCount: summary.variantCount,
          sessionCount: summary.sessionCount,
          activeStorylineId: newActiveStorylineId,
          activeSessionId,
          initialActiveStorylineId,
        },
      };
    },
  };
}