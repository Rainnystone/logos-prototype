import { describe, expect, it } from 'vitest';

import { loadStoryPackage } from '@/engine/story-loader';
import {
  createNarrativeRouter,
  getVerbLexicon,
  selectRouter,
} from '@/engine/modules/narrative-router';
import type { LLMAdapter, RouteRequest } from '@/engine/types/adapter-interface';
import type { RouterProfile } from '@/types';

const routerProfiles: readonly RouterProfile[] = [
  {
    routerName: '日常/闲暇',
    routerSemanticCore: 'slice-of-life',
    verbLexicon: ['闲散', '琐事'],
  },
  {
    routerName: '悬疑/探案',
    routerSemanticCore: 'investigation',
    verbLexicon: ['勘查', '演绎'],
  },
];

const routeRequest: RouteRequest = {
  context: {
    phaseGoal: 'inspect the signal source',
    currentVolume: 'Med',
    alpha: 'alpha-boundary',
    beta: 'beta-boundary',
    routerHint: '日常/闲暇 -> 悬疑/探案',
  },
  historyWindow: [
    { role: 'assistant', content: 'A phone combusted and the classroom fell into brief panic.' },
    { role: 'user', content: 'Slip out through the window and trace the signal.' },
  ],
  availableRouters: routerProfiles,
};

describe('Narrative Router', () => {
  it('returns the hinted profile when the static hint matches', () => {
    expect(selectRouter(routerProfiles, '悬疑/探案')).toEqual({
      routerName: '悬疑/探案',
      routerSemanticCore: 'investigation',
      verbLexicon: ['勘查', '演绎'],
    });
  });

  it('returns the first profile when no static hint is provided', () => {
    expect(selectRouter(routerProfiles)).toEqual({
      routerName: '日常/闲暇',
      routerSemanticCore: 'slice-of-life',
      verbLexicon: ['闲散', '琐事'],
    });
  });

  it('falls back to the first profile when the static hint does not match', () => {
    expect(selectRouter(routerProfiles, '未知路由')).toMatchObject({
      routerName: '日常/闲暇',
    });
  });

  it('throws when the profile list is empty', () => {
    expect(() => selectRouter([])).toThrow(/router profile/i);
  });

  it('returns the correct verb lexicon for a known router', () => {
    expect(getVerbLexicon(routerProfiles, '悬疑/探案')).toEqual(['勘查', '演绎']);
  });

  it('throws for an unknown router name', () => {
    expect(() => getVerbLexicon(routerProfiles, 'unknown')).toThrow(/unknown/i);
  });

  it('runs LLM-driven router inference when adapter.route is configured', async () => {
    const adapter: LLMAdapter = {
      async collapse() {
        throw new Error('not used');
      },
      async route() {
        return {
          routerName: '悬疑/探案',
          inferenceTrace: 'history shifts toward investigation',
        };
      },
    };

    const router = createNarrativeRouter(adapter);
    const selection = await router.selectRouter(routeRequest);

    expect(selection).toEqual({
      routerName: '悬疑/探案',
      routerSemanticCore: 'investigation',
      verbLexicon: ['勘查', '演绎'],
      inferenceTrace: 'history shifts toward investigation',
    });
  });

  it('falls back to fixture-safe static selection when adapter.route is unavailable', async () => {
    const adapter: LLMAdapter = {
      async collapse() {
        throw new Error('not used');
      },
    };

    const router = createNarrativeRouter(adapter);
    const selection = await router.selectRouter(routeRequest);

    expect(selection.routerName).toBe('日常/闲暇');
  });

  it('falls back to the static phase prior when the inferred router name is invalid', async () => {
    const adapter: LLMAdapter = {
      async collapse() {
        throw new Error('not used');
      },
      async route() {
        return {
          routerName: '动作/战斗',
          inferenceTrace: 'invalid-test',
        };
      },
    };

    const router = createNarrativeRouter(adapter);

    await expect(router.selectRouter(routeRequest)).resolves.toMatchObject({
      routerName: '日常/闲暇',
      inferenceTrace: expect.stringMatching(/Fallback route selected/i),
    });
  });

  it('falls back to the phase routing prior after repeated route inference failures', async () => {
    const adapter: LLMAdapter = {
      async collapse() {
        throw new Error('not used');
      },
      async route() {
        throw new Error('Provider response did not contain valid structured JSON');
      },
    };

    const router = createNarrativeRouter(adapter);
    const selection = await router.selectRouter(routeRequest);

    expect(selection.routerName).toBe('日常/闲暇');
    expect(selection.inferenceTrace).toMatch(/Fallback route selected/i);
  });

  it('integrates with the sample-scene story package', async () => {
    const storyPackage = await loadStoryPackage('sample-scene');
    const adapter: LLMAdapter = {
      async collapse() {
        throw new Error('not used');
      },
      async route() {
        return {
          routerName: '悬疑/探案',
          inferenceTrace: 'sample-trace',
        };
      },
    };

    const router = createNarrativeRouter(adapter);
    const selection = await router.selectRouter({
      context: {
        phaseGoal: storyPackage.phasePlans[0]!.phaseGoal,
        currentVolume: 'Low',
        alpha: 'alpha',
        beta: 'beta',
        routerHint: storyPackage.phasePlans[0]!.routerHint ?? '日常/闲暇',
      },
      historyWindow: [],
      availableRouters: storyPackage.routerProfiles,
    });

    expect(selection.routerName).toBe('悬疑/探案');
    expect(selection.verbLexicon.length).toBeGreaterThan(0);
  });
});
