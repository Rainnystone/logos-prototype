import { beforeEach, describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { RuntimeStoryPackageNotFoundError } from '@/runtime-sessions/repository';

const mocks = vi.hoisted(() => ({
  resolveActiveStorylineContext: vi.fn(async () => ({
    authoredRoot: '/tmp/storylines/sample-scene/active',
  })),
  loadRuntimeStoryPackage: vi.fn(),
  createAPIAdapter: vi.fn(() => ({
    collapse: vi.fn(async () => ({
      alpha: 'alpha',
      beta: 'beta',
      inferenceTrace: 'trace',
    })),
    gossipelogUpdate: vi.fn(async () => ({
      involvedRoleIds: [],
      invocationNoOp: true,
      memoryUpdates: [],
    })),
    gossipelogInjection: vi.fn(async () => ({
      highlightedDeltasText: 'delta',
      stableBackgroundText: 'background',
    })),
  })),
  createWorkbenchDemoAdapter: vi.fn(() => ({
    collapse: vi.fn(async () => ({
      alpha: 'alpha',
      beta: 'beta',
      inferenceTrace: 'trace',
    })),
    gossipelogUpdate: vi.fn(async () => ({
      involvedRoleIds: [],
      invocationNoOp: true,
      memoryUpdates: [],
    })),
    gossipelogInjection: vi.fn(async () => ({
      highlightedDeltasText: 'demo delta',
      stableBackgroundText: 'demo background',
    })),
  })),
  runGossipelogCycle: vi.fn(async () => ({
    updateRequest: {
      acceptedBeatText: 'Accepted beat text',
      roundId: 'round-1',
      phaseId: 'phase-01-prologue',
      beatIndex: 1,
      sceneCastRoleIds: [],
      sceneCastFraming: {
        sceneId: 'scene-1',
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
      resolvedReferences: [],
    },
    updateResult: {
      involvedRoleIds: [],
      invocationNoOp: true,
      memoryUpdates: [],
    },
    injectionRequest: {
      sceneCastRoleIds: [],
      sceneCastFraming: {
        sceneId: 'scene-1',
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
  })),
}));

vi.mock('@/engine/story-loader', () => ({
  loadRuntimeStoryPackage: mocks.loadRuntimeStoryPackage,
}));

vi.mock('@/storylines/substrate', () => ({
  resolveActiveStorylineContext: mocks.resolveActiveStorylineContext,
}));

vi.mock('@/engine/api-adapter/adapter', () => ({
  createAPIAdapter: mocks.createAPIAdapter,
}));

vi.mock('@/engine/__mocks__/workbench-demo-adapter', () => ({
  createWorkbenchDemoAdapter: mocks.createWorkbenchDemoAdapter,
}));

vi.mock('@/agents/gossipelog/agent', () => ({
  runGossipelogCycle: mocks.runGossipelogCycle,
}));

describe('POST play gossipelog route', () => {
  beforeEach(() => {
    mocks.resolveActiveStorylineContext.mockClear();
    mocks.loadRuntimeStoryPackage.mockReset();
    mocks.loadRuntimeStoryPackage.mockResolvedValue(storyPackageFixture);
    mocks.createAPIAdapter.mockClear();
    mocks.createWorkbenchDemoAdapter.mockClear();
    mocks.runGossipelogCycle.mockClear();
  });

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
          phaseId: 'phase-01-prologue',
          beatIndex: 1,
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'previous delta',
            stableBackgroundText: 'previous background',
          },
        }),
      }),
    );

    expect(mocks.resolveActiveStorylineContext).toHaveBeenCalledWith('sample-scene', {
      forWrite: false,
    });
    expect(mocks.loadRuntimeStoryPackage).toHaveBeenCalledWith('sample-scene', {
      authoredRootOverride: '/tmp/storylines/sample-scene/active',
    });
    expect(mocks.createAPIAdapter).toHaveBeenCalledWith(adapterConfig);
    expect(mocks.createWorkbenchDemoAdapter).not.toHaveBeenCalled();
    expect(mocks.runGossipelogCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        adapter: expect.objectContaining({
          gossipelogUpdate: expect.any(Function),
          gossipelogInjection: expect.any(Function),
        }),
        storyPackageName: 'sample-scene',
        storyPackage: storyPackageFixture,
        acceptedBeatText: 'Accepted beat text',
        roundId: 'round-1',
        phaseId: 'phase-01-prologue',
        beatIndex: 1,
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

  it('falls back to the demo adapter when adapterConfig is absent or invalid', async () => {
    const { POST } = await import('@/app/api/play/gossipelog/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          storyPackageName: 'sample-scene',
          adapterConfig: {
            provider: 'openai-compatible',
            providerConfig: {
              apiKey: 'test-key',
              model: 'demo-model',
            },
          },
          acceptedBeatText: 'Accepted beat text',
          roundId: 'round-2',
          phaseId: 'phase-01-prologue',
          beatIndex: 2,
        }),
      }),
    );

    expect(mocks.createAPIAdapter).not.toHaveBeenCalled();
    expect(mocks.createWorkbenchDemoAdapter).toHaveBeenCalledTimes(1);
    expect(mocks.runGossipelogCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        adapter: expect.objectContaining({
          gossipelogUpdate: expect.any(Function),
          gossipelogInjection: expect.any(Function),
        }),
        storyPackageName: 'sample-scene',
        acceptedBeatText: 'Accepted beat text',
        roundId: 'round-2',
        phaseId: 'phase-01-prologue',
        beatIndex: 2,
      }),
    );
    expect(response.status).toBe(200);
  });

  it.each([
    {
      label: 'phaseId is missing',
      body: {
        storyPackageName: 'sample-scene',
        acceptedBeatText: 'Accepted beat text',
        roundId: 'round-2',
        beatIndex: 2,
      },
    },
    {
      label: 'phaseId is blank',
      body: {
        storyPackageName: 'sample-scene',
        acceptedBeatText: 'Accepted beat text',
        roundId: 'round-2',
        phaseId: '',
        beatIndex: 2,
      },
    },
    {
      label: 'beatIndex is missing',
      body: {
        storyPackageName: 'sample-scene',
        acceptedBeatText: 'Accepted beat text',
        roundId: 'round-2',
        phaseId: 'phase-01-prologue',
      },
    },
    {
      label: 'beatIndex is negative',
      body: {
        storyPackageName: 'sample-scene',
        acceptedBeatText: 'Accepted beat text',
        roundId: 'round-2',
        phaseId: 'phase-01-prologue',
        beatIndex: -1,
      },
    },
    {
      label: 'beatIndex is null',
      body: {
        storyPackageName: 'sample-scene',
        acceptedBeatText: 'Accepted beat text',
        roundId: 'round-2',
        phaseId: 'phase-01-prologue',
        beatIndex: null,
      },
    },
  ])('returns 400 when $label', async ({ body }) => {
    const { POST } = await import('@/app/api/play/gossipelog/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/phaseId|beatIndex/i),
    });
    expect(mocks.resolveActiveStorylineContext).not.toHaveBeenCalled();
    expect(mocks.loadRuntimeStoryPackage).not.toHaveBeenCalled();
    expect(mocks.createAPIAdapter).not.toHaveBeenCalled();
    expect(mocks.createWorkbenchDemoAdapter).not.toHaveBeenCalled();
    expect(mocks.runGossipelogCycle).not.toHaveBeenCalled();
  });

  it('propagates missing-package errors from the storyline resolver', async () => {
    mocks.resolveActiveStorylineContext.mockRejectedValueOnce(
      new RuntimeStoryPackageNotFoundError('missing-package'),
    );
    const { POST } = await import('@/app/api/play/gossipelog/route');

    await expect(
      POST(
        new Request('http://localhost/api/play/gossipelog', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            storyPackageName: 'sample-scene',
            adapterConfig: {
              provider: 'openai-compatible',
              providerConfig: {
                apiKey: 'test-key',
                baseUrl: 'https://api.example.com/v1',
                model: 'demo-model',
              },
            },
            acceptedBeatText: 'Accepted beat text',
            roundId: 'round-3',
            phaseId: 'phase-01-prologue',
            beatIndex: 3,
          }),
        }),
      ),
    ).rejects.toBeInstanceOf(RuntimeStoryPackageNotFoundError);

    expect(mocks.loadRuntimeStoryPackage).not.toHaveBeenCalled();
    expect(mocks.createAPIAdapter).not.toHaveBeenCalled();
    expect(mocks.createWorkbenchDemoAdapter).not.toHaveBeenCalled();
    expect(mocks.runGossipelogCycle).not.toHaveBeenCalled();
  });
});
