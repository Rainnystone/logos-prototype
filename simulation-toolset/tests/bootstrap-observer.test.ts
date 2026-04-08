import { describe, it, expect, vi } from 'vitest';
import type { WeaverImportSummary } from '@/types';
import { observeGossipelogBootstrap } from '@simulation/bootstrap-observer';

vi.mock('@/agents/gossipelog/bootstrap', () => ({
  bootstrapGossipelogFromWeaverSummary: vi.fn(),
}));

const mockSummary: WeaverImportSummary = {
  schemaVersion: 1,
  sourceKind: 'text_import',
  lastRunAt: '2026-04-08T00:00:00.000Z',
  sourceSummary: 'Test summary.',
  importSummary: 'Import summary.',
  warnings: [],
  unresolvedGaps: [],
  warningCount: 0,
  unresolvedGapCount: 0,
  bootstrapStatus: 'pending',
};

describe('observeGossipelogBootstrap', () => {
  it('returns succeeded outcome on success', async () => {
    const { bootstrapGossipelogFromWeaverSummary } = await import('@/agents/gossipelog/bootstrap');
    vi.mocked(bootstrapGossipelogFromWeaverSummary).mockResolvedValueOnce({
      ok: true,
      attempted: true,
      bootstrapStatus: 'succeeded',
    });

    const observation = await observeGossipelogBootstrap({
      storyPackageName: 'test-package',
      weaverSummary: mockSummary,
      adapter: { gossipelogUpdate: vi.fn(), gossipelogInjection: vi.fn() },
    });

    expect(observation.ok).toBe(true);
    expect(observation.bootstrapStatus).toBe('succeeded');
    expect(observation.agentTrace.agentId).toBe('gossipelog');
    expect(observation.agentTrace.stage).toBe('bootstrap');
    expect(observation.agentTrace.outcome).toBe('succeeded');
  });

  it('returns fallback-pending outcome when bootstrap fails', async () => {
    const { bootstrapGossipelogFromWeaverSummary } = await import('@/agents/gossipelog/bootstrap');
    vi.mocked(bootstrapGossipelogFromWeaverSummary).mockResolvedValueOnce({
      ok: false,
      attempted: true,
      bootstrapStatus: 'fallback_pending',
      errorMessage: 'Test bootstrap failure.',
    });

    const observation = await observeGossipelogBootstrap({
      storyPackageName: 'test-package',
      weaverSummary: mockSummary,
      adapter: { gossipelogUpdate: vi.fn(), gossipelogInjection: vi.fn() },
    });

    expect(observation.ok).toBe(false);
    expect(observation.bootstrapStatus).toBe('fallback_pending');
    expect(observation.agentTrace.outcome).toBe('fallback-pending');
    expect(observation.errorMessage).toBe('Test bootstrap failure.');
  });

  it('includes side effect summary', async () => {
    const { bootstrapGossipelogFromWeaverSummary } = await import('@/agents/gossipelog/bootstrap');
    vi.mocked(bootstrapGossipelogFromWeaverSummary).mockResolvedValueOnce({
      ok: true,
      attempted: true,
      bootstrapStatus: 'succeeded',
    });

    const observation = await observeGossipelogBootstrap({
      storyPackageName: 'test-package',
      weaverSummary: mockSummary,
      adapter: { gossipelogUpdate: vi.fn(), gossipelogInjection: vi.fn() },
    });

    expect(observation.agentTrace.sideEffectSummary).toBeDefined();
    expect(observation.agentTrace.sideEffectSummary!.length).toBeGreaterThan(0);
  });
});
