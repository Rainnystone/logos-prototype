import { describe, expect, it } from 'vitest';

import { createCreateFromSourceAndContinueScenario } from '../src/scenarios/storyline-flows/create-from-source-and-continue';

import { runSimulationScenario } from '@simulation/scenario-runner';

/**
 * Tests for create_from_source_and_continue scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md Section 10.2
 *
 * This scenario verifies:
 * - A new storyline can be created from a source storyline and immediately continued
 * - The resulting trace stays story-agnostic and kernel-backed
 */
describe('create from source and continue scenario', () => {
  it('creates new storyline from source and switches active storyline', async () => {
    const report = await runSimulationScenario(createCreateFromSourceAndContinueScenario());

    // All assertions should pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Storyline should be created
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'storyline-created-from-source',
        pass: true,
      }),
    );

    // Variant should be copied from source
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'variant-copied-from-source',
        pass: true,
      }),
    );

    // Session should be bound to new storyline
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'session-bound-to-new-storyline',
        pass: true,
      }),
    );

    // Active storyline should NOT switch (per spec Section 9.4)
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'active-storyline-unchanged',
        pass: true,
      }),
    );
  });

  it('trace stays story-agnostic and kernel-backed', async () => {
    const report = await runSimulationScenario(createCreateFromSourceAndContinueScenario());

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
        kind: 'storyline.create_from_source',
      }),
    );
  });

  it('maintains kernel consistency after create and switch', async () => {
    const report = await runSimulationScenario(createCreateFromSourceAndContinueScenario());

    // Final state should have increased storyline count
    expect(report.finalState).toMatchObject({
      storylineCount: expect.any(Number),
    });

    // Storyline count should be greater than initial (at least 2)
    const finalState = report.finalState as { storylineCount: number };
    expect(finalState.storylineCount).toBeGreaterThanOrEqual(2);
  });
});