import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  MANAGED_VARIANT_AUTHORING_FILES,
  cloneVariantWorkspace,
  promoteStagedVariantWorkspace,
  resolveVariantWorkspacePath,
  resolveVariantWorkspaceRoot,
  resolveVariantWorkspaceStageRoot,
  stageVariantWorkspaceFromBaseline,
} from '@/storylines/workspaces';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');

describe('storyline workspaces', () => {
  it('copies only the managed authored YAML files when bootstrapping a staged workspace from baseline', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-storyline-baseline-'));
    const packageName = path.basename(packageRoot);
    const stageId = 'stage_bootstrap';

    try {
      for (const fileName of MANAGED_VARIANT_AUTHORING_FILES) {
        await writeFile(path.resolve(packageRoot, fileName), `# ${fileName}\n`, 'utf8');
      }
      await writeFile(path.resolve(packageRoot, 'extra-baseline.txt'), 'should not be copied\n', 'utf8');

      await stageVariantWorkspaceFromBaseline({ packageName, stageId });

      const stagedEntries = await readdir(resolveVariantWorkspaceStageRoot(packageName, stageId));
      expect(stagedEntries.sort()).toEqual([...MANAGED_VARIANT_AUTHORING_FILES].sort());
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('promotes a staged workspace into the canonical variants/<variantId> root', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-storyline-promote-'));
    const packageName = path.basename(packageRoot);
    const stageId = 'stage_promote';

    try {
      for (const fileName of MANAGED_VARIANT_AUTHORING_FILES) {
        await writeFile(path.resolve(packageRoot, fileName), `managed-${fileName}\n`, 'utf8');
      }

      await stageVariantWorkspaceFromBaseline({ packageName, stageId });
      await promoteStagedVariantWorkspace({
        packageName,
        stageId,
        targetVariantId: 'variant_main',
      });

      const promotedWorldBase = await readFile(
        resolveVariantWorkspacePath(packageName, 'variant_main', 'world-base.yaml'),
        'utf8',
      );
      expect(promotedWorldBase).toContain('managed-world-base.yaml');
      await expect(
        readdir(resolveVariantWorkspaceStageRoot(packageName, stageId)),
      ).rejects.toThrow();
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('copies the full variant workspace recursively for variant-to-variant cloning', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-storyline-clone-'));
    const packageName = path.basename(packageRoot);

    try {
      const sourceRoot = resolveVariantWorkspaceRoot(packageName, 'variant_source');
      await mkdir(path.resolve(sourceRoot, 'notes'), { recursive: true });
      await mkdir(path.resolve(sourceRoot, 'assets', 'meta'), { recursive: true });
      await writeFile(path.resolve(sourceRoot, 'world-base.yaml'), '# managed\n', 'utf8');
      await writeFile(path.resolve(sourceRoot, 'notes', 'readme.txt'), 'opaque file\n', 'utf8');
      await writeFile(
        path.resolve(sourceRoot, 'assets', 'meta', 'opaque.json'),
        '{"kind":"opaque"}\n',
        'utf8',
      );

      await cloneVariantWorkspace({
        packageName,
        sourceVariantId: 'variant_source',
        targetVariantId: 'variant_copy',
      });

      await expect(
        readFile(
          resolveVariantWorkspacePath(packageName, 'variant_copy', 'notes', 'readme.txt'),
          'utf8',
        ),
      ).resolves.toContain('opaque file');
      await expect(
        readFile(
          resolveVariantWorkspacePath(packageName, 'variant_copy', 'assets', 'meta', 'opaque.json'),
          'utf8',
        ),
      ).resolves.toContain('"kind":"opaque"');
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });
});
