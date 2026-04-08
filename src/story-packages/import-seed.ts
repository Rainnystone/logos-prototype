import { parseWithSchema } from '@/lib/validation';
import type { SceneSpec, WeaverImportPayload, WorldBase } from '@/types';
import { SceneSpecSchema, WorldBaseSchema } from '@/types';

interface ApplyTextImportSeedInput {
  readonly displayName: string;
  readonly sourceText: string;
  readonly payload: WeaverImportPayload;
  readonly worldBase: WorldBase;
  readonly sceneSpec: SceneSpec;
}

interface ApplyTextImportSeedResult {
  readonly worldBase: WorldBase;
  readonly sceneSpec: SceneSpec;
  readonly diagnostics: {
    readonly rewrittenOpeningHook: string;
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapCharacterSeed(
  seed: unknown,
  fallback: WorldBase['hero'],
  characterId: string,
): WorldBase['hero'] {
  const seedObject = readObject(seed);
  const name = readString(seedObject.displayName) ?? fallback.name;
  const roleSummary = readString(seedObject.roleSummary) ?? fallback.characterSummary;

  return {
    ...fallback,
    characterId,
    name,
    characterSummary: roleSummary,
    lightNovelTrait: roleSummary,
  };
}

function mapLocationSeed(
  seed: unknown,
  fallback: WorldBase['locations'][number],
  locationId: string,
): WorldBase['locations'][number] {
  const seedObject = readObject(seed);
  const summary = readString(seedObject.summary) ?? fallback.description;
  const name = readString(seedObject.displayName) ?? fallback.name;

  return {
    ...fallback,
    locationId,
    name,
    description: summary,
    environmentAppearance: summary,
    atmosphereDescription: summary,
  };
}

function requireFirstLocation(worldBase: WorldBase): WorldBase['locations'][number] {
  const firstLocation = worldBase.locations[0];

  if (!firstLocation) {
    throw new Error('Text import seed requires at least one scaffold location.');
  }

  return firstLocation;
}

function mapCharacterCollectionSeed(
  seeds: readonly unknown[],
  fallbackCollection: readonly WorldBase['hero'][],
  fallbackCharacter: WorldBase['hero'],
  idPrefix: string,
): readonly WorldBase['hero'][] {
  return seeds.length > 0
    ? seeds.map((member, index) =>
        mapCharacterSeed(
          member,
          fallbackCollection[index] ?? fallbackCharacter,
          fallbackCollection[index]?.characterId ?? `${idPrefix}${String(index + 1).padStart(2, '0')}`,
        ),
      )
    : fallbackCollection;
}

function mapNpcCharactersSeed(
  seeds: readonly unknown[],
  fallbackValue: string,
): string {
  const summaries = seeds
    .map((seed) => {
      if (typeof seed === 'string') {
        return readString(seed);
      }

      const seedObject = readObject(seed);
      return readString(seedObject.summary) ?? readString(seedObject.roleSummary);
    })
    .filter((value): value is string => Boolean(value));

  return summaries.length > 0 ? summaries.join('；') : fallbackValue;
}

export function applyTextImportSeed(
  input: ApplyTextImportSeedInput,
): ApplyTextImportSeedResult {
  const payloadWorldBase = readObject(input.payload.worldBase);
  const fallbackLocation = requireFirstLocation(input.worldBase);
  const nextHero = input.payload.hero
    ? mapCharacterSeed(input.payload.hero, input.worldBase.hero, input.worldBase.hero.characterId)
    : input.worldBase.hero;
  const nextCoreCast = mapCharacterCollectionSeed(
    input.payload.coreCast,
    input.worldBase.coreCast,
    input.worldBase.hero,
    'chr_core',
  );
  const nextAntagonists = mapCharacterCollectionSeed(
    input.payload.antagonists,
    input.worldBase.antagonists,
    input.worldBase.hero,
    'chr_ant',
  );
  const nextNpcCharacters =
    input.payload.npcCharacters.length > 0
      ? mapNpcCharactersSeed(input.payload.npcCharacters, input.worldBase.npcCharacters)
      : readString(payloadWorldBase.npcCharactersSummary) ?? input.worldBase.npcCharacters;
  const nextLocations =
    input.payload.locations.length > 0
      ? input.payload.locations.map((location, index) =>
          mapLocationSeed(
            location,
            input.worldBase.locations[index] ?? fallbackLocation,
            input.worldBase.locations[index]?.locationId ?? `loc_import_${index + 1}`,
          ),
        )
      : input.worldBase.locations;
  const nextWorldBase = parseWithSchema(
    WorldBaseSchema,
    {
      ...input.worldBase,
      worldBaseSetting:
        readString(payloadWorldBase.settingSummary) ?? input.worldBase.worldBaseSetting,
      worldRules: readString(payloadWorldBase.worldRules) ?? input.worldBase.worldRules,
      toneBaseline: readString(payloadWorldBase.toneBaseline) ?? input.worldBase.toneBaseline,
      npcCharacters: nextNpcCharacters,
      locationPatch: readString(payloadWorldBase.locationPatch) ?? input.worldBase.locationPatch,
      hero: nextHero,
      coreCast: nextCoreCast,
      antagonists: nextAntagonists,
      locations: nextLocations,
    },
    'worldBase',
  );
  const nextSceneSpec = parseWithSchema(
    SceneSpecSchema,
    {
      ...input.sceneSpec,
      sceneName: input.displayName,
      openingHook: input.sourceText,
    },
    'sceneSpec',
  );

  return {
    worldBase: nextWorldBase,
    sceneSpec: nextSceneSpec,
    diagnostics: {
      rewrittenOpeningHook: input.payload.openingHook,
    },
  };
}
