import { describe, expect, it } from 'vitest';

import {
  createValidationFailureScenario,
  createValidationSuccessScenario,
} from '../scenarios/validation-failure';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('validation failure scenario', () => {
  it('captures save_blocked without mutating package files', async () => {
    const report = await runSimulationScenario(createValidationFailureScenario());

    expect(report.authoringTrace?.[0]).toMatchObject({
      resultKind: 'save_blocked',
    });
    expect(report.assertions.every((item) => item.pass)).toBe(true);
  });

  it('captures save_applied when payload is valid', async () => {
    const report = await runSimulationScenario(createValidationSuccessScenario());

    expect(report.authoringTrace?.[0]).toMatchObject({
      resultKind: 'save_applied',
    });
    expect(report.assertions.every((item) => item.pass)).toBe(true);
  });
});
