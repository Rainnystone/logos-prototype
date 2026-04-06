import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { StorylineRepositoryFile } from '@/types';
import {
  readStorylineRepository,
  readStorylineRepositoryForWrite,
  writeStorylineRepository,
} from '@/storylines/repository';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');

function createRepositoryFixture(): StorylineRepositoryFile {
  return {
    version: 1,
    activeStorylineId: 'storyline_main',
    storylinesById: {
      storyline_main: {
        storylineId: 'storyline_main',
        name: 'Main Line',
        status: 'active',
        sourceCheckpointId: null,
        headCheckpointId: null,
        variantId: 'variant_main',
        activeSessionId: 'sess_main',
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
    },
    variantsById: {
      variant_main: {
        variantId: 'variant_main',
        workspaceRoot: 'variants/variant_main',
        createdFromStorylineId: null,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
    },
  };
}

describe('storyline repository', () => {
  it('returns null when storyline-repository.json is missing', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-storyline-repo-missing-'));
    const packageName = path.basename(packageRoot);

    try {
      await expect(readStorylineRepository(packageName)).resolves.toBeNull();
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('throws when read-for-write is called before the explicit repository exists', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-storyline-repo-write-'));
    const packageName = path.basename(packageRoot);

    try {
      await expect(readStorylineRepositoryForWrite(packageName)).rejects.toThrow(
        /storyline-repository\.json/i,
      );
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('writes and reads storyline-repository.json through the repository helpers', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-storyline-repo-roundtrip-'));
    const packageName = path.basename(packageRoot);
    const fixture = createRepositoryFixture();

    try {
      await writeStorylineRepository(packageName, fixture);

      await expect(readStorylineRepository(packageName)).resolves.toMatchObject({
        activeStorylineId: 'storyline_main',
      });
      await expect(readStorylineRepositoryForWrite(packageName)).resolves.toMatchObject({
        storylinesById: {
          storyline_main: {
            activeSessionId: 'sess_main',
          },
        },
      });
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });
});
