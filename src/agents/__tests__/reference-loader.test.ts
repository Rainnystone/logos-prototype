import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const fixturesRoot = path.resolve(process.cwd(), 'src/story-packages/__reference-loader-test__');

function resetFixtures(): void {
  rmSync(fixturesRoot, { recursive: true, force: true });
}

function writeFixture(relativePath: string, contents: string): string {
  const absolutePath = path.resolve(fixturesRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents, 'utf8');
  return path.relative(process.cwd(), absolutePath);
}

afterEach(() => {
  resetFixtures();
});

describe('resolveSidecarReferences', () => {
  it('loads a required sidecar reference from a repo-relative static asset', async () => {
    const relativePath = writeFixture('required-core.md', 'required reference body');
    const { resolveSidecarReferences } = await import('@/agents/reference-loader');

    const resolved = await resolveSidecarReferences({
      agentId: 'weaver',
      operationKind: 'weaver_import',
      manifests: [
        {
          referenceId: 'required-core',
          resolverKey: 'repo-text',
          relativePath,
          loadPolicy: 'operation-scoped',
          required: true,
          injectionLabel: 'required reference',
          priority: 100,
        },
      ],
    });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({
      referenceId: 'required-core',
      injectionLabel: 'required reference',
      contents: 'required reference body',
    });
  });

  it('fails before any provider call when a required sidecar reference is missing', async () => {
    const { resolveSidecarReferences } = await import('@/agents/reference-loader');

    await expect(
      resolveSidecarReferences({
        agentId: 'weaver',
        operationKind: 'weaver_import',
        manifests: [
          {
            referenceId: 'missing-required',
            resolverKey: 'repo-text',
            relativePath: 'src/story-packages/__reference-loader-test__/missing.md',
            loadPolicy: 'operation-scoped',
            required: true,
            injectionLabel: 'missing required reference',
            priority: 100,
          },
        ],
      }),
    ).rejects.toThrow(/required reference/i);
  });

  it('trims optional references after required references consume the frozen budget', async () => {
    const requiredPath = writeFixture('required.md', 'R'.repeat(16));
    const highPriorityPath = writeFixture('optional-high.md', 'H'.repeat(24));
    const lowPriorityPath = writeFixture('optional-low.md', 'L'.repeat(24));
    const { resolveSidecarReferences } = await import('@/agents/reference-loader');

    const resolved = await resolveSidecarReferences({
      agentId: 'gossipelog',
      operationKind: 'gossipelog_update',
      maxReferenceTokens: 10,
      manifests: [
        {
          referenceId: 'required-core',
          resolverKey: 'repo-text',
          relativePath: requiredPath,
          loadPolicy: 'always',
          required: true,
          injectionLabel: 'required core',
          priority: 100,
        },
        {
          referenceId: 'optional-low',
          resolverKey: 'repo-text',
          relativePath: lowPriorityPath,
          loadPolicy: 'always',
          required: false,
          injectionLabel: 'optional low',
          priority: 10,
        },
        {
          referenceId: 'optional-high',
          resolverKey: 'repo-text',
          relativePath: highPriorityPath,
          loadPolicy: 'always',
          required: false,
          injectionLabel: 'optional high',
          priority: 90,
        },
      ],
    });

    expect(resolved.map((reference) => reference.referenceId)).toContain('required-core');
    expect(resolved.map((reference) => reference.referenceId)).toContain('optional-high');
    expect(resolved.map((reference) => reference.referenceId)).not.toContain('optional-low');
  });
});
