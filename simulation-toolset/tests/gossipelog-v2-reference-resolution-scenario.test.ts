import { describe, expect, it } from 'vitest';

import { createGossipelogV2ReferenceResolutionScenario } from '../scenarios/gossipelog-v2-reference-resolution';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('gossipelog v2 reference resolution scenario', () => {
  it('completes a v2 cycle where update request contains resolved references and injection does not', async () => {
    const report = await runSimulationScenario(
      createGossipelogV2ReferenceResolutionScenario(),
    );

    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // The adapter trace should show the update operation was called
    expect(report.adapterTrace?.[0]).toMatchObject({
      operation: 'gossipelogUpdate',
      outcome: 'result',
    });

    // The adapter trace should also show the injection operation
    expect(report.adapterTrace?.[1]).toMatchObject({
      operation: 'gossipelogInjection',
      outcome: 'result',
    });

    // The agent trace should show applied outcome
    expect(report.agentTrace?.[0]).toMatchObject({
      agentId: 'gossipelog',
      stage: 'cycle',
      outcome: 'applied',
    });
  });
});
