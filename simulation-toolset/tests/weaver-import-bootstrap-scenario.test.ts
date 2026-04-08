import { describe, it, expect, vi } from 'vitest';

import { createWeaverImportBootstrapScenario } from '../scenarios/weaver-import-bootstrap';

import { runSimulationScenario } from '@simulation/scenario-runner';

vi.mock('@/agents/gossipelog/bootstrap', () => ({
  bootstrapGossipelogFromWeaverSummary: vi.fn(),
}));

describe('S8: Weaver Import + Bootstrap Success', () => {
  it('runs weaver import then bootstrap and asserts bootstrap succeeded', async () => {
    const { bootstrapGossipelogFromWeaverSummary } = await import('@/agents/gossipelog/bootstrap');
    vi.mocked(bootstrapGossipelogFromWeaverSummary).mockResolvedValueOnce({
      ok: true,
      attempted: true,
      bootstrapStatus: 'succeeded',
    });

    const report = await runSimulationScenario(createWeaverImportBootstrapScenario());

    // Assert weaver import action was recorded
    const importAction = report.actions.find((a) => a.kind === 'weaver.import');
    expect(importAction).toBeDefined();

    // Assert bootstrap action was recorded
    const bootstrapAction = report.actions.find((a) => a.kind === 'gossipelog.bootstrap');
    expect(bootstrapAction).toBeDefined();

    // Assert agent trace shows succeeded
    expect(report.agentTrace?.[0]).toMatchObject({
      agentId: 'gossipelog',
      stage: 'bootstrap',
      outcome: 'succeeded',
    });

    // Assert bootstrapStatus in trace details
    expect(report.agentTrace?.[0]?.details?.bootstrapStatus).toBe('succeeded');

    // All assertions pass
    expect(report.assertions.every((a) => a.pass)).toBe(true);

    // Final state reflects succeeded
    expect(report.finalState.bootstrapOutcome).toBe('succeeded');
    expect(report.finalState.bootstrapStatus).toBe('succeeded');
  });
});
