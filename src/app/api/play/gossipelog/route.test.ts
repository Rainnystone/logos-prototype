import { describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';

const loadRuntimeStoryPackage = vi.fn(async () => storyPackageFixture);
const createAPIAdapter = vi.fn(() => ({
  collapse: vi.fn(async () => ({
    alpha: 'alpha',
    beta: 'beta',
    inferenceTrace: 'trace',
  })),
  gossipelogUpdate: vi.fn(async () => ({
    involvedRoleIds: [],
    invocationNoOp: true,
    edgeUpdates: [],
  })),
  gossipelogInjection: vi.fn(async () => ({
    highlightedDeltasText: 'delta',
    stableBackgroundText: 'background',
  })),
}));
const createWorkbenchDemoAdapter = vi.fn(() => ({
  collapse: vi.fn(async () => ({
    alpha: 'alpha',
    beta: 'beta',
    inferenceTrace: 'trace',
  })),
  gossipelogUpdate: vi.fn(async () => ({
    involvedRoleIds: [],
    invocationNoOp: true,
    edgeUpdates: [],
  })),
  gossipelogInjection: vi.fn(async () => ({
    highlightedDeltasText: 'demo delta',
    stableBackgroundText: 'demo background',
  })),
}));
const runGossipelogCycle = vi.fn(async () => ({
  updateRequest: {
    acceptedBeatText: 'Accepted beat text',
    roundId: 'round-1',
    sceneCastRoleIds: [],
    sceneCastFraming: {
      sceneId: storyPackageFixture.sceneSpec.sceneId,
      castRoleIds: [],
    },
    candidateRoles: [],
    roleDefinitions: [],
    relationshipSubgraph: {
      meta: {
        fileType: 'character-relationships',
        schemaVersion: 1,
        storyPackage: 'sample-scene',
      },
      relationshipsBySource: {},
    },
  },
  updateResult: {
    involvedRoleIds: [],
    invocationNoOp: true,
    edgeUpdates: [],
  },
  injectionRequest: {
    sceneCastRoleIds: [],
    sceneCastFraming: {
      sceneId: storyPackageFixture.sceneSpec.sceneId,
      castRoleIds: [],
    },
    roleDefinitions: [],
    relationshipSubgraph: {
      meta: {
        fileType: 'character-relationships',
        schemaVersion: 1,
        storyPackage: 'sample-scene',
      },
      relationshipsBySource: {},
    },
  },
  relationshipLayer: {
    highlightedDeltasText: 'delta',
    stableBackgroundText: 'background',
  },
}));

vi.mock('@/engine/story-loader', () => ({
  loadRuntimeStoryPackage,
}));

vi.mock('@/engine/api-adapter/adapter', () => ({
  createAPIAdapter,
}));

vi.mock('@/engine/__mocks__/workbench-demo-adapter', () => ({
  createWorkbenchDemoAdapter,
}));

vi.mock('@/agents/gossipelog/agent', () => ({
  runGossipelogCycle,
}));

describe('POST play gossipelog route', () => {
  it('loads the runtime package and runs the server-side cycle with the configured adapter', async () => {
    const { POST } = await import('@/app/api/play/gossipelog/route');
    const adapterConfig = {
      provider: 'openai-compatible' as const,
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.example.com/v1',
        model: 'demo-model',
      },
    };

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          storyPackageName: 'sample-scene',
          adapterConfig,
          acceptedBeatText: 'Accepted beat text',
          roundId: 'round-1',
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'previous delta',
            stableBackgroundText: 'previous background',
          },
        }),
      }),
    );

    expect(loadRuntimeStoryPackage).toHaveBeenCalledWith('sample-scene');
    expect(createAPIAdapter).toHaveBeenCalledWith(adapterConfig);
    expect(createWorkbenchDemoAdapter).not.toHaveBeenCalled();
    expect(runGossipelogCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        adapter: expect.objectContaining({
          gossipelogUpdate: expect.any(Function),
          gossipelogInjection: expect.any(Function),
        }),
        storyPackageName: 'sample-scene',
        storyPackage: storyPackageFixture,
        acceptedBeatText: 'Accepted beat text',
        roundId: 'round-1',
        lastStableRelationshipLayer: {
          highlightedDeltasText: 'previous delta',
          stableBackgroundText: 'previous background',
        },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      relationshipLayer: {
        highlightedDeltasText: 'delta',
        stableBackgroundText: 'background',
      },
    });
  });
});
