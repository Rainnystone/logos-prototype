import { describe, expect, it } from 'vitest';

import type { RunGossipelogCycleResult } from '@/agents/gossipelog/contracts';
import type { GossipelogUpdateResult } from '@/types';

import { createGossipelogAgentTrace } from '@simulation/sidecar-trace';

function buildNoOpUpdateResult(): GossipelogUpdateResult {
  return {
    involvedRoleIds: [],
    invocationNoOp: true,
    memoryUpdates: [],
  };
}

function buildAppliedUpdateResult(): GossipelogUpdateResult {
  return {
    involvedRoleIds: ['char_001', 'char_002'],
    invocationNoOp: false,
    memoryUpdates: [
      {
        sourceRoleId: 'char_001',
        targetRoleId: 'char_002',
        shouldCreateEdge: false,
        nextCurrentRelation: {
          phaseId: null,
          beatIndex: null,
          roundId: 'round-1',
          functionalRole: null,
          mindsetTags: ['friendly'],
          summary: 'grew closer',
          triggerEvent: 'shared-danger',
          reasoning: 'bonded through adversity',
          causalAction: 'shared-danger',
        },
      },
    ],
  };
}

function buildCycleResult(
  updateResult: GossipelogUpdateResult,
  overrides?: Partial<RunGossipelogCycleResult>,
): RunGossipelogCycleResult {
  return {
    updateRequest: {
      sceneCastRoleIds: [],
      candidateRoles: [],
      roleDefinitions: [],
      relationshipSubgraph: {
        meta: {
          fileType: 'character-relationships',
          schemaVersion: 1,
          storyPackage: 'trace-v2-test',
        },
        relationshipsBySource: {},
      },
      sceneCastFraming: {
        sceneId: 'trace-v2-test',
        castRoleIds: [],
      },
      acceptedBeatText: 'test beat',
      roundId: 'round-1',
      phaseId: 'phase-01',
      beatIndex: 0,
      resolvedReferences: [],
    },
    updateResult,
    injectionRequest: {
      sceneCastRoleIds: [],
      roleDefinitions: [],
      relationshipSubgraph: {
        meta: {
          fileType: 'character-relationships',
          schemaVersion: 1,
          storyPackage: 'trace-v2-test',
        },
        relationshipsBySource: {},
      },
      sceneCastFraming: {
        sceneId: 'trace-v2-test',
        castRoleIds: [],
      },
    },
    relationshipLayer: {
      highlightedDeltasText: '',
      stableBackgroundText: '',
    },
    ...overrides,
  };
}

describe('createGossipelogAgentTrace (v2 contract)', () => {
  it('uses v2 memory field name in no-op side effect summary', () => {
    const result = buildCycleResult(buildNoOpUpdateResult());
    const trace = createGossipelogAgentTrace(result);

    expect(trace.sideEffectSummary).toContain('update:no-op(v2-memory)');
  });

  it('uses v2 memory field name in applied side effect summary', () => {
    const result = buildCycleResult(buildAppliedUpdateResult());
    const trace = createGossipelogAgentTrace(result);

    expect(trace.sideEffectSummary).toContain('update:memory-count:1');
  });

  it('does not reference edge-count in v2 side effect summary', () => {
    const result = buildCycleResult(buildAppliedUpdateResult());
    const trace = createGossipelogAgentTrace(result);

    const hasEdgeCount = (trace.sideEffectSummary ?? []).some((s) => s.includes('edge-count'));
    expect(hasEdgeCount).toBe(false);
  });

  it('resolves no-op outcome for v2 no-op result', () => {
    const result = buildCycleResult(buildNoOpUpdateResult());
    const trace = createGossipelogAgentTrace(result);

    expect(trace.outcome).toBe('no-op');
  });

  it('resolves applied outcome for v2 applied result', () => {
    const result = buildCycleResult(buildAppliedUpdateResult());
    const trace = createGossipelogAgentTrace(result);

    expect(trace.outcome).toBe('applied');
  });
});
