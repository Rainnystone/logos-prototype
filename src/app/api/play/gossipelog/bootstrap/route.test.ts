import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RuntimeStoryPackageNotFoundError } from '@/runtime-sessions/repository';
import type { WeaverImportSummary } from '@/types';

const mocks = vi.hoisted(() => ({
  resolveActiveStorylineContext: vi.fn(async () => ({
    authoredRoot: '/tmp/storylines/sample-scene/active',
  })),
  loadWeaverImportSummaryIfPresent: vi.fn(),
  saveWeaverImportSummary: vi.fn(),
  inspectCharacterRelationshipsState: vi.fn(),
  createAPIAdapter: vi.fn(() => ({
    gossipelogUpdate: vi.fn(),
    gossipelogInjection: vi.fn(),
  })),
  bootstrapGossipelogFromWeaverSummary: vi.fn(),
}));

vi.mock('@/agents/weaver/repository', () => ({
  loadWeaverImportSummaryIfPresent: mocks.loadWeaverImportSummaryIfPresent,
  saveWeaverImportSummary: mocks.saveWeaverImportSummary,
}));

vi.mock('@/storylines/substrate', () => ({
  resolveActiveStorylineContext: mocks.resolveActiveStorylineContext,
}));

vi.mock('@/agents/gossipelog/repository', () => ({
  inspectCharacterRelationshipsState: mocks.inspectCharacterRelationshipsState,
}));

vi.mock('@/engine/api-adapter/adapter', () => ({
  createAPIAdapter: mocks.createAPIAdapter,
}));

vi.mock('@/agents/gossipelog/bootstrap', () => ({
  bootstrapGossipelogFromWeaverSummary: mocks.bootstrapGossipelogFromWeaverSummary,
}));

describe('POST /api/play/gossipelog/bootstrap', () => {
  const summaryFixture: WeaverImportSummary = {
    schemaVersion: 1,
    sourceKind: 'text_import',
    lastRunAt: '2026-04-08T12:00:00.000Z',
    suggestedPackageName: 'woven-import-package',
    sourceSummary: '作者原文摘要',
    importSummary: '已整理出基础导入摘要',
    warnings: ['角色关系只得到部分文本支持'],
    unresolvedGaps: [],
    warningCount: 1,
    unresolvedGapCount: 0,
    bootstrapStatus: 'fallback_pending',
  };

  beforeEach(() => {
    mocks.resolveActiveStorylineContext.mockClear();
    mocks.loadWeaverImportSummaryIfPresent.mockReset();
    mocks.saveWeaverImportSummary.mockReset();
    mocks.inspectCharacterRelationshipsState.mockReset();
    mocks.createAPIAdapter.mockClear();
    mocks.bootstrapGossipelogFromWeaverSummary.mockReset();
  });

  it('returns 400 when adapterConfig cannot be parsed', async () => {
    const { POST } = await import('@/app/api/play/gossipelog/bootstrap/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog/bootstrap', {
        method: 'POST',
        body: JSON.stringify({
          storyPackageName: 'sample-scene',
          adapterConfig: {
            provider: 'openai-compatible',
            providerConfig: {
              apiKey: 'test-key',
              model: 'demo-model',
            },
          },
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'A valid adapter config is required for gossipelog bootstrap.',
    });
  });

  it('returns 400 when storyPackageName is missing', async () => {
    const { POST } = await import('@/app/api/play/gossipelog/bootstrap/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog/bootstrap', {
        method: 'POST',
        body: JSON.stringify({
          adapterConfig: {
            provider: 'openai-compatible',
            providerConfig: {
              apiKey: 'test-key',
              baseUrl: 'https://api.example.com/v1',
              model: 'demo-model',
            },
          },
        }),
      }),
    );

    expect(mocks.loadWeaverImportSummaryIfPresent).not.toHaveBeenCalled();
    expect(mocks.inspectCharacterRelationshipsState).not.toHaveBeenCalled();
    expect(mocks.createAPIAdapter).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'A valid storyPackageName is required for gossipelog bootstrap.',
    });
  });

  it.each([
    'Bad-Uppercase-Slug',
    '../sample-scene',
  ])('returns 400 when storyPackageName is invalid: %s', async (storyPackageName) => {
    const { POST } = await import('@/app/api/play/gossipelog/bootstrap/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog/bootstrap', {
        method: 'POST',
        body: JSON.stringify({
          storyPackageName,
          adapterConfig: {
            provider: 'openai-compatible',
            providerConfig: {
              apiKey: 'test-key',
              baseUrl: 'https://api.example.com/v1',
              model: 'demo-model',
            },
          },
        }),
      }),
    );

    expect(mocks.loadWeaverImportSummaryIfPresent).not.toHaveBeenCalled();
    expect(mocks.inspectCharacterRelationshipsState).not.toHaveBeenCalled();
    expect(mocks.createAPIAdapter).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'A valid storyPackageName is required for gossipelog bootstrap.',
    });
  });

  it('returns noop when no persisted weaver summary exists', async () => {
    mocks.loadWeaverImportSummaryIfPresent.mockResolvedValueOnce(null);
    const { POST } = await import('@/app/api/play/gossipelog/bootstrap/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog/bootstrap', {
        method: 'POST',
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
        }),
      }),
    );

    expect(mocks.resolveActiveStorylineContext).not.toHaveBeenCalled();
    expect(mocks.inspectCharacterRelationshipsState).not.toHaveBeenCalled();
    expect(mocks.createAPIAdapter).not.toHaveBeenCalled();
    expect(mocks.bootstrapGossipelogFromWeaverSummary).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'noop',
      reason: 'no_weaver_summary',
    });
  });

  it('returns a bounded 400 when resolving the active storyline context fails because the package is missing', async () => {
    mocks.loadWeaverImportSummaryIfPresent.mockResolvedValueOnce(summaryFixture);
    mocks.inspectCharacterRelationshipsState.mockResolvedValueOnce('missing');
    mocks.resolveActiveStorylineContext.mockRejectedValueOnce(
      new RuntimeStoryPackageNotFoundError('missing-package'),
    );
    const { POST } = await import('@/app/api/play/gossipelog/bootstrap/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog/bootstrap', {
        method: 'POST',
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
        }),
      }),
    );

    expect(mocks.resolveActiveStorylineContext).toHaveBeenCalledWith('sample-scene', {
      forWrite: false,
    });
    expect(mocks.inspectCharacterRelationshipsState).toHaveBeenCalledWith('sample-scene');
    expect(mocks.createAPIAdapter).not.toHaveBeenCalled();
    expect(mocks.bootstrapGossipelogFromWeaverSummary).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Story package was not found for gossipelog bootstrap.',
    });
  });

  it('returns a bounded 400 when storyPackageName is valid but the package does not exist', async () => {
    mocks.loadWeaverImportSummaryIfPresent.mockRejectedValueOnce(
      new Error(
        'Story package "missing-package" was not found at /tmp/story-packages/missing-package.',
      ),
    );
    const { POST } = await import('@/app/api/play/gossipelog/bootstrap/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog/bootstrap', {
        method: 'POST',
        body: JSON.stringify({
          storyPackageName: 'missing-package',
          adapterConfig: {
            provider: 'openai-compatible',
            providerConfig: {
              apiKey: 'test-key',
              baseUrl: 'https://api.example.com/v1',
              model: 'demo-model',
            },
          },
        }),
      }),
    );

    expect(mocks.inspectCharacterRelationshipsState).not.toHaveBeenCalled();
    expect(mocks.createAPIAdapter).not.toHaveBeenCalled();
    expect(mocks.bootstrapGossipelogFromWeaverSummary).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Story package was not found for gossipelog bootstrap.',
    });
  });

  it('returns noop and reconciles summary when persisted gossipelog state is already readable', async () => {
    mocks.loadWeaverImportSummaryIfPresent.mockResolvedValueOnce(summaryFixture);
    mocks.inspectCharacterRelationshipsState.mockResolvedValueOnce('readable');

    const { POST } = await import('@/app/api/play/gossipelog/bootstrap/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog/bootstrap', {
        method: 'POST',
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
        }),
      }),
    );

    expect(mocks.resolveActiveStorylineContext).not.toHaveBeenCalled();
    expect(mocks.saveWeaverImportSummary).toHaveBeenCalledWith('sample-scene', {
      ...summaryFixture,
      bootstrapStatus: 'succeeded',
    });
    expect(mocks.createAPIAdapter).not.toHaveBeenCalled();
    expect(mocks.bootstrapGossipelogFromWeaverSummary).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'noop',
      bootstrapStatus: 'succeeded',
      reason: 'gossipelog_state_present',
    });
  });

  it('attempts one fallback bootstrap when persisted gossipelog state is missing', async () => {
    mocks.loadWeaverImportSummaryIfPresent.mockResolvedValueOnce({
      ...summaryFixture,
      bootstrapStatus: 'succeeded',
    });
    mocks.inspectCharacterRelationshipsState.mockResolvedValueOnce('missing');
    mocks.bootstrapGossipelogFromWeaverSummary.mockResolvedValueOnce({
      ok: false,
      attempted: true,
      bootstrapStatus: 'fallback_pending',
      errorMessage: 'model timeout',
    });

    const { POST } = await import('@/app/api/play/gossipelog/bootstrap/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog/bootstrap', {
        method: 'POST',
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
        }),
      }),
    );

    expect(mocks.createAPIAdapter).toHaveBeenCalledWith({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.example.com/v1',
        model: 'demo-model',
      },
    });
    expect(mocks.resolveActiveStorylineContext).toHaveBeenCalledWith('sample-scene', {
      forWrite: false,
    });
    expect(mocks.bootstrapGossipelogFromWeaverSummary).toHaveBeenCalledWith({
      storyPackageName: 'sample-scene',
      weaverSummary: {
        ...summaryFixture,
        bootstrapStatus: 'succeeded',
      },
      relationshipState: 'missing',
      authoredRootOverride: '/tmp/storylines/sample-scene/active',
      adapter: expect.objectContaining({
        gossipelogUpdate: expect.any(Function),
        gossipelogInjection: expect.any(Function),
      }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'fallback_pending',
      bootstrapStatus: 'fallback_pending',
    });
  });

  it('attempts one fallback bootstrap when persisted gossipelog state is unreadable', async () => {
    mocks.loadWeaverImportSummaryIfPresent.mockResolvedValueOnce({
      ...summaryFixture,
      bootstrapStatus: 'succeeded',
    });
    mocks.inspectCharacterRelationshipsState.mockResolvedValueOnce('unreadable');
    mocks.bootstrapGossipelogFromWeaverSummary.mockResolvedValueOnce({
      ok: false,
      attempted: true,
      bootstrapStatus: 'fallback_pending',
      errorMessage: 'bootstrap fell back to persisted-relationship-state',
    });

    const { POST } = await import('@/app/api/play/gossipelog/bootstrap/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog/bootstrap', {
        method: 'POST',
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
        }),
      }),
    );

    expect(mocks.bootstrapGossipelogFromWeaverSummary).toHaveBeenCalledWith({
      storyPackageName: 'sample-scene',
      weaverSummary: {
        ...summaryFixture,
        bootstrapStatus: 'succeeded',
      },
      relationshipState: 'unreadable',
      authoredRootOverride: '/tmp/storylines/sample-scene/active',
      adapter: expect.objectContaining({
        gossipelogUpdate: expect.any(Function),
        gossipelogInjection: expect.any(Function),
      }),
    });
    expect(mocks.saveWeaverImportSummary).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'fallback_pending',
      bootstrapStatus: 'fallback_pending',
    });
  });

  it('boots with the active storyline authored root and preserves the bootstrapped response shape', async () => {
    mocks.loadWeaverImportSummaryIfPresent.mockResolvedValueOnce(summaryFixture);
    mocks.inspectCharacterRelationshipsState.mockResolvedValueOnce('missing');
    mocks.bootstrapGossipelogFromWeaverSummary.mockResolvedValueOnce({
      ok: true,
      attempted: true,
      bootstrapStatus: 'succeeded',
    });

    const { POST } = await import('@/app/api/play/gossipelog/bootstrap/route');

    const response = await POST(
      new Request('http://localhost/api/play/gossipelog/bootstrap', {
        method: 'POST',
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
        }),
      }),
    );

    expect(mocks.resolveActiveStorylineContext).toHaveBeenCalledWith('sample-scene', {
      forWrite: false,
    });
    expect(mocks.bootstrapGossipelogFromWeaverSummary).toHaveBeenCalledWith({
      storyPackageName: 'sample-scene',
      weaverSummary: summaryFixture,
      relationshipState: 'missing',
      authoredRootOverride: '/tmp/storylines/sample-scene/active',
      adapter: expect.objectContaining({
        gossipelogUpdate: expect.any(Function),
        gossipelogInjection: expect.any(Function),
      }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'bootstrapped',
      bootstrapStatus: 'succeeded',
    });
  });
});
