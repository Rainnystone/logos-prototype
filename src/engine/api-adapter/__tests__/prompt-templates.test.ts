import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildGenerateSystemPrompt,
  buildGossipelogInjectionSystemPrompt,
  buildGossipelogInjectionUserPrompt,
  buildGossipelogUpdateUserPrompt,
  buildWeaverImportUserPrompt,
} from '@/engine/api-adapter/prompt-templates';
import { gossipelogAgentDefinition } from '@/agents/gossipelog/definition';
import { mapForGenerate } from '@/engine/api-adapter/schema-mapper';
import {
  sampleGossipelogUpdateRequest,
  samplePromptObject,
  sampleWeaverImportRequest,
} from '@/engine/api-adapter/__tests__/fixtures';

describe('prompt templates', () => {
  describe('generate system prompt', () => {
    it('renders the dynamic relationship layer after the world base section', () => {
      const systemPrompt = buildGenerateSystemPrompt(samplePromptObject);
      const worldBaseIndex = systemPrompt.indexOf('[World Base]');
      const relationshipIndex = systemPrompt.indexOf('[Dynamic Relationship Layer]');

      expect(relationshipIndex).toBeGreaterThan(worldBaseIndex);
      expect(systemPrompt).toContain(
        `Highlighted deltas: ${samplePromptObject.relationshipLayer?.highlightedDeltasText ?? 'none'}`,
      );
      expect(systemPrompt).toContain(
        `Stable background: ${samplePromptObject.relationshipLayer?.stableBackgroundText ?? 'none'}`,
      );
    });

    it('keeps history as message entries while the relationship layer stays in the system prompt', () => {
      const request = mapForGenerate(samplePromptObject, 'openai-compatible');
      const systemPrompt = request.system ?? '';
      const messageContent = request.messages.map((entry) => entry.content).join('\n');

      expect(request.messages.slice(0, samplePromptObject.history.length)).toEqual(
        samplePromptObject.history,
      );
      expect(systemPrompt).toContain('[Dynamic Relationship Layer]');
      expect(messageContent).not.toContain('[Dynamic Relationship Layer]');
      expect(messageContent).not.toContain('Highlighted deltas:');
      expect(messageContent).not.toContain('Stable background:');
    });

    it('omits the location section line when no explicit scene locations are present', () => {
      const systemPrompt = buildGenerateSystemPrompt({
        ...samplePromptObject,
        worldBase: {
          ...samplePromptObject.worldBase,
          locationPatch: '',
        },
      });

      expect(systemPrompt).not.toContain('Location patch:');
    });
  });

  describe('weaver import user prompt', () => {
    it('locks the fuller bounded extraction contract instead of sparse fallback guidance', () => {
      const prompt = buildWeaverImportUserPrompt(sampleWeaverImportRequest);

      expect(prompt).toContain('attempt the fullest bounded extraction the text can support');
      expect(prompt).toContain('minimal shapes are fallback floors, not the preferred target');
      expect(prompt).toContain('sourceSummary: required concise source-level summary.');
      expect(prompt).toContain('importSummary: required concise import-level summary.');
      expect(prompt).toContain('worldBase is a lightweight seed object');
      expect(prompt).toContain('suggestedPackageName is only a display-name suggestion');
      expect(prompt).toContain(
        'persisted scene openingHook still comes from the original source text',
      );
      expect(prompt).toContain(
        'npcCharacters[]: displayName required; summary and roleSummary optional',
      );
      expect(prompt).not.toContain('Keep uncertainty bounded via warnings and unresolved gaps.');
    });
  });

  describe('gossipelog update user prompt', () => {
    it('renders phase/beat context and resolved references for memory updates', () => {
      const prompt = buildGossipelogUpdateUserPrompt({
        ...sampleGossipelogUpdateRequest,
        phaseId: 'phase-01-prologue',
        beatIndex: 1,
        resolvedReferences: [
          {
            referenceId: 'relationship-reference',
            injectionLabel: 'Relationship reference',
            relativePath: 'src/agents/gossipelog/references/relationship-reference.md',
            contents: '# Relationship rules',
            estimatedTokens: 20,
          },
        ],
      });

      expect(prompt).toContain('Phase ID: phase-01-prologue');
      expect(prompt).toContain('Beat index: 1');
      expect(prompt).toContain('[Resolved References]');
      expect(prompt).toContain('Relationship reference');
      expect(prompt).toContain('src/agents/gossipelog/references/relationship-reference.md');
    });
  });

  describe('gossipelog injection prompt', () => {
    it('separates current relationship emphasis from historical trajectory', () => {
      const systemPrompt = buildGossipelogInjectionSystemPrompt();
      const prompt = buildGossipelogInjectionUserPrompt({
        sceneCastRoleIds: ['chr_hero01', 'chr_core01'],
        sceneCastFraming: {
          sceneId: 'scene-fixture',
          castRoleIds: ['chr_hero01', 'chr_core01'],
        },
        roleDefinitions: sampleGossipelogUpdateRequest.roleDefinitions,
        relationshipSubgraph: {
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
                    phaseId: 'phase-02-hunt',
                    beatIndex: 3,
                    roundId: 'round-0011',
                    functionalRole: 'emotional-anchor',
                    mindsetTags: ['trust', 'dependence'],
                    summary: 'views the target as a reliable emotional anchor',
                    triggerEvent: 'target risked personal safety to rescue source',
                    reasoning: 'target demonstrated loyalty through action',
                    causalAction: 'source discloses a personal secret',
                  },
                  history: [
                    {
                      phaseId: 'phase-01-prologue',
                      beatIndex: 1,
                      roundId: 'round-0009',
                      functionalRole: null,
                      mindsetTags: ['caution'],
                      summary: 'first contact leaves a cautious impression',
                      triggerEvent: 'the two meet during a tense briefing',
                      reasoning: 'source is still evaluating intent',
                      causalAction: 'source memorizes the target name',
                    },
                    {
                      phaseId: 'phase-02-hunt',
                      beatIndex: 3,
                      roundId: 'round-0011',
                      functionalRole: 'emotional-anchor',
                      mindsetTags: ['trust', 'dependence'],
                      summary: 'views the target as a reliable emotional anchor',
                      triggerEvent: 'target risked personal safety to rescue source',
                      reasoning: 'target demonstrated loyalty through action',
                      causalAction: 'source discloses a personal secret',
                    },
                  ],
                },
              },
            },
          },
        },
      });

      expect(systemPrompt).toContain('Use current relations to write highlightedDeltasText');
      expect(systemPrompt).toContain('Use relationship history to write stableBackgroundText');
      expect(prompt).toContain('[Current Relationships]');
      expect(prompt).toContain('chr_core01 -> chr_hero01');
      expect(prompt).toContain('Current summary: views the target as a reliable emotional anchor');
      expect(prompt).toContain('[Relationship History]');
      expect(prompt).toContain('phase-01-prologue / beat-1 / round-0009');
      expect(prompt).toContain('phase-02-hunt / beat-3 / round-0011');
    });

    it('numbers multiple relationship edges sequentially inside the current layer', () => {
      const prompt = buildGossipelogInjectionUserPrompt({
        sceneCastRoleIds: ['chr_hero01', 'chr_core01', 'chr_ant01'],
        sceneCastFraming: {
          sceneId: 'scene-fixture',
          castRoleIds: ['chr_hero01', 'chr_core01', 'chr_ant01'],
        },
        roleDefinitions: sampleGossipelogUpdateRequest.roleDefinitions,
        relationshipSubgraph: {
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
                    phaseId: 'phase-02-hunt',
                    beatIndex: 3,
                    roundId: 'round-0011',
                    functionalRole: null,
                    mindsetTags: ['trust'],
                    summary: 'trusts the hero',
                    triggerEvent: 'hero intervened',
                    reasoning: 'hero proved dependable',
                    causalAction: 'shares inside knowledge',
                  },
                  history: [
                    {
                      phaseId: 'phase-02-hunt',
                      beatIndex: 3,
                      roundId: 'round-0011',
                      functionalRole: null,
                      mindsetTags: ['trust'],
                      summary: 'trusts the hero',
                      triggerEvent: 'hero intervened',
                      reasoning: 'hero proved dependable',
                      causalAction: 'shares inside knowledge',
                    },
                  ],
                },
                chr_ant01: {
                  sourceRoleId: 'chr_core01',
                  targetRoleId: 'chr_ant01',
                  currentRelation: {
                    phaseId: 'phase-02-hunt',
                    beatIndex: 3,
                    roundId: 'round-0011',
                    functionalRole: 'threat-focus',
                    mindsetTags: ['suspicion'],
                    summary: 'sees the antagonist as an immediate threat',
                    triggerEvent: 'antagonist issued a warning',
                    reasoning: 'the warning confirms hostile intent',
                    causalAction: 'starts tracking the antagonist closely',
                  },
                  history: [
                    {
                      phaseId: 'phase-02-hunt',
                      beatIndex: 3,
                      roundId: 'round-0011',
                      functionalRole: 'threat-focus',
                      mindsetTags: ['suspicion'],
                      summary: 'sees the antagonist as an immediate threat',
                      triggerEvent: 'antagonist issued a warning',
                      reasoning: 'the warning confirms hostile intent',
                      causalAction: 'starts tracking the antagonist closely',
                    },
                  ],
                },
              },
            },
          },
        },
      });

      expect(prompt).toContain('1. chr_core01 -> chr_hero01');
      expect(prompt).toContain('2. chr_core01 -> chr_ant01');
    });

    it('preserves legacy highlightNextPrompt emphasis in the current relationship layer', () => {
      const prompt = buildGossipelogInjectionUserPrompt({
        sceneCastRoleIds: ['chr_hero01', 'chr_core01'],
        sceneCastFraming: {
          sceneId: 'scene-fixture',
          castRoleIds: ['chr_hero01', 'chr_core01'],
        },
        roleDefinitions: sampleGossipelogUpdateRequest.roleDefinitions,
        relationshipSubgraph: {
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
        },
      });

      expect(prompt).toContain('Prompt emphasis: prioritize this edge in highlightedDeltasText');
    });

    it('adds a placeholder when a v2 relationship edge has no recorded history entries', () => {
      const prompt = buildGossipelogInjectionUserPrompt({
        sceneCastRoleIds: ['chr_hero01', 'chr_core01'],
        sceneCastFraming: {
          sceneId: 'scene-fixture',
          castRoleIds: ['chr_hero01', 'chr_core01'],
        },
        roleDefinitions: sampleGossipelogUpdateRequest.roleDefinitions,
        relationshipSubgraph: {
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
                    phaseId: 'phase-02-hunt',
                    beatIndex: 3,
                    roundId: 'round-0011',
                    functionalRole: 'emotional-anchor',
                    mindsetTags: ['trust'],
                    summary: 'trusts the hero',
                    triggerEvent: 'hero intervened',
                    reasoning: 'hero proved dependable',
                    causalAction: 'shares inside knowledge',
                  },
                  history: [],
                },
              },
            },
          },
        },
      });

      expect(prompt).toContain('History entries: none recorded for this edge yet');
    });
  });

  describe('gossipelog reference', () => {
    it('registers the gossipelog update manifest for relationship reference', () => {
      expect(gossipelogAgentDefinition.referenceManifestsByOperation.gossipelogUpdate).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            referenceId: 'relationship-reference',
            relativePath: 'src/agents/gossipelog/references/relationship-reference.md',
            loadPolicy: 'operation-scoped',
          }),
        ]),
      );
    });

    it('stores the repo-local relationship reference document', () => {
      const referencePath = join(
        process.cwd(),
        'src/agents/gossipelog/references/relationship-reference.md',
      );
      const reference = readFileSync(referencePath, 'utf8');

      expect(reference).toContain('Gossipelog Relationship Reference');
      expect(reference).toContain('schemaVersion: 2');
      expect(reference).toContain('memoryUpdates');
      expect(reference).toContain('phaseId');
      expect(reference).toContain('beatIndex');
      expect(reference).toContain('主观定向关系');
      expect(reference).toContain('A -> B');
      expect(reference).toContain('允许单向建边');
      expect(reference).toContain('hero 不能作为持久化 source');
      expect(reference).toContain('functionalRole 可为空');
      expect(reference).toContain('mindsetTags 可为空数组');
      expect(reference).toContain('允许扩展');
      expect(reference).toContain('JSON only');
      expect(reference).toContain('From Beat to memoryUpdates');
    });
  });

  describe('weaver import reference', () => {
    it('keeps the bounded extraction guidance and suggested package name semantics', () => {
      const referencePath = join(
        process.cwd(),
        'src/agents/weaver/references/import-reference.md',
      );
      const reference = readFileSync(referencePath, 'utf8');

      expect(reference).toContain('Prefer fuller bounded extraction over sparse shells.');
      expect(reference).toContain(
        'suggestedPackageName is only a display-name suggestion, not the final persisted package identity or slug.',
      );
      expect(reference).toContain(
        'worldBase`: lightweight seed object with `settingSummary`, `worldRules`, `toneBaseline`, `locationPatch`, and `npcCharactersSummary`.',
      );
      expect(reference).toContain('## Examples');
      expect(reference).toContain('Source excerpt:');
      expect(reference).toContain('The harbor district never slept');
      expect(reference).toContain('Expected lightweight payload shape:');
      expect(reference).toContain(
        '"sourceSummary": "A harbor-district scene with Mara, Old Ellis, a silent lighthouse bell, and a smuggling thread."',
      );
      expect(reference).toContain(
        '"importSummary": "Bootstrap a harbor-district scene around Mara, Old Ellis, the quay, and the warehouse door."',
      );
      expect(reference).toContain('"openingHook": "The harbor district never slept."');
      expect(reference).toContain('"worldBase": {');
      expect(reference).toContain(
        '"settingSummary": "A harbor district with a quay, a lighthouse, a warehouse door, and market stalls."',
      );
      expect(reference).toContain('"hero": {');
      expect(reference).toContain('"displayName": "Mara"');
      expect(reference).toContain('"coreCast": [{ "displayName": "Old Ellis" }]');
      expect(reference).toContain('"locations": [{ "displayName": "quay" }');
      expect(reference).toContain('Minimal-fallback example:');
      expect(reference).toContain('> Mara. Old Ellis. Warehouse 9.');
      expect(reference).not.toContain('The Tide Cartel');
      expect(reference).not.toContain('Lighthouse keeper');
      expect(reference).not.toContain('Grounded maritime tension');
      expect(reference).not.toContain('safe passage');
      expect(reference).not.toContain('hidden route');
    });
  });
});
