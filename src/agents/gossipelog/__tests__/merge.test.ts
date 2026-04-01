import { describe, expect, it } from 'vitest';

import {
  absorbConsumedDeltas,
  mergeRelationshipUpdates,
} from '@/agents/gossipelog/merge';
import type { CharacterRelationshipsFile, GossipelogUpdateResult } from '@/types';

const heroRoleId = 'chr_pc01';

function createExistingFile(): CharacterRelationshipsFile {
  return {
    meta: {
      fileType: 'character-relationships',
      schemaVersion: 1,
      storyPackage: 'sample-scene',
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

function createConsumedHighlightFile(): CharacterRelationshipsFile {
  return {
    meta: {
      fileType: 'character-relationships',
      schemaVersion: 1,
      storyPackage: 'sample-scene',
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
              sourceRound: 'round-0010',
            },
            highlightNextPrompt: true,
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
        edgeUpdates: [],
      },
      { heroRoleId },
    );

    expect(merged).toEqual(existingFile);
  });

  it('still returns a valid next-round layer input after invocation-level no-op lifecycle processing', () => {
    const settled = absorbConsumedDeltas(createConsumedHighlightFile(), 'round-0011');

    expect(settled.relationshipsBySource.chr_core01?.targets.chr_hero01?.baseline.state).toBe(
      'trust increased after direct protection',
    );
    expect(
      settled.relationshipsBySource.chr_core01?.targets.chr_hero01?.baseline.lastAbsorbedRound,
    ).toBe('round-0011');
    expect(settled.relationshipsBySource.chr_core01?.targets.chr_hero01?.recentDelta).toBeNull();
    expect(
      settled.relationshipsBySource.chr_core01?.targets.chr_hero01?.highlightNextPrompt,
    ).toBe(false);
  });

  it('creates a thin baseline plus current delta for a genuine new_edge', () => {
    const existingFile = createExistingFile();
    const merged = mergeRelationshipUpdates(
      existingFile,
      {
        involvedRoleIds: ['chr_core01', 'chr_ant01'],
        invocationNoOp: false,
        edgeUpdates: [
          {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_ant01',
            mode: 'new_edge',
            replaceBaseline: false,
            baseline: {
              state: 'first-contact caution',
              lastAbsorbedRound: 'round-0010',
            },
            recentDelta: {
              state: 'hostility registered after first confrontation',
              sourceRound: 'round-0010',
            },
          },
        ],
      },
      { heroRoleId },
    );

    expect(merged.relationshipsBySource.chr_core01?.targets.chr_ant01).toEqual({
      sourceRoleId: 'chr_core01',
      targetRoleId: 'chr_ant01',
      baseline: {
        state: 'first-contact caution',
        lastAbsorbedRound: 'round-0010',
      },
      recentDelta: {
        state: 'hostility registered after first confrontation',
        sourceRound: 'round-0010',
      },
      highlightNextPrompt: true,
    });
  });

  it('replaces the baseline before attaching a current delta when replaceBaseline is true', () => {
    const existingFile = createExistingFile();
    const update: GossipelogUpdateResult = {
      involvedRoleIds: ['chr_core01', 'chr_hero01'],
      invocationNoOp: false,
      edgeUpdates: [
        {
          sourceRoleId: 'chr_core01',
          targetRoleId: 'chr_hero01',
          mode: 'delta',
          replaceBaseline: true,
          baseline: {
            state: 'active distrust',
            lastAbsorbedRound: 'round-0010',
          },
          recentDelta: {
            state: 'trust collapsed after direct betrayal',
            sourceRound: 'round-0011',
          },
        },
      ],
    };

    const merged = mergeRelationshipUpdates(existingFile, update, { heroRoleId });

    expect(merged.relationshipsBySource.chr_core01?.targets.chr_hero01).toEqual({
      sourceRoleId: 'chr_core01',
      targetRoleId: 'chr_hero01',
      baseline: {
        state: 'active distrust',
        lastAbsorbedRound: 'round-0010',
      },
      recentDelta: {
        state: 'trust collapsed after direct betrayal',
        sourceRound: 'round-0011',
      },
      highlightNextPrompt: true,
    });
  });

  it('rejects hero-outgoing long-term edges in Phase 1', () => {
    const existingFile = createExistingFile();

    expect(() =>
      mergeRelationshipUpdates(
        existingFile,
        {
          involvedRoleIds: ['chr_pc01', 'chr_core01'],
          invocationNoOp: false,
          edgeUpdates: [
            {
              sourceRoleId: 'chr_pc01',
              targetRoleId: 'chr_core01',
              mode: 'delta',
              replaceBaseline: false,
              recentDelta: {
                state: 'hero decided to trust core one',
                sourceRound: 'round-0010',
              },
            },
          ],
        },
        { heroRoleId },
      ),
    ).toThrow(/hero-outgoing/i);
  });

  it('absorbs a consumed highlighted delta into baseline before applying a later round update', () => {
    const settled = absorbConsumedDeltas(createConsumedHighlightFile(), 'round-0011');
    const merged = mergeRelationshipUpdates(
      settled,
      {
        involvedRoleIds: ['chr_core01', 'chr_hero01'],
        invocationNoOp: false,
        edgeUpdates: [
          {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_hero01',
            mode: 'delta',
            replaceBaseline: false,
            recentDelta: {
              state: 'protective concern hardened into caution',
              sourceRound: 'round-0011',
            },
          },
        ],
      },
      { heroRoleId },
    );

    expect(merged.relationshipsBySource.chr_core01?.targets.chr_hero01).toEqual({
      sourceRoleId: 'chr_core01',
      targetRoleId: 'chr_hero01',
      baseline: {
        state: 'trust increased after direct protection',
        lastAbsorbedRound: 'round-0011',
      },
      recentDelta: {
        state: 'protective concern hardened into caution',
        sourceRound: 'round-0011',
      },
      highlightNextPrompt: true,
    });
  });

  it('rejects new_edge when the edge already exists', () => {
    const existingFile = createExistingFile();

    expect(() =>
      mergeRelationshipUpdates(
        existingFile,
        {
          involvedRoleIds: ['chr_core01', 'chr_hero01'],
          invocationNoOp: false,
          edgeUpdates: [
            {
              sourceRoleId: 'chr_core01',
              targetRoleId: 'chr_hero01',
              mode: 'new_edge',
              replaceBaseline: false,
              baseline: {
                state: 'duplicate baseline',
                lastAbsorbedRound: 'round-0010',
              },
              recentDelta: {
                state: 'duplicate delta',
                sourceRound: 'round-0010',
              },
            },
          ],
        },
        { heroRoleId },
      ),
    ).toThrow(/new_edge/i);
  });

  it('rejects delta when the edge does not exist yet', () => {
    const existingFile = createExistingFile();

    expect(() =>
      mergeRelationshipUpdates(
        existingFile,
        {
          involvedRoleIds: ['chr_core01', 'chr_ant01'],
          invocationNoOp: false,
          edgeUpdates: [
            {
              sourceRoleId: 'chr_core01',
              targetRoleId: 'chr_ant01',
              mode: 'delta',
              replaceBaseline: false,
              recentDelta: {
                state: 'missing edge delta',
                sourceRound: 'round-0010',
              },
            },
          ],
        },
        { heroRoleId },
      ),
    ).toThrow(/missing relationship/i);
  });

  it('keeps the file unchanged when a highlighted delta is from the current round', () => {
    const currentRoundFile = createConsumedHighlightFile();

    expect(absorbConsumedDeltas(currentRoundFile, 'round-0010')).toBe(currentRoundFile);
  });

  it('keeps the file unchanged when the edge is already settled', () => {
    const settledFile: CharacterRelationshipsFile = {
      meta: {
        fileType: 'character-relationships',
        schemaVersion: 1,
        storyPackage: 'sample-scene',
      },
      relationshipsBySource: {
        chr_core01: {
          targets: {
            chr_hero01: {
              sourceRoleId: 'chr_core01',
              targetRoleId: 'chr_hero01',
              baseline: {
                state: 'guarded trust',
                lastAbsorbedRound: 'round-0010',
              },
              recentDelta: null,
              highlightNextPrompt: false,
            },
          },
        },
      },
    };

    expect(absorbConsumedDeltas(settledFile, 'round-0011')).toBe(settledFile);
  });
});
