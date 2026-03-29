import { generateCharacterId } from '@/lib/character-id';

type CharacterKind = 'hero' | 'core' | 'antagonist';

export interface LegacyWorldBaseLike {
  readonly mainCharacters: string;
  readonly npcCharacters?: string;
  readonly locationPatch: string;
}

export interface SceneCastLike {
  readonly cast?: readonly string[];
}

export interface WorldBaseCharacterProfile {
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

export interface StructuredWorldBase {
  readonly worldBaseSetting: string;
  readonly worldRules: string;
  readonly toneBaseline: string;
  readonly hero: WorldBaseCharacterProfile;
  readonly coreCast: readonly WorldBaseCharacterProfile[];
  readonly antagonists: readonly WorldBaseCharacterProfile[];
  readonly npcCharacters: string;
  readonly locationPatch: string;
}

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

interface CharacterDraft {
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeBlock(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function normalizeInline(value: string): string {
  return normalizeBlock(value).replace(/\n+/g, ' ');
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

function extractStructuredSection(source: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(
    new RegExp(`^## ${escapedHeading}\\s*$\\n?([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'm'),
  );

  return normalizeBlock(match?.[1] ?? '');
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

function normalizeCharacterDraft(
  character: CharacterDraft,
  kind: CharacterKind,
): CharacterDraft {
  return {
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

function toCharacterProfile(character: CharacterDraft, kind: CharacterKind): WorldBaseCharacterProfile {
  const normalizedCharacter = normalizeCharacterDraft(character, kind);

  return {
    characterId: generateCharacterId(),
    ...normalizedCharacter,
  };
}

function createEmptyCharacterDraft(kind: CharacterKind): CharacterDraft {
  return {
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

function parseStructuredCharacterSection(
  body: string,
  kind: CharacterKind,
): CharacterDraft[] {
  const normalizedBody = normalizeBlock(body);

  if (!normalizedBody) {
    return [];
  }

  const blocks = normalizedBody
    .split(/\n(?=### Character(?: \d+)?\s*$)/m)
    .map((block) => normalizeBlock(block))
    .filter((block) => block.startsWith('### Character'));

  return blocks.map((block) => {
    const values = parseStructuredFieldBlock(block.replace(/^### Character(?: \d+)?\s*/m, '').trim());

    return normalizeCharacterDraft(
      {
        ...createEmptyCharacterDraft(kind),
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
    );
  });
}

function parseLegacyCharacterBlock(
  heading: string,
  body: string,
  kind: CharacterKind,
): CharacterDraft {
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
      ...createEmptyCharacterDraft(kind),
      name,
      identityRole,
      lightNovelTrait,
      oocRedLine,
      characterSummary,
      capabilityBoundary: capabilityBoundaryLines.join('\n'),
      behaviorBoundary: behaviorBoundaryLines.join('\n'),
      ...(kind === 'antagonist' ? { fatalWeakness: fatalWeaknessLines.join('\n') } : {}),
    },
    kind,
  );
}

function parseLegacyWorldBase(worldBase: LegacyWorldBaseLike): Omit<StructuredWorldBase, 'hero' | 'coreCast' | 'antagonists'> & {
  readonly hero: CharacterDraft;
  readonly coreCast: readonly CharacterDraft[];
  readonly antagonists: readonly CharacterDraft[];
} {
  const normalizedMainCharacters = normalizeBlock(worldBase.mainCharacters);
  let hero = createEmptyCharacterDraft('hero');
  let coreCast: CharacterDraft[] = [];
  let antagonists: CharacterDraft[] = [];
  const supportingCast = normalizeBlock(worldBase.npcCharacters ?? '');
  const locationPatch = normalizeBlock(worldBase.locationPatch);

  if (!normalizedMainCharacters) {
    return {
      worldBaseSetting: '',
      worldRules: '',
      toneBaseline: '',
      hero,
      coreCast,
      antagonists,
      npcCharacters: supportingCast,
      locationPatch,
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
      npcCharacters: supportingCast,
      locationPatch,
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
    hero = parseLegacyCharacterBlock(heroSection.heading, heroSection.body, 'hero');
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
            return parseLegacyCharacterBlock(match[0] ?? '', body, 'core');
          })
        : [];
  }

  antagonists = majorSections
    .filter((section) => section.heading.includes('反派'))
    .map((section) => parseLegacyCharacterBlock(section.heading, section.body, 'antagonist'));

  return {
    worldBaseSetting: '',
    worldRules: '',
    toneBaseline: '',
    hero,
    coreCast,
    antagonists,
    npcCharacters: supportingCast,
    locationPatch,
  };
}

function hasStructuredWorldBaseSections(mainCharacters: string): boolean {
  return (
    mainCharacters.includes(`## ${STRUCTURED_WORLD_HEADINGS.hero}`) ||
    mainCharacters.includes(`## ${STRUCTURED_WORLD_HEADINGS.coreCast}`) ||
    mainCharacters.includes(`## ${STRUCTURED_WORLD_HEADINGS.antagonists}`)
  );
}

function parseStructuredWorldBase(
  worldBase: LegacyWorldBaseLike,
): Omit<StructuredWorldBase, 'hero' | 'coreCast' | 'antagonists'> & {
  readonly hero: CharacterDraft;
  readonly coreCast: readonly CharacterDraft[];
  readonly antagonists: readonly CharacterDraft[];
} {
  const normalizedMainCharacters = normalizeBlock(worldBase.mainCharacters);

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
      parseStructuredCharacterSection(
        extractStructuredSection(normalizedMainCharacters, STRUCTURED_WORLD_HEADINGS.hero),
        'hero',
      )[0] ?? createEmptyCharacterDraft('hero'),
    coreCast: parseStructuredCharacterSection(
      extractStructuredSection(normalizedMainCharacters, STRUCTURED_WORLD_HEADINGS.coreCast),
      'core',
    ),
    antagonists: parseStructuredCharacterSection(
      extractStructuredSection(normalizedMainCharacters, STRUCTURED_WORLD_HEADINGS.antagonists),
      'antagonist',
    ),
    npcCharacters: normalizeBlock(worldBase.npcCharacters ?? ''),
    locationPatch: normalizeBlock(worldBase.locationPatch),
  };
}

export function isLegacyWorldBase(value: unknown): value is LegacyWorldBaseLike {
  return isPlainObject(value) && typeof value.mainCharacters === 'string';
}

export function migrateLegacyWorldBase(worldBase: LegacyWorldBaseLike): StructuredWorldBase {
  const normalizedMainCharacters = normalizeBlock(worldBase.mainCharacters);
  const parsedWorldBase = hasStructuredWorldBaseSections(normalizedMainCharacters)
    ? parseStructuredWorldBase(worldBase)
    : parseLegacyWorldBase(worldBase);

  return {
    worldBaseSetting: parsedWorldBase.worldBaseSetting,
    worldRules: parsedWorldBase.worldRules,
    toneBaseline: parsedWorldBase.toneBaseline,
    hero: toCharacterProfile(parsedWorldBase.hero, 'hero'),
    coreCast: parsedWorldBase.coreCast.map((character) => toCharacterProfile(character, 'core')),
    antagonists: parsedWorldBase.antagonists.map((character) =>
      toCharacterProfile(character, 'antagonist'),
    ),
    npcCharacters: parsedWorldBase.npcCharacters,
    locationPatch: parsedWorldBase.locationPatch,
  };
}

export function filterWorldBaseForSceneCast(
  worldBase: StructuredWorldBase,
  sceneSpec?: SceneCastLike,
): StructuredWorldBase {
  const cast = sceneSpec?.cast;

  if (!cast) {
    return {
      ...worldBase,
      coreCast: [...worldBase.coreCast],
      antagonists: [...worldBase.antagonists],
    };
  }

  const castSet = new Set(cast);

  return {
    ...worldBase,
    coreCast: worldBase.coreCast.filter((character) => castSet.has(character.characterId)),
    antagonists: worldBase.antagonists.filter((character) => castSet.has(character.characterId)),
  };
}
