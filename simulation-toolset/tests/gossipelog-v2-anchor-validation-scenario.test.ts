import { describe, expect, it } from 'vitest';

import { createGossipelogV2AnchorValidationScenario } from '../scenarios/gossipelog-v2-anchor-validation';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('gossipelog v2 anchor validation scenario', () => {
  it('falls back to persisted state when adapter returns mismatched phaseId anchor', async () => {
    const report = await runSimulationScenario(createGossipelogV2AnchorValidationScenario());

    expect(report.assertions.every((item) => item.pass)).toBe(true);
    expect(report.agentTrace?.[0]).toMatchObject({
      agentId: 'gossipelog',
      stage: 'cycle',
      outcome: 'fallback',
    });
    expect(report.agentTrace?.[0]?.details).toMatchObject({
      usedFallbackSource: 'persisted-relationship-state',
    });
  });
});
