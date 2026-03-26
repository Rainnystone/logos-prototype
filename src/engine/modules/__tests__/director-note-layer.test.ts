import { describe, expect, it } from 'vitest';

import { buildDirectorNote } from '@/engine/modules/director-note-layer';
import type { RoundState, SceneState, WorldBase } from '@/types';

const baseRoundState: RoundState = {
  phaseGoal: 'advance-phase-goal',
  currentVolume: 'Med',
  currentRouter: '悬疑/探案',
  verbLexicon: ['勘查', '演绎', '潜伏', '干预'],
  historyWindow: [],
  directorConstraints:
    'Strict phase-plan red lines: the protagonist must not identify the culprit too early and must not confront the villain head-on in this phase. [AQ-G-001] For "宫下藤花是否察觉到了异常，或者表现出对生命安全的恐慌？", the correct answer must be NO. [AQ-C-001] For "本轮 Beat 正文是否符合当前声量要求？", the correct answer must be YES.',
};

const baseSceneState: SceneState = {
  sceneId: 'scene-id',
  currentPhaseIndex: 1,
  currentBeatIndexInPhase: 1,
  mainAxis: 'main-axis',
  endLine: 'end-line',
  alpha: 'alpha-boundary',
  beta: 'beta-boundary',
};

const baseWorldBase: WorldBase = {
  mainCharacters: 'disciplined character profile',
  npcCharacters: '',
  locationPatch: 'location-patch',
};

describe('Director Note Layer', () => {
  it('returns a DirectorNote with all required fields', () => {
    const directorNote = buildDirectorNote(baseRoundState, baseSceneState, baseWorldBase);

    expect(directorNote.volume).toBe(baseRoundState.currentVolume);
    expect(directorNote.beatConstraints.length).toBeGreaterThan(0);
    expect(directorNote.optionConstraints.length).toBeGreaterThan(0);
    expect(directorNote).not.toHaveProperty('router');
    expect(directorNote).not.toHaveProperty('verbLexicon');
  });

  it('mentions high-volume slow motion and sensory detail constraints', () => {
    const directorNote = buildDirectorNote(
      { ...baseRoundState, currentVolume: 'High' },
      baseSceneState,
      baseWorldBase,
    );

    expect(directorNote.beatConstraints).toMatch(/slow-motion|time stretching|sensory/i);
  });

  it('mentions low-volume montage and accelerated time constraints', () => {
    const directorNote = buildDirectorNote(
      { ...baseRoundState, currentVolume: 'Low' },
      baseSceneState,
      baseWorldBase,
    );

    expect(directorNote.beatConstraints).toMatch(/montage|accelerated time|summary/i);
  });

  it('mentions medium-volume real-time pacing constraints', () => {
    const directorNote = buildDirectorNote(baseRoundState, baseSceneState, baseWorldBase);

    expect(directorNote.beatConstraints).toMatch(/real-time|standard pacing|causal chain/i);
  });

  it('references Alpha, Beta, phaseGoal, canon grounding, phase-plan red lines, and audit answer targets in beat constraints', () => {
    const directorNote = buildDirectorNote(baseRoundState, baseSceneState, baseWorldBase);

    expect(directorNote.beatConstraints).toContain(baseSceneState.alpha);
    expect(directorNote.beatConstraints).toContain(baseSceneState.beta);
    expect(directorNote.beatConstraints).toContain(baseRoundState.phaseGoal);
    expect(directorNote.beatConstraints).not.toContain(baseRoundState.currentRouter);
    for (const verb of baseRoundState.verbLexicon) {
      expect(directorNote.beatConstraints).not.toContain(verb);
    }
    expect(directorNote.beatConstraints).toMatch(/strictly obey|must obey|mandatory/i);
    expect(directorNote.beatConstraints).toMatch(/phase plan|phase goal/i);
    expect(directorNote.beatConstraints).toMatch(/wall of text|paragraph/i);
    expect(directorNote.beatConstraints).toMatch(/hard failure|unacceptable|must be rejected/i);
    expect(directorNote.beatConstraints).toMatch(/prefer shorter paragraphs|more breaks/i);
    expect(directorNote.beatConstraints).toMatch(/local canon authority|franchise|worldview/i);
    expect(directorNote.beatConstraints).toContain(
      'must not identify the culprit too early and must not confront the villain head-on',
    );
    expect(directorNote.beatConstraints).toContain('宫下藤花是否察觉到了异常');
    expect(directorNote.beatConstraints).toMatch(/correct answer must be NO/i);
  });

  it('references anti-OOC, boundaries, volume, phase-goal obedience, and audit answer targets in option constraints without route locking', () => {
    const directorNote = buildDirectorNote(baseRoundState, baseSceneState, baseWorldBase);

    expect(directorNote.optionConstraints).toMatch(/Anti-OOC|Chain-of-Thought/i);
    expect(directorNote.optionConstraints).toContain(baseSceneState.alpha);
    expect(directorNote.optionConstraints).toContain(baseSceneState.beta);
    expect(directorNote.optionConstraints).toContain(baseRoundState.currentVolume);
    expect(directorNote.optionConstraints).toContain(baseRoundState.phaseGoal);
    expect(directorNote.optionConstraints).not.toContain(baseRoundState.currentRouter);
    for (const verb of baseRoundState.verbLexicon) {
      expect(directorNote.optionConstraints).not.toContain(verb);
    }
    expect(directorNote.optionConstraints).toMatch(/phase plan|phase goal/i);
    expect(directorNote.optionConstraints).toContain(
      'must not identify the culprit too early and must not confront the villain head-on',
    );
    expect(directorNote.optionConstraints).toContain('本轮 Beat 正文是否符合当前声量要求');
    expect(directorNote.optionConstraints).toMatch(/correct answer must be YES/i);
    expect(directorNote.optionConstraints).toMatch(/materially distinct|orthogonal/i);
  });

  it('works with minimal required RoundState fields', () => {
    const minimalRoundState: RoundState = {
      phaseGoal: 'goal',
      currentVolume: 'Low',
      currentRouter: '日常/闲暇',
      verbLexicon: ['闲散'],
      historyWindow: [],
    };

    const directorNote = buildDirectorNote(minimalRoundState, baseSceneState, baseWorldBase);

    expect(directorNote.volume).toBe('Low');
    expect(directorNote.beatConstraints).toContain('goal');
  });

  it('returns an immutable result and does not mutate inputs', () => {
    const frozenRoundState: RoundState = {
      ...baseRoundState,
      verbLexicon: [...baseRoundState.verbLexicon],
      historyWindow: [],
    };
    const frozenSceneState: SceneState = { ...baseSceneState };
    const frozenWorldBase: WorldBase = { ...baseWorldBase };

    Object.freeze(frozenRoundState.verbLexicon);
    Object.freeze(frozenRoundState.historyWindow);
    Object.freeze(frozenRoundState);
    Object.freeze(frozenSceneState);
    Object.freeze(frozenWorldBase);

    const directorNote = buildDirectorNote(frozenRoundState, frozenSceneState, frozenWorldBase);

    expect(Object.isFrozen(directorNote)).toBe(true);
    expect(frozenRoundState.currentRouter).toBe(baseRoundState.currentRouter);
    expect(frozenRoundState.verbLexicon).toEqual(baseRoundState.verbLexicon);
  });

  it('uses control-module volume definitions and additive guidance when provided', () => {
    const directorNote = buildDirectorNote(baseRoundState, baseSceneState, baseWorldBase, {
      directorNoteAdditions: {
        beatConstraintsAdditions: 'Never let the scene drift into spectacle beyond a containable campus incident.',
        optionConstraintsAdditions: 'Keep every option grounded in immediate physical action.',
      },
      beatVolumeDefinitions: {
        Low: {
          beatConstraints: 'Use accelerated time and broad framing.',
          optionFormatting: 'Use short macro-level options.',
        },
        Med: {
          beatConstraints: 'Use direct real-time pacing with firm causal links.',
          optionFormatting: 'Use balanced action options with clear real-time wording.',
        },
        High: {
          beatConstraints: 'Use pressure-heavy close focus and tactile sensory detail.',
          optionFormatting: 'Use high-immediacy tactical options with sharper physical wording.',
        },
      },
    });

    expect(directorNote.beatConstraints).toContain(
      'Use direct real-time pacing with firm causal links.',
    );
    expect(directorNote.beatConstraints).toContain(
      'Never let the scene drift into spectacle beyond a containable campus incident.',
    );
    expect(directorNote.optionConstraints).toContain(
      'Use balanced action options with clear real-time wording.',
    );
    expect(directorNote.optionConstraints).toContain(
      'Keep every option grounded in immediate physical action.',
    );
  });
});
