import { describe, expect, it } from 'vitest';

import {
  validateAuditPacket,
  validateAuditQuestionSet,
  validateCollapseRequest,
  validateCollapseResponse,
  validatePhasePlan,
  validatePhaseConsequenceRequest,
  validatePhaseConsequenceResponse,
  validatePromptObject,
  validateStateSnapshot,
} from '@/engine/schema-validator';

describe('schema validator', () => {
  it('accepts a valid PromptObject', () => {
    expect(
      validatePromptObject({
        worldBase: {
          mainCharacters: 'main-characters',
          npcCharacters: 'npc-characters',
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
          volume: 'Low',
          router: 'router',
          verbLexicon: ['verb'],
          beatConstraints: 'beat-constraints',
          optionConstraints: 'option-constraints',
        },
      }),
    ).toMatchObject({
      directorNote: {
        volume: 'Low',
      },
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
        auditQuestions: ['question-1'],
      }),
    ).toThrow(/generatedContent\.options/i);
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
});
