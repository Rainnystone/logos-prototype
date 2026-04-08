import { describe, expect, it, vi } from 'vitest';

import { observeWeaverImport } from '@simulation/weaver-observer';

vi.mock('@/agents/weaver/agent', () => ({
  runWeaverImport: vi.fn().mockResolvedValue({
    request: { sourceText: 'Test source.', resolvedReferences: [] },
    payload: {
      sourceSummary: 'Test summary.',
      importSummary: 'Import summary.',
      openingHook: 'Test hook.',
      worldBase: {},
      coreCast: [],
      antagonists: [],
      npcCharacters: [],
      locations: [],
      warnings: [],
      unresolvedGaps: [],
    },
    summary: {
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
    },
  }),
}));

describe('observeWeaverImport', () => {
  it('returns observation with agent trace', async () => {
    const observation = await observeWeaverImport({
      adapter: { weaverImport: vi.fn() },
      sourceText: 'Test source text for import.',
    });

    expect(observation.result).toBeDefined();
    expect(observation.agentTrace.agentId).toBe('weaver');
    expect(observation.agentTrace.stage).toBe('import');
    expect(observation.agentTrace.outcome).toBe('payload-clean');
  });

  it('returns full result alongside trace', async () => {
    const observation = await observeWeaverImport({
      adapter: { weaverImport: vi.fn() },
      sourceText: 'Another test source.',
    });

    expect(observation.result.payload).toBeDefined();
    expect(observation.result.summary).toBeDefined();
    expect(observation.result.request).toBeDefined();
  });
});
