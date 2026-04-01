import { describe, expect, it } from 'vitest';

import { renderWorldBaseForPrompt } from '@/engine/modules/world-base-prompt-render';
import {
  validateAuditPacket,
  validateAuditQuestionSet,
  validateCharacterRelationshipsFile,
  validateCollapseRequest,
  validateCollapseResponse,
  validateGossipelogInjectionResult,
  validateGossipelogUpdateResult,
  validatePhasePlan,
  validatePhaseConsequenceRequest,
  validatePhaseConsequenceResponse,
  validatePromptObject,
  validateStateSnapshot,
} from '@/engine/schema-validator';
import type { WorldBase } from '@/types';

const structuredWorldBase: WorldBase = {
  worldBaseSetting: 'world-setting',
  worldRules: 'world-rules',
  toneBaseline: 'tone-baseline',
  hero: {
    characterId: 'chr_hero01',
    name: 'Hero One',
    identityRole: 'Lead character',
    lightNovelTrait: 'Calm and precise',
    gender: 'Female',
    personality: 'Reserved',
    age: '16',
    occupation: 'Student',
    characterSummary: 'Primary viewpoint character.',
    capabilityBoundary: 'Uses only physical methods.',
    behaviorBoundary: 'Does not panic under pressure.',
    oocRedLine: 'Never breaks character.',
    clothing: 'School uniform',
    propsWeapon: 'Flashlight',
  },
  coreCast: [],
  antagonists: [],
  npcCharacters: 'Support One - steady witness',
  locationPatch: 'location-patch',
};

describe('schema validator', () => {
  it('accepts a valid PromptObject', () => {
    expect(
      validatePromptObject({
        worldBase: renderWorldBaseForPrompt(structuredWorldBase),
        relationshipLayer: {
          highlightedDeltasText: 'chr_core01 -> chr_hero01: trust has risen this round.',
          stableBackgroundText: 'chr_core01 -> chr_hero01: long-term baseline is guarded trust.',
        },
        history: [],
        narrative: {
          mainAxis: 'main-axis',
          endLine: 'end-line',
          phaseGoal: 'phase-goal',
          alpha: 'alpha',
          beta: 'beta',
        },
        directorNote: {
          volume: 'Low',
          router: 'router',
          verbLexicon: ['verb'],
          beatConstraints: 'beat-constraints',
          optionConstraints: 'option-constraints',
        },
      }),
    ).toMatchObject({
      worldBase: {
        mainCharacters: expect.stringContaining('Name: Hero One'),
      },
      directorNote: {
        volume: 'Low',
      },
    });
  });

  it('accepts a valid character relationships file', () => {
    expect(
      validateCharacterRelationshipsFile({
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
                recentDelta: null,
                highlightNextPrompt: true,
              },
            },
          },
        },
      }),
    ).toMatchObject({
      meta: {
        storyPackage: 'sample-scene',
      },
    });
  });

  it('accepts a valid gossipelog update result', () => {
    expect(
      validateGossipelogUpdateResult({
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
      }),
    ).toMatchObject({
      invocationNoOp: false,
    });
  });

  it('accepts a valid gossipelog injection result', () => {
    expect(
      validateGossipelogInjectionResult({
        highlightedDeltasText: 'chr_core01 -> chr_hero01: trust has risen this round.',
        stableBackgroundText: 'chr_core01 -> chr_hero01: long-term baseline is guarded trust.',
      }),
    ).toMatchObject({
      highlightedDeltasText: expect.stringContaining('chr_core01'),
    });
  });

  it('rejects an invalid PromptObject volume', () => {
    expect(() =>
      validatePromptObject({
        worldBase: {
          mainCharacters: 'main-characters',
          locationPatch: 'location-patch',
        },
        history: [],
        narrative: {
          mainAxis: 'main-axis',
          endLine: 'end-line',
          phaseGoal: 'phase-goal',
          alpha: 'alpha',
          beta: 'beta',
        },
        directorNote: {
          volume: 'Invalid',
          router: 'router',
          verbLexicon: ['verb'],
          beatConstraints: 'beat-constraints',
          optionConstraints: 'option-constraints',
        },
      }),
    ).toThrow(/directorNote\.volume/i);
  });

  it('accepts a valid StateSnapshot', () => {
    expect(
      validateStateSnapshot({
        sceneState: {
          sceneId: 'scene-id',
          currentPhaseIndex: 1,
          currentBeatIndexInPhase: 1,
          mainAxis: 'main-axis',
          endLine: 'end-line',
          alpha: 'alpha',
          beta: 'beta',
        },
        roundState: {
          phaseGoal: 'phase-goal',
          currentVolume: 'Med',
          currentRouter: 'router',
          verbLexicon: ['verb'],
          historyWindow: [],
        },
        generationState: {
          directorNoteSummary: 'summary',
          promptObject: {},
          currentBeatText: null,
          currentOptions: [],
        },
        evaluationState: {
          auditAnswers: [],
          blockingFailures: [],
          retryCount: 0,
          rewriteFeedback: null,
        },
      }),
    ).toMatchObject({
      sceneState: {
        currentPhaseIndex: 1,
      },
    });
  });

  it('rejects a StateSnapshot with an invalid phase index', () => {
    expect(() =>
      validateStateSnapshot({
        sceneState: {
          sceneId: 'scene-id',
          currentPhaseIndex: 0,
          currentBeatIndexInPhase: 1,
          mainAxis: 'main-axis',
          endLine: 'end-line',
          alpha: 'alpha',
          beta: 'beta',
        },
        roundState: {
          phaseGoal: 'phase-goal',
          currentVolume: 'Med',
          currentRouter: 'router',
          verbLexicon: ['verb'],
          historyWindow: [],
        },
        generationState: {
          directorNoteSummary: 'summary',
          promptObject: {},
          currentBeatText: null,
          currentOptions: [],
        },
        evaluationState: {
          auditAnswers: [],
          blockingFailures: [],
          retryCount: 0,
          rewriteFeedback: null,
        },
      }),
    ).toThrow(/sceneState\.currentPhaseIndex/i);
  });

  it('accepts a valid PhasePlan and rejects an invalid beatCount', () => {
    expect(
      validatePhasePlan({
        phaseId: 'phase-01',
        phaseIndex: 1,
        phaseGoal: 'phase-goal',
        gradientType: 'Rising',
        beatCount: 4,
      }),
    ).toMatchObject({
      beatCount: 4,
    });

    expect(() =>
      validatePhasePlan({
        phaseId: 'phase-01',
        phaseIndex: 1,
        phaseGoal: 'phase-goal',
        gradientType: 'Rising',
        beatCount: 5,
      }),
    ).toThrow(/beatCount/i);
  });

  it('rejects an AuditPacket with fewer than four options', () => {
    expect(() =>
      validateAuditPacket({
        context: {
          precedingBeats: [],
        },
        generatedContent: {
          beatText: 'beat-text',
          options: ['opt-1', 'opt-2', 'opt-3'],
        },
        auditQuestions: [],
      }),
    ).toThrow(/generatedContent\.options/i);
  });

  it('accepts an AuditPacket with no audit questions', () => {
    expect(
      validateAuditPacket({
        context: {
          precedingBeats: [],
        },
        generatedContent: {
          beatText: 'beat-text',
          options: ['opt-1', 'opt-2', 'opt-3', 'opt-4'],
        },
        auditQuestions: [],
      }),
    ).toMatchObject({
      auditQuestions: [],
    });
  });

  it('rejects a CollapseRequest without phaseConsequences', () => {
    expect(() =>
      validateCollapseRequest({
        context: {
          mainAxis: 'main-axis',
          endLine: 'end-line',
          currentAlpha: 'alpha',
          currentBeta: 'beta',
        },
      }),
    ).toThrow(/phaseConsequences/i);
  });

  it('accepts valid collapse and settlement responses', () => {
    expect(
      validateCollapseResponse({
        alpha: 'next-alpha',
        beta: 'next-beta',
        inferenceTrace: 'trace',
      }),
    ).toMatchObject({
      alpha: 'next-alpha',
    });

    expect(
      validatePhaseConsequenceRequest({
        context: {
          mainAxis: 'main-axis',
          endLine: 'end-line',
          phaseGoal: 'phase-goal',
        },
        phaseTranscript: [
          { role: 'assistant', content: 'assistant turn' },
          { role: 'user', content: 'user turn' },
        ],
      }),
    ).toMatchObject({
      context: {
        phaseGoal: 'phase-goal',
      },
    });

    expect(
      validatePhaseConsequenceResponse({
        phaseConsequences: ['fact-1'],
        settlementTrace: 'trace',
      }),
    ).toMatchObject({
      settlementTrace: 'trace',
    });
  });

  it('accepts a valid AuditQuestionSet', () => {
    expect(
      validateAuditQuestionSet({
        sceneId: 'scene-id',
        globalQuestions: [
          {
            id: 'AQ-G-001',
            question: 'Is the output valid?',
            expected: true,
            blocking: true,
          },
        ],
        controlQuestions: [],
        selectionPolicy: {
          default: ['AQ-G-001'],
        },
      }),
    ).toMatchObject({
      selectionPolicy: {
        default: ['AQ-G-001'],
      },
    });
  });

  it('accepts an AuditQuestionSet with an empty default selection', () => {
    expect(
      validateAuditQuestionSet({
        sceneId: 'scene-id',
        globalQuestions: [
          {
            id: 'AQ-G-001',
            question: 'Is the output valid?',
            expected: true,
            blocking: true,
          },
        ],
        controlQuestions: [],
        selectionPolicy: {
          default: [],
        },
      }),
    ).toMatchObject({
      selectionPolicy: {
        default: [],
      },
    });
  });
});
