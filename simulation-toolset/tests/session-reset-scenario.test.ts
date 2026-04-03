import { describe, expect, it } from 'vitest';

import { createSessionResetScenario } from '../scenarios/session-reset';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('session reset scenario', () => {
  it('creates new session with awaiting_start lifecycle while preserving old session', async () => {
    const report = await runSimulationScenario(createSessionResetScenario());

    // All assertions should pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Verify session trace exists
    expect(report.finalState).toHaveProperty('oldSessionId');
    expect(report.finalState).toHaveProperty('newSessionId');
    expect(report.finalState).toHaveProperty('resetPerformed');

    // New session should have different ID
    expect(report.finalState.newSessionId).not.toBe(report.finalState.oldSessionId);

    // Check specific assertions
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'reset-created-new-session',
        pass: true,
      }),
    );

    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'old-session-preserved',
        pass: true,
      }),
    );

    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'new-session-awaiting-start',
        pass: true,
      }),
    );

    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'new-session-no-checkpoints',
        pass: true,
      }),
    );
  });
});