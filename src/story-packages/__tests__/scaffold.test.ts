import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadStoryPackage } from '@/engine/story-loader';
import { readStorylineRepository } from '@/storylines/repository';
import * as runtimeSessionsRepository from '@/runtime-sessions/repository';
import {
  StoryPackageScaffoldConflictError,
  StoryPackageScaffoldInputError,
  StoryPackageScaffoldValidationError,
  StoryPackageScaffoldWriteError,
} from '@/story-packages/scaffold-errors';
import type { StorylineRecord, StorylineRepositoryFile } from '@/types';

const fileSystemFailureState = vi.hoisted(() => ({
  failRename: false,
  failMkdirStageRoot: false,
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();

  return {
    ...actual,
    mkdir: vi.fn(async (...args: Parameters<typeof actual.mkdir>) => {
      const [targetPath] = args;

      if (
        fileSystemFailureState.failMkdirStageRoot &&
        typeof targetPath === 'string' &&
        targetPath.includes('.stage-')
      ) {
        throw new Error('mkdir blocked');
      }

      return actual.mkdir(...args);
    }),
    rename: vi.fn(async (...args: Parameters<typeof actual.rename>) => {
      if (fileSystemFailureState.failRename) {
        throw new Error('rename blocked');
      }

      return actual.rename(...args);
    }),
  };
});

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
  fileSystemFailureState.failRename = false;
  fileSystemFailureState.failMkdirStageRoot = false;
  vi.restoreAllMocks();
  for (const packageRoot of createdPackageRoots) {
    await removeIfExists(packageRoot);
  }
  createdPackageRoots.clear();
});

async function loadCreateStoryPackageScaffold() {
  const scaffoldModule = await import('@/story-packages/scaffold');
  return scaffoldModule.createStoryPackageScaffold;
}

function requireMainStoryline(
  repository: StorylineRepositoryFile | null,
): StorylineRecord {
  if (!repository) {
    throw new Error('Expected storyline repository to exist.');
  }

  const storyline = repository.storylinesById.storyline_main;
  if (!storyline) {
    throw new Error('Expected storyline_main to exist.');
  }

  return storyline;
}

describe('story package scaffold', () => {
  it('rejects invalid display names as input errors', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();

    await expect(
      createStoryPackageScaffold({
        displayName: 'CON',
      }),
    ).rejects.toBeInstanceOf(StoryPackageScaffoldInputError);
  });

  it('creates an explicit Phase 3 package scaffold that validates through both loader and repositories', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
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
    const mainStoryline = requireMainStoryline(repository);

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
      activeSessionId: mainStoryline.activeSessionId,
      sessionsById: {
        [mainStoryline.activeSessionId]: expect.objectContaining({
          lifecycle: 'awaiting_start',
          headCheckpointId: null,
          activeCheckpointId: null,
        }),
      },
    });
  });

  it('rejects duplicate package names case-insensitively', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    const existingRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'Case-Folded-Story-'));
    createdPackageRoots.add(existingRoot);

    await expect(
      createStoryPackageScaffold({
        displayName: path.basename(existingRoot).toLowerCase(),
      }),
    ).rejects.toBeInstanceOf(StoryPackageScaffoldConflictError);
  });

  it('cleans up the staged directory if scaffold validation fails before promotion', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    const brokenSlug = 'broken-package';
    const originalStringify = YAML.stringify;
    let stringifyCallCount = 0;

    vi.spyOn(YAML, 'stringify').mockImplementation((value, options) => {
      stringifyCallCount += 1;
      if (stringifyCallCount === 2) {
        return 'sceneName: [\n';
      }

      return originalStringify.call(YAML, value, options);
    });

    await expect(
      createStoryPackageScaffold({
        displayName: 'broken package',
      }),
    ).rejects.toBeInstanceOf(StoryPackageScaffoldValidationError);

    expect(await findStagedPackageRoots(brokenSlug)).toEqual([]);
    await expect(access(path.resolve(storyPackagesRoot, brokenSlug))).rejects.toThrow();
  });

  it('cleans up the staged directory if promotion fails after validation succeeds', async () => {
    const blockedSlug = 'rename-failure-package';
    await removeIfExists(path.resolve(storyPackagesRoot, blockedSlug));
    fileSystemFailureState.failRename = true;
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();

    await expect(
      createStoryPackageScaffold({
        displayName: 'rename failure package',
      }),
    ).rejects.toBeInstanceOf(StoryPackageScaffoldWriteError);

    expect(await findStagedPackageRoots(blockedSlug)).toEqual([]);
    await expect(access(path.resolve(storyPackagesRoot, blockedSlug))).rejects.toThrow();
  });

  it('wraps stage-root mkdir failures as write errors', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    fileSystemFailureState.failMkdirStageRoot = true;

    await expect(
      createStoryPackageScaffold({
        displayName: 'mkdir failure package',
      }),
    ).rejects.toBeInstanceOf(StoryPackageScaffoldWriteError);
  });

  it('preserves an explicit awaiting_start runtime session bound to storyline_main', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    const result = await createStoryPackageScaffold({
      displayName: 'Awaiting Start Package',
    });

    const packageRoot = path.resolve(storyPackagesRoot, result.packageName);
    createdPackageRoots.add(packageRoot);

    const repository = await readStorylineRepository(result.packageName);
    const runtimeFile = await runtimeSessionsRepository.readFile(result.packageName);
    const mainStoryline = requireMainStoryline(repository);
    const boundSessionId = mainStoryline.activeSessionId;
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
