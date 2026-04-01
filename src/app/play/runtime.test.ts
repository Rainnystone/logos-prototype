import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserGossipelogCycleRunner,
  createTrackedWorkbenchAdapter,
} from '@/app/play/runtime';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import { storyPackageFixture } from '@/app/__tests__/fixtures';

function createReporter() {
  return {
    onStatusChange: vi.fn(),
    onRewriteFeedback: vi.fn(),
    onUsage: vi.fn(),
  };
}

describe('createTrackedWorkbenchAdapter', () => {
  it('preserves existing gossipelog methods on the wrapped adapter', () => {
    const gossipelogUpdate = vi.fn(async () => ({
      involvedRoleIds: [],
      invocationNoOp: true,
      edgeUpdates: [],
    }));
    const gossipelogInjection = vi.fn(async () => ({
      highlightedDeltasText: 'delta',
      stableBackgroundText: 'background',
    }));
    const adapter: LLMAdapter = {
      collapse: vi.fn(async () => ({
        alpha: 'alpha',
        beta: 'beta',
        inferenceTrace: 'trace',
      })),
      gossipelogUpdate,
      gossipelogInjection,
    };

    const trackedAdapter = createTrackedWorkbenchAdapter(
      adapter,
      storyPackageFixture.auditQuestionSet,
      createReporter(),
    );

    expect(trackedAdapter.gossipelogUpdate).toBe(gossipelogUpdate);
    expect(trackedAdapter.gossipelogInjection).toBe(gossipelogInjection);
  });

  it('injects tagged fallback gossipelog methods when they are missing', async () => {
    const adapter: LLMAdapter = {
      collapse: vi.fn(async () => ({
        alpha: 'alpha',
        beta: 'beta',
        inferenceTrace: 'trace',
      })),
    };

    const trackedAdapter = createTrackedWorkbenchAdapter(
      adapter,
      storyPackageFixture.auditQuestionSet,
      createReporter(),
    );

    expect(trackedAdapter.gossipelogUpdate).toBeDefined();
    expect(trackedAdapter.gossipelogInjection).toBeDefined();
    expect(
      (trackedAdapter.gossipelogUpdate as { __logosGossipelogFallback?: boolean })
        .__logosGossipelogFallback,
    ).toBe(true);
    expect(
      (trackedAdapter.gossipelogInjection as { __logosGossipelogFallback?: boolean })
        .__logosGossipelogFallback,
    ).toBe(true);
    await expect(trackedAdapter.gossipelogUpdate?.({} as never)).resolves.toEqual({
      involvedRoleIds: [],
      invocationNoOp: true,
      edgeUpdates: [],
    });
    await expect(trackedAdapter.gossipelogInjection?.({} as never)).resolves.toEqual({
      highlightedDeltasText: '',
      stableBackgroundText: '',
    });
  });
});

describe('createBrowserGossipelogCycleRunner', () => {
  it('posts the accepted beat and adapter config to the server bridge', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          updateRequest: {
            acceptedBeatText: 'Accepted beat text',
          },
          updateResult: {
            involvedRoleIds: [],
            invocationNoOp: true,
            edgeUpdates: [],
          },
          injectionRequest: {
            sceneCastRoleIds: [],
          },
          relationshipLayer: {
            highlightedDeltasText: 'delta',
            stableBackgroundText: 'background',
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    });
    const adapterConfig = {
      provider: 'openai-compatible' as const,
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.example.com/v1',
        model: 'demo-model',
      },
    };
    const runner = createBrowserGossipelogCycleRunner({
      adapterConfig,
      fetchImpl: fetchMock,
    });

    const result = await runner({
      adapter: {
        gossipelogUpdate: vi.fn(),
        gossipelogInjection: vi.fn(),
      },
      storyPackageName: 'sample-scene',
      storyPackage: storyPackageFixture,
      acceptedBeatText: 'Accepted beat text',
      roundId: 'round-1',
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'previous delta',
        stableBackgroundText: 'previous background',
      },
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/play/gossipelog', {
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
    });
    expect(result.relationshipLayer).toEqual({
      highlightedDeltasText: 'delta',
      stableBackgroundText: 'background',
    });
  });
});
