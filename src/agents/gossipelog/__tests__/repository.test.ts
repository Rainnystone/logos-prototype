import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  loadCharacterRelationships,
  loadOrCreateCharacterRelationships,
} from '@/agents/gossipelog/repository';

describe('gossipelog relationship repository', () => {
  it('loads an existing package-local character-relationships file', async () => {
    const file = await loadCharacterRelationships('sample-scene');

    expect(file.meta.fileType).toBe('character-relationships');
    expect(file.meta.storyPackage).toBe('sample-scene');
  });

  it('returns a deterministic empty file when an existing package path has no relationship file yet', async () => {
    const packagesRoot = path.resolve(process.cwd(), 'src/story-packages');
    const packageRoot = await mkdtemp(path.resolve(packagesRoot, 'tmp-gossipelog-'));
    const packageName = path.basename(packageRoot);

    await mkdir(path.resolve(packageRoot, 'agents', 'gossipelog'), { recursive: true });

    try {
      const file = await loadOrCreateCharacterRelationships(packageName);

      expect(file).toEqual({
        meta: {
          fileType: 'character-relationships',
          schemaVersion: 1,
          storyPackage: packageName,
        },
        relationshipsBySource: {},
      });
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('rejects loads for a missing story package path', async () => {
    await expect(loadCharacterRelationships('missing-gossipelog-package')).rejects.toThrow(
      /was not found/i,
    );
  });

  it('still throws when an existing relationship file has invalid content', async () => {
    const packagesRoot = path.resolve(process.cwd(), 'src/story-packages');
    const packageRoot = await mkdtemp(path.resolve(packagesRoot, 'tmp-gossipelog-invalid-'));
    const packageName = path.basename(packageRoot);
    const relationshipPath = path.resolve(
      packageRoot,
      'agents',
      'gossipelog',
      'character-relationships.yaml',
    );

    await mkdir(path.dirname(relationshipPath), { recursive: true });
    await writeFile(relationshipPath, 'meta:\n  fileType: wrong-shape\n', 'utf8');

    try {
      await expect(loadOrCreateCharacterRelationships(packageName)).rejects.toThrow(
        /Failed to load character relationships|characterRelationships/i,
      );
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });
});
