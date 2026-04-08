import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';

import type { WeaverImportSummary } from '@/types';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const sourcePackageName = 'sample-scene';

function packageRoot(packageName: string): string {
  return path.resolve(storyPackagesRoot, packageName);
}

function resetPackage(packageName: string): void {
  rmSync(packageRoot(packageName), { recursive: true, force: true });
}

function prepareEmptyPackage(packageName: string): string {
  resetPackage(packageName);
  const root = packageRoot(packageName);
  mkdirSync(root, { recursive: true });
  return root;
}

function prepareSamplePackage(packageName: string): string {
  resetPackage(packageName);
  const root = packageRoot(packageName);
  cpSync(path.resolve(storyPackagesRoot, sourcePackageName), root, {
    recursive: true,
  });
  return root;
}

function writeWeaverSummary(packageName: string, summary: Partial<WeaverImportSummary> = {}): void {
  const root = packageRoot(packageName);
  const summaryPath = path.resolve(root, 'agents/weaver/import-summary.yaml');
  mkdirSync(path.dirname(summaryPath), { recursive: true });
  writeFileSync(
    summaryPath,
    YAML.stringify({
      schemaVersion: 1,
      sourceKind: 'text_import',
      lastRunAt: '2026-04-08T00:00:00.000Z',
      suggestedPackageName: 'imported-package',
      sourceSummary: 'import source summary',
      importSummary: 'import summary ready for bootstrap',
      warnings: [],
      unresolvedGaps: [],
      warningCount: 0,
      unresolvedGapCount: 0,
      bootstrapStatus: 'succeeded',
      ...summary,
    } satisfies WeaverImportSummary),
    'utf8',
  );
}

function writeWeaverConfig(packageName: string, enabled: boolean): void {
  const configPath = path.resolve(packageRoot(packageName), 'agents/weaver/config.yaml');
  mkdirSync(path.dirname(configPath), { recursive: true });
  writeFileSync(configPath, `agentId: weaver\nenabled: ${enabled ? 'true' : 'false'}\n`, 'utf8');
}

afterEach(() => {
  resetPackage('__phase4-missing-sidecar__');
  resetPackage('__phase4-built-in-config-drift__');
  resetPackage('__phase4-imported-package-missing-gossipelog__');
  resetPackage('__phase4-imported-package-readable-gossipelog__');
});

describe('loadAgentSurfaceItems', () => {
  it('keeps registered built-in sidecars visible when config and state files are missing', async () => {
    prepareEmptyPackage('__phase4-missing-sidecar__');
    const { loadAgentSurfaceItems } = await import('@/agents/agent-surface');

    const items = await loadAgentSurfaceItems('__phase4-missing-sidecar__');

    expect(items.some((item) => item.agentId === 'weaver')).toBe(true);
    expect(items.some((item) => item.agentId === 'gossipelog')).toBe(true);
  });

  it('treats enabled false on a built-in sidecar config as drift instead of deactivation', async () => {
    prepareSamplePackage('__phase4-built-in-config-drift__');
    writeFileSync(
      path.resolve(
        packageRoot('__phase4-built-in-config-drift__'),
        'agents/gossipelog/config.yaml',
      ),
      'agentId: gossipelog\nenabled: false\n',
      'utf8',
    );
    const { loadAgentSurfaceItems } = await import('@/agents/agent-surface');

    const items = await loadAgentSurfaceItems('__phase4-built-in-config-drift__');
    const gossipelogCard = items.find((item) => item.agentId === 'gossipelog');

    expect(gossipelogCard?.operationalHint).toBe('warning');
    expect(gossipelogCard?.latestStateLine).toEqual(expect.any(String));
  });

  it('marks gossipelog as pending_bootstrap for imported packages when relationship state is missing', async () => {
    prepareSamplePackage('__phase4-imported-package-missing-gossipelog__');
    writeWeaverConfig('__phase4-imported-package-missing-gossipelog__', true);
    writeWeaverSummary('__phase4-imported-package-missing-gossipelog__');
    rmSync(
      path.resolve(
        packageRoot('__phase4-imported-package-missing-gossipelog__'),
        'agents/gossipelog/character-relationships.yaml',
      ),
      { force: true },
    );
    const { loadAgentSurfaceItems } = await import('@/agents/agent-surface');

    const items = await loadAgentSurfaceItems('__phase4-imported-package-missing-gossipelog__');

    expect(items.find((item) => item.agentId === 'gossipelog')?.operationalHint).toBe(
      'pending_bootstrap',
    );
    expect(items.find((item) => item.agentId === 'weaver')?.operationalHint).toBe('ready');
  });

  it('marks gossipelog as ready once relationship state is readable even if weaver bootstrap status drifted', async () => {
    prepareSamplePackage('__phase4-imported-package-readable-gossipelog__');
    writeWeaverConfig('__phase4-imported-package-readable-gossipelog__', true);
    writeWeaverSummary('__phase4-imported-package-readable-gossipelog__', {
      bootstrapStatus: 'fallback_pending',
      warnings: ['bootstrap drift'],
      warningCount: 1,
    });
    const { loadAgentSurfaceItems } = await import('@/agents/agent-surface');

    const items = await loadAgentSurfaceItems('__phase4-imported-package-readable-gossipelog__');

    expect(items.find((item) => item.agentId === 'gossipelog')?.operationalHint).toBe('ready');
    expect(items.find((item) => item.agentId === 'weaver')?.latestStateLine).toEqual(
      expect.any(String),
    );
    expect(items.find((item) => item.agentId === 'gossipelog')?.latestStateLine).toEqual(
      expect.any(String),
    );
  });
});
