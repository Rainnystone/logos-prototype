import type { WorldBase } from '@/types';

type SceneCastLibrary = Pick<WorldBase, 'hero' | 'coreCast' | 'antagonists'>;

export function getSceneCastSelectableIds(worldBase: SceneCastLibrary): string[] {
  const selectableIds: string[] = [];
  const seenIds = new Set<string>();

  for (const character of [...worldBase.coreCast, ...worldBase.antagonists]) {
    const characterId = character.characterId;

    if (
      characterId === worldBase.hero.characterId ||
      seenIds.has(characterId)
    ) {
      continue;
    }

    seenIds.add(characterId);
    selectableIds.push(characterId);
  }

  return selectableIds;
}

export function normalizeSceneCastSelection(
  worldBase: SceneCastLibrary,
  selection: readonly unknown[] | undefined,
): { cast: string[]; staleIds: string[] } {
  if (!Array.isArray(selection) || selection.length === 0) {
    return {
      cast: [],
      staleIds: [],
    };
  }

  const selectableIds = getSceneCastSelectableIds(worldBase);
  const selectableIdSet = new Set(selectableIds);
  const requestedIds = selection.filter((value): value is string => typeof value === 'string');
  const staleIds = requestedIds.filter(
    (characterId) => !selectableIdSet.has(characterId) && characterId !== worldBase.hero.characterId,
  );
  const requestedIdSet = new Set(requestedIds.filter((characterId) => selectableIdSet.has(characterId)));

  return {
    cast: selectableIds.filter((characterId) => requestedIdSet.has(characterId)),
    staleIds: [...new Set(staleIds)],
  };
}
