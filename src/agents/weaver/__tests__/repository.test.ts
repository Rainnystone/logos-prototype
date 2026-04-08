import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

import {
  loadWeaverImportSummary,
  saveWeaverImportSummary,
} from '@/agents/weaver/repository';
import type { WeaverImportSummary } from '@/types';

function createSummary(): WeaverImportSummary {
  return {
    schemaVersion: 1,
    sourceKind: 'text_import',
    lastRunAt: '2026-04-08T10:00:00.000Z',
    suggestedPackageName: 'woven-package',
    sourceSummary: '外部文本来源摘要',
    importSummary: '已提取基础世界观与角色框架',
    warnings: ['角色关系只得到部分文本支持'],
    unresolvedGaps: ['缺少明确的地点时间线'],
    warningCount: 1,
    unresolvedGapCount: 1,
    bootstrapStatus: 'pending',
  };
}

describe('weaver import repository', () => {
  it('loads an existing package-local import-summary file', async () => {
    const packagesRoot = path.resolve(process.cwd(), 'src/story-packages');
    const packageRoot = await mkdtemp(path.resolve(packagesRoot, 'tmp-weaver-load-'));
    const packageName = path.basename(packageRoot);
    const summaryPath = path.resolve(packageRoot, 'agents', 'weaver', 'import-summary.yaml');

    await mkdir(path.dirname(summaryPath), { recursive: true });
    try {
      await writeFile(summaryPath, YAML.stringify(createSummary()), 'utf8');

      await expect(loadWeaverImportSummary(packageName)).resolves.toEqual(createSummary());
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('writes a valid import-summary file successfully', async () => {
    const packagesRoot = path.resolve(process.cwd(), 'src/story-packages');
    const packageRoot = await mkdtemp(path.resolve(packagesRoot, 'tmp-weaver-save-'));
    const packageName = path.basename(packageRoot);
    const summaryPath = path.resolve(packageRoot, 'agents', 'weaver', 'import-summary.yaml');

    try {
      await saveWeaverImportSummary(packageName, createSummary());

      expect(YAML.parse(await readFile(summaryPath, 'utf8'))).toEqual(createSummary());
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('rejects invalid input before writing any file', async () => {
    const packagesRoot = path.resolve(process.cwd(), 'src/story-packages');
    const packageRoot = await mkdtemp(path.resolve(packagesRoot, 'tmp-weaver-invalid-'));
    const packageName = path.basename(packageRoot);
    const summaryPath = path.resolve(packageRoot, 'agents', 'weaver', 'import-summary.yaml');

    try {
      await expect(
        saveWeaverImportSummary(packageName, {
          ...createSummary(),
          bootstrapStatus: 'unknown',
        } as never),
      ).rejects.toThrow(/weaverImportSummary|bootstrapStatus/i);

      await expect(access(summaryPath)).rejects.toThrow();
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });
});
