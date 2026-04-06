import { describe, expect, it } from 'vitest';

import { createSwitchAndContinueScenario } from '../src/scenarios/storyline-flows/switch-and-continue';

import { runSimulationScenario } from '@simulation/scenario-runner';

/**
 * Tests for switch_and_continue scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md Section 10.1
 *
 * This scenario verifies:
 * - Switching a storyline updates the active storyline without inventing a separate selected-row state
 * - The resulting trace stays story-agnostic and kernel-backed
 */
describe('switch and continue scenario', () => {
  it('switches active storyline without separate selected-row state', async () => {
    const report = await runSimulationScenario(createSwitchAndContinueScenario());

    // All assertions should pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Active storyline should be updated
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'active-storyline-updated',
        pass: true,
      }),
    );

    // Session binding should follow storyline switch
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'session-binding-follows-storyline',
        pass: true,
      }),
    );

    // No separate "selected row" state should exist
    // This is verified by checking that only one active storyline exists
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'single-active-storyline-no-selection-state',
        pass: true,
      }),
    );
  });

  it('trace stays story-agnostic and kernel-backed', async () => {
    const report = await runSimulationScenario(createSwitchAndContinueScenario());

    // Trace should have actions recorded
    expect(report.actions.length).toBeGreaterThan(0);

    // Trace should not contain story-specific content
    const allDetails = report.actions
      .map((a) => JSON.stringify(a.details ?? {}))
      .join('');

    // Should not contain hardcoded character names or story text
    expect(allDetails).not.toContain('Simulation Hero');
    expect(allDetails).not.toContain('beat-1');

    // Operations should reference kernel-backed operations
    expect(report.actions).toContainEqual(
      expect.objectContaining({
        kind: 'storyline.switch_active',
      }),
    );
  });

  it('verifies kernel state after switch', async () => {
    const report = await runSimulationScenario(createSwitchAndContinueScenario());

    // Final state should have correct active storyline
    expect(report.finalState).toMatchObject({
      activeStorylineId: expect.any(String),
    });

    // Active storyline should be the target storyline (not the initial one)
    const finalState = report.finalState as {
      initialActiveStorylineId: string;
      activeStorylineId: string;
    };
    expect(finalState.activeStorylineId).not.toBe(finalState.initialActiveStorylineId);
  });

  it('runtime sessions reflect storyline binding', async () => {
    const report = await runSimulationScenario(createSwitchAndContinueScenario());

    // Runtime session active session should match storyline session
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'runtime-session-aligned',
        pass: true,
      }),
    );
  });
});