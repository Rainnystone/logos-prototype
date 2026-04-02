import { describe, expect, it } from 'vitest';

import {
  filterWorldBaseForSceneCast,
  isLegacyWorldBase,
  migrateLegacyWorldBase,
  projectLegacyLocationPatchFromStructuredLocations,
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

  it('migrates legacy mainCharacters blobs into structured character profiles', () => {
    const migrated = migrateLegacyWorldBase({
      mainCharacters: `# Characters

## 1. 玩家角色：Hero One

**【身份定位】** Lead character
**【轻小说特质】** Calm and precise

- **行为边界**：
  - Always stays focused.
  - **OOC 红线**：Never breaks character.

## 2. 关键角色与机制

### A. Core One

**【身份定位】** Support

- **行为边界**：
  - Stays grounded.

## 3. 核心反派：Villain One

**【身份定位】** Opponent

- **行为边界**：
  - Pushes conflict forward.
- **致命弱点**：
  - Overconfidence.`,
      npcCharacters: 'NPC pool',
      locationPatch: 'Location notes',
    });

    expect(migrated.worldBaseSetting).toBe('');
    expect(migrated.worldRules).toBe('');
    expect(migrated.toneBaseline).toBe('');
    expect(migrated.hero).toMatchObject({
      name: 'Hero One',
      identityRole: 'Lead character',
      lightNovelTrait: 'Calm and precise',
      oocRedLine: 'Never breaks character.',
    });
    expect(migrated.hero.behaviorBoundary).toContain('Always stays focused.');
    expect(migrated.hero.behaviorBoundary).toContain('OOC 红线：Never breaks character.');
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

  it('drops fully blank structured cast entries during legacy migration', () => {
    const migrated = migrateLegacyWorldBase({
      mainCharacters: `## Hero
### Character 1
Name: Hero One

## Core Cast
### Character 1
Name: Core One

### Character 2
Name:

## Antagonists
### Character 1
Name: Villain One

### Character 2
Name:`,
      npcCharacters: '',
      locationPatch: '',
    });

    expect(migrated.coreCast).toHaveLength(1);
    expect(migrated.coreCast[0]?.name).toBe('Core One');
    expect(migrated.antagonists).toHaveLength(1);
    expect(migrated.antagonists[0]?.name).toBe('Villain One');
  });

  it('keeps structured cast entries when any field contains input', () => {
    const migrated = migrateLegacyWorldBase({
      mainCharacters: `## Hero
### Character 1
Name: Hero One

## Core Cast
### Character 1
Name: Core One

### Character 2
Personality: X

## Antagonists`,
      npcCharacters: '',
      locationPatch: '',
    });

    expect(migrated.coreCast).toHaveLength(2);
    expect(migrated.coreCast[1]?.personality).toBe('X');
  });

  it('projects untouched imported location descriptions back to locationPatch', () => {
    expect(
      projectLegacyLocationPatchFromStructuredLocations({
        locationPatch: 'Original location patch',
        locations: [
          {
            locationId: 'loc_a1b2c3',
            name: '',
            description: '  Legacy location notes  ',
            environmentAppearance: '',
            atmosphereDescription: '',
            humanContextDescription: '',
          },
        ],
      }),
    ).toBe('Legacy location notes');
  });
});
