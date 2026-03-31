type CharacterContentLike = {
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
  readonly fatalWeakness?: string | undefined;
};

type WorldBaseCastListsLike<TCharacter extends CharacterContentLike> = {
  readonly coreCast: readonly TCharacter[];
  readonly antagonists: readonly TCharacter[];
};

const CHARACTER_CONTENT_FIELDS = [
  'name',
  'identityRole',
  'lightNovelTrait',
  'gender',
  'personality',
  'age',
  'occupation',
  'characterSummary',
  'capabilityBoundary',
  'behaviorBoundary',
  'oocRedLine',
  'clothing',
  'propsWeapon',
  'fatalWeakness',
] as const;

export function hasAnyCharacterContent(character: CharacterContentLike): boolean {
  return CHARACTER_CONTENT_FIELDS.some((field) => {
    const value = character[field];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function compactWorldBaseCastLists<
  TCharacter extends CharacterContentLike,
  TWorldBase extends WorldBaseCastListsLike<TCharacter>,
>(worldBase: TWorldBase): TWorldBase {
  return {
    ...worldBase,
    coreCast: worldBase.coreCast.filter((character) => hasAnyCharacterContent(character)),
    antagonists: worldBase.antagonists.filter((character) => hasAnyCharacterContent(character)),
  } as TWorldBase;
}
