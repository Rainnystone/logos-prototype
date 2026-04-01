import { describe, expect, it } from 'vitest';

import { createValidationFailureScenario } from '../scenarios/validation-failure';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('validation failure scenario', () => {
  it('captures save_blocked without mutating package files', async () => {
    const report = await runSimulationScenario(createValidationFailureScenario());

    expect(report.authoringTrace?.[0]).toMatchObject({
      resultKind: 'save_blocked',
    });
    expect(report.assertions.every((item) => item.pass)).toBe(true);
  });
});
