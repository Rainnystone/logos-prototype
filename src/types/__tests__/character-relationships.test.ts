import { describe, expect, it } from 'vitest';

import {
  CharacterRelationshipsFileSchema,
  GossipelogInjectionResultSchema,
  GossipelogUpdateResultSchema,
  PromptObjectSchema,
} from '@/types';

describe('gossipelog contracts', () => {
  it('accepts the Phase 1 relationship file shape', () => {
    const parsed = CharacterRelationshipsFileSchema.parse({
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
    });

    const coreSource = parsed.relationshipsBySource.chr_core01!;
    const heroTarget = coreSource.targets.chr_hero01!;

    expect(heroTarget.highlightNextPrompt).toBe(true);
  });

  it('rejects relationship entries whose stored ids drift from their bucket keys', () => {
    expect(() =>
      CharacterRelationshipsFileSchema.parse({
        meta: {
          fileType: 'character-relationships',
          schemaVersion: 1,
          storyPackage: 'sample-scene',
        },
        relationshipsBySource: {
          chr_core01: {
            targets: {
              chr_hero01: {
                sourceRoleId: 'chr_core99',
                targetRoleId: 'chr_hero01',
                baseline: {
                  state: 'guarded trust',
                  lastAbsorbedRound: 'round-0008',
                },
                recentDelta: null,
                highlightNextPrompt: true,
              },
            },
          },
        },
      }),
    ).toThrow(/sourceRoleId|relationshipsBySource/i);
  });

  it('accepts the update-skill payload', () => {
    const parsed = GossipelogUpdateResultSchema.parse({
      involvedRoleIds: ['chr_core01', 'chr_hero01'],
      invocationNoOp: false,
      edgeUpdates: [
        {
          sourceRoleId: 'chr_core01',
          targetRoleId: 'chr_hero01',
          mode: 'delta',
          replaceBaseline: false,
          recentDelta: {
            state: 'trust increased after direct protection',
            sourceRound: 'round-0009',
          },
        },
      ],
    });

    expect(parsed.edgeUpdates[0]?.mode).toBe('delta');
  });

  it('accepts noop edge updates in the update-skill payload', () => {
    const parsed = GossipelogUpdateResultSchema.parse({
      involvedRoleIds: ['chr_core01', 'chr_hero01'],
      invocationNoOp: false,
      edgeUpdates: [
        {
          sourceRoleId: 'chr_core01',
          targetRoleId: 'chr_hero01',
          mode: 'noop',
        },
      ],
    });

    expect(parsed.edgeUpdates[0]?.mode).toBe('noop');
  });

  it('rejects no-op update payloads that still carry edge updates', () => {
    expect(() =>
      GossipelogUpdateResultSchema.parse({
        involvedRoleIds: ['chr_core01'],
        invocationNoOp: true,
        edgeUpdates: [
          {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_hero01',
            mode: 'delta',
            replaceBaseline: false,
            recentDelta: {
              state: 'trust increased after direct protection',
              sourceRound: 'round-0009',
            },
          },
        ],
      }),
    ).toThrow(/invocationNoOp|edgeUpdates/i);
  });

  it('rejects baseline replacements without baseline content', () => {
    expect(() =>
      GossipelogUpdateResultSchema.parse({
        involvedRoleIds: ['chr_core01', 'chr_hero01'],
        invocationNoOp: false,
        edgeUpdates: [
          {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_hero01',
            mode: 'delta',
            replaceBaseline: true,
            recentDelta: {
              state: 'trust increased after direct protection',
              sourceRound: 'round-0009',
            },
          },
        ],
      }),
    ).toThrow(/replaceBaseline|baseline/i);
  });

  it('accepts the injection-skill payload and prompt object relationship layer', () => {
    const injection = GossipelogInjectionResultSchema.parse({
      highlightedDeltasText: 'chr_core01 -> chr_hero01: trust has risen this round.',
      stableBackgroundText: 'chr_core01 -> chr_hero01: long-term baseline is guarded trust.',
    });

    const promptObject = PromptObjectSchema.parse({
      worldBase: {
        mainCharacters: 'hero',
        npcCharacters: '',
        locationPatch: 'school rooftop',
      },
      relationshipLayer: injection,
      history: [],
      narrative: {
        mainAxis: 'axis',
        endLine: 'end line',
        phaseGoal: 'goal',
        alpha: 'alpha',
        beta: 'beta',
      },
      directorNote: {
        volume: 'Low',
        router: 'Observe',
        verbLexicon: ['observe'],
        beatConstraints: 'rule',
        optionConstraints: 'rule',
      },
    });

    expect(promptObject.relationshipLayer!.highlightedDeltasText.length).toBeGreaterThan(0);
  });
});
