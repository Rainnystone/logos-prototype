import { describe, expect, it } from 'vitest';

import { validatePromptObject } from '@/engine/schema-validator';
import {
  assemblePromptObject,
  assembleRewritePromptObject,
  type PromptAssemblerInput,
  type RewriteContext,
} from '@/engine/modules/prompt-assembler';
import type { DirectorNote, PreviousDraft, WorldBase } from '@/types';

const worldBase: WorldBase = {
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
  coreCast: [
    {
      characterId: 'chr_core01',
      name: 'Core One',
      identityRole: 'Support',
      lightNovelTrait: 'Reliable',
      gender: 'Male',
      personality: 'Steady',
      age: '17',
      occupation: 'Student',
      characterSummary: 'Core supporting character.',
      capabilityBoundary: 'Stays within the setting.',
      behaviorBoundary: 'Remains grounded.',
      oocRedLine: 'Does not leave the scene.',
      clothing: 'School uniform',
      propsWeapon: 'Notebook',
    },
  ],
  antagonists: [],
  npcCharacters: 'Support One - steady witness',
  locationPatch: 'location-patch',
};

const directorNote: DirectorNote = {
  volume: 'Med',
  beatConstraints: 'beat-constraints',
  optionConstraints: 'option-constraints',
};

const baseInput: PromptAssemblerInput = {
  worldBase,
  precedingBeats: [
    { role: 'assistant', content: 'beat-1' },
    { role: 'user', content: 'input-1' },
  ],
  mainAxis: 'main-axis',
  endLine: 'end-line',
  phaseGoal: 'phase-goal',
  alpha: 'alpha-boundary',
  beta: 'beta-boundary',
  currentRouter: '悬疑/探案',
  verbLexicon: ['勘查', '演绎', '潜伏', '干预'],
  directorNote,
};

const previousDraft: PreviousDraft = {
  beatText: 'previous-beat-text',
  options: ['option-1', 'option-2', 'option-3', 'option-4'],
};

const rewriteContext: RewriteContext = {
  retryCount: 1,
  rewriteFeedback: 'Fix the failing constraint.',
  previousDraft,
};

describe('Prompt Assembler', () => {
  it('assembles a valid PromptObject on the normal path', () => {
    const promptObject = assemblePromptObject(baseInput);

    expect(validatePromptObject(promptObject)).toEqual(promptObject);
  });

  it('returns all required top-level fields and omits generationControl on the normal path', () => {
    const promptObject = assemblePromptObject(baseInput);

    expect(promptObject).toHaveProperty('worldBase');
    expect(promptObject).toHaveProperty('history');
    expect(promptObject).toHaveProperty('narrative');
    expect(promptObject).toHaveProperty('directorNote');
    expect(promptObject).not.toHaveProperty('generationControl');
  });

  it('maps layer 1 worldBase fields exactly', () => {
    const promptObject = assemblePromptObject(baseInput);

    expect(promptObject.worldBase.mainCharacters).toContain('## Hero');
    expect(promptObject.worldBase.mainCharacters).toContain('Name: Hero One');
    expect(promptObject.worldBase.mainCharacters).toContain('## Core Cast');
    expect(promptObject.worldBase.locationPatch).toBe(worldBase.locationPatch);
    expect(promptObject.worldBase.npcCharacters).toBe('Support One：steady witness');
  });

  it('maps layer 2 history from precedingBeats using a new array', () => {
    const promptObject = assemblePromptObject(baseInput);

    expect(promptObject.history).toEqual(baseInput.precedingBeats);
    expect(promptObject.history).not.toBe(baseInput.precedingBeats);
  });

  it('maps an empty history window to an empty history array', () => {
    const promptObject = assemblePromptObject({
      ...baseInput,
      precedingBeats: [],
    });

    expect(promptObject.history).toEqual([]);
  });

  it('maps layer 3 narrative fields exactly', () => {
    const promptObject = assemblePromptObject(baseInput);

    expect(promptObject.narrative.mainAxis).toBe(baseInput.mainAxis);
    expect(promptObject.narrative.endLine).toBe(baseInput.endLine);
    expect(promptObject.narrative.phaseGoal).toBe(baseInput.phaseGoal);
    expect(promptObject.narrative.alpha).toBe(baseInput.alpha);
    expect(promptObject.narrative.beta).toBe(baseInput.beta);
  });

  it('maps layer 4 directorNote fields exactly', () => {
    const promptObject = assemblePromptObject(baseInput);

    expect(promptObject.directorNote.volume).toBe(directorNote.volume);
    expect(promptObject.directorNote.router).toBe(baseInput.currentRouter);
    expect(promptObject.directorNote.verbLexicon).toEqual(baseInput.verbLexicon);
    expect(promptObject.directorNote.beatConstraints).toBe(directorNote.beatConstraints);
    expect(promptObject.directorNote.optionConstraints).toBe(directorNote.optionConstraints);
  });

  it('returns an immutable deep-copied object and does not mutate inputs', () => {
    const frozenInput = {
      ...baseInput,
      worldBase: Object.freeze({ ...worldBase }),
      precedingBeats: Object.freeze([...baseInput.precedingBeats]),
      verbLexicon: Object.freeze([...baseInput.verbLexicon]),
      directorNote: Object.freeze({ ...directorNote }),
    } as PromptAssemblerInput;

    const promptObject = assemblePromptObject(frozenInput);

    expect(Object.isFrozen(promptObject)).toBe(true);
    expect(Object.isFrozen(promptObject.worldBase)).toBe(true);
    expect(Object.isFrozen(promptObject.history)).toBe(true);
    expect(Object.isFrozen(promptObject.narrative)).toBe(true);
    expect(Object.isFrozen(promptObject.directorNote)).toBe(true);
    expect(Object.isFrozen(promptObject.directorNote.verbLexicon)).toBe(true);
    expect(frozenInput.directorNote.volume).toBe(directorNote.volume);
  });

  it('assembles a valid PromptObject on the rewrite path', () => {
    const promptObject = assembleRewritePromptObject(baseInput, rewriteContext);

    expect(validatePromptObject(promptObject)).toEqual(promptObject);
  });

  it('attaches generationControl with rewrite-specific fields', () => {
    const promptObject = assembleRewritePromptObject(baseInput, rewriteContext);

    expect(promptObject.generationControl).toEqual({
      isRewrite: true,
      retryCount: rewriteContext.retryCount,
      rewriteFeedback: rewriteContext.rewriteFeedback,
      previousDraft: {
        beatText: previousDraft.beatText,
        options: previousDraft.options,
      },
    });
  });

  it('preserves all four layers on the rewrite path', () => {
    const promptObject = assembleRewritePromptObject(baseInput, rewriteContext);

    expect(promptObject.worldBase.mainCharacters).toContain('Name: Hero One');
    expect(promptObject.history).toEqual(baseInput.precedingBeats);
    expect(promptObject.narrative.phaseGoal).toBe(baseInput.phaseGoal);
    expect(promptObject.directorNote.router).toBe(baseInput.currentRouter);
    expect(promptObject.directorNote.optionConstraints).toBe(directorNote.optionConstraints);
  });

  it('supports retryCount values at both 0 and 3', () => {
    const zeroRetry = assembleRewritePromptObject(baseInput, {
      ...rewriteContext,
      retryCount: 0,
    });
    const maxRetry = assembleRewritePromptObject(baseInput, {
      ...rewriteContext,
      retryCount: 3,
    });

    expect(zeroRetry.generationControl?.retryCount).toBe(0);
    expect(maxRetry.generationControl?.retryCount).toBe(3);
  });

  it('copies previousDraft options on the rewrite path', () => {
    const promptObject = assembleRewritePromptObject(baseInput, rewriteContext);

    expect(promptObject.generationControl?.previousDraft?.options).toEqual(previousDraft.options);
    expect(promptObject.generationControl?.previousDraft?.options).not.toBe(previousDraft.options);
    expect(promptObject.generationControl?.previousDraft?.options).toHaveLength(4);
  });
});
