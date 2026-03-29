import { describe, expect, it } from 'vitest';

import {
  renderCharacterProfileForOOC,
  renderWorldBaseForPrompt,
} from '@/engine/modules/world-base-prompt-render';
import type { WorldBase } from '@/types';

const structuredWorldBase: WorldBase = {
  worldBaseSetting: 'Rain-soaked academy city ruled by rumor economics.',
  worldRules: 'No overt supernatural spectacle may break the campus shell.',
  toneBaseline: 'Lean, tense, light-novel suspense with sharp sensory detail.',
  hero: {
    characterId: 'chr_hero01',
    name: 'Hero One',
    identityRole: 'Lead breaker',
    lightNovelTrait: 'Calm pressure with surgical timing.',
    gender: 'Female',
    personality: 'Reserved and ruthless under stress.',
    age: '16',
    occupation: 'Student',
    characterSummary: 'The only person actively trying to break the incident open.',
    capabilityBoundary: 'Uses only physical action and observation.',
    behaviorBoundary: 'Never panics or begs for rescue.',
    oocRedLine: 'Never turns hesitant or melodramatic.',
    clothing: 'School blazer',
    propsWeapon: 'Flashlight',
  },
  coreCast: [
    {
      characterId: 'chr_core01',
      name: 'Core One',
      identityRole: 'Daily-life anchor',
      lightNovelTrait: 'Warm contrast to the hero.',
      gender: 'Female',
      personality: 'Steady',
      age: '16',
      occupation: 'Student',
      characterSummary: 'Keeps the normal shell intact.',
      capabilityBoundary: 'Stays in mundane social space.',
      behaviorBoundary: 'Avoids direct danger.',
      oocRedLine: 'Never spots the anomaly clearly.',
      clothing: 'Cardigan',
      propsWeapon: 'Notebook',
    },
  ],
  antagonists: [
    {
      characterId: 'chr_anti01',
      name: 'Antagonist One',
      identityRole: 'Showman threat',
      lightNovelTrait: 'Performative menace.',
      gender: 'Male',
      personality: 'Cruel',
      age: '18',
      occupation: 'Streamer',
      characterSummary: 'Turns the incident into a spectacle.',
      capabilityBoundary: 'Needs audience attention to escalate.',
      behaviorBoundary: 'Always performs for the crowd.',
      oocRedLine: 'Never becomes quiet and efficient.',
      clothing: 'Coat',
      propsWeapon: 'Phone rig',
      fatalWeakness: 'Social humiliation',
    },
  ],
  npcCharacters: 'Support One - steady witness\nSupport Two - sharp clue finder',
  locationPatch: 'Main corridor\nBroadcast booth',
};

describe('world-base prompt render', () => {
  it('renders structured world data into prompt-compatible worldBase strings', () => {
    const promptWorldBase = renderWorldBaseForPrompt(structuredWorldBase);

    expect(promptWorldBase.mainCharacters).toContain('## World Base Setting');
    expect(promptWorldBase.mainCharacters).toContain('## World Rules / Prohibitions / Anomalous Properties');
    expect(promptWorldBase.mainCharacters).toContain('## Genre Tone & Prose Baseline');
    expect(promptWorldBase.mainCharacters).toContain('## Hero');
    expect(promptWorldBase.mainCharacters).toContain('## Core Cast');
    expect(promptWorldBase.mainCharacters).toContain('## Antagonists');
    expect(promptWorldBase.mainCharacters).toContain('Name: Hero One');
    expect(promptWorldBase.mainCharacters).toContain('Name: Antagonist One');
    expect(promptWorldBase.mainCharacters).toContain('Fatal Weakness: Social humiliation');
    expect(promptWorldBase.npcCharacters).toBe('Support One：steady witness\nSupport Two：sharp clue finder');
    expect(promptWorldBase.locationPatch).toBe('Main corridor\nBroadcast booth');
  });

  it('derives the anti-OOC character profile from structured hero fields only', () => {
    const antiOocProfile = renderCharacterProfileForOOC(structuredWorldBase);

    expect(antiOocProfile).toContain('Name: Hero One');
    expect(antiOocProfile).toContain('Identity / Narrative Role: Lead breaker');
    expect(antiOocProfile).toContain('Capability Boundary: Uses only physical action and observation.');
    expect(antiOocProfile).toContain('OOC Red Line: Never turns hesitant or melodramatic.');
    expect(antiOocProfile).not.toContain('Core One');
    expect(antiOocProfile).not.toContain('Antagonist One');
  });

  it('indents multiline hero fields when rendering prompt text', () => {
    const promptWorldBase = renderWorldBaseForPrompt({
      ...structuredWorldBase,
      hero: {
        ...structuredWorldBase.hero,
        characterSummary: 'First line\nSecond line',
        capabilityBoundary: 'Boundary line one\nBoundary line two',
      },
    });

    expect(promptWorldBase.mainCharacters).toContain('Character Summary:\n  First line\n  Second line');
    expect(promptWorldBase.mainCharacters).toContain(
      'Capability Boundary:\n  Boundary line one\n  Boundary line two',
    );
  });

  it('returns an empty anti-OOC profile when hero fields are blank', () => {
    const antiOocProfile = renderCharacterProfileForOOC({
      ...structuredWorldBase,
      hero: {
        ...structuredWorldBase.hero,
        name: '',
        identityRole: '',
        lightNovelTrait: '',
        gender: '',
        personality: '',
        age: '',
        occupation: '',
        characterSummary: '',
        capabilityBoundary: '',
        behaviorBoundary: '',
        oocRedLine: '',
        clothing: '',
        propsWeapon: '',
      },
    });

    expect(antiOocProfile).toBe('');
  });
});
