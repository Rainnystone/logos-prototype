import { describe, expect, it } from 'vitest';

import { createLegacyBootstrapFlowScenario } from '../src/scenarios/storyline-flows/legacy-bootstrap-flow';

import { runSimulationScenario } from '@simulation/scenario-runner';

/**
 * Tests for legacy_bootstrap_flow scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-1-storyline-substrate-design.md Section 10.1-10.4
 *
 * This scenario verifies:
 * - Legacy packages (without storyline-repository.json) still work
 * - The package resolves as one implicit default storyline
 * - First write triggers bootstrap and materializes the repository
 * - Bootstrap creates default variant workspace
 * - Bootstrap binds existing session or creates new session
 */
describe('legacy bootstrap flow scenario', () => {
  it('resolves implicit storyline without repository', async () => {
    const report = await runSimulationScenario(createLegacyBootstrapFlowScenario());

    // All assertions should pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Legacy implicit context should be detected
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'legacy-implicit-context-detected',
        pass: true,
      }),
    );

    // Implicit default storyline should resolve
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'implicit-default-storyline-resolved',
        pass: true,
      }),
    );
  });

  it('first write triggers bootstrap', async () => {
    const report = await runSimulationScenario(createLegacyBootstrapFlowScenario());

    // Bootstrap should be triggered on first write
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'bootstrap-triggered-on-write',
        pass: true,
      }),
    );

    // Repository should be created after bootstrap
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'repository-created-after-bootstrap',
        pass: true,
      }),
    );
  });

  it('creates default variant workspace', async () => {
    const report = await runSimulationScenario(createLegacyBootstrapFlowScenario());

    // Default variant should be created
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'default-variant-created',
        pass: true,
      }),
    );

    // Variant workspace should have correct structure
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'variant-workspace-structure-valid',
        pass: true,
      }),
    );
  });

  it('creates or binds session', async () => {
    const report = await runSimulationScenario(createLegacyBootstrapFlowScenario());

    // Session should be bound or created
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'session-bound-or-created',
        pass: true,
      }),
    );

    // Session should be storyline-bound
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'session-storyline-bound',
        pass: true,
      }),
    );
  });

  it('switches to explicit substrate after bootstrap', async () => {
    const report = await runSimulationScenario(createLegacyBootstrapFlowScenario());

    // After bootstrap, context should not be legacy implicit
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'explicit-substrate-after-bootstrap',
        pass: true,
      }),
    );

    // activeStorylineId should resolve correctly
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'active-storyline-id-resolves',
        pass: true,
      }),
    );
  });

  it('trace stays story-agnostic and kernel-backed', async () => {
    const report = await runSimulationScenario(createLegacyBootstrapFlowScenario());

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
        kind: 'storyline.bootstrap_legacy',
      }),
    );
  });

  it('maintains kernel consistency after bootstrap', async () => {
    const report = await runSimulationScenario(createLegacyBootstrapFlowScenario());

    // Final state should have storyline repository
    expect(report.finalState).toMatchObject({
      storylineCount: expect.any(Number),
    });

    // Storyline count should be 1 after bootstrap
    const finalState = report.finalState as { storylineCount: number };
    expect(finalState.storylineCount).toBe(1);

    // Variant count should be 1 after bootstrap
    const finalStateWithVariants = report.finalState as { variantCount: number };
    expect(finalStateWithVariants.variantCount).toBe(1);
  });
});