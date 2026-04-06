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
  stageVariantWorkspaceFromVariant,
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

  it('copies the full variant workspace recursively when staging from an existing variant', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-storyline-stage-from-variant-'));
    const packageName = path.basename(packageRoot);
    const stageId = 'stage_from_variant';

    try {
      const sourceRoot = resolveVariantWorkspaceRoot(packageName, 'variant_source');
      await mkdir(path.resolve(sourceRoot, 'notes', 'deep'), { recursive: true });
      await writeFile(path.resolve(sourceRoot, 'world-base.yaml'), '# managed\n', 'utf8');
      await writeFile(path.resolve(sourceRoot, 'notes', 'deep', 'opaque.txt'), 'opaque staged file\n', 'utf8');

      await stageVariantWorkspaceFromVariant({
        packageName,
        sourceVariantId: 'variant_source',
        stageId,
      });

      await expect(
        readFile(
          path.resolve(resolveVariantWorkspaceStageRoot(packageName, stageId), 'notes', 'deep', 'opaque.txt'),
          'utf8',
        ),
      ).resolves.toContain('opaque staged file');
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('rejects unsafe variantId and stageId inputs before path resolution escapes workspace roots', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-storyline-invalid-id-'));
    const packageName = path.basename(packageRoot);

    try {
      expect(() => resolveVariantWorkspaceRoot(packageName, '../escape')).toThrow(/variantId/i);
      expect(() => resolveVariantWorkspaceRoot(packageName, 'variant/main')).toThrow(/variantId/i);
      expect(() => resolveVariantWorkspaceStageRoot(packageName, '/tmp/stage')).toThrow(/stageId/i);
      expect(() => resolveVariantWorkspaceStageRoot(packageName, '..')).toThrow(/stageId/i);
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('fails promotion without deleting the existing target workspace when target already exists', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-storyline-promote-conflict-'));
    const packageName = path.basename(packageRoot);
    const stageId = 'stage_conflict';
    const targetVariantId = 'variant_main';

    try {
      for (const fileName of MANAGED_VARIANT_AUTHORING_FILES) {
        await writeFile(path.resolve(packageRoot, fileName), `staged-${fileName}\n`, 'utf8');
      }

      const targetRoot = resolveVariantWorkspaceRoot(packageName, targetVariantId);
      await mkdir(targetRoot, { recursive: true });
      await writeFile(path.resolve(targetRoot, 'world-base.yaml'), 'existing target content\n', 'utf8');

      await stageVariantWorkspaceFromBaseline({ packageName, stageId });

      await expect(
        promoteStagedVariantWorkspace({
          packageName,
          stageId,
          targetVariantId,
        }),
      ).rejects.toThrow(/already exists/i);

      await expect(
        readFile(path.resolve(targetRoot, 'world-base.yaml'), 'utf8'),
      ).resolves.toContain('existing target content');
      await expect(
        readFile(path.resolve(resolveVariantWorkspaceStageRoot(packageName, stageId), 'world-base.yaml'), 'utf8'),
      ).resolves.toContain('staged-world-base.yaml');
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('fails promotion safely when the staged workspace is missing', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-storyline-promote-missing-stage-'));
    const packageName = path.basename(packageRoot);

    try {
      await expect(
        promoteStagedVariantWorkspace({
          packageName,
          stageId: 'missing_stage',
          targetVariantId: 'variant_main',
        }),
      ).rejects.toThrow(/staged workspace/i);

      await expect(readdir(resolveVariantWorkspaceRoot(packageName, 'variant_main'))).rejects.toThrow();
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('fails variant-to-variant clone when the target workspace already exists', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-storyline-clone-conflict-'));
    const packageName = path.basename(packageRoot);

    try {
      const sourceRoot = resolveVariantWorkspaceRoot(packageName, 'variant_source');
      const targetRoot = resolveVariantWorkspaceRoot(packageName, 'variant_copy');
      await mkdir(sourceRoot, { recursive: true });
      await mkdir(targetRoot, { recursive: true });
      await writeFile(path.resolve(sourceRoot, 'world-base.yaml'), 'source content\n', 'utf8');
      await writeFile(path.resolve(targetRoot, 'world-base.yaml'), 'target content\n', 'utf8');

      await expect(
        cloneVariantWorkspace({
          packageName,
          sourceVariantId: 'variant_source',
          targetVariantId: 'variant_copy',
        }),
      ).rejects.toThrow(/already exists/i);

      await expect(readFile(path.resolve(targetRoot, 'world-base.yaml'), 'utf8')).resolves.toContain(
        'target content',
      );
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });
});
