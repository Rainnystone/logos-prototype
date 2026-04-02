import type { CharacterProfile, WorldBase } from '@/types';
import { generateCharacterId } from '@/lib/character-id';
import { compactWorldBaseCastLists } from '@/lib/world-base-characters';
import {
  areWorldLocationDraftCollectionsEqual,
  alignDescriptionOnlyLocationWithPatch,
  hydrateWorldLocationDrafts,
  normalizeWorldLocationDrafts,
  projectLocationPatchFromLocations,
  toPersistedLocations,
  type WorldLocationDraft,
} from '@/authoring/sections/world-locations';

type CharacterKind = 'hero' | 'core' | 'antagonist';

export interface WorldBaseCharacterDraft {
  readonly draftId: string;
  readonly characterId: string;
  readonly name: string;
  readonly identityRole: string;
  readonly lightNovelTrait: string;
  readonly gender: string;
  readonly personality: string;
  readonly age: string;
  readonly occupation: string;
  readonly characterSummary: string;
  readonly capabilityBoundary: string;
  readonly behaviorBoundary: string;
  readonly oocRedLine: string;
  readonly clothing: string;
  readonly propsWeapon: string;
  readonly fatalWeakness?: string;
}

export interface WorldBaseCastDraft {
  readonly worldBaseSetting: string;
  readonly worldRules: string;
  readonly toneBaseline: string;
  readonly hero: WorldBaseCharacterDraft;
  readonly coreCast: readonly WorldBaseCharacterDraft[];
  readonly antagonists: readonly WorldBaseCharacterDraft[];
  readonly supportingCast: string;
  readonly locations: readonly WorldLocationDraft[];
  readonly locationPool: string;
}

function normalizeBlock(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function normalizeInline(value: string): string {
  return normalizeBlock(value).replace(/\n+/g, ' ');
}

function stripListMarker(value: string): string {
  return value.replace(/^[\s*•-]+/, '');
}

function createCharacterDraftId(kind: CharacterKind, index: number): string {
  return `${kind}-${index}`;
}

function toCharacterProfile(character: WorldBaseCharacterDraft, kind: CharacterKind): CharacterProfile {
  const normalizedCharacter = normalizeWorldBaseCharacterDraft(character, kind, 1);

  return {
    characterId: normalizedCharacter.characterId,
    name: normalizedCharacter.name,
    identityRole: normalizedCharacter.identityRole,
    lightNovelTrait: normalizedCharacter.lightNovelTrait,
    gender: normalizedCharacter.gender,
    personality: normalizedCharacter.personality,
    age: normalizedCharacter.age,
    occupation: normalizedCharacter.occupation,
    characterSummary: normalizedCharacter.characterSummary,
    capabilityBoundary: normalizedCharacter.capabilityBoundary,
    behaviorBoundary: normalizedCharacter.behaviorBoundary,
    oocRedLine: normalizedCharacter.oocRedLine,
    clothing: normalizedCharacter.clothing,
    propsWeapon: normalizedCharacter.propsWeapon,
    ...(kind === 'antagonist'
      ? { fatalWeakness: normalizedCharacter.fatalWeakness ?? '' }
      : {}),
  };
}

function fromCharacterProfile(
  character: CharacterProfile,
  kind: CharacterKind,
  index: number,
): WorldBaseCharacterDraft {
  return normalizeWorldBaseCharacterDraft(
    {
      draftId: character.characterId,
      characterId: character.characterId,
      name: character.name,
      identityRole: character.identityRole,
      lightNovelTrait: character.lightNovelTrait,
      gender: character.gender,
      personality: character.personality,
      age: character.age,
      occupation: character.occupation,
      characterSummary: character.characterSummary,
      capabilityBoundary: character.capabilityBoundary,
      behaviorBoundary: character.behaviorBoundary,
      oocRedLine: character.oocRedLine,
      clothing: character.clothing,
      propsWeapon: character.propsWeapon,
      ...(kind === 'antagonist' ? { fatalWeakness: character.fatalWeakness ?? '' } : {}),
    },
    kind,
    index,
  );
}

function normalizeCharacterList(
  characters: readonly WorldBaseCharacterDraft[],
  kind: CharacterKind,
): WorldBaseCharacterDraft[] {
  return characters.map((character, index) =>
    normalizeWorldBaseCharacterDraft(character, kind, index + 1),
  );
}

export function createEmptyWorldBaseCharacterDraft(
  kind: CharacterKind,
): WorldBaseCharacterDraft {
  const generatedId = generateCharacterId();

  return {
    draftId: generatedId,
    characterId: generatedId,
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
    ...(kind === 'antagonist' ? { fatalWeakness: '' } : {}),
  };
}

export function normalizeWorldBaseCharacterDraft(
  character: WorldBaseCharacterDraft,
  kind: CharacterKind,
  index: number,
): WorldBaseCharacterDraft {
  const fallbackId = createCharacterDraftId(kind, index);
  const normalizedCharacterId =
    normalizeInline(character.characterId) || normalizeInline(character.draftId) || fallbackId;
  const normalizedDraftId =
    normalizeInline(character.draftId) || normalizeInline(character.characterId) || fallbackId;

  return {
    ...character,
    draftId: normalizedDraftId,
    characterId: normalizedCharacterId,
    name: normalizeInline(character.name),
    identityRole: normalizeBlock(character.identityRole),
    lightNovelTrait: normalizeBlock(character.lightNovelTrait),
    gender: normalizeInline(character.gender),
    personality: normalizeInline(character.personality),
    age: normalizeInline(character.age),
    occupation: normalizeInline(character.occupation),
    characterSummary: normalizeBlock(character.characterSummary),
    capabilityBoundary: normalizeBlock(character.capabilityBoundary),
    behaviorBoundary: normalizeBlock(character.behaviorBoundary),
    oocRedLine: normalizeBlock(character.oocRedLine),
    clothing: normalizeBlock(character.clothing),
    propsWeapon: normalizeBlock(character.propsWeapon),
    ...(kind === 'antagonist'
      ? { fatalWeakness: normalizeBlock(character.fatalWeakness ?? '') }
      : {}),
  };
}

function normalizeWorldBaseCastDraft(
  currentWorldBase: WorldBase,
  draft: Partial<WorldBaseCastDraft>,
): WorldBaseCastDraft {
  const baseDraft = createWorldBaseCastDraft(currentWorldBase);
  const normalizedLocationPool = normalizeBlock(draft.locationPool ?? baseDraft.locationPool);
  const nextLocations = draft.locations ?? baseDraft.locations;
  const shouldAlignImportedDescription =
    draft.locations === undefined ||
    areWorldLocationDraftCollectionsEqual(nextLocations, baseDraft.locations);
  const normalizedLocations = shouldAlignImportedDescription
    ? alignDescriptionOnlyLocationWithPatch(nextLocations, normalizedLocationPool)
    : normalizeWorldLocationDrafts(nextLocations);

  return {
    ...baseDraft,
    ...draft,
    worldBaseSetting: normalizeBlock(draft.worldBaseSetting ?? baseDraft.worldBaseSetting),
    worldRules: normalizeBlock(draft.worldRules ?? baseDraft.worldRules),
    toneBaseline: normalizeBlock(draft.toneBaseline ?? baseDraft.toneBaseline),
    hero: normalizeWorldBaseCharacterDraft(draft.hero ?? baseDraft.hero, 'hero', 1),
    coreCast: normalizeCharacterList(draft.coreCast ?? baseDraft.coreCast, 'core'),
    antagonists: normalizeCharacterList(draft.antagonists ?? baseDraft.antagonists, 'antagonist'),
    supportingCast: normalizeBlock(draft.supportingCast ?? baseDraft.supportingCast),
    locations: normalizedLocations,
    locationPool: normalizedLocationPool,
  };
}

export function createWorldBaseCastDraft(worldBase: WorldBase): WorldBaseCastDraft {
  const hydratedLocations = hydrateWorldLocationDrafts({
    locations: worldBase.locations ?? [],
    locationPatch: worldBase.locationPatch,
  });

  return {
    worldBaseSetting: normalizeBlock(worldBase.worldBaseSetting),
    worldRules: normalizeBlock(worldBase.worldRules),
    toneBaseline: normalizeBlock(worldBase.toneBaseline),
    hero: fromCharacterProfile(worldBase.hero, 'hero', 1),
    coreCast: worldBase.coreCast.map((character, index) =>
      fromCharacterProfile(character, 'core', index + 1),
    ),
    antagonists: worldBase.antagonists.map((character, index) =>
      fromCharacterProfile(character, 'antagonist', index + 1),
    ),
    supportingCast: normalizeBlock(worldBase.npcCharacters),
    locations: hydratedLocations,
    locationPool: projectLocationPatchFromLocations(hydratedLocations, worldBase.locationPatch),
  };
}

function normalizeSupportingCastEntry(line: string): string | null {
  const cleanedLine = stripListMarker(line).trim();

  if (!cleanedLine) {
    return null;
  }

  const match = cleanedLine.match(/^([^：:]+)[：:]\s*(.+)$/);
  if (!match) {
    return null;
  }

  const name = match[1]?.trim();
  const description = match[2]?.trim();

  if (!name || !description) {
    return null;
  }

  return `${name}：${description}`;
}

export function normalizeSupportingCast(input: string): string {
  const normalized = normalizeBlock(input);

  if (!normalized) {
    return '';
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const renderedEntries: string[] = [];

  for (const line of lines) {
    const renderedEntry = normalizeSupportingCastEntry(line);
    if (!renderedEntry) {
      return normalized;
    }

    renderedEntries.push(renderedEntry);
  }

  return renderedEntries.join('\n');
}

export function renderSupportingCast(input: string): string {
  return normalizeSupportingCast(input);
}

export function applyWorldBaseCastDraft(
  currentWorldBase: WorldBase,
  draft: Partial<WorldBaseCastDraft>,
): WorldBase {
  const nextDraft = normalizeWorldBaseCastDraft(currentWorldBase, draft);
  const persistedLocations = toPersistedLocations(nextDraft.locations);
  const projectedLocationPatch = projectLocationPatchFromLocations(
    persistedLocations,
    nextDraft.locationPool,
  );

  return compactWorldBaseCastLists({
    worldBaseSetting: nextDraft.worldBaseSetting,
    worldRules: nextDraft.worldRules,
    toneBaseline: nextDraft.toneBaseline,
    hero: toCharacterProfile(nextDraft.hero, 'hero'),
    coreCast: nextDraft.coreCast.map((character) => toCharacterProfile(character, 'core')),
    antagonists: nextDraft.antagonists.map((character) =>
      toCharacterProfile(character, 'antagonist'),
    ),
    npcCharacters: normalizeSupportingCast(nextDraft.supportingCast),
    locations: persistedLocations,
    locationPatch: projectedLocationPatch,
  });
}

export function renderWorldBase(
  currentWorldBase: WorldBase,
  draft: Partial<WorldBaseCastDraft>,
): WorldBase {
  return applyWorldBaseCastDraft(currentWorldBase, draft);
}
