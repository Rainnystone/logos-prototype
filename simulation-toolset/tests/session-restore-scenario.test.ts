import { describe, expect, it } from 'vitest';

import { createSessionRestoreScenario } from '../scenarios/session-restore';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('session restore scenario', () => {
  it('preserves session state after multiple accepted beats', async () => {
    const report = await runSimulationScenario(createSessionRestoreScenario());

    // Verify all assertions pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Verify beats were accepted (2-3 beats)
    expect(report.runtimeTrace?.length).toBeGreaterThanOrEqual(2);
    expect(report.runtimeTrace?.every((item) => item.accepted)).toBe(true);

    // Verify session restoration succeeded
    expect(report.finalState).toMatchObject({
      restored: true,
    });

    // Verify beat history is preserved
    expect(report.finalState).toHaveProperty('checkpointCount');
    expect((report.finalState as Record<string, unknown>).checkpointCount).toBeGreaterThanOrEqual(2);

    // Verify relationship layer is preserved
    expect(report.finalState).toHaveProperty('relationshipSource');
    expect((report.finalState as Record<string, unknown>).relationshipSource).toMatch(/session|checkpoint/);
  });

  it('restores matching state snapshot', async () => {
    const report = await runSimulationScenario(createSessionRestoreScenario());

    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'restored-state-matches-recorded',
        pass: true,
      }),
    );

    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'beat-history-preserved',
        pass: true,
      }),
    );
  });

  it('preserves relationship layer across restore', async () => {
    const report = await runSimulationScenario(createSessionRestoreScenario());

    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'relationship-layer-preserved',
        pass: true,
      }),
    );
  });
});