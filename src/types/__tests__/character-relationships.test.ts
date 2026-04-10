import { describe, expect, it } from 'vitest';

import {
  CharacterRelationshipsFileSchema,
  GossipelogInjectionResultSchema,
  GossipelogUpdateResultSchema,
  PromptObjectSchema,
} from '@/types';
import type { RelationshipEdge, RelationshipMemoryEdge } from '@/types';

function expectLegacyEdge(edge: unknown): RelationshipEdge {
  expect(edge).toBeDefined();

  if (!edge || typeof edge !== 'object' || !('highlightNextPrompt' in edge)) {
    throw new Error('Expected schemaVersion 1 relationship edge.');
  }

  return edge as RelationshipEdge;
}

function expectMemoryEdge(edge: unknown): RelationshipMemoryEdge {
  expect(edge).toBeDefined();

  if (!edge || typeof edge !== 'object' || !('history' in edge) || !('currentRelation' in edge)) {
    throw new Error('Expected schemaVersion 2 relationship memory edge.');
  }

  return edge as RelationshipMemoryEdge;
}

describe('gossipelog contracts', () => {
  it('accepts the Phase 1 relationship file shape for backward-compatible reads', () => {
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

    const heroTarget = expectLegacyEdge(parsed.relationshipsBySource.chr_core01?.targets.chr_hero01);

    expect(heroTarget.highlightNextPrompt).toBe(true);
  });

  it('accepts schemaVersion 2 relationship memory edges with currentRelation and full history', () => {
    const parsed = CharacterRelationshipsFileSchema.parse({
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
              currentRelation: {
                phaseId: 'phase-01-prologue',
                beatIndex: 2,
                roundId: 'round-0002',
                functionalRole: 'emotional-anchor',
                mindsetTags: ['trust'],
                summary: '视为暂时可信的支点。',
                triggerEvent: '对方替自己挡下盘问',
                reasoning: '对方在关键时刻站队',
                causalAction: '在众人面前替其说话',
              },
              history: [
                {
                  phaseId: 'phase-01-prologue',
                  beatIndex: 1,
                  roundId: 'round-0001',
                  functionalRole: null,
                  mindsetTags: [],
                  summary: '刚刚认识，开始形成注意。',
                  triggerEvent: '第一次见面',
                  reasoning: '需要先观察对方',
                  causalAction: '记住了对方的名字',
                },
              ],
            },
          },
        },
      },
    });

    const heroTarget = expectMemoryEdge(parsed.relationshipsBySource.chr_core01?.targets.chr_hero01);

    expect(parsed.meta.schemaVersion).toBe(2);
    expect(heroTarget.history).toHaveLength(1);
  });

  it('rejects relationship entries whose stored ids drift from their bucket keys in schemaVersion 2', () => {
    expect(() =>
      CharacterRelationshipsFileSchema.parse({
        meta: {
          fileType: 'character-relationships',
          schemaVersion: 2,
          storyPackage: 'sample-scene',
        },
        relationshipsBySource: {
          chr_core01: {
            targets: {
              chr_hero01: {
                sourceRoleId: 'chr_core99',
                targetRoleId: 'chr_hero01',
                currentRelation: {
                  phaseId: null,
                  beatIndex: null,
                  roundId: 'round-0009',
                  functionalRole: null,
                  mindsetTags: [],
                  summary: 'summary',
                  triggerEvent: 'trigger',
                  reasoning: 'reasoning',
                  causalAction: 'action',
                },
                history: [
                  {
                    phaseId: null,
                    beatIndex: null,
                    roundId: 'round-0009',
                    functionalRole: null,
                    mindsetTags: [],
                    summary: 'summary',
                    triggerEvent: 'trigger',
                    reasoning: 'reasoning',
                    causalAction: 'action',
                  },
                ],
              },
            },
          },
        },
      }),
    ).toThrow(/sourceRoleId|relationshipsBySource/i);
  });

  it('rejects schemaVersion 2 relationship memory edges with empty history', () => {
    expect(() =>
      CharacterRelationshipsFileSchema.parse({
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
                currentRelation: {
                  phaseId: 'phase-01-prologue',
                  beatIndex: 2,
                  roundId: 'round-0002',
                  functionalRole: 'emotional-anchor',
                  mindsetTags: ['trust'],
                  summary: '视为暂时可信的支点。',
                  triggerEvent: '对方替自己挡下盘问',
                  reasoning: '对方在关键时刻站队',
                  causalAction: '在众人面前替其说话',
                },
                history: [],
              },
            },
          },
        },
      }),
    ).toThrow(/history/i);
  });

  it('accepts gossipelog update results that emit memoryUpdates instead of edgeUpdates', () => {
    const parsed = GossipelogUpdateResultSchema.parse({
      involvedRoleIds: ['chr_core01', 'chr_hero01'],
      invocationNoOp: false,
      memoryUpdates: [
        {
          sourceRoleId: 'chr_core01',
          targetRoleId: 'chr_hero01',
          shouldCreateEdge: true,
          nextCurrentRelation: {
            phaseId: 'phase-01-prologue',
            beatIndex: 1,
            roundId: 'round-0001',
            functionalRole: null,
            mindsetTags: [],
            summary: '对对方留下初始印象。',
            triggerEvent: '第一次照面',
            reasoning: '需要继续观察',
            causalAction: '开始留意对方动向',
          },
        },
      ],
    });

    expect(parsed.memoryUpdates[0]?.sourceRoleId).toBe('chr_core01');
  });

  it('rejects update payloads that still include legacy edgeUpdates', () => {
    expect(() =>
      GossipelogUpdateResultSchema.parse({
        involvedRoleIds: ['chr_core01', 'chr_hero01'],
        invocationNoOp: false,
        memoryUpdates: [
          {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_hero01',
            shouldCreateEdge: true,
            nextCurrentRelation: {
              phaseId: 'phase-01-prologue',
              beatIndex: 1,
              roundId: 'round-0001',
              functionalRole: null,
              mindsetTags: [],
              summary: '对对方留下初始印象。',
              triggerEvent: '第一次照面',
              reasoning: '需要继续观察',
              causalAction: '开始留意对方动向',
            },
          },
        ],
        edgeUpdates: [
          {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_hero01',
            mode: 'noop',
          },
        ],
      }),
    ).toThrow(/edgeUpdates/i);
  });

  it('rejects no-op update payloads that still carry memory updates', () => {
    expect(() =>
      GossipelogUpdateResultSchema.parse({
        involvedRoleIds: ['chr_core01'],
        invocationNoOp: true,
        memoryUpdates: [
          {
            sourceRoleId: 'chr_core01',
            targetRoleId: 'chr_hero01',
            shouldCreateEdge: false,
            nextCurrentRelation: {
              phaseId: null,
              beatIndex: null,
              roundId: 'round-0009',
              functionalRole: null,
              mindsetTags: [],
              summary: 'summary',
              triggerEvent: 'trigger',
              reasoning: 'reasoning',
              causalAction: 'action',
            },
          },
        ],
      }),
    ).toThrow(/invocationNoOp|memoryUpdates/i);
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
