import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WeaverImportSummary } from '@/types';

const loadWeaverImportSummaryIfPresent = vi.fn();
const saveWeaverImportSummary = vi.fn();
const inspectCharacterRelationshipsState = vi.fn();
const createAPIAdapter = vi.fn(() => ({
  gossipelogUpdate: vi.fn(),
  gossipelogInjection: vi.fn(),
}));
const bootstrapGossipelogFromWeaverSummary = vi.fn();

vi.mock('@/agents/weaver/repository', () => ({
  loadWeaverImportSummaryIfPresent,
  saveWeaverImportSummary,
}));

vi.mock('@/agents/gossipelog/repository', () => ({
  inspectCharacterRelationshipsState,
}));

vi.mock('@/engine/api-adapter/adapter', () => ({
  createAPIAdapter,
}));

vi.mock('@/agents/gossipelog/bootstrap', () => ({
  bootstrapGossipelogFromWeaverSummary,
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
    loadWeaverImportSummaryIfPresent.mockReset();
    saveWeaverImportSummary.mockReset();
    inspectCharacterRelationshipsState.mockReset();
    createAPIAdapter.mockClear();
    bootstrapGossipelogFromWeaverSummary.mockReset();
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

  it('returns noop when no persisted weaver summary exists', async () => {
    loadWeaverImportSummaryIfPresent.mockResolvedValueOnce(null);
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

    expect(inspectCharacterRelationshipsState).not.toHaveBeenCalled();
    expect(createAPIAdapter).not.toHaveBeenCalled();
    expect(bootstrapGossipelogFromWeaverSummary).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'noop',
      reason: 'no_weaver_summary',
    });
  });

  it('returns noop and reconciles summary when persisted gossipelog state is already readable', async () => {
    loadWeaverImportSummaryIfPresent.mockResolvedValueOnce(summaryFixture);
    inspectCharacterRelationshipsState.mockResolvedValueOnce('readable');

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

    expect(saveWeaverImportSummary).toHaveBeenCalledWith('sample-scene', {
      ...summaryFixture,
      bootstrapStatus: 'succeeded',
    });
    expect(createAPIAdapter).not.toHaveBeenCalled();
    expect(bootstrapGossipelogFromWeaverSummary).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'noop',
      bootstrapStatus: 'succeeded',
      reason: 'gossipelog_state_present',
    });
  });

  it('attempts one fallback bootstrap when persisted gossipelog state is missing', async () => {
    loadWeaverImportSummaryIfPresent.mockResolvedValueOnce({
      ...summaryFixture,
      bootstrapStatus: 'succeeded',
    });
    inspectCharacterRelationshipsState.mockResolvedValueOnce('missing');
    bootstrapGossipelogFromWeaverSummary.mockResolvedValueOnce({
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

    expect(createAPIAdapter).toHaveBeenCalledWith({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.example.com/v1',
        model: 'demo-model',
      },
    });
    expect(bootstrapGossipelogFromWeaverSummary).toHaveBeenCalledWith({
      storyPackageName: 'sample-scene',
      weaverSummary: {
        ...summaryFixture,
        bootstrapStatus: 'succeeded',
      },
      relationshipState: 'missing',
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
});
