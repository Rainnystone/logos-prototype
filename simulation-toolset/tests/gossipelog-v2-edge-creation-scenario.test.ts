import { describe, expect, it } from 'vitest';

import { createGossipelogV2EdgeCreationScenario } from '../scenarios/gossipelog-v2-edge-creation';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('gossipelog v2 edge creation scenario', () => {
  it('creates a new relationship edge that did not exist before', async () => {
    const scenario = createGossipelogV2EdgeCreationScenario();
    const report = await runSimulationScenario(scenario);

    // All scenario assertions pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Agent trace shows applied outcome
    expect(report.agentTrace?.[0]).toMatchObject({
      agentId: 'gossipelog',
      stage: 'cycle',
      outcome: 'applied',
    });

    // Verify persisted edge from disk (read before cleanup)
    const persistedEdge = report.finalState.persistedEdge as import('@/types').RelationshipMemoryEdge | null;
    const newEdgeSourceRoleId = report.finalState.newEdgeSourceRoleId as string;
    const newEdgeTargetRoleId = report.finalState.newEdgeTargetRoleId as string;

    // Assert a new edge was created
    expect(persistedEdge).not.toBeNull();
    expect(persistedEdge!.sourceRoleId).toBe(newEdgeSourceRoleId);
    expect(persistedEdge!.targetRoleId).toBe(newEdgeTargetRoleId);

    // Assert the new edge's history has at least 1 entry
    expect(persistedEdge!.history.length).toBeGreaterThanOrEqual(1);
    expect(persistedEdge!.currentRelation).toBeDefined();
  });
});
