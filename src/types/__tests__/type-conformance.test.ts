import { describe, expect, it } from 'vitest';

import type {
  AuditPacket,
  AuditQuestionSet,
  CollapseRequest,
  CollapseResponse,
  PhaseConsequenceRequest,
  PhaseConsequenceResponse,
  PhasePlan,
  PromptObject,
  StateSnapshot,
} from '@/types';

describe('Phase 00 contract types', () => {
  it('exports a structured runtime character schema and world-base schema', async () => {
    const types = await import('@/types');

    expect(
      types.CharacterProfileSchema.parse({
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
        propsWeapon: 'None',
      }),
    ).toMatchObject({ characterId: 'chr_hero01' });

    expect(
      types.WorldBaseSchema.parse({
        worldBaseSetting: 'World setting',
        worldRules: 'World rules',
        toneBaseline: 'Tone baseline',
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
          propsWeapon: 'None',
        },
        coreCast: [],
        antagonists: [],
        npcCharacters: 'NPC pool',
        locationPatch: 'Location notes',
      }),
    ).toHaveProperty('hero.characterId', 'chr_hero01');
  });

  it('exports a separate prompt-only world-base schema', async () => {
    const types = await import('@/types');

    expect(
      types.PromptWorldBaseSchema.parse({
        mainCharacters: 'main-characters',
        npcCharacters: 'npc-characters',
        locationPatch: 'location-patch',
      }),
    ).toMatchObject({
      mainCharacters: 'main-characters',
      npcCharacters: 'npc-characters',
      locationPatch: 'location-patch',
    });
  });

  it('keeps scene cast available on the public scene spec contract', async () => {
    const storyPackage = await import('@/types/story-package');

    expect(storyPackage.SceneSpecSchema).toBeDefined();
    expect(() =>
      storyPackage.SceneSpecSchema.parse({
        sceneId: 'scene-id',
        sceneName: 'Scene Name',
        cast: ['chr_hero01', 'chr_core01'],
        mainAxis: 'main-axis',
        endLine: 'end-line',
      }),
    ).not.toThrow();
  });

  it('models PromptObject with an optional generationControl payload', () => {
    const promptObject: PromptObject = {
      worldBase: {
        mainCharacters: 'main-characters',
        npcCharacters: 'npc-characters',
        locationPatch: 'location-patch',
      },
      history: [
        { role: 'assistant', content: 'previous beat' },
        { role: 'user', content: 'player input' },
      ],
      narrative: {
        mainAxis: 'main-axis',
        endLine: 'end-line',
        phaseGoal: 'phase-goal',
        alpha: 'alpha-boundary',
        beta: 'beta-boundary',
      },
      directorNote: {
        volume: 'Low',
        router: 'router-name',
        verbLexicon: ['observe', 'move'],
        beatConstraints: 'beat constraints',
        optionConstraints: 'option constraints',
      },
      generationControl: {
        isRewrite: true,
        retryCount: 1,
        rewriteFeedback: 'Fix the failing constraint.',
        previousDraft: {
          beatText: 'previous draft',
          options: ['opt-1', 'opt-2', 'opt-3', 'opt-4'],
        },
      },
    };

    expect(promptObject.directorNote.volume).toBe('Low');
    expect(promptObject.generationControl?.previousDraft?.options).toHaveLength(4);
  });

  it('models StateSnapshot with scene, round, generation, and evaluation state', () => {
    const stateSnapshot: StateSnapshot = {
      sceneState: {
        sceneId: 'scene-id',
        currentPhaseIndex: 1,
        currentBeatIndexInPhase: 1,
        mainAxis: 'main-axis',
        endLine: 'end-line',
        alpha: 'alpha',
        beta: 'beta',
        sceneProgress: 'scene-progress',
        phaseConsequences: ['fact-1'],
      },
      roundState: {
        phaseGoal: 'phase-goal',
        currentVolume: 'Med',
        currentRouter: 'router-name',
        verbLexicon: ['verb-1'],
        historyWindow: [{ role: 'assistant', content: 'history' }],
        directorConstraints: 'constraints',
      },
      generationState: {
        directorNoteSummary: 'summary',
        promptObject: {},
        currentBeatText: null,
        currentOptions: [],
      },
      evaluationState: {
        auditAnswers: [true],
        blockingFailures: [],
        retryCount: 0,
        rewriteFeedback: null,
      },
    };

    expect(stateSnapshot.roundState.currentVolume).toBe('Med');
    expect(stateSnapshot.evaluationState.retryCount).toBe(0);
  });

  it('models PhasePlan with a fixed beat count', () => {
    const phasePlan: PhasePlan = {
      phaseId: 'phase-01',
      phaseIndex: 1,
      phaseGoal: 'phase-goal',
      gradientType: 'Rising',
      beatCount: 4,
      routerHint: 'router-hint',
      notes: 'notes',
    };

    expect(phasePlan.gradientType).toBe('Rising');
    expect(phasePlan.beatCount).toBe(4);
  });

  it('models AuditPacket with exactly four generated options', () => {
    const auditPacket: AuditPacket = {
      context: {
        precedingBeats: [{ role: 'assistant', content: 'history' }],
      },
      generatedContent: {
        beatText: 'beat-text',
        options: ['opt-1', 'opt-2', 'opt-3', 'opt-4'],
      },
      auditQuestions: ['question-1'],
    };

    expect(auditPacket.generatedContent.options).toHaveLength(4);
  });

  it('models collapse and settlement packets', () => {
    const collapseRequest: CollapseRequest = {
      context: {
        mainAxis: 'main-axis',
        endLine: 'end-line',
        currentAlpha: 'alpha',
        currentBeta: 'beta',
        sceneProgress: 'progress',
        completedPhaseGoal: 'goal',
      },
      phaseConsequences: ['fact-1'],
    };

    const collapseResponse: CollapseResponse = {
      alpha: 'next-alpha',
      beta: 'next-beta',
      inferenceTrace: 'trace',
    };

    const consequenceRequest: PhaseConsequenceRequest = {
      context: {
        mainAxis: 'main-axis',
        endLine: 'end-line',
        phaseGoal: 'phase-goal',
        sceneProgress: 'progress',
        currentPhaseIndex: 1,
      },
      phaseTranscript: [
        { role: 'assistant', content: 'assistant turn' },
        { role: 'user', content: 'user turn' },
      ],
    };

    const consequenceResponse: PhaseConsequenceResponse = {
      phaseConsequences: ['fact-1'],
      settlementTrace: 'trace',
    };

    expect(collapseRequest.phaseConsequences).toHaveLength(1);
    expect(collapseResponse.inferenceTrace).toBe('trace');
    expect(consequenceRequest.phaseTranscript).toHaveLength(2);
    expect(consequenceResponse.phaseConsequences).toHaveLength(1);
  });

  it('models AuditQuestionSet with phase overrides', () => {
    const auditQuestionSet: AuditQuestionSet = {
      sceneId: 'scene-id',
      globalQuestions: [
        {
          id: 'AQ-G-001',
          question: 'Is the output valid?',
          expected: true,
          blocking: true,
        },
      ],
      controlQuestions: [
        {
          id: 'AQ-C-001',
          question: 'Does the beat respect the current volume?',
          expected: true,
          blocking: false,
        },
      ],
      phaseSpecificQuestions: {
        'phase-01': [
          {
            id: 'AQ-P1-001',
            question: 'Phase-specific question',
            expected: true,
            blocking: false,
          },
        ],
      },
      selectionPolicy: {
        default: ['AQ-G-001', 'AQ-C-001'],
        phaseOverrides: {
          'phase-01': {
            append: ['AQ-P1-001'],
          },
        },
      },
    };

    expect(auditQuestionSet.selectionPolicy.default).toContain('AQ-G-001');
    expect(auditQuestionSet.phaseSpecificQuestions?.['phase-01']).toHaveLength(1);
  });
});
