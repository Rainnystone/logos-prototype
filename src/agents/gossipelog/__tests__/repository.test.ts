import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

import {
  loadCharacterRelationships,
  loadOrCreateCharacterRelationships,
  saveCharacterRelationships,
} from '@/agents/gossipelog/repository';
import type { CharacterRelationshipsFile } from '@/types';

function createRelationshipFile(packageName: string): CharacterRelationshipsFile {
  return {
    meta: {
      fileType: 'character-relationships',
      schemaVersion: 1,
      storyPackage: packageName,
    },
    relationshipsBySource: {
      chr_core01: {
        targets: {
          chr_hero01: {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_hero01',
            baseline: {
              state: 'guarded trust',
              lastAbsorbedRound: 'round-0008',
            },
            recentDelta: {
              state: 'trust increased after direct protection',
              sourceRound: 'round-0009',
            },
            highlightNextPrompt: true,
          },
        },
      },
    },
  };
}

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

  it('writes a valid character-relationships file successfully', async () => {
    const packagesRoot = path.resolve(process.cwd(), 'src/story-packages');
    const packageRoot = await mkdtemp(path.resolve(packagesRoot, 'tmp-gossipelog-save-'));
    const packageName = path.basename(packageRoot);
    const relationshipPath = path.resolve(
      packageRoot,
      'agents',
      'gossipelog',
      'character-relationships.yaml',
    );

    await mkdir(path.dirname(relationshipPath), { recursive: true });

    try {
      const file = createRelationshipFile(packageName);
      await saveCharacterRelationships(packageName, file);

      expect(YAML.parse(await readFile(relationshipPath, 'utf8'))).toEqual(file);
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('rejects invalid input before writing any file', async () => {
    const packagesRoot = path.resolve(process.cwd(), 'src/story-packages');
    const packageRoot = await mkdtemp(path.resolve(packagesRoot, 'tmp-gossipelog-save-invalid-'));
    const packageName = path.basename(packageRoot);
    const relationshipPath = path.resolve(
      packageRoot,
      'agents',
      'gossipelog',
      'character-relationships.yaml',
    );

    try {
      await expect(
        saveCharacterRelationships(
          packageName,
          {
            meta: {
              fileType: 'wrong-shape',
              schemaVersion: 1,
              storyPackage: packageName,
            },
            relationshipsBySource: {},
          } as unknown as CharacterRelationshipsFile,
        ),
      ).rejects.toThrow(/characterRelationships|fileType/i);

      await expect(access(relationshipPath)).rejects.toThrow();
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('creates the missing gossipelog directory path for a valid write', async () => {
    const packagesRoot = path.resolve(process.cwd(), 'src/story-packages');
    const packageRoot = await mkdtemp(path.resolve(packagesRoot, 'tmp-gossipelog-save-mkdir-'));
    const packageName = path.basename(packageRoot);
    const gossipelogDir = path.resolve(packageRoot, 'agents', 'gossipelog');
    const relationshipPath = path.resolve(gossipelogDir, 'character-relationships.yaml');

    try {
      await saveCharacterRelationships(packageName, createRelationshipFile(packageName));

      await expect(access(gossipelogDir)).resolves.toBeUndefined();
      expect(YAML.parse(await readFile(relationshipPath, 'utf8'))).toEqual(
        createRelationshipFile(packageName),
      );
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });
});
