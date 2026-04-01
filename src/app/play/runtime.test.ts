import { describe, expect, it, vi } from 'vitest';

import { createTrackedWorkbenchAdapter } from '@/app/play/runtime';
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
