import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

import {
  loadCharacterRelationships,
  loadOrCreateCharacterRelationships,
  saveCharacterRelationships,
} from '@/agents/gossipelog/repository';
import type { CharacterRelationshipsFile, RelationshipMemoryEdge } from '@/types';

function expectMemoryEdge(edge: unknown): RelationshipMemoryEdge {
  expect(edge).toBeDefined();

  if (!edge || typeof edge !== 'object' || !('history' in edge) || !('currentRelation' in edge)) {
    throw new Error('Expected schemaVersion 2 relationship memory edge.');
  }

  return edge as RelationshipMemoryEdge;
}

function createRelationshipFile(packageName: string): CharacterRelationshipsFile {
  const initialMemoryEntry = {
    phaseId: 'phase-01-prologue',
    beatIndex: 2,
    roundId: 'round-0009',
    functionalRole: 'anchor',
    mindsetTags: ['trust'],
    summary: 'trust increased after direct protection',
    triggerEvent: 'protected during ambush',
    reasoning: 'action proved dependable intent',
    causalAction: 'shares sensitive intel',
  };

  return {
    meta: {
      fileType: 'character-relationships',
      schemaVersion: 2,
      storyPackage: packageName,
    },
    relationshipsBySource: {
      chr_core01: {
        targets: {
          chr_hero01: {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_hero01',
            currentRelation: initialMemoryEntry,
            history: [initialMemoryEntry],
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
          schemaVersion: 2,
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

  it('loads a v1 gossipelog file and returns a v2 relationship memory shape', async () => {
    const packagesRoot = path.resolve(process.cwd(), 'src/story-packages');
    const packageRoot = await mkdtemp(path.resolve(packagesRoot, 'tmp-gossipelog-migrate-'));
    const packageName = path.basename(packageRoot);
    const relationshipPath = path.resolve(
      packageRoot,
      'agents',
      'gossipelog',
      'character-relationships.yaml',
    );

    await mkdir(path.dirname(relationshipPath), { recursive: true });
    await writeFile(
      relationshipPath,
      `
meta:
  fileType: character-relationships
  schemaVersion: 1
  storyPackage: ${packageName}
relationshipsBySource:
  chr_core01:
    targets:
      chr_hero01:
        sourceRoleId: chr_core01
        targetRoleId: chr_hero01
        baseline:
          state: guarded trust
          lastAbsorbedRound: round-0008
        recentDelta:
          state: trust increased after direct protection
          sourceRound: round-0009
        highlightNextPrompt: true
`,
      'utf8',
    );

    try {
      const file = await loadCharacterRelationships(packageName);
      const edge = expectMemoryEdge(file.relationshipsBySource.chr_core01?.targets.chr_hero01);

      expect(file.meta.schemaVersion).toBe(2);
      expect(edge.history).toHaveLength(2);
      expect(edge.history[0]?.phaseId).toBeNull();
      expect(edge.history[0]?.beatIndex).toBeNull();
      expect(edge.currentRelation.roundId).toBe('round-0009');
      expect(edge.history.length).toBeGreaterThan(0);
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
              schemaVersion: 2,
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
