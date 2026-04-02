import { describe, expect, it } from 'vitest';

import {
  getSceneCastSelectableIds,
  normalizeSceneCastSelection,
} from '@/authoring/sections/scene-cast';
import type { WorldBase } from '@/types';

const worldBase = {
  worldBaseSetting: 'World base',
  worldRules: 'Rules',
  toneBaseline: 'Tone',
  hero: {
    characterId: 'chr_hero01',
    name: 'Hero',
    identityRole: 'Lead',
    lightNovelTrait: 'Trait',
    gender: 'Female',
    personality: 'Calm',
    age: '17',
    occupation: 'Student',
    characterSummary: 'Hero summary',
    capabilityBoundary: 'Boundary',
    behaviorBoundary: 'Behavior',
    oocRedLine: 'Red line',
    clothing: 'Uniform',
    propsWeapon: 'None',
  },
  coreCast: [
    {
      characterId: 'chr_core01',
      name: 'Core One',
      identityRole: 'Anchor',
      lightNovelTrait: 'Trait',
      gender: 'Female',
      personality: 'Kind',
      age: '16',
      occupation: 'Student',
      characterSummary: 'Core summary',
      capabilityBoundary: 'Boundary',
      behaviorBoundary: 'Behavior',
      oocRedLine: 'Red line',
      clothing: 'Uniform',
      propsWeapon: 'None',
    },
    {
      characterId: 'chr_core02',
      name: 'Core Two',
      identityRole: 'Anchor',
      lightNovelTrait: 'Trait',
      gender: 'Male',
      personality: 'Calm',
      age: '18',
      occupation: 'Student',
      characterSummary: 'Core summary',
      capabilityBoundary: 'Boundary',
      behaviorBoundary: 'Behavior',
      oocRedLine: 'Red line',
      clothing: 'Uniform',
      propsWeapon: 'None',
    },
  ],
  antagonists: [
    {
      characterId: 'chr_ant01',
      name: 'Antagonist One',
      identityRole: 'Threat',
      lightNovelTrait: 'Trait',
      gender: 'Male',
      personality: 'Chaotic',
      age: '19',
      occupation: 'Streamer',
      characterSummary: 'Antagonist summary',
      capabilityBoundary: 'Boundary',
      behaviorBoundary: 'Behavior',
      oocRedLine: 'Red line',
      clothing: 'Coat',
      propsWeapon: 'Device',
      fatalWeakness: 'Weakness',
    },
  ],
  npcCharacters: 'NPC',
  locations: [],
  locationPatch: 'Location',
} as const satisfies WorldBase;

describe('scene-cast semantics', () => {
  it('derives selectable ids from core cast and antagonists in shared-library order', () => {
    expect(getSceneCastSelectableIds(worldBase)).toEqual([
      'chr_core01',
      'chr_core02',
      'chr_ant01',
    ]);
  });

  it('normalizes explicit cast selections by removing the hero, duplicates, and stale ids', () => {
    expect(
      normalizeSceneCastSelection(worldBase, [
        'chr_ant01',
        'chr_hero01',
        'chr_missing',
        'chr_core02',
        'chr_core01',
        'chr_core02',
      ]),
    ).toEqual({
      cast: ['chr_core01', 'chr_core02', 'chr_ant01'],
      staleIds: ['chr_missing'],
    });
  });
});
