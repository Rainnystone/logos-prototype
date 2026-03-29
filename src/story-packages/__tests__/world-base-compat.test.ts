import { describe, expect, it } from 'vitest';

import {
  filterWorldBaseForSceneCast,
  isLegacyWorldBase,
  migrateLegacyWorldBase,
} from '@/story-packages/world-base-compat';

describe('world-base compatibility helpers', () => {
  it('detects legacy world-base payloads by the mainCharacters blob', () => {
    expect(
      isLegacyWorldBase({
        mainCharacters: '## Hero\n### Character 1',
        npcCharacters: '',
        locationPatch: '',
      }),
    ).toBe(true);

    expect(
      isLegacyWorldBase({
        worldBaseSetting: 'World setting',
        hero: { characterId: 'chr_abcdef' },
      }),
    ).toBe(false);
  });

  it('migrates legacy world-base content into structured character profiles', () => {
    const migrated = migrateLegacyWorldBase({
      mainCharacters: `## World Base Setting
World setting text

## World Rules / Prohibitions / Anomalous Properties
World rules text

## Genre Tone & Prose Baseline
Tone text

## Hero
### Character 1
Name: Hero One
Identity / Narrative Role: Lead character
Light-Novel Trait: Calm and precise
Behavior Boundary:
Always stays focused.
OOC Red Line: Never breaks character.

## Core Cast
### Character 1
Name: Core One
Identity / Narrative Role: Support
Behavior Boundary:
Stays grounded.

## Antagonists
### Character 1
Name: Villain One
Identity / Narrative Role: Opponent
Behavior Boundary:
Pushes conflict forward.
Fatal Weakness:
Overconfidence.`,
      npcCharacters: 'NPC pool',
      locationPatch: 'Location notes',
    });

    expect(migrated.worldBaseSetting).toBe('World setting text');
    expect(migrated.worldRules).toBe('World rules text');
    expect(migrated.toneBaseline).toBe('Tone text');
    expect(migrated.hero).toMatchObject({
      name: 'Hero One',
      identityRole: 'Lead character',
      lightNovelTrait: 'Calm and precise',
      behaviorBoundary: 'Always stays focused.',
      oocRedLine: 'Never breaks character.',
    });
    expect(migrated.hero.characterId).toMatch(/^chr_[0-9a-f]{6}$/);
    expect(migrated.coreCast).toHaveLength(1);
    expect(migrated.coreCast[0]).toMatchObject({
      name: 'Core One',
      identityRole: 'Support',
      behaviorBoundary: 'Stays grounded.',
    });
    expect(migrated.antagonists).toHaveLength(1);
    expect(migrated.antagonists[0]).toMatchObject({
      name: 'Villain One',
      identityRole: 'Opponent',
      behaviorBoundary: 'Pushes conflict forward.',
      fatalWeakness: 'Overconfidence.',
    });
    expect(migrated.npcCharacters).toBe('NPC pool');
    expect(migrated.locationPatch).toBe('Location notes');
    expect(
      new Set([
        migrated.hero.characterId,
        migrated.coreCast[0]?.characterId,
        migrated.antagonists[0]?.characterId,
      ]).size,
    ).toBe(3);
  });

  it('filters scene cast members but always preserves the hero', () => {
    const worldBase = migrateLegacyWorldBase({
      mainCharacters: `## Hero
### Character 1
Name: Hero One

## Core Cast
### Character 1
Name: Core One

### Character 2
Name: Core Two

## Antagonists
### Character 1
Name: Villain One`,
      npcCharacters: '',
      locationPatch: '',
    });

    const heroId = worldBase.hero.characterId;
    const coreOneId = worldBase.coreCast[0]!.characterId;
    const coreTwoId = worldBase.coreCast[1]!.characterId;
    const villainId = worldBase.antagonists[0]!.characterId;

    const filtered = filterWorldBaseForSceneCast(worldBase, {
      cast: [coreOneId, villainId],
    });

    expect(filtered.hero.characterId).toBe(heroId);
    expect(filtered.coreCast).toHaveLength(1);
    expect(filtered.coreCast[0]?.characterId).toBe(coreOneId);
    expect(filtered.antagonists).toHaveLength(1);
    expect(filtered.antagonists[0]?.characterId).toBe(villainId);
    expect(worldBase.coreCast).toHaveLength(2);
    expect(worldBase.coreCast[1]?.characterId).toBe(coreTwoId);
  });
});
