import { describe, expect, it } from 'vitest';

import { createGossipelogV2MemoryUpdateScenario } from '../scenarios/gossipelog-v2-memory-update';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('gossipelog v2 memory update scenario', () => {
  it('completes a v2 memory update cycle with 1 memoryUpdate and applied outcome', async () => {
    const report = await runSimulationScenario(createGossipelogV2MemoryUpdateScenario());

    expect(report.assertions.every((item) => item.pass)).toBe(true);
    expect(report.agentTrace?.[0]).toMatchObject({
      agentId: 'gossipelog',
      stage: 'cycle',
      outcome: 'applied',
    });
    expect(report.agentTrace?.[0]?.sideEffectSummary).toContainEqual(
      expect.stringContaining('memory-count:1'),
    );
    expect(report.agentTrace?.[0]?.details).toMatchObject({
      stableBackgroundText: 'v2-memory-update-stable-background',
    });
  });
});
