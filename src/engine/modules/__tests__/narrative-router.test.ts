import { describe, expect, it } from 'vitest';

import { loadStoryPackage } from '@/engine/story-loader';
import { getVerbLexicon, selectRouter } from '@/engine/modules/narrative-router';
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

describe('Narrative Router', () => {
  it('returns the hinted profile when the hint matches', () => {
    expect(selectRouter(routerProfiles, '悬疑/探案')).toEqual({
      routerName: '悬疑/探案',
      routerSemanticCore: 'investigation',
      verbLexicon: ['勘查', '演绎'],
    });
  });

  it('returns the first profile when no hint is provided', () => {
    expect(selectRouter(routerProfiles)).toEqual({
      routerName: '日常/闲暇',
      routerSemanticCore: 'slice-of-life',
      verbLexicon: ['闲散', '琐事'],
    });
  });

  it('falls back to the first profile when the hint does not match', () => {
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

  it('returns new copies for downstream mutation safety', () => {
    const selection = selectRouter(routerProfiles, '悬疑/探案');
    const verbs = getVerbLexicon(routerProfiles, '悬疑/探案');

    expect(selection.verbLexicon).not.toBe(routerProfiles[1]?.verbLexicon);
    expect(verbs).not.toBe(routerProfiles[1]?.verbLexicon);
  });

  it('does not mutate the input router profiles', () => {
    expect(() => selectRouter(routerProfiles, '日常/闲暇')).not.toThrow();
    expect(() => getVerbLexicon(routerProfiles, '悬疑/探案')).not.toThrow();
  });

  it('integrates with the sample-scene story package', async () => {
    const storyPackage = await loadStoryPackage('sample-scene');
    const selection = selectRouter(storyPackage.routerProfiles, '悬疑/探案');

    expect(selection.routerName).toBe('悬疑/探案');
    expect(selection.verbLexicon.length).toBeGreaterThan(0);
  });
});
