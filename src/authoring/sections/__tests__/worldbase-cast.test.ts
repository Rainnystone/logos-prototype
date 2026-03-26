import { describe, expect, it } from 'vitest';

import {
  createWorldBaseCastDraft,
  renderWorldBase,
  type WorldBaseCastDraft,
} from '@/authoring/sections/worldbase-cast';
import type { WorldBase } from '@/types';

const currentWorldBase: WorldBase = {
  mainCharacters: '现有主文本',
  npcCharacters: '现有配角',
  locationPatch: '现有地点',
};

const structuredDraft: WorldBaseCastDraft = {
  worldBaseSetting: '世界基础设定',
  worldRules: '不允许公开的超自然力量。',
  toneBaseline: '冷静、压迫、克制。',
  hero: {
    draftId: 'hero-1',
    name: 'Hero One',
    identityRole: 'Lead breaker',
    lightNovelTrait: 'Silent pressure',
    gender: 'Female',
    personality: 'Cold',
    age: '17',
    occupation: 'Student',
    characterSummary: 'Keeps moving toward the threat.',
    capabilityBoundary: 'No magic, only physical action.',
    behaviorBoundary: 'Never abandons the trace.',
    oocRedLine: 'No speeches.',
    clothing: 'School uniform',
    propsWeapon: 'Ceramic blade',
  },
  coreCast: [
    {
      draftId: 'core-1',
      name: 'Core One',
      identityRole: 'Anchor',
      lightNovelTrait: 'Soft contrast',
      gender: 'Female',
      personality: 'Gentle',
      age: '17',
      occupation: 'Student',
      characterSummary: 'Keeps the ordinary layer intact.',
      capabilityBoundary: '',
      behaviorBoundary: 'Must stay out of direct danger.',
      oocRedLine: 'Never notices the anomaly.',
      clothing: '',
      propsWeapon: '',
    },
  ],
  antagonists: [
    {
      draftId: 'antagonist-1',
      name: 'Villain One',
      identityRole: 'Threat',
      lightNovelTrait: 'Showman',
      gender: 'Male',
      personality: 'Chaotic',
      age: '19',
      occupation: 'Streamer',
      characterSummary: 'Turns attention into pressure.',
      capabilityBoundary: 'Requires attention to trigger.',
      behaviorBoundary: 'Always performs for an audience.',
      oocRedLine: 'Cannot become quiet and efficient.',
      clothing: '',
      propsWeapon: '',
      fatalWeakness: 'Loses power when attention drops to zero.',
    },
  ],
  supportingCast: 'Support One：Steady witness\n- Support Two：Sharp clue finder',
  locationPool: 'Main corridor\nSignal room',
};

describe('renderWorldBase', () => {
  it('creates a structured draft from legacy runtime strings', () => {
    const draft = createWorldBaseCastDraft({
      mainCharacters: `# Characters

## 1. 玩家角色：Hero One

**【身份定位】** Lead breaker
**【轻小说特质】** Silent pressure

- **能力边界**：
  - No magic, only physical action.
- **行为边界**：
  - Never abandons the trace.
  - **OOC 红线**：No speeches.

## 2. 关键角色与机制

### A. Core One

**【身份定位】** Anchor

- **行为边界**：
  - Must stay out of direct danger.
  - **OOC 红线**：Never notices the anomaly.

## 3. 核心反派：Villain One

**【身份定位】** Threat

- **行为边界**：
  - Always performs for an audience.
  - **OOC 红线**：Cannot become quiet and efficient.
- **致命弱点**：
  - Loses power when attention drops to zero.`,
      npcCharacters: 'Support One：Steady witness',
      locationPatch: 'Signal room',
    });

    expect(draft.hero.name).toBe('Hero One');
    expect(draft.hero.identityRole).toBe('Lead breaker');
    expect(draft.coreCast).toHaveLength(1);
    expect(draft.coreCast[0]?.name).toBe('Core One');
    expect(draft.antagonists).toHaveLength(1);
    expect(draft.antagonists[0]?.fatalWeakness).toContain('attention drops to zero');
    expect(draft.supportingCast).toBe('Support One：Steady witness');
    expect(draft.locationPool).toBe('Signal room');
  });

  it('cleans legacy sample headings into short summary-card names', () => {
    const draft = createWorldBaseCastDraft({
      mainCharacters: `# Characters

## 1. 玩家角色：雾间凪 (Nagi Kirima)

**【身份定位】** 主角

## 2. 关键角色与机制：宫下藤花 / 不吉波普

### A. 宫下藤花 (Touka Miyashita) - 表人格

**【身份定位】** 锚点

### B. 不吉波普 (Boogiepop) - 里人格

**【身份定位】** 兜底机制

## 3. 核心反派：灰谷烈 (Retsu Haiya)

**【身份定位】** 反派`,
      npcCharacters: '竹田启司：稳重的男友',
      locationPatch: '旧校舍机房',
    });

    expect(draft.hero.name).toBe('雾间凪');
    expect(draft.coreCast.map((character) => character.name)).toEqual([
      '宫下藤花',
      '不吉波普',
    ]);
    expect(draft.antagonists.map((character) => character.name)).toEqual(['灰谷烈']);
  });

  it('keeps the trailing antagonists section when parsing structured runtime strings', () => {
    const draft = createWorldBaseCastDraft({
      mainCharacters: `## Hero
### Character 1
Name: Hero One

## Core Cast
### Character 1
Name: Core One

## Antagonists
### Character 1
Name: Villain One`,
      npcCharacters: '',
      locationPatch: '',
    });

    expect(draft.coreCast.map((character) => character.name)).toEqual(['Core One']);
    expect(draft.antagonists.map((character) => character.name)).toEqual(['Villain One']);
  });

  it('keeps the trailing core-cast section when structured content has no antagonists yet', () => {
    const draft = createWorldBaseCastDraft({
      mainCharacters: `## Hero
### Character 1
Name: Hero One

## Core Cast
### Character 1
Name: Core One`,
      npcCharacters: '',
      locationPatch: '',
    });

    expect(draft.coreCast.map((character) => character.name)).toEqual(['Core One']);
    expect(draft.antagonists).toEqual([]);
  });

  it('renders structured worldbase data into stable runtime blocks', () => {
    const output = renderWorldBase(currentWorldBase, structuredDraft);

    expect(output.mainCharacters).toContain('## World Base Setting');
    expect(output.mainCharacters).toContain('## Hero');
    expect(output.mainCharacters).toContain('Name: Hero One');
    expect(output.mainCharacters).toContain('## Core Cast');
    expect(output.mainCharacters).toContain('## Antagonists');
    expect(output.mainCharacters).toContain('Fatal Weakness:');
    expect(output.npcCharacters).toBe('Support One：Steady witness\nSupport Two：Sharp clue finder');
    expect(output.locationPatch).toBe('Main corridor\nSignal room');
  });

  it('keeps ambiguous supporting cast text as a grouped fallback block', () => {
    const output = renderWorldBase(currentWorldBase, {
      ...structuredDraft,
      supportingCast: '今天的走廊里有几位没有明确姓名的学生',
    });

    expect(output.npcCharacters).toBe('今天的走廊里有几位没有明确姓名的学生');
  });
});
