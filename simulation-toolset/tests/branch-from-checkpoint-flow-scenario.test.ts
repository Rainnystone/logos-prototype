import { describe, expect, it } from 'vitest';

import { createBranchFromCheckpointFlowScenario } from '../scenarios/storyline-flows/branch-from-checkpoint-flow';

import { runSimulationScenario } from '@simulation/scenario-runner';

/**
 * Tests for branch_from_checkpoint_flow scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-1-storyline-substrate-design.md Section 9.3
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md Section 8.3
 *
 * This scenario verifies:
 * - Branching from a reachable checkpoint creates a new storyline rooted at that checkpoint
 * - The new storyline has sourceCheckpointId and headCheckpointId set to the selected checkpoint
 * - The new storyline's session starts from that checkpoint
 * - The new storyline receives a copied variant workspace
 */
describe('branch from checkpoint flow scenario', () => {
  it('creates new storyline rooted at selected checkpoint', async () => {
    const report = await runSimulationScenario(createBranchFromCheckpointFlowScenario());

    // All assertions should pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // New storyline should be created
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'storyline-created-from-checkpoint',
        pass: true,
      }),
    );

    // New storyline should have correct sourceCheckpointId
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'source-checkpoint-id-set',
        pass: true,
      }),
    );

    // New storyline should have correct headCheckpointId
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'head-checkpoint-id-set',
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
  });

  it('new session starts from selected checkpoint', async () => {
    const report = await runSimulationScenario(createBranchFromCheckpointFlowScenario());

    // New session should be rooted at checkpoint
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'session-rooted-at-checkpoint',
        pass: true,
      }),
    );

    // Session should have checkpoint copied
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'checkpoint-copied-to-new-session',
        pass: true,
      }),
    );
  });

  it('only reachable checkpoints can be branched', async () => {
    const report = await runSimulationScenario(createBranchFromCheckpointFlowScenario());

    // Reachability assertion should pass
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'checkpoint-reachable-from-source',
        pass: true,
      }),
    );
  });

  it('trace stays story-agnostic and kernel-backed', async () => {
    const report = await runSimulationScenario(createBranchFromCheckpointFlowScenario());

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
        kind: 'storyline.branch_from_checkpoint',
      }),
    );
  });

  it('maintains kernel consistency after branch', async () => {
    const report = await runSimulationScenario(createBranchFromCheckpointFlowScenario());

    // Final state should have increased storyline count
    expect(report.finalState).toMatchObject({
      storylineCount: expect.any(Number),
    });

    // Storyline count should be greater than initial (at least 2)
    const finalState = report.finalState as { storylineCount: number };
    expect(finalState.storylineCount).toBeGreaterThanOrEqual(2);

    // Variant count should increase
    const finalStateWithVariants = report.finalState as { variantCount: number };
    expect(finalStateWithVariants.variantCount).toBeGreaterThanOrEqual(2);
  });
});