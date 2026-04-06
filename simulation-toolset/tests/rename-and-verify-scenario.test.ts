import { describe, expect, it } from 'vitest';

import { createRenameAndVerifyScenario } from '../src/scenarios/storyline-flows/rename-and-verify';

import { runSimulationScenario } from '@simulation/scenario-runner';

/**
 * Tests for rename_and_verify scenario.
 *
 * Reference: docs/superpowers/specs/2026-04-06-phase-3-part-2-package-storyline-workspace-design.md Section 9.2
 *
 * This scenario verifies:
 * - Renaming only changes storyline name and updatedAt
 * - Renaming does NOT change: storylineId, variantId, activeSessionId, checkpoint ids
 * - Renaming does NOT affect runtime-sessions.json
 * - Renaming does NOT affect variant workspace files
 */
describe('rename and verify scenario', () => {
  it('updates display name only', async () => {
    const report = await runSimulationScenario(createRenameAndVerifyScenario());

    // All assertions should pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Name should be updated
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'storyline-name-updated',
        pass: true,
      }),
    );

    // updatedAt should be updated
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'updated-at-changed',
        pass: true,
      }),
    );
  });

  it('preserves storylineId', async () => {
    const report = await runSimulationScenario(createRenameAndVerifyScenario());

    // storylineId should not change
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'storyline-id-preserved',
        pass: true,
      }),
    );
  });

  it('preserves variantId', async () => {
    const report = await runSimulationScenario(createRenameAndVerifyScenario());

    // variantId should not change
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'variant-id-preserved',
        pass: true,
      }),
    );
  });

  it('preserves activeSessionId', async () => {
    const report = await runSimulationScenario(createRenameAndVerifyScenario());

    // activeSessionId should not change
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'active-session-id-preserved',
        pass: true,
      }),
    );
  });

  it('preserves checkpoint ids', async () => {
    const report = await runSimulationScenario(createRenameAndVerifyScenario());

    // headCheckpointId should not change
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'head-checkpoint-id-preserved',
        pass: true,
      }),
    );

    // sourceCheckpointId should not change
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'source-checkpoint-id-preserved',
        pass: true,
      }),
    );
  });

  it('preserves runtime session state', async () => {
    const report = await runSimulationScenario(createRenameAndVerifyScenario());

    // Session checkpoint count should not change
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'session-checkpoint-count-preserved',
        pass: true,
      }),
    );

    // Session lifecycle should not change
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'session-lifecycle-preserved',
        pass: true,
      }),
    );
  });

  it('preserves variant workspace state', async () => {
    const report = await runSimulationScenario(createRenameAndVerifyScenario());

    // Variant workspace flags should not change
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'variant-workspace-preserved',
        pass: true,
      }),
    );
  });

  it('trace stays story-agnostic and kernel-backed', async () => {
    const report = await runSimulationScenario(createRenameAndVerifyScenario());

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
        kind: 'storyline.update_display_name',
      }),
    );
  });

  it('handles no-op rename gracefully', async () => {
    const report = await runSimulationScenario(createRenameAndVerifyScenario());

    // No-op rename should succeed
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'no-op-rename-succeeds',
        pass: true,
      }),
    );
  });
});