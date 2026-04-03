import { describe, expect, it } from 'vitest';

import { createStaleRefreshProtectionScenario } from '../scenarios/stale-refresh-protection';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('stale refresh protection scenario', () => {
  it('verifies new session is unaffected when gossipelog refresh completes after reset', async () => {
    const report = await runSimulationScenario(createStaleRefreshProtectionScenario());

    // Verify the scenario completed successfully
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Verify that stale refresh protection was verified
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'stale-refresh-protection-verified',
        pass: true,
      }),
    );

    // Verify new session was unaffected
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'new-session-unaffected',
        pass: true,
      }),
    );

    // Verify reset was executed during pending refresh
    expect(report.actions).toContainEqual(
      expect.objectContaining({
        kind: 'session.reset',
      }),
    );

    // Verify delayed gossipelogUpdate was recorded
    expect(report.adapterTrace?.some((item) => item.outcome === 'delayed')).toBe(true);

    // Verify old session checkpoint was finalized (allowed)
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'old-session-finalization-allowed',
        pass: true,
      }),
    );
  });
});