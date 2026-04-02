import { describe, expect, it } from 'vitest';

import {
  applyWorldBaseCastDraft,
  createEmptyWorldBaseCharacterDraft,
  createWorldBaseCastDraft,
  normalizeSupportingCast,
  normalizeWorldBaseCharacterDraft,
} from '@/authoring/sections/worldbase-cast';
import type { WorldBase } from '@/types';

const structuredWorldBase: WorldBase = {
  worldBaseSetting: 'Existing setting',
  worldRules: 'No open magic.',
  toneBaseline: 'Cold, restrained pressure.',
  hero: {
    characterId: 'chr_hero01',
    name: 'Hero One',
    identityRole: 'Lead breaker',
    lightNovelTrait: 'Silent pressure',
    gender: 'Female',
    personality: 'Cold',
    age: '17',
    occupation: 'Student',
    characterSummary: 'Keeps moving toward the threat.',
    capabilityBoundary: 'No magic, only physical action.',
    behaviorBoundary: 'Never abandons the trace.',
    oocRedLine: 'No speeches.',
    clothing: 'School uniform',
    propsWeapon: 'Ceramic blade',
  },
  coreCast: [
    {
      characterId: 'chr_core01',
      name: 'Core One',
      identityRole: 'Anchor',
      lightNovelTrait: 'Soft contrast',
      gender: 'Female',
      personality: 'Gentle',
      age: '17',
      occupation: 'Student',
      characterSummary: 'Keeps the ordinary layer intact.',
      capabilityBoundary: '',
      behaviorBoundary: 'Must stay out of direct danger.',
      oocRedLine: 'Never notices the anomaly.',
      clothing: '',
      propsWeapon: '',
    },
  ],
  antagonists: [
    {
      characterId: 'chr_ant01',
      name: 'Villain One',
      identityRole: 'Threat',
      lightNovelTrait: 'Showman',
      gender: 'Male',
      personality: 'Chaotic',
      age: '19',
      occupation: 'Streamer',
      characterSummary: 'Turns attention into pressure.',
      capabilityBoundary: 'Requires attention to trigger.',
      behaviorBoundary: 'Always performs for an audience.',
      oocRedLine: 'Cannot become quiet and efficient.',
      clothing: '',
      propsWeapon: '',
      fatalWeakness: 'Loses power when attention drops to zero.',
    },
  ],
  npcCharacters: 'Support One：Steady witness',
  locations: [],
  locationPatch: 'Signal room',
};

describe('createEmptyWorldBaseCharacterDraft', () => {
  it('creates an empty structured draft for a requested slot', () => {
    const draft = createEmptyWorldBaseCharacterDraft('core');

    expect(draft).toMatchObject({
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
    });
    expect(draft.characterId).toMatch(/^chr_[0-9a-f]{6}$/);
    expect(draft.draftId).toBe(draft.characterId);
  });
});

describe('normalizeWorldBaseCharacterDraft', () => {
  it('normalizes whitespace while preserving structured profile fields', () => {
    expect(
      normalizeWorldBaseCharacterDraft(
        {
          draftId: ' chr_core01 ',
          characterId: ' chr_core01 ',
          name: '  Core\nOne ',
          identityRole: ' Anchor ',
          lightNovelTrait: ' Soft\ncontrast ',
          gender: ' Female ',
          personality: ' Gentle ',
          age: ' 17 ',
          occupation: ' Student ',
          characterSummary: ' Keeps the ordinary layer intact. ',
          capabilityBoundary: ' Keep watch. ',
          behaviorBoundary: ' Stay out of direct danger. ',
          oocRedLine: ' Never notice the anomaly. ',
          clothing: ' Ribbon ',
          propsWeapon: ' Notebook ',
        },
        'core',
        1,
      ),
    ).toEqual({
      draftId: 'chr_core01',
      characterId: 'chr_core01',
      name: 'Core One',
      identityRole: 'Anchor',
      lightNovelTrait: 'Soft\ncontrast',
      gender: 'Female',
      personality: 'Gentle',
      age: '17',
      occupation: 'Student',
      characterSummary: 'Keeps the ordinary layer intact.',
      capabilityBoundary: 'Keep watch.',
      behaviorBoundary: 'Stay out of direct danger.',
      oocRedLine: 'Never notice the anomaly.',
      clothing: 'Ribbon',
      propsWeapon: 'Notebook',
    });
  });
});

describe('normalizeSupportingCast', () => {
  it('normalizes supporting-cast lines into stable list entries', () => {
    expect(
      normalizeSupportingCast(' Support One：Steady witness\n- Support Two: Sharp clue finder '),
    ).toBe('Support One：Steady witness\nSupport Two：Sharp clue finder');
  });
});

describe('createWorldBaseCastDraft', () => {
  it('keeps structured character ids stable when creating the authoring draft', () => {
    const draft = createWorldBaseCastDraft(structuredWorldBase);

    expect(draft.hero.characterId).toBe('chr_hero01');
    expect(draft.hero.draftId).toBe('chr_hero01');
    expect(draft.coreCast[0]).toMatchObject({
      characterId: 'chr_core01',
      draftId: 'chr_core01',
      name: 'Core One',
    });
    expect(draft.antagonists[0]).toMatchObject({
      characterId: 'chr_ant01',
      draftId: 'chr_ant01',
      fatalWeakness: 'Loses power when attention drops to zero.',
    });
    expect(draft.supportingCast).toBe('Support One：Steady witness');
    expect(draft.locationPool).toBe('Signal room');
  });

  it('hydrates one imported location from a legacy locationPatch blob', () => {
    const draft = createWorldBaseCastDraft({
      ...structuredWorldBase,
      locationPatch: '  Legacy location notes  ',
    });

    expect(draft.locations).toHaveLength(1);
    expect(draft.locations[0]).toMatchObject({
      locationId: '',
      name: '',
      description: 'Legacy location notes',
      environmentAppearance: '',
      atmosphereDescription: '',
      humanContextDescription: '',
    });
  });

  it('hydrates exactly one imported location from a complex legacy location blob', () => {
    const draft = createWorldBaseCastDraft({
      ...structuredWorldBase,
      locations: [],
      locationPatch: `- 地点一：教学楼走廊
- 地点二：广播室
- 地点三：天台

夜间巡逻路线如下：
1. 教学楼
2. 广播室
3. 天台`,
    });

    expect(draft.locations).toHaveLength(1);
    expect(draft.locations[0]?.locationId).toBe('');
    expect(draft.locations[0]?.description).toBe(`- 地点一：教学楼走廊
- 地点二：广播室
- 地点三：天台

夜间巡逻路线如下：
1. 教学楼
2. 广播室
3. 天台`);
  });
});

describe('applyWorldBaseCastDraft', () => {
  it('drops fully blank cast entries when saving world-base drafts', () => {
    const draft = createWorldBaseCastDraft(structuredWorldBase);

    const nextWorldBase = applyWorldBaseCastDraft(structuredWorldBase, {
      ...draft,
      coreCast: [...draft.coreCast, createEmptyWorldBaseCharacterDraft('core')],
      antagonists: [...draft.antagonists, createEmptyWorldBaseCharacterDraft('antagonist')],
    });

    expect(nextWorldBase.coreCast).toHaveLength(1);
    expect(nextWorldBase.coreCast[0]?.name).toBe('Core One');
    expect(nextWorldBase.antagonists).toHaveLength(1);
    expect(nextWorldBase.antagonists[0]?.name).toBe('Villain One');
  });

  it('keeps cast entries when any field contains input', () => {
    const draft = createWorldBaseCastDraft(structuredWorldBase);
    const partialCharacter = createEmptyWorldBaseCharacterDraft('core');

    const nextWorldBase = applyWorldBaseCastDraft(structuredWorldBase, {
      ...draft,
      coreCast: [...draft.coreCast, { ...partialCharacter, personality: 'X' }],
    });

    expect(nextWorldBase.coreCast).toHaveLength(2);
    expect(nextWorldBase.coreCast[1]?.personality).toBe('X');
  });

  it('mints durable loc_ ids on the first successful structured save', () => {
    const legacyWorldBase: WorldBase = {
      ...structuredWorldBase,
      locations: [],
      locationPatch: 'Legacy location notes',
    };
    const draft = createWorldBaseCastDraft(legacyWorldBase);

    expect(draft.locations).toHaveLength(1);
    expect(draft.locations[0]?.locationId).toBe('');

    const nextWorldBase = applyWorldBaseCastDraft(legacyWorldBase, draft);

    expect(nextWorldBase.locations).toHaveLength(1);
    expect(nextWorldBase.locations[0]?.locationId).toMatch(/^loc_[0-9a-f]{6}$/);
  });

  it('projects deterministic locationPatch text from named and multi-location drafts', () => {
    const legacyWorldBase: WorldBase = {
      ...structuredWorldBase,
      locations: [],
      locationPatch: 'legacy fallback location patch',
    };
    const draft = createWorldBaseCastDraft(legacyWorldBase);

    const nextWorldBase = applyWorldBaseCastDraft(legacyWorldBase, {
      ...draft,
      locations: [
        {
          draftId: 'location-a',
          locationId: '',
          name: 'Signal Room',
          description: 'Legacy monitors and cracked glass.',
          environmentAppearance: 'Cold blue light and hanging wires.',
          atmosphereDescription: 'Tense and humming.',
          humanContextDescription: 'Two operators watch the corridor.',
        },
        {
          draftId: 'location-b',
          locationId: '',
          name: 'Rooftop',
          description: 'Wind pushes across open concrete.',
          environmentAppearance: 'Exposed railings and wet floor.',
          atmosphereDescription: 'Wide and isolating.',
          humanContextDescription: 'Students avoid this place after dusk.',
        },
      ],
    });

    expect(nextWorldBase.locationPatch).toBe(`### Location 1
Name: Signal Room
Description:
Legacy monitors and cracked glass.
Environment Appearance:
Cold blue light and hanging wires.
Atmosphere Description:
Tense and humming.
Human Context Description:
Two operators watch the corridor.

### Location 2
Name: Rooftop
Description:
Wind pushes across open concrete.
Environment Appearance:
Exposed railings and wet floor.
Atmosphere Description:
Wide and isolating.
Human Context Description:
Students avoid this place after dusk.`);
  });

  it('does not overwrite edited imported descriptions with stale locationPool text', () => {
    const legacyWorldBase: WorldBase = {
      ...structuredWorldBase,
      locations: [],
      locationPatch: 'Original legacy description',
    };
    const draft = createWorldBaseCastDraft(legacyWorldBase);

    const nextWorldBase = applyWorldBaseCastDraft(legacyWorldBase, {
      ...draft,
      locationPool: 'Stale location pool text',
      locations: [
        {
          ...(draft.locations[0] ?? {
            draftId: 'location-1',
            locationId: '',
            name: '',
            description: '',
            environmentAppearance: '',
            atmosphereDescription: '',
            humanContextDescription: '',
          }),
          description: 'Edited imported description',
        },
      ],
    });

    expect(nextWorldBase.locations[0]?.description).toBe('Edited imported description');
    expect(nextWorldBase.locationPatch).toBe('Edited imported description');
  });
});
