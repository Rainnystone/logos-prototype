import { describe, expect, it } from 'vitest';

import { buildDirectorNote } from '@/engine/modules/director-note-layer';
import type { RoundState, SceneState, WorldBase } from '@/types';

const baseRoundState: RoundState = {
  phaseGoal: 'advance-phase-goal',
  currentVolume: 'Med',
  currentRouter: '悬疑/探案',
  verbLexicon: ['勘查', '演绎', '潜伏', '干预'],
  historyWindow: [],
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
    expect(directorNote.router).toBe(baseRoundState.currentRouter);
    expect(directorNote.verbLexicon).toEqual(baseRoundState.verbLexicon);
    expect(directorNote.beatConstraints.length).toBeGreaterThan(0);
    expect(directorNote.optionConstraints.length).toBeGreaterThan(0);
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

  it('references Alpha, Beta, and phaseGoal in beat constraints', () => {
    const directorNote = buildDirectorNote(baseRoundState, baseSceneState, baseWorldBase);

    expect(directorNote.beatConstraints).toContain(baseSceneState.alpha);
    expect(directorNote.beatConstraints).toContain(baseSceneState.beta);
    expect(directorNote.beatConstraints).toContain(baseRoundState.phaseGoal);
  });

  it('references verb lexicon, anti-OOC, boundaries, and volume in option constraints', () => {
    const directorNote = buildDirectorNote(baseRoundState, baseSceneState, baseWorldBase);

    for (const verb of baseRoundState.verbLexicon) {
      expect(directorNote.optionConstraints).toContain(verb);
    }

    expect(directorNote.optionConstraints).toMatch(/Anti-OOC|Chain-of-Thought/i);
    expect(directorNote.optionConstraints).toContain(baseSceneState.alpha);
    expect(directorNote.optionConstraints).toContain(baseSceneState.beta);
    expect(directorNote.optionConstraints).toContain(baseRoundState.currentVolume);
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

    expect(directorNote.router).toBe('日常/闲暇');
    expect(directorNote.verbLexicon).toEqual(['闲散']);
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
    expect(Object.isFrozen(directorNote.verbLexicon)).toBe(true);
    expect(frozenRoundState.currentRouter).toBe(baseRoundState.currentRouter);
  });
});
