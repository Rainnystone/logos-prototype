import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadStoryPackage } from '@/engine/story-loader';
import { createStoryPackageScaffold } from '@/story-packages/scaffold';
import { readStorylineRepository } from '@/storylines/repository';
import * as runtimeSessionsRepository from '@/runtime-sessions/repository';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const createdPackageRoots = new Set<string>();

async function removeIfExists(targetPath: string): Promise<void> {
  await rm(targetPath, { recursive: true, force: true });
}

async function findStagedPackageRoots(slug: string): Promise<string[]> {
  const entries = await readdir(storyPackagesRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(`.${slug}.stage-`))
    .map((entry) => path.resolve(storyPackagesRoot, entry.name));
}

afterEach(async () => {
  for (const packageRoot of createdPackageRoots) {
    await removeIfExists(packageRoot);
  }
  createdPackageRoots.clear();
});

describe('story package scaffold', () => {
  it('creates an explicit Phase 3 package scaffold that validates through both loader and repositories', async () => {
    const result = await createStoryPackageScaffold({
      displayName: '新故事包',
    });

    const packageRoot = path.resolve(storyPackagesRoot, result.packageName);
    createdPackageRoots.add(packageRoot);

    expect(result.packageName).toMatch(/[a-z0-9-]+/);
    expect(result.activeStorylineId).toBe('storyline_main');
    expect(result.createdAt).toEqual(expect.any(String));
    await expect(access(path.resolve(packageRoot, 'variants/variant_main'))).resolves.toBeUndefined();

    await expect(loadStoryPackage(result.packageName)).resolves.toMatchObject({
      sceneSpec: expect.objectContaining({
        sceneName: '新故事包',
      }),
    });

    const repository = await readStorylineRepository(result.packageName);
    const runtimeFile = await runtimeSessionsRepository.readFile(result.packageName);

    expect(repository).toMatchObject({
      activeStorylineId: 'storyline_main',
      storylinesById: {
        storyline_main: expect.objectContaining({
          storylineId: 'storyline_main',
          variantId: 'variant_main',
          activeSessionId: expect.any(String),
        }),
      },
      variantsById: {
        variant_main: expect.objectContaining({
          variantId: 'variant_main',
          workspaceRoot: 'variants/variant_main',
        }),
      },
    });
    expect(runtimeFile).toMatchObject({
      activeSessionId: repository?.storylinesById.storyline_main.activeSessionId,
      sessionsById: {
        [repository?.storylinesById.storyline_main.activeSessionId ?? '']: expect.objectContaining({
          lifecycle: 'awaiting_start',
          headCheckpointId: null,
          activeCheckpointId: null,
        }),
      },
    });
  });

  it('rejects duplicate package names case-insensitively', async () => {
    const existingRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'Case-Folded-Story-'));
    createdPackageRoots.add(existingRoot);

    await expect(
      createStoryPackageScaffold({
        displayName: path.basename(existingRoot).toLowerCase(),
      }),
    ).rejects.toThrow(/already exists/i);
  });

  it('cleans up the staged directory if scaffold validation fails before promotion', async () => {
    const brokenSlug = 'broken-package';

    await expect(
      createStoryPackageScaffold({
        displayName: 'broken package',
        testOnlyTransformStageFile: async (stageRoot) => {
          await writeFile(path.resolve(stageRoot, 'scene.yaml'), 'sceneName: [\n', 'utf8');
        },
      }),
    ).rejects.toThrow();

    expect(await findStagedPackageRoots(brokenSlug)).toEqual([]);
    await expect(access(path.resolve(storyPackagesRoot, brokenSlug))).rejects.toThrow();
  });

  it('preserves an explicit awaiting_start runtime session bound to storyline_main', async () => {
    const result = await createStoryPackageScaffold({
      displayName: 'Awaiting Start Package',
    });

    const packageRoot = path.resolve(storyPackagesRoot, result.packageName);
    createdPackageRoots.add(packageRoot);

    const repository = await readStorylineRepository(result.packageName);
    const runtimeFile = await runtimeSessionsRepository.readFile(result.packageName);
    const boundSessionId = repository?.storylinesById.storyline_main.activeSessionId;
    const runtimeJson = JSON.parse(
      await readFile(path.resolve(packageRoot, 'runtime-sessions.json'), 'utf8'),
    ) as {
      activeSessionId: string | null;
      sessionsById: Record<string, { lifecycle: string }>;
    };

    expect(boundSessionId).toEqual(expect.any(String));
    expect(runtimeFile?.activeSessionId).toBe(boundSessionId);
    expect(runtimeJson.activeSessionId).toBe(boundSessionId);
    expect(boundSessionId ? runtimeJson.sessionsById[boundSessionId]?.lifecycle : null).toBe(
      'awaiting_start',
    );
  });
});
