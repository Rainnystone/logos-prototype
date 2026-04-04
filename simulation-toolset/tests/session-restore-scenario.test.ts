import { describe, expect, it } from 'vitest';

import { createSessionRestoreScenario } from '../scenarios/session-restore';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('session restore scenario', () => {
  it('restores session state with beat history and relationship layer intact', async () => {
    const report = await runSimulationScenario(createSessionRestoreScenario());

    // All scenario-internal assertions must pass
    expect(report.assertions.every((a) => a.pass)).toBe(true);

    // Spot-check key named assertions are present and passing
    const keyAssertions = [
      'session-restored',
      'beat-history-preserved',
      'relationship-layer-preserved',
      'active-checkpoint-exists',
    ] as const;

    for (const name of keyAssertions) {
      expect(report.assertions).toContainEqual(
        expect.objectContaining({ name, pass: true }),
      );
    }
  });
});