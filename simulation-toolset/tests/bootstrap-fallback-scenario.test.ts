import { describe, it, expect, vi } from 'vitest';

import { createBootstrapFallbackScenario } from '../scenarios/bootstrap-fallback';

import { runSimulationScenario } from '@simulation/scenario-runner';

vi.mock('@/agents/gossipelog/bootstrap', () => ({
  bootstrapGossipelogFromWeaverSummary: vi.fn(),
}));

describe('S10: Bootstrap Fallback', () => {
  it('runs weaver import then bootstrap and asserts fallback-pending outcome with package intact', async () => {
    const { bootstrapGossipelogFromWeaverSummary } = await import('@/agents/gossipelog/bootstrap');
    vi.mocked(bootstrapGossipelogFromWeaverSummary).mockResolvedValueOnce({
      ok: false,
      attempted: true,
      bootstrapStatus: 'fallback_pending',
      errorMessage: 'Bootstrap failed due to incomplete data.',
    });

    const report = await runSimulationScenario(createBootstrapFallbackScenario());

    // Assert weaver import action was recorded
    const importAction = report.actions.find((a) => a.kind === 'weaver.import');
    expect(importAction).toBeDefined();

    // Assert bootstrap-force-fail action was recorded
    const fallbackAction = report.actions.find((a) => a.kind === 'gossipelog.bootstrap-force-fail');
    expect(fallbackAction).toBeDefined();

    // Assert agent trace shows fallback-pending
    expect(report.agentTrace?.[0]).toMatchObject({
      agentId: 'gossipelog',
      stage: 'bootstrap',
      outcome: 'fallback-pending',
    });

    // All assertions pass
    expect(report.assertions.every((a) => a.pass)).toBe(true);

    // Final state reflects fallback-pending
    expect(report.finalState.bootstrapOutcome).toBe('fallback-pending');
    expect(report.finalState.bootstrapStatus).toBe('fallback_pending');

    // Package still exists after bootstrap failure
    expect(report.finalState.packageStillExists).toBe(true);
  });
});
