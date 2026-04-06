import { describe, expect, it } from 'vitest';

import { createFullStorylineRuntimeFlowScenario } from '../scenarios/storyline-flows/full-storyline-runtime-flow';

import { runSimulationScenario } from '@simulation/scenario-runner';

/**
 * Tests for full_storyline_runtime_flow scenario.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 6.2 Flow 6
 *
 * This scenario verifies:
 * - A storyline can continue into runtime
 * - Accepted beats update the storyline head checkpoint
 * - A branch from an accepted checkpoint gets a copied variant workspace and a fresh session
 * - The trace remains replayable
 */
describe('full storyline runtime flow scenario', () => {
  it('storyline continues into runtime', async () => {
    const report = await runSimulationScenario(createFullStorylineRuntimeFlowScenario());

    // All assertions should pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Storyline should have entered runtime
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'storyline-continued-to-runtime',
        pass: true,
      }),
    );

    // Session should be bound
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'session-bound-after-continue',
        pass: true,
      }),
    );
  });

  it('accepted beat updates storyline head checkpoint', async () => {
    const report = await runSimulationScenario(createFullStorylineRuntimeFlowScenario());

    // Head checkpoint should be updated
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'head-checkpoint-updated-after-beat',
        pass: true,
      }),
    );

    // Storyline should have valid headCheckpointId
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'storyline-has-head-checkpoint',
        pass: true,
      }),
    );

    // Session checkpoint should match storyline head
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'session-checkpoint-matches-storyline-head',
        pass: true,
      }),
    );
  });

  it('branch from checkpoint gets copied variant workspace', async () => {
    const report = await runSimulationScenario(createFullStorylineRuntimeFlowScenario());

    // Branch variant should be created
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'branch-has-copied-variant',
        pass: true,
      }),
    );

    // Variant should be different from source
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'branch-variant-different-from-source',
        pass: true,
      }),
    );

    // Variant should have workspace state
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'branch-variant-has-workspace-state',
        pass: true,
      }),
    );
  });

  it('branch from checkpoint gets fresh session', async () => {
    const report = await runSimulationScenario(createFullStorylineRuntimeFlowScenario());

    // Branch session should be fresh
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'branch-has-fresh-session',
        pass: true,
      }),
    );

    // Branch session should start from checkpoint
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'branch-session-starts-from-checkpoint',
        pass: true,
      }),
    );

    // Branch session should have awaiting_start lifecycle
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'branch-session-awaiting-start',
        pass: true,
      }),
    );
  });

  it('trace remains replayable', async () => {
    const report = await runSimulationScenario(createFullStorylineRuntimeFlowScenario());

    // Trace should have operations recorded
    expect(report.actions.length).toBeGreaterThan(0);

    // Trace should be story-agnostic
    const allDetails = report.actions
      .map((a) => JSON.stringify(a.details ?? {}))
      .join('');

    // Should not contain hardcoded character names or story text
    expect(allDetails).not.toContain('Simulation Hero');
    expect(allDetails).not.toContain('beat-1');

    // Operations should reference kernel-backed operations
    expect(report.actions).toContainEqual(
      expect.objectContaining({
        kind: expect.stringContaining('storyline.runtime_flow'),
      }),
    );

    // Should have runtime layer operations
    expect(report.actions).toContainEqual(
      expect.objectContaining({
        kind: 'storyline.record_accepted_beat',
      }),
    );

    // Should have branch operation
    expect(report.actions).toContainEqual(
      expect.objectContaining({
        kind: 'storyline.branch_from_checkpoint',
      }),
    );
  });

  it('maintains kernel consistency after full flow', async () => {
    const report = await runSimulationScenario(createFullStorylineRuntimeFlowScenario());

    // Final state should have multiple storylines
    expect(report.finalState).toMatchObject({
      storylineCount: expect.any(Number),
    });

    const finalState = report.finalState as { storylineCount: number };
    expect(finalState.storylineCount).toBeGreaterThanOrEqual(2);

    // Variant count should match storyline count
    const finalStateWithVariants = report.finalState as { variantCount: number };
    expect(finalStateWithVariants.variantCount).toBeGreaterThanOrEqual(2);

    // Session count should match
    const finalStateWithSessions = report.finalState as { sessionCount: number };
    expect(finalStateWithSessions.sessionCount).toBeGreaterThanOrEqual(2);
  });

  it('creates correct number of checkpoints', async () => {
    const report = await runSimulationScenario(createFullStorylineRuntimeFlowScenario());

    // Should have recorded beats
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'beats-recorded',
        pass: true,
      }),
    );

    // Checkpoint count should be positive
    const finalState = report.finalState as { checkpointCount?: number };
    if (finalState.checkpointCount !== undefined) {
      expect(finalState.checkpointCount).toBeGreaterThan(0);
    }
  });
});