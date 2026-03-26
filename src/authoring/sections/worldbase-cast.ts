import type { WorldBase } from '@/types';

type CharacterKind = 'hero' | 'core' | 'antagonist';

interface CharacterFieldDefinition {
  readonly key:
    | 'name'
    | 'identityRole'
    | 'lightNovelTrait'
    | 'gender'
    | 'personality'
    | 'age'
    | 'occupation'
    | 'characterSummary'
    | 'capabilityBoundary'
    | 'behaviorBoundary'
    | 'oocRedLine'
    | 'clothing'
    | 'propsWeapon'
    | 'fatalWeakness';
  readonly label: string;
}

const CHARACTER_FIELD_DEFINITIONS: readonly CharacterFieldDefinition[] = [
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

const STRUCTURED_WORLD_HEADINGS = {
  worldBaseSetting: 'World Base Setting',
  worldRules: 'World Rules / Prohibitions / Anomalous Properties',
  toneBaseline: 'Genre Tone & Prose Baseline',
  hero: 'Hero',
  coreCast: 'Core Cast',
  antagonists: 'Antagonists',
} as const;

export interface WorldBaseCharacterDraft {
  readonly draftId: string;
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

export function createEmptyWorldBaseCharacterDraft(
  kind: CharacterKind,
  index: number,
): WorldBaseCharacterDraft {
  return {
    draftId: createCharacterDraftId(kind, index),
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

function normalizeCharacterDraft(
  character: WorldBaseCharacterDraft,
  kind: CharacterKind,
  index: number,
): WorldBaseCharacterDraft {
  return {
    ...character,
    draftId: normalizeInline(character.draftId) || createCharacterDraftId(kind, index),
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

function parseStructuredFieldBlock(block: string): Record<string, string> {
  const lines = normalizeBlock(block).split('\n');
  const values = new Map<string, string>();
  const fieldEntries = CHARACTER_FIELD_DEFINITIONS.map((field) => ({
    key: field.key,
    label: `${field.label}:`,
  }));

  let currentKey: string | null = null;
  let currentBuffer: string[] = [];

  function flushCurrentField(): void {
    if (!currentKey) {
      return;
    }

    values.set(currentKey, normalizeBlock(currentBuffer.join('\n')));
    currentKey = null;
    currentBuffer = [];
  }

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();

    if (trimmedLine.length === 0) {
      if (currentKey) {
        currentBuffer.push('');
      }
      continue;
    }

    const matchedEntry = fieldEntries.find((entry) => trimmedLine.startsWith(entry.label));
    if (matchedEntry) {
      flushCurrentField();
      const remainder = trimmedLine.slice(matchedEntry.label.length).trim();
      if (remainder.length > 0) {
        values.set(matchedEntry.key, remainder);
        currentKey = null;
        currentBuffer = [];
      } else {
        currentKey = matchedEntry.key;
      }
      continue;
    }

    if (currentKey) {
      currentBuffer.push(rawLine);
    }
  }

  flushCurrentField();

  return Object.fromEntries(values.entries());
}

function parseStructuredCharacterSection(
  body: string,
  kind: CharacterKind,
): WorldBaseCharacterDraft[] {
  const normalizedBody = normalizeBlock(body);
  if (!normalizedBody) {
    return [];
  }

  const blocks = normalizedBody
    .split(/\n(?=### Character(?: \d+)?\s*$)/m)
    .map((block) => normalizeBlock(block))
    .filter((block) => block.startsWith('### Character'));

  return blocks.map((block, index) => {
    const values = parseStructuredFieldBlock(block.replace(/^### Character(?: \d+)?\s*/m, '').trim());

    return normalizeCharacterDraft(
      {
        draftId: createCharacterDraftId(kind, index + 1),
        name: values.name ?? '',
        identityRole: values.identityRole ?? '',
        lightNovelTrait: values.lightNovelTrait ?? '',
        gender: values.gender ?? '',
        personality: values.personality ?? '',
        age: values.age ?? '',
        occupation: values.occupation ?? '',
        characterSummary: values.characterSummary ?? '',
        capabilityBoundary: values.capabilityBoundary ?? '',
        behaviorBoundary: values.behaviorBoundary ?? '',
        oocRedLine: values.oocRedLine ?? '',
        clothing: values.clothing ?? '',
        propsWeapon: values.propsWeapon ?? '',
        ...(kind === 'antagonist' ? { fatalWeakness: values.fatalWeakness ?? '' } : {}),
      },
      kind,
      index + 1,
    );
  });
}

function extractStructuredSection(source: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(
    new RegExp(`^## ${escapedHeading}\\s*$\\n?([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'm'),
  );

  return normalizeBlock(match?.[1] ?? '');
}

function stripFormatting(value: string): string {
  return value
    .replace(/^\s*[-*•]+\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/, '')
    .trim();
}

function extractHeadingName(heading: string): string {
  const normalizedHeading = stripFormatting(heading)
    .replace(/^\d+\.\s*/, '')
    .replace(/^[A-Z]\.\s*/, '');

  const markerIndex =
    normalizedHeading.lastIndexOf('：') >= 0
      ? normalizedHeading.lastIndexOf('：')
      : normalizedHeading.lastIndexOf(':');

  const namedHeading =
    markerIndex >= 0 ? normalizedHeading.slice(markerIndex + 1).trim() : normalizedHeading;

  return namedHeading
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*[-–—]\s*.+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLegacyCharacterBlock(
  heading: string,
  body: string,
  kind: CharacterKind,
  index: number,
): WorldBaseCharacterDraft {
  const lines = normalizeBlock(body).split('\n');
  const capabilityBoundaryLines: string[] = [];
  const behaviorBoundaryLines: string[] = [];
  const fatalWeaknessLines: string[] = [];
  let currentSection: 'capability' | 'behavior' | 'fatalWeakness' | null = null;
  const name = extractHeadingName(heading);
  let identityRole = '';
  let lightNovelTrait = '';
  let oocRedLine = '';
  let characterSummary = '';

  for (const rawLine of lines) {
    const cleanedLine = stripFormatting(rawLine);

    if (!cleanedLine) {
      if (currentSection === 'capability') {
        capabilityBoundaryLines.push('');
      } else if (currentSection === 'behavior') {
        behaviorBoundaryLines.push('');
      } else if (currentSection === 'fatalWeakness') {
        fatalWeaknessLines.push('');
      }
      continue;
    }

    if (cleanedLine.includes('【身份定位】')) {
      identityRole = normalizeBlock(cleanedLine.split('】').slice(1).join('】'));
      continue;
    }

    if (cleanedLine.includes('【轻小说特质】')) {
      lightNovelTrait = normalizeBlock(cleanedLine.split('】').slice(1).join('】'));
      continue;
    }

    if (cleanedLine.includes('OOC 红线')) {
      const markerIndex = cleanedLine.includes('：')
        ? cleanedLine.indexOf('：')
        : cleanedLine.indexOf(':');
      oocRedLine = markerIndex >= 0 ? normalizeBlock(cleanedLine.slice(markerIndex + 1)) : cleanedLine;
      if (currentSection === 'behavior') {
        behaviorBoundaryLines.push(cleanedLine);
      }
      continue;
    }

    if (cleanedLine.includes('能力边界')) {
      currentSection = 'capability';
      continue;
    }

    if (
      cleanedLine.includes('行为边界') ||
      cleanedLine.includes('行为与遭遇边界') ||
      cleanedLine.includes('行动与性格边界')
    ) {
      currentSection = 'behavior';
      continue;
    }

    if (cleanedLine.includes('致命弱点')) {
      currentSection = 'fatalWeakness';
      continue;
    }

    if (currentSection === 'capability') {
      capabilityBoundaryLines.push(cleanedLine);
      continue;
    }

    if (currentSection === 'behavior') {
      behaviorBoundaryLines.push(cleanedLine);
      continue;
    }

    if (currentSection === 'fatalWeakness') {
      fatalWeaknessLines.push(cleanedLine);
      continue;
    }

    if (!characterSummary) {
      characterSummary = cleanedLine;
    } else {
      characterSummary = `${characterSummary}\n${cleanedLine}`;
    }
  }

  return normalizeCharacterDraft(
    {
      ...createEmptyWorldBaseCharacterDraft(kind, index),
      name,
      identityRole,
      lightNovelTrait,
      oocRedLine,
      characterSummary,
      capabilityBoundary: capabilityBoundaryLines.join('\n'),
      behaviorBoundary: behaviorBoundaryLines.join('\n'),
      ...(kind === 'antagonist'
        ? { fatalWeakness: fatalWeaknessLines.join('\n') }
        : {}),
    },
    kind,
    index,
  );
}

function parseLegacyWorldBase(worldBase: WorldBase): WorldBaseCastDraft {
  const normalizedMainCharacters = normalizeBlock(worldBase.mainCharacters);
  let hero = createEmptyWorldBaseCharacterDraft('hero', 1);
  let coreCast: WorldBaseCharacterDraft[] = [];
  let antagonists: WorldBaseCharacterDraft[] = [];
  const supportingCast = normalizeBlock(worldBase.npcCharacters);
  const locationPool = normalizeBlock(worldBase.locationPatch);

  if (!normalizedMainCharacters) {
    return {
      worldBaseSetting: '',
      worldRules: '',
      toneBaseline: '',
      hero,
      coreCast,
      antagonists,
      supportingCast,
      locationPool,
    };
  }

  const majorSectionMatches = Array.from(normalizedMainCharacters.matchAll(/^##\s+[^\n]+$/gm));

  if (majorSectionMatches.length === 0) {
    return {
      worldBaseSetting: normalizedMainCharacters,
      worldRules: '',
      toneBaseline: '',
      hero,
      coreCast,
      antagonists,
      supportingCast,
      locationPool,
    };
  }

  const majorSections = majorSectionMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = majorSectionMatches[index + 1]?.index ?? normalizedMainCharacters.length;
    return {
      heading: match[0] ?? '',
      body: normalizedMainCharacters.slice(start + (match[0]?.length ?? 0), end).trim(),
    };
  });

  const heroSection = majorSections.find((section) => section.heading.includes('玩家角色'));
  if (heroSection) {
    hero = parseLegacyCharacterBlock(heroSection.heading, heroSection.body, 'hero', 1);
  }

  const coreSection = majorSections.find((section) => section.heading.includes('关键角色'));
  if (coreSection) {
    const subSectionMatches = Array.from(coreSection.body.matchAll(/^###\s+[^\n]+$/gm));
    coreCast =
      subSectionMatches.length > 0
        ? subSectionMatches.map((match, index) => {
            const start = match.index ?? 0;
            const end = subSectionMatches[index + 1]?.index ?? coreSection.body.length;
            const body = coreSection.body.slice(start + (match[0]?.length ?? 0), end).trim();
            return parseLegacyCharacterBlock(match[0] ?? '', body, 'core', index + 1);
          })
        : [];
  }

  const antagonistSections = majorSections.filter((section) => section.heading.includes('反派'));
  antagonists = antagonistSections.map((section, index) =>
    parseLegacyCharacterBlock(section.heading, section.body, 'antagonist', index + 1),
  );

  return {
    worldBaseSetting: '',
    worldRules: '',
    toneBaseline: '',
    hero,
    coreCast,
    antagonists,
    supportingCast,
    locationPool,
  };
}

export function createWorldBaseCastDraft(worldBase: WorldBase): WorldBaseCastDraft {
  const normalizedMainCharacters = normalizeBlock(worldBase.mainCharacters);

  const hasStructuredSections =
    normalizedMainCharacters.includes(`## ${STRUCTURED_WORLD_HEADINGS.hero}`) ||
    normalizedMainCharacters.includes(`## ${STRUCTURED_WORLD_HEADINGS.coreCast}`) ||
    normalizedMainCharacters.includes(`## ${STRUCTURED_WORLD_HEADINGS.antagonists}`);

  if (!hasStructuredSections) {
    return parseLegacyWorldBase(worldBase);
  }

  const heroSection = extractStructuredSection(normalizedMainCharacters, STRUCTURED_WORLD_HEADINGS.hero);
  const coreSection = extractStructuredSection(normalizedMainCharacters, STRUCTURED_WORLD_HEADINGS.coreCast);
  const antagonistSection = extractStructuredSection(
    normalizedMainCharacters,
    STRUCTURED_WORLD_HEADINGS.antagonists,
  );

  return {
    worldBaseSetting: extractStructuredSection(
      normalizedMainCharacters,
      STRUCTURED_WORLD_HEADINGS.worldBaseSetting,
    ),
    worldRules: extractStructuredSection(normalizedMainCharacters, STRUCTURED_WORLD_HEADINGS.worldRules),
    toneBaseline: extractStructuredSection(
      normalizedMainCharacters,
      STRUCTURED_WORLD_HEADINGS.toneBaseline,
    ),
    hero:
      parseStructuredCharacterSection(heroSection, 'hero')[0] ??
      createEmptyWorldBaseCharacterDraft('hero', 1),
    coreCast: parseStructuredCharacterSection(coreSection, 'core'),
    antagonists: parseStructuredCharacterSection(antagonistSection, 'antagonist'),
    supportingCast: normalizeBlock(worldBase.npcCharacters),
    locationPool: normalizeBlock(worldBase.locationPatch),
  };
}

function renderSupportingCastEntry(line: string): string | null {
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

export function renderSupportingCast(input: string): string {
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

  return [`${label}:`, ...lines];
}

function renderCharacterBlock(
  character: WorldBaseCharacterDraft,
  index: number,
  kind: CharacterKind,
): string {
  const normalizedCharacter = normalizeCharacterDraft(character, kind, index);
  const lines: string[] = [`### Character ${index}`];

  for (const field of CHARACTER_FIELD_DEFINITIONS) {
    if (field.key === 'fatalWeakness' && kind !== 'antagonist') {
      continue;
    }

    const value =
      field.key === 'fatalWeakness'
        ? normalizedCharacter.fatalWeakness ?? ''
        : normalizedCharacter[field.key];

    lines.push(...renderFieldLines(field.label, value ?? ''));
  }

  return lines.join('\n');
}

function renderWorldHeaderBlocks(draft: WorldBaseCastDraft): string[] {
  const sections: Array<[string, string]> = [
    [STRUCTURED_WORLD_HEADINGS.worldBaseSetting, draft.worldBaseSetting],
    [STRUCTURED_WORLD_HEADINGS.worldRules, draft.worldRules],
    [STRUCTURED_WORLD_HEADINGS.toneBaseline, draft.toneBaseline],
  ];

  return sections
    .map(([heading, value]) => {
      const normalizedValue = normalizeBlock(value);
      if (!normalizedValue) {
        return null;
      }

      return `## ${heading}\n${normalizedValue}`;
    })
    .filter((value): value is string => value !== null);
}

function renderCharacterGroup(
  heading: string,
  characters: readonly WorldBaseCharacterDraft[],
  kind: CharacterKind,
): string | null {
  const normalizedCharacters = characters
    .map((character, index) => normalizeCharacterDraft(character, kind, index + 1))
    .filter((character) => {
      return CHARACTER_FIELD_DEFINITIONS.some((field) => {
        if (field.key === 'fatalWeakness' && kind !== 'antagonist') {
          return false;
        }

        const value =
          field.key === 'fatalWeakness' ? character.fatalWeakness ?? '' : character[field.key];
        return normalizeBlock(value ?? '').length > 0;
      });
    });

  if (normalizedCharacters.length === 0) {
    return null;
  }

  const blocks = normalizedCharacters.map((character, index) =>
    renderCharacterBlock(character, index + 1, kind),
  );

  return `## ${heading}\n${blocks.join('\n\n')}`;
}

export function renderWorldBase(
  currentWorldBase: WorldBase,
  draft: Partial<WorldBaseCastDraft>,
): WorldBase {
  const baseDraft = createWorldBaseCastDraft(currentWorldBase);
  const nextDraft: WorldBaseCastDraft = {
    ...baseDraft,
    ...draft,
    hero: normalizeCharacterDraft(draft.hero ?? baseDraft.hero, 'hero', 1),
    coreCast: (draft.coreCast ?? baseDraft.coreCast).map((character, index) =>
      normalizeCharacterDraft(character, 'core', index + 1),
    ),
    antagonists: (draft.antagonists ?? baseDraft.antagonists).map((character, index) =>
      normalizeCharacterDraft(character, 'antagonist', index + 1),
    ),
    supportingCast: normalizeBlock(draft.supportingCast ?? baseDraft.supportingCast),
    locationPool: normalizeBlock(draft.locationPool ?? baseDraft.locationPool),
  };

  const renderedMainCharacters = [
    ...renderWorldHeaderBlocks(nextDraft),
    renderCharacterGroup(STRUCTURED_WORLD_HEADINGS.hero, [nextDraft.hero], 'hero'),
    renderCharacterGroup(STRUCTURED_WORLD_HEADINGS.coreCast, nextDraft.coreCast, 'core'),
    renderCharacterGroup(
      STRUCTURED_WORLD_HEADINGS.antagonists,
      nextDraft.antagonists,
      'antagonist',
    ),
  ]
    .filter((value): value is string => Boolean(value && normalizeBlock(value)))
    .join('\n\n');

  return {
    ...currentWorldBase,
    mainCharacters: normalizeBlock(renderedMainCharacters),
    npcCharacters: renderSupportingCast(nextDraft.supportingCast),
    locationPatch: normalizeBlock(nextDraft.locationPool),
  };
}
