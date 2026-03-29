import type { CharacterProfile, PromptWorldBase, WorldBase } from '@/types';

const STRUCTURED_WORLD_HEADINGS = {
  worldBaseSetting: 'World Base Setting',
  worldRules: 'World Rules / Prohibitions / Anomalous Properties',
  toneBaseline: 'Genre Tone & Prose Baseline',
  hero: 'Hero',
  coreCast: 'Core Cast',
  antagonists: 'Antagonists',
} as const;

const CHARACTER_FIELD_DEFINITIONS = [
  { key: 'name', label: 'Name' },
  { key: 'identityRole', label: 'Identity / Narrative Role' },
  { key: 'lightNovelTrait', label: 'Light-Novel Trait' },
  { key: 'gender', label: 'Gender' },
  { key: 'personality', label: 'Personality' },
  { key: 'age', label: 'Age' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'characterSummary', label: 'Character Summary' },
  { key: 'capabilityBoundary', label: 'Capability Boundary' },
  { key: 'behaviorBoundary', label: 'Behavior Boundary' },
  { key: 'oocRedLine', label: 'OOC Red Line' },
  { key: 'clothing', label: 'Clothing' },
  { key: 'propsWeapon', label: 'Props / Weapon' },
  { key: 'fatalWeakness', label: 'Fatal Weakness' },
] as const;

type CharacterKind = 'hero' | 'core' | 'antagonist';

function normalizeBlock(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function renderSupportingCastEntry(line: string): string | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(.+?)\s*[-:：]\s*(.+)$/);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return `${match[1].trim()}：${match[2].trim()}`;
}

function renderSupportingCast(input: string): string {
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
    const renderedEntry = renderSupportingCastEntry(line);

    if (!renderedEntry) {
      return normalized;
    }

    renderedEntries.push(renderedEntry);
  }

  return renderedEntries.join('\n');
}

function renderFieldLines(label: string, value: string): string[] {
  const normalizedValue = normalizeBlock(value);

  if (!normalizedValue) {
    return [];
  }

  const lines = normalizedValue.split('\n');

  if (lines.length === 1) {
    return [`${label}: ${lines[0]}`];
  }

  return [`${label}:`, ...lines.map((line) => `  ${line}`)];
}

function hasRenderableCharacterData(character: CharacterProfile, kind: CharacterKind): boolean {
  return CHARACTER_FIELD_DEFINITIONS.some((field) => {
    if (field.key === 'fatalWeakness' && kind !== 'antagonist') {
      return false;
    }

    const value =
      field.key === 'fatalWeakness'
        ? character.fatalWeakness ?? ''
        : character[field.key as keyof CharacterProfile];

    return typeof value === 'string' && normalizeBlock(value).length > 0;
  });
}

function renderCharacterBlock(
  character: CharacterProfile,
  index: number,
  kind: CharacterKind,
): string {
  const lines: string[] = [`### Character ${index}`];

  for (const field of CHARACTER_FIELD_DEFINITIONS) {
    if (field.key === 'fatalWeakness' && kind !== 'antagonist') {
      continue;
    }

    const value =
      field.key === 'fatalWeakness'
        ? character.fatalWeakness ?? ''
        : character[field.key as keyof CharacterProfile];

    if (typeof value === 'string') {
      lines.push(...renderFieldLines(field.label, value));
    }
  }

  return lines.join('\n');
}

function renderWorldHeaderBlocks(worldBase: WorldBase): string[] {
  const sections: Array<[string, string]> = [
    [STRUCTURED_WORLD_HEADINGS.worldBaseSetting, worldBase.worldBaseSetting],
    [STRUCTURED_WORLD_HEADINGS.worldRules, worldBase.worldRules],
    [STRUCTURED_WORLD_HEADINGS.toneBaseline, worldBase.toneBaseline],
  ];

  return sections
    .map(([heading, value]) => {
      const normalizedValue = normalizeBlock(value);
      return normalizedValue ? `## ${heading}\n${normalizedValue}` : null;
    })
    .filter((value): value is string => value !== null);
}

function renderCharacterGroup(
  heading: string,
  characters: readonly CharacterProfile[],
  kind: CharacterKind,
): string | null {
  const renderableCharacters = characters.filter((character) =>
    hasRenderableCharacterData(character, kind),
  );

  if (renderableCharacters.length === 0) {
    return null;
  }

  const blocks = renderableCharacters.map((character, index) =>
    renderCharacterBlock(character, index + 1, kind),
  );

  return `## ${heading}\n${blocks.join('\n\n')}`;
}

export function renderCharacterProfileForOOC(worldBase: WorldBase): string {
  if (!hasRenderableCharacterData(worldBase.hero, 'hero')) {
    return '';
  }

  return renderCharacterBlock(worldBase.hero, 1, 'hero');
}

export function renderWorldBaseForPrompt(worldBase: WorldBase): PromptWorldBase {
  const mainCharacters = [
    ...renderWorldHeaderBlocks(worldBase),
    renderCharacterGroup(STRUCTURED_WORLD_HEADINGS.hero, [worldBase.hero], 'hero'),
    renderCharacterGroup(STRUCTURED_WORLD_HEADINGS.coreCast, worldBase.coreCast, 'core'),
    renderCharacterGroup(STRUCTURED_WORLD_HEADINGS.antagonists, worldBase.antagonists, 'antagonist'),
  ]
    .filter((value): value is string => Boolean(value && normalizeBlock(value)))
    .join('\n\n');

  return {
    mainCharacters: normalizeBlock(mainCharacters),
    npcCharacters: renderSupportingCast(worldBase.npcCharacters),
    locationPatch: normalizeBlock(worldBase.locationPatch),
  };
}
