import { describe, expect, it, vi } from 'vitest';

import * as referenceLoader from '@/agents/reference-loader';
import { runWeaverImport } from '@/agents/weaver/agent';
import type { WeaverImportRequest } from '@/engine/types/adapter-interface';
import type { LLMAdapter } from '@/engine/types/adapter-interface';

function createAdapterResult() {
  return {
    suggestedPackageName: 'woven-package',
    sourceSummary: '外部文本来源摘要',
    importSummary: '已提取基础世界观与角色框架',
    openingHook: '原始 opening hook 文本',
    worldBase: {
      settingSummary: '近未来沿海都市',
    },
    hero: {
      displayName: '林深',
      roleSummary: '被迫接管灯塔网络的主角',
    },
    coreCast: [],
    antagonists: [],
    npcCharacters: [
      {
        displayName: '值班维修技师',
        summary: '受事故波及的值班员与维修技师',
      },
    ],
    locations: [],
    warnings: ['角色关系只得到部分文本支持'],
    unresolvedGaps: ['缺少明确的地点时间线'],
  };
}

function createAdapterMock() {
  return {
    weaverImport: vi.fn(async (request: WeaverImportRequest) => {
      void request;
      return createAdapterResult();
    }),
  } satisfies Pick<LLMAdapter, 'weaverImport'>;
}

describe('weaver agent shell', () => {
  it('returns a validated payload and bounded summary state with bootstrapStatus pending', async () => {
    const adapter = createAdapterMock();

    const result = await runWeaverImport({
      adapter,
      sourceText: '一段外部作者文本',
      packageNameHint: '作者命名',
    });

    expect(result.payload).toEqual(createAdapterResult());
    expect(result.summary).toMatchObject({
      schemaVersion: 1,
      sourceKind: 'text_import',
      suggestedPackageName: 'woven-package',
      sourceSummary: '外部文本来源摘要',
      importSummary: '已提取基础世界观与角色框架',
      warnings: ['角色关系只得到部分文本支持'],
      unresolvedGaps: ['缺少明确的地点时间线'],
      warningCount: 1,
      unresolvedGapCount: 1,
      bootstrapStatus: 'pending',
    });
    expect(result.summary.lastRunAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('resolves and injects required references before provider call', async () => {
    const adapter = createAdapterMock();
    const resolveSpy = vi.spyOn(referenceLoader, 'resolveSidecarReferences');

    await runWeaverImport({
      adapter,
      sourceText: '一段外部作者文本',
    });

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(resolveSpy.mock.invocationCallOrder[0]).toBeLessThan(
      adapter.weaverImport.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(adapter.weaverImport).toHaveBeenCalledTimes(1);
    expect(adapter.weaverImport).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceText: '一段外部作者文本',
        resolvedReferences: [
          expect.objectContaining({
            referenceId: 'weaver-import-reference',
            injectionLabel: 'Import reference',
            relativePath: 'src/agents/weaver/references/import-reference.md',
          }),
        ],
      }),
    );
  });

  it('blocks provider calls when a required reference cannot be resolved', async () => {
    const adapter = createAdapterMock();
    const resolveSpy = vi
      .spyOn(referenceLoader, 'resolveSidecarReferences')
      .mockRejectedValue(new Error('Required reference "weaver-import-reference" could not be loaded.'));

    await expect(
      runWeaverImport({
        adapter,
        sourceText: '一段外部作者文本',
      }),
    ).rejects.toThrow(/required reference/i);

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(adapter.weaverImport).not.toHaveBeenCalled();
  });
});
