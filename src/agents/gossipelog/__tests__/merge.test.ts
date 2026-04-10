import { describe, expect, it } from 'vitest';

import {
  absorbConsumedDeltas,
  mergeRelationshipUpdates,
} from '@/agents/gossipelog/merge';
import type {
  CharacterRelationshipsFile,
  CharacterRelationshipsFileV2,
  RelationshipMemoryEdge,
  RelationshipMemoryEntry,
} from '@/types';

const heroRoleId = 'chr_hero01';

function createEntry(
  overrides: Partial<RelationshipMemoryEntry> = {},
): RelationshipMemoryEntry {
  return {
    phaseId: 'phase-01-prologue',
    beatIndex: 1,
    roundId: 'round-0010',
    functionalRole: 'anchor',
    mindsetTags: ['trust'],
    summary: 'stable guarded trust',
    triggerEvent: 'shared risk during scouting',
    reasoning: 'consistent support reinforced confidence',
    causalAction: 'core role shares a tactical lead',
    ...overrides,
  };
}

function expectMemoryEdge(edge: unknown): RelationshipMemoryEdge {
  expect(edge).toBeDefined();

  if (!edge || typeof edge !== 'object' || !('history' in edge) || !('currentRelation' in edge)) {
    throw new Error('Expected schemaVersion 2 relationship memory edge.');
  }

  return edge as RelationshipMemoryEdge;
}

function createExistingFile(): CharacterRelationshipsFileV2 {
  const existingCurrentRelation = createEntry();

  return {
    meta: {
      fileType: 'character-relationships',
      schemaVersion: 2,
      storyPackage: 'sample-scene',
    },
    relationshipsBySource: {
      chr_core01: {
        targets: {
          chr_hero01: {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_hero01',
            currentRelation: existingCurrentRelation,
            history: [existingCurrentRelation],
          },
        },
      },
    },
  };
}

describe('gossipelog merge helpers', () => {
  it('keeps the current file unchanged on invocation-level no-op', () => {
    const existingFile = createExistingFile();
    const merged = mergeRelationshipUpdates(
      existingFile,
      {
        involvedRoleIds: ['chr_core01'],
        invocationNoOp: true,
        memoryUpdates: [],
      },
      { heroRoleId },
    );

    expect(merged).toEqual(existingFile);
  });

  it('appends the new current relation to history and replaces currentRelation', () => {
    const existingFile = createExistingFile();
    const merged = mergeRelationshipUpdates(
      existingFile,
      {
        involvedRoleIds: ['chr_core01', 'chr_hero01'],
        invocationNoOp: false,
        memoryUpdates: [
          {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_hero01',
            shouldCreateEdge: false,
            nextCurrentRelation: createEntry({
              phaseId: 'phase-02-hunt',
              beatIndex: 3,
              roundId: 'round-0011',
              functionalRole: 'emotional-anchor',
              mindsetTags: ['trust', 'dependence'],
              summary: 'views the target as a reliable emotional anchor',
              triggerEvent: 'target risked personal safety to rescue source',
              reasoning: 'target demonstrated loyalty through action',
              causalAction: 'source discloses a personal secret',
            }),
          },
        ],
      },
      { heroRoleId },
    );

    const edge = expectMemoryEdge(merged.relationshipsBySource.chr_core01?.targets.chr_hero01);

    expect(edge.currentRelation.roundId).toBe('round-0011');
    expect(edge.history).toHaveLength(2);
  });

  it('does not append duplicate history when the same update is applied twice', () => {
    const existingFile = createExistingFile();
    const repeatedUpdate = {
      involvedRoleIds: ['chr_core01', 'chr_hero01'],
      invocationNoOp: false as const,
      memoryUpdates: [
        {
          sourceRoleId: 'chr_core01',
          targetRoleId: 'chr_hero01',
          shouldCreateEdge: false,
          nextCurrentRelation: createEntry({
            phaseId: 'phase-02-hunt',
            beatIndex: 3,
            roundId: 'round-0011',
            functionalRole: 'emotional-anchor',
            mindsetTags: ['trust', 'dependence'],
            summary: 'views the target as a reliable emotional anchor',
            triggerEvent: 'target risked personal safety to rescue source',
            reasoning: 'target demonstrated loyalty through action',
            causalAction: 'source discloses a personal secret',
          }),
        },
      ],
    };

    const mergedOnce = mergeRelationshipUpdates(existingFile, repeatedUpdate, { heroRoleId });
    const mergedTwice = mergeRelationshipUpdates(mergedOnce, repeatedUpdate, { heroRoleId });

    const edgeOnce = expectMemoryEdge(mergedOnce.relationshipsBySource.chr_core01?.targets.chr_hero01);
    const edgeTwice = expectMemoryEdge(
      mergedTwice.relationshipsBySource.chr_core01?.targets.chr_hero01,
    );

    expect(edgeOnce.history).toHaveLength(2);
    expect(edgeTwice.history).toHaveLength(2);
    expect(edgeTwice.currentRelation.roundId).toBe('round-0011');
  });

  it('creates a new memory edge when shouldCreateEdge is true', () => {
    const existingFile = createExistingFile();
    const merged = mergeRelationshipUpdates(
      existingFile,
      {
        involvedRoleIds: ['chr_core01', 'chr_ant01'],
        invocationNoOp: false,
        memoryUpdates: [
          {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_ant01',
            shouldCreateEdge: true,
            nextCurrentRelation: createEntry({
              roundId: 'round-0012',
              summary: 'hostility escalated after first direct confrontation',
              mindsetTags: ['suspicion', 'hostility'],
            }),
          },
        ],
      },
      { heroRoleId },
    );

    const edge = expectMemoryEdge(merged.relationshipsBySource.chr_core01?.targets.chr_ant01);

    expect(edge.currentRelation.roundId).toBe('round-0012');
    expect(edge.history).toHaveLength(1);
  });

  it('rejects updates that target a missing edge without shouldCreateEdge', () => {
    const existingFile = createExistingFile();

    expect(() =>
      mergeRelationshipUpdates(
        existingFile,
        {
          involvedRoleIds: ['chr_core01', 'chr_ant01'],
          invocationNoOp: false,
          memoryUpdates: [
            {
              sourceRoleId: 'chr_core01',
              targetRoleId: 'chr_ant01',
              shouldCreateEdge: false,
              nextCurrentRelation: createEntry({ roundId: 'round-0012' }),
            },
          ],
        },
        { heroRoleId },
      ),
    ).toThrow(/missing relationship/i);
  });

  it('rejects shouldCreateEdge when the edge already exists', () => {
    const existingFile = createExistingFile();

    expect(() =>
      mergeRelationshipUpdates(
        existingFile,
        {
          involvedRoleIds: ['chr_core01', 'chr_hero01'],
          invocationNoOp: false,
          memoryUpdates: [
            {
              sourceRoleId: 'chr_core01',
              targetRoleId: 'chr_hero01',
              shouldCreateEdge: true,
              nextCurrentRelation: createEntry({ roundId: 'round-0012' }),
            },
          ],
        },
        { heroRoleId },
      ),
    ).toThrow(/cannot create/i);
  });

  it('rejects hero-outgoing relationship memories', () => {
    const existingFile = createExistingFile();

    expect(() =>
      mergeRelationshipUpdates(
        existingFile,
        {
          involvedRoleIds: ['chr_hero01', 'chr_core01'],
          invocationNoOp: false,
          memoryUpdates: [
            {
              sourceRoleId: 'chr_hero01',
              targetRoleId: 'chr_core01',
              shouldCreateEdge: true,
              nextCurrentRelation: createEntry({
                roundId: 'round-0012',
                summary: 'hero chooses to trust core role',
              }),
            },
          ],
        },
        { heroRoleId },
      ),
    ).toThrow(/hero-outgoing/i);
  });

  it('keeps absorbConsumedDeltas as a no-op passthrough for memory schema', () => {
    const existingFile = createExistingFile();

    expect(absorbConsumedDeltas(existingFile, 'round-0011')).toBe(existingFile);
  });
});
