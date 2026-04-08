import { describe, expect, it } from 'vitest';

import { applyTextImportSeed } from '@/story-packages/import-seed';
import type { SceneSpec, WeaverImportPayload, WorldBase } from '@/types';

function createBaseWorldBase(): WorldBase {
  return {
    worldBaseSetting: 'Baseline scaffold setting.',
    worldRules: 'Baseline scaffold rules.',
    toneBaseline: 'Baseline tone.',
    hero: {
      characterId: 'chr_hero01',
      name: 'Primary Lead',
      identityRole: 'Lead perspective',
      lightNovelTrait: 'Baseline hero trait.',
      gender: 'Unspecified',
      personality: 'Adaptable',
      age: 'Unknown',
      occupation: 'Open role',
      characterSummary: 'Baseline hero summary.',
      capabilityBoundary: 'Baseline hero capability boundary.',
      behaviorBoundary: 'Baseline hero behavior boundary.',
      oocRedLine: 'Baseline hero red line.',
      clothing: 'Open',
      propsWeapon: 'Open',
    },
    coreCast: [
      {
        characterId: 'chr_core01',
        name: 'Supporting Cast',
        identityRole: 'Supporting role',
        lightNovelTrait: 'Baseline supporting cast trait.',
        gender: 'Unspecified',
        personality: 'Steady',
        age: 'Unknown',
        occupation: 'Open supporting role',
        characterSummary: 'Baseline supporting cast summary.',
        capabilityBoundary: 'Baseline supporting cast capability boundary.',
        behaviorBoundary: 'Baseline supporting cast behavior boundary.',
        oocRedLine: 'Baseline supporting cast red line.',
        clothing: 'Open',
        propsWeapon: 'Open',
      },
    ],
    antagonists: [],
    npcCharacters: 'Baseline npc notes.',
    locations: [
      {
        locationId: 'loc_a1b2c3',
        name: 'Primary Location',
        description: 'Baseline location description.',
        environmentAppearance: 'Baseline environment appearance.',
        atmosphereDescription: 'Baseline atmosphere.',
        humanContextDescription: 'Baseline human context.',
      },
    ],
    locationPatch: 'Baseline location patch.',
  };
}

function createBaseSceneSpec(): SceneSpec {
  return {
    sceneId: 'scene-baseline',
    sceneName: 'Baseline Scene',
    cast: ['chr_hero01'],
    locationIds: ['loc_a1b2c3'],
    openingSituation: 'Baseline opening situation.',
    startPoint: 'Baseline start point.',
    mainAxis: 'Baseline main axis.',
    endLine: 'Baseline end line.',
    openingHook: 'Baseline opening hook.',
    samplePurpose: 'Baseline sample purpose.',
    source: 'phase-3-scaffold',
  };
}

function createWeaverPayload(
  overrides: Partial<WeaverImportPayload> = {},
): WeaverImportPayload {
  return {
    suggestedPackageName: 'woven-package',
    sourceSummary: '外部文本来源摘要',
    importSummary: '提取了基础世界观与角色框架',
    openingHook: '模型改写后的 opening hook',
    worldBase: {
      settingSummary: '近未来沿海都市',
      worldRules: '通讯塔网络支撑城市秩序。',
      toneBaseline: '压抑而悬疑的都市气氛。',
      npcCharactersSummary: '路人与技术人员都受到网络事故影响。',
      locationPatch: '灯塔塔区与老城区需要长期拉扯。',
    },
    hero: {
      displayName: '林深',
      roleSummary: '被迫接管灯塔网络的主角',
    },
    coreCast: [
      {
        displayName: '周珂',
        roleSummary: '负责追查事故源头的记者',
      },
    ],
    antagonists: [
      {
        displayName: '祁夜',
        roleSummary: '操控网络事故的地下策划者',
      },
    ],
    npcCharacters: [
      {
        summary: '受事故波及的值班员与维修技师',
      },
    ],
    locations: [
      {
        displayName: '灯塔塔区',
        summary: '维持城市网络秩序的核心区域',
      },
    ],
    warnings: ['角色关系只得到部分文本支持'],
    unresolvedGaps: ['缺少明确的地点时间线'],
    ...overrides,
  };
}

describe('applyTextImportSeed', () => {
  it('applies validated world-base overrides while preserving sourceText as the persisted openingHook', () => {
    const result = applyTextImportSeed({
      displayName: '织入故事包',
      sourceText: '作者原始文本',
      payload: createWeaverPayload(),
      worldBase: createBaseWorldBase(),
      sceneSpec: createBaseSceneSpec(),
    });

    expect(result.worldBase.worldBaseSetting).toBe('近未来沿海都市');
    expect(result.worldBase.worldRules).toBe('通讯塔网络支撑城市秩序。');
    expect(result.worldBase.toneBaseline).toBe('压抑而悬疑的都市气氛。');
    expect(result.worldBase.hero.name).toBe('林深');
    expect(result.worldBase.hero.characterSummary).toBe('被迫接管灯塔网络的主角');
    expect(result.worldBase.coreCast).toHaveLength(1);
    expect(result.worldBase.coreCast[0]).toMatchObject({
      name: '周珂',
      characterSummary: '负责追查事故源头的记者',
    });
    expect(result.worldBase.antagonists).toHaveLength(1);
    expect(result.worldBase.antagonists[0]).toMatchObject({
      name: '祁夜',
      characterSummary: '操控网络事故的地下策划者',
      identityRole: 'Antagonist pressure',
      capabilityBoundary: 'Define antagonist capabilities during authoring.',
      behaviorBoundary: 'Define scene-specific antagonist behavior during authoring.',
    });
    expect(result.worldBase.antagonists[0]?.identityRole).not.toBe(
      result.worldBase.hero.identityRole,
    );
    expect(result.worldBase.antagonists[0]?.capabilityBoundary).not.toBe(
      result.worldBase.hero.capabilityBoundary,
    );
    expect(result.worldBase.npcCharacters).toBe('受事故波及的值班员与维修技师');
    expect(result.worldBase.locations[0]).toBeDefined();
    expect(result.worldBase.locations[0]!).toMatchObject({
      name: '灯塔塔区',
      description: '维持城市网络秩序的核心区域',
    });
    expect(result.sceneSpec.sceneName).toBe('织入故事包');
    expect(result.sceneSpec.cast).toEqual(['chr_core01', 'chr_ant01']);
    expect(result.sceneSpec.locationIds).toEqual(['loc_a1b2c3']);
    expect(result.sceneSpec.openingHook).toBe('作者原始文本');
    expect(result.diagnostics.rewrittenOpeningHook).toBe('模型改写后的 opening hook');
  });

  it('keeps scaffold defaults when the weaver payload omits optional seed details', () => {
    const baseWorldBase = createBaseWorldBase();
    const result = applyTextImportSeed({
      displayName: '保留默认值',
      sourceText: '原始文本',
      payload: createWeaverPayload({
        worldBase: {},
        hero: undefined,
        coreCast: [],
        locations: [],
      }),
      worldBase: baseWorldBase,
      sceneSpec: createBaseSceneSpec(),
    });

    expect(result.worldBase.worldBaseSetting).toBe(baseWorldBase.worldBaseSetting);
    expect(result.worldBase.hero.name).toBe(baseWorldBase.hero.name);
    expect(result.worldBase.locations[0]).toBeDefined();
    expect(result.worldBase.locations[0]!.name).toBe(baseWorldBase.locations[0]!.name);
    expect(result.sceneSpec.openingHook).toBe('原始文本');
  });

  it('uses a supporting-cast fallback for imported core cast entries beyond the preseeded slot', () => {
    const result = applyTextImportSeed({
      displayName: '扩展配角',
      sourceText: '原始文本',
      payload: createWeaverPayload({
        coreCast: [
          {
            displayName: '周珂',
            roleSummary: '负责追查事故源头的记者',
          },
          {
            displayName: '苏遥',
            roleSummary: '负责维护外环通讯的工程师',
          },
        ],
        antagonists: [],
      }),
      worldBase: createBaseWorldBase(),
      sceneSpec: createBaseSceneSpec(),
    });

    expect(result.worldBase.coreCast).toHaveLength(2);
    expect(result.worldBase.coreCast[1]).toMatchObject({
      name: '苏遥',
      characterSummary: '负责维护外环通讯的工程师',
      identityRole: 'Supporting role',
      capabilityBoundary: 'Define supporting cast capabilities during authoring.',
      behaviorBoundary: 'Define scene-specific supporting cast behavior during authoring.',
    });
    expect(result.worldBase.coreCast[1]?.identityRole).not.toBe(
      result.worldBase.hero.identityRole,
    );
    expect(result.worldBase.coreCast[1]?.capabilityBoundary).not.toBe(
      result.worldBase.hero.capabilityBoundary,
    );
    expect(result.sceneSpec.cast).toEqual(['chr_core01', 'chr_core02']);
  });
});
