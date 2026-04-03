import { describe, expect, it } from 'vitest';

import { createSessionCheckpointPersistenceScenario } from '../scenarios/session-checkpoint-persistence';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('session checkpoint persistence scenario', () => {
  it('creates checkpoint after accepted beat with correct ordinal and state snapshot', async () => {
    const report = await runSimulationScenario(createSessionCheckpointPersistenceScenario());

    // All assertions should pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Session should be in_progress lifecycle
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'session-lifecycle-in-progress',
        pass: true,
      }),
    );

    // Checkpoint should exist
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'checkpoint-created-after-beat',
        pass: true,
      }),
    );

    // Checkpoint should have correct beat ordinal (1 for first beat)
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'checkpoint-has-correct-beat-ordinal',
        pass: true,
      }),
    );

    // Checkpoint should have state snapshot
    expect(report.assertions).toContainEqual(
      expect.objectContaining({
        name: 'checkpoint-has-state-snapshot',
        pass: true,
      }),
    );
  });
});