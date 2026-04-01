import { describe, expect, it } from 'vitest';

import { createAdapterFailureScenario } from '../scenarios/adapter-failure';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('adapter failure scenario', () => {
  it('records gossipelog injection fallback and leaves a resolved report outcome', async () => {
    const report = await runSimulationScenario(createAdapterFailureScenario());

    expect(report.agentTrace?.[0]).toMatchObject({
      usedFallbackLayer: 'last-stable-layer',
    });
    expect(report.assertions.every((item) => item.pass)).toBe(true);
  });
});
