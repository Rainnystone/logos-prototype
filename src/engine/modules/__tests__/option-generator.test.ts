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
  it('mentions all verbs from the current lexicon', () => {
    const constraints = buildOptionConstraints(
      baseRoundState,
      baseSceneState,
      'disciplined character profile',
    );

    for (const verb of baseRoundState.verbLexicon) {
      expect(constraints).toContain(verb);
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
    expect(constraints).toMatch(/orthogonal/i);
  });

  it('mentions Anti-OOC and Chain-of-Thought checks', () => {
    const constraints = buildOptionConstraints(
      baseRoundState,
      baseSceneState,
      'disciplined character profile',
    );

    expect(constraints).toMatch(/Anti-OOC/i);
    expect(constraints).toMatch(/Chain-of-Thought|CoT/i);
  });

  it('covers the 4-verb lexicon case by mentioning each verb', () => {
    const constraints = buildOptionConstraints(
      baseRoundState,
      baseSceneState,
      'disciplined character profile',
    );

    expect(constraints).toContain('强攻');
    expect(constraints).toContain('机动');
  });

  it('covers the 6-verb lexicon case by saying select 4 from these 6', () => {
    const constraints = buildOptionConstraints(
      {
        ...baseRoundState,
        verbLexicon: ['强攻', '牵制', '防御', '机动', '脱离', '器物'],
      },
      baseSceneState,
      'disciplined character profile',
    );

    expect(constraints).toMatch(/select 4 from these 6/i);
  });

  it('still produces valid constraints when character profile is empty', () => {
    const constraints = buildOptionConstraints(baseRoundState, baseSceneState, '');

    expect(constraints.length).toBeGreaterThan(0);
    expect(constraints).toMatch(/No character profile supplied|baseline plausibility/i);
  });
});
