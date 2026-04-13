import { describe, expect, it } from 'vitest';

import { createGossipelogV2MergeIdempotencyScenario } from '../scenarios/gossipelog-v2-merge-idempotency';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('gossipelog v2 merge idempotency scenario', () => {
  it('does not duplicate history when the same memory update is applied twice', async () => {
    const report = await runSimulationScenario(createGossipelogV2MergeIdempotencyScenario());

    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // First cycle: applied (non-no-op result from adapter)
    expect(report.agentTrace?.[0]).toMatchObject({
      agentId: 'gossipelog',
      stage: 'cycle',
      outcome: 'applied',
    });

    // Second cycle: still 'applied' because adapter returns non-no-op,
    // but the merge deduplicated the history entry
    expect(report.agentTrace?.[1]).toMatchObject({
      agentId: 'gossipelog',
      stage: 'cycle',
      outcome: 'applied',
    });

    // The final state should report that history has exactly 2 entries:
    // 1 from the pre-seeded edge, 1 from the first update.
    // The second identical update must NOT add a third entry.
    const historyLength = (report.finalState as Record<string, unknown>).historyLength;
    expect(historyLength).toBe(2);
  });
});
