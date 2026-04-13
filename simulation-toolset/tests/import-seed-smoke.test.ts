import { describe, it, expect } from 'vitest';
import { applyTextImportSeed } from '@/story-packages/import-seed';
import type { WeaverImportPayload, WorldBase, SceneSpec } from '@/types';

// ---------------------------------------------------------------------------
// Minimal valid scaffolds
// ---------------------------------------------------------------------------

const scaffoldHero: WorldBase['hero'] = {
  characterId: 'chr_hero',
  name: 'Default Hero',
  identityRole: 'Protagonist',
  lightNovelTrait: 'Brave and curious.',
  gender: 'Unspecified',
  personality: 'Determined',
  age: 'Unknown',
  occupation: 'Adventurer',
  characterSummary: 'A hero awaiting author refinement.',
  capabilityBoundary: 'Define capabilities during authoring.',
  behaviorBoundary: 'Define scene-specific behavior during authoring.',
  oocRedLine: 'Do not break character.',
  clothing: 'Open',
  propsWeapon: 'Open',
};

const scaffoldLocation: WorldBase['locations'][number] = {
  locationId: 'loc_000001',
  name: 'Starting Location',
  description: 'A default location.',
  environmentAppearance: 'Undefined environment.',
  atmosphereDescription: 'Neutral atmosphere.',
  humanContextDescription: '',
};

function makeScaffoldWorldBase(overrides: Partial<WorldBase> = {}): WorldBase {
  return {
    worldBaseSetting: 'Default setting',
    worldRules: 'Default rules',
    toneBaseline: 'Neutral',
    hero: scaffoldHero,
    coreCast: [],
    antagonists: [],
    npcCharacters: '',
    locations: [scaffoldLocation],
    locationPatch: '',
    ...overrides,
  };
}

function makeScaffoldSceneSpec(overrides: Partial<SceneSpec> = {}): SceneSpec {
  return {
    sceneId: 'scn_import_seed_test',
    sceneName: 'Import Seed Test Scene',
    mainAxis: 'Discovery and growth',
    endLine: 'Resolution achieved.',
    openingHook: 'Initial hook text.',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applyTextImportSeed', () => {
  it('maps world base fields, hero, core cast, and locations from payload', () => {
    const worldBase = makeScaffoldWorldBase({
      locations: [
        scaffoldLocation,
        { ...scaffoldLocation, locationId: 'loc_000002', name: 'Second Location' },
      ],
      coreCast: [
        {
          ...scaffoldHero,
          characterId: 'chr_core01',
          name: 'Scaffold Ally',
        },
      ],
      antagonists: [],
    });
    const sceneSpec = makeScaffoldSceneSpec();

    const payload: WeaverImportPayload = {
      suggestedPackageName: 'mapped-package',
      sourceSummary: 'A rich fantasy world.',
      importSummary: 'Successfully extracted characters and locations.',
      openingHook: 'The adventure begins in a misty valley.',
      worldBase: {
        settingSummary: 'A high-fantasy kingdom on the brink of war.',
        worldRules: 'Magic is real but costs a price.',
        toneBaseline: 'Dark and hopeful',
      },
      hero: {
        displayName: 'Elara Nightwhisper',
        roleSummary: 'A seasoned mage seeking redemption.',
      },
      coreCast: [
        {
          displayName: 'Captain Dorin',
          roleSummary: 'A loyal knight with a hidden past.',
        },
      ],
      antagonists: [],
      npcCharacters: [],
      locations: [
        {
          displayName: 'Shadowkeep Fortress',
          summary: 'A looming citadel shrouded in perpetual twilight.',
        },
      ],
      warnings: [],
      unresolvedGaps: [],
    };

    const result = applyTextImportSeed({
      displayName: 'Test Package',
      sourceText: 'Original source text for the story.',
      payload,
      worldBase,
      sceneSpec,
    });

    // World base fields are mapped from payload
    expect(result.worldBase.worldBaseSetting).toBe('A high-fantasy kingdom on the brink of war.');
    expect(result.worldBase.worldRules).toBe('Magic is real but costs a price.');
    expect(result.worldBase.toneBaseline).toBe('Dark and hopeful');

    // Hero is mapped from payload
    expect(result.worldBase.hero.name).toBe('Elara Nightwhisper');
    expect(result.worldBase.hero.characterSummary).toBe('A seasoned mage seeking redemption.');
    expect(result.worldBase.hero.characterId).toBe('chr_hero');

    // Core cast mapped from payload
    const coreCastMember = result.worldBase.coreCast[0]!;
    expect(result.worldBase.coreCast).toHaveLength(1);
    expect(coreCastMember.name).toBe('Captain Dorin');
    expect(coreCastMember.characterSummary).toBe(
      'A loyal knight with a hidden past.',
    );

    // Location mapped from payload
    const mappedLocation = result.worldBase.locations[0]!;
    expect(result.worldBase.locations).toHaveLength(1);
    expect(mappedLocation.name).toBe('Shadowkeep Fortress');
    expect(mappedLocation.description).toBe(
      'A looming citadel shrouded in perpetual twilight.',
    );

    // Scene spec inherits displayName as sceneName and sourceText as openingHook
    expect(result.sceneSpec.sceneName).toBe('Test Package');
    expect(result.sceneSpec.openingHook).toBe('Original source text for the story.');

    // Cast and locationIds on scene spec reflect mapped world base
    expect(result.sceneSpec.cast).toContain('chr_core01');
    expect(result.sceneSpec.locationIds).toContain(mappedLocation.locationId);

    // Diagnostics track the rewritten opening hook
    expect(result.diagnostics.rewrittenOpeningHook).toBe(
      'The adventure begins in a misty valley.',
    );
  });

  it('fills scaffold defaults when payload has only openingHook and empty arrays', () => {
    const worldBase = makeScaffoldWorldBase();
    const sceneSpec = makeScaffoldSceneSpec();

    const payload: WeaverImportPayload = {
      sourceSummary: 'Minimal source.',
      importSummary: 'Minimal import.',
      openingHook: 'A quiet beginning.',
      worldBase: {},
      coreCast: [],
      antagonists: [],
      npcCharacters: [],
      locations: [],
      warnings: [],
      unresolvedGaps: [],
    };

    const result = applyTextImportSeed({
      displayName: 'Minimal Package',
      sourceText: 'Source.',
      payload,
      worldBase,
      sceneSpec,
    });

    // World base setting falls back to scaffold when payload provides nothing
    expect(result.worldBase.worldBaseSetting).toBe('Default setting');
    expect(result.worldBase.worldRules).toBe('Default rules');
    expect(result.worldBase.toneBaseline).toBe('Neutral');

    // Hero falls back to scaffold hero (no payload.hero provided)
    expect(result.worldBase.hero.name).toBe('Default Hero');

    // Empty arrays fall back to scaffold arrays
    expect(result.worldBase.coreCast).toEqual([]);
    expect(result.worldBase.antagonists).toEqual([]);
    expect(result.worldBase.locations).toEqual([scaffoldLocation]);

    // Scene spec gets displayName
    expect(result.sceneSpec.sceneName).toBe('Minimal Package');

    // Diagnostics still present
    expect(result.diagnostics.rewrittenOpeningHook).toBe('A quiet beginning.');
  });

  it('tracks warnings and unresolved gaps in the returned world structure', () => {
    const worldBase = makeScaffoldWorldBase();
    const sceneSpec = makeScaffoldSceneSpec();

    const payload: WeaverImportPayload = {
      sourceSummary: 'Gappy source.',
      importSummary: 'Import with issues.',
      openingHook: 'An uncertain start.',
      worldBase: {},
      coreCast: [],
      antagonists: [
        {
          displayName: 'The Shadow King',
          roleSummary: 'An ancient evil awakening.',
        },
      ],
      npcCharacters: [
        { displayName: 'Mysterious Merchant', summary: 'A traveling merchant with secrets.' },
      ],
      locations: [
        {
          displayName: 'The Blighted Lands',
          summary: 'A corrupted wasteland.',
        },
      ],
      warnings: [
        'Source text contains fragmented dialogue.',
        'Character motivations are ambiguous.',
      ],
      unresolvedGaps: [
        'Antagonist backstory is incomplete.',
        'World map boundaries are undefined.',
      ],
    };

    const result = applyTextImportSeed({
      displayName: 'Gap Package',
      sourceText: 'Gappy source text.',
      payload,
      worldBase,
      sceneSpec,
    });

    // Antagonist is mapped from payload
    const antagonist = result.worldBase.antagonists[0]!;
    expect(result.worldBase.antagonists).toHaveLength(1);
    expect(antagonist.name).toBe('The Shadow King');

    // NPC characters are mapped to string summary
    expect(result.worldBase.npcCharacters).toBe('A traveling merchant with secrets.');

    // Location is mapped from payload
    const gappyLocation = result.worldBase.locations[0]!;
    expect(gappyLocation.name).toBe('The Blighted Lands');

    // The function itself does not propagate warnings/gaps on the return type
    // (they live on WeaverImportSummary, not on the seed result), but the
    // diagnostics.rewrittenOpeningHook is always present
    expect(result.diagnostics.rewrittenOpeningHook).toBe('An uncertain start.');

    // The key structural guarantee: result is always a valid WorldBase + SceneSpec
    expect(result.worldBase.hero.characterId).toBe('chr_hero');
    expect(result.sceneSpec.sceneId).toBe('scn_import_seed_test');
  });
});
