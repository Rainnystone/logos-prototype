import { describe, expect, it } from 'vitest';

import { buildOptionConstraints } from '@/engine/modules/director-note-layer';
import type { RoundState, SceneState } from '@/types';

const baseRoundState: RoundState = {
  phaseGoal: 'advance-phase-goal',
  currentVolume: 'High',
  currentRouter: '动作/战斗',
  verbLexicon: ['强攻', '牵制', '防御', '机动'],
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

describe('Option Generator constraint builder', () => {
  it('does not mention the current router or any verb lexicon entries', () => {
    const constraints = buildOptionConstraints(
      baseRoundState,
      baseSceneState,
      'disciplined character profile',
    );

    expect(constraints).not.toContain(baseRoundState.currentRouter);
    for (const verb of baseRoundState.verbLexicon) {
      expect(constraints).not.toContain(verb);
    }
  });

  it('mentions character profile, alpha, beta, and current volume', () => {
    const constraints = buildOptionConstraints(
      baseRoundState,
      baseSceneState,
      'disciplined character profile',
    );

    expect(constraints).toContain('disciplined character profile');
    expect(constraints).toContain(baseSceneState.alpha);
    expect(constraints).toContain(baseSceneState.beta);
    expect(constraints).toContain(baseRoundState.currentVolume);
  });

  it('instructs the model to generate exactly four orthogonal options', () => {
    const constraints = buildOptionConstraints(
      baseRoundState,
      baseSceneState,
      'disciplined character profile',
    );

    expect(constraints).toMatch(/exactly 4 options/i);
    expect(constraints).toMatch(/orthogonal|materially distinct/i);
  });

  it('mentions Anti-OOC and Chain-of-Thought checks', () => {
    const constraints = buildOptionConstraints(
      baseRoundState,
      baseSceneState,
      'disciplined character profile',
    );

    expect(constraints).toMatch(/Anti-OOC/i);
    expect(constraints).toMatch(/Chain-of-Thought|CoT/i);
    expect(constraints).toMatch(/local canon authority|franchise|worldview/i);
  });

  it('remains stable even when the runtime router result changes', () => {
    const constraints = buildOptionConstraints(
      baseRoundState,
      baseSceneState,
      'disciplined character profile',
    );
    const alternateConstraints = buildOptionConstraints(
      {
        ...baseRoundState,
        currentRouter: '悬疑/探案',
        verbLexicon: ['勘查', '演绎', '潜伏', '干预', '质证', '诱导'],
      },
      baseSceneState,
      'disciplined character profile',
    );

    expect(alternateConstraints).toBe(constraints);
  });

  it('still produces valid constraints when character profile is empty', () => {
    const constraints = buildOptionConstraints(baseRoundState, baseSceneState, '');

    expect(constraints.length).toBeGreaterThan(0);
    expect(constraints).toMatch(/No character profile supplied|baseline plausibility/i);
  });
});
