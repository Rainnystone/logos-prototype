import { describe, expect, it } from 'vitest';

import { createGossipelogV2InjectionLayeringScenario } from '../scenarios/gossipelog-v2-injection-layering';

import { runSimulationScenario } from '@simulation/scenario-runner';

describe('gossipelog v2 injection layering scenario', () => {
  it('runs a full cycle and verifies both injection texts are non-empty and injection request subgraph is v2-shaped', async () => {
    const scenario = createGossipelogV2InjectionLayeringScenario();
    const report = await runSimulationScenario(scenario);

    // All scenario-internal assertions pass
    expect(report.assertions.every((item) => item.pass)).toBe(true);

    // Agent trace shows applied outcome (memory was updated before injection)
    expect(report.agentTrace?.[0]).toMatchObject({
      agentId: 'gossipelog',
      stage: 'cycle',
      outcome: 'applied',
    });

    // highlightedDeltasText is non-empty
    const details = report.agentTrace?.[0]?.details as Record<string, unknown> | undefined;
    expect(typeof details?.highlightedDeltasText).toBe('string');
    expect((details?.highlightedDeltasText as string).length).toBeGreaterThan(0);

    // stableBackgroundText is non-empty
    expect(typeof details?.stableBackgroundText).toBe('string');
    expect((details?.stableBackgroundText as string).length).toBeGreaterThan(0);

    // Injection request subgraph is v2-shaped:
    // schemaVersion === 2 and edges have history arrays (not v1 baseline/recentDelta)
    const injectionRequestSubgraph = report.finalState
      .injectionRequestSubgraph as import('@/types').CharacterRelationshipsFile;
    expect(injectionRequestSubgraph.meta.schemaVersion).toBe(2);

    // At least one edge exists with a history array (v2 shape)
    const allEdges = Object.values(injectionRequestSubgraph.relationshipsBySource).flatMap(
      (bucket) => Object.values(bucket.targets),
    );
    expect(allEdges.length).toBeGreaterThan(0);
    const firstEdge = allEdges[0] as Record<string, unknown>;
    expect('history' in firstEdge).toBe(true);
    expect('baseline' in firstEdge).toBe(false);
  });
});
