import { describe, expect, it } from 'vitest';

import { createGossipelogV2HeroOutgoingScenario } from '../scenarios/gossipelog-v2-hero-outgoing';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('gossipelog v2 hero-outgoing rejection scenario', () => {
  it('falls back to persisted state when adapter returns hero-outgoing memory update', async () => {
    const report = await runSimulationScenario(createGossipelogV2HeroOutgoingScenario());

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
