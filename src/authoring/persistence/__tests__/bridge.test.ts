import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveSectionDraft } from '@/authoring/persistence/bridge';
import { loadAuthoringState } from '@/authoring/persistence/package-state';
import * as authoringStatus from '@/authoring/persistence/authoring-status';
import * as reloadModule from '@/authoring/persistence/reload';
import * as repositoryModule from '@/authoring/persistence/repository';
import { createWorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';
import { loadStoryPackage } from '@/engine/story-loader';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const sourcePackageName = 'sample-scene';
const testPackageName = '__authoring-bridge-test__';
const testPackagePath = path.resolve(storyPackagesRoot, testPackageName);
const baselineWorldBasePath = path.resolve(testPackagePath, 'world-base.yaml');
const variantRootPath = path.resolve(testPackagePath, 'variants/variant_main');
const variantWorldBasePath = path.resolve(variantRootPath, 'world-base.yaml');
const authoringStatusPath = path.resolve(testPackagePath, 'authoring-state.json');
const storylineRepositoryPath = path.resolve(testPackagePath, 'storyline-repository.json');
const sourceWorldBaseFixture = YAML.parse(
  readFileSync(path.resolve(storyPackagesRoot, sourcePackageName, 'world-base.yaml'), 'utf8'),
) as {
  locations?: Array<{
    locationId: string;
    name: string;
    description: string;
    environmentAppearance?: string;
    atmosphereDescription?: string;
    humanContextDescription?: string;
  }>;
  locationPatch?: string;
};

function resetTestPackage(): void {
  rmSync(testPackagePath, { recursive: true, force: true });
}

function prepareTestPackage(): void {
  resetTestPackage();
  cpSync(path.resolve(storyPackagesRoot, sourcePackageName), testPackagePath, {
    recursive: true,
  });
  rmSync(authoringStatusPath, { force: true });
}

afterEach(() => {
  vi.restoreAllMocks();
  resetTestPackage();
});

function buildWorldBaseDraft(heroName: string) {
  return {
    worldBaseSetting: 'World base',
    worldRules: 'No open magic',
    toneBaseline: 'Cold pressure',
    hero: {
      draftId: 'hero-1',
      characterId: 'chr_hero01',
      name: heroName,
      identityRole: 'Lead breaker',
      lightNovelTrait: 'Silent pressure',
      gender: 'Female',
      personality: 'Cold',
      age: '17',
      occupation: 'Student',
      characterSummary: 'Moves toward the threat.',
      capabilityBoundary: 'No magic.',
      behaviorBoundary: 'Never abandons the trace.',
      oocRedLine: 'No speeches.',
      clothing: 'Uniform',
      propsWeapon: 'Ceramic blade',
    },
    coreCast: [],
    antagonists: [],
    supportingCast: 'Support One：Steady witness',
    locations: (sourceWorldBaseFixture.locations ?? []).map((location) => ({
      draftId: location.locationId,
      locationId: location.locationId,
      name: location.name,
      description: location.description,
      environmentAppearance: location.environmentAppearance ?? '',
      atmosphereDescription: location.atmosphereDescription ?? '',
      humanContextDescription: location.humanContextDescription ?? '',
    })),
    locationPool: sourceWorldBaseFixture.locationPatch ?? '',
  };
}

function resolveAuthoredFilePath(fileName: string): string {
  const variantPath = path.resolve(variantRootPath, fileName);
  if (existsSync(variantPath)) {
    return variantPath;
  }
  return path.resolve(testPackagePath, fileName);
}

function readAuthoredFile(fileName: string): string {
  return readFileSync(resolveAuthoredFilePath(fileName), 'utf8');
}

function readSavedWorldBase() {
  return YAML.parse(readAuthoredFile('world-base.yaml')) as {
    worldBaseSetting: string;
    worldRules: string;
    toneBaseline: string;
    hero: {
      characterId: string;
      name: string;
      gender?: string;
    };
    coreCast: Array<{
      characterId: string;
      name: string;
      gender?: string;
    }>;
    antagonists: Array<{
      characterId: string;
      name: string;
      gender?: string;
      fatalWeakness?: string;
    }>;
    npcCharacters: string;
    locations?: Array<{
      locationId: string;
      name: string;
      description: string;
    }>;
    locationPatch: string;
  };
}

async function loadSavedAuthoringPackage() {
  const result = await loadAuthoringState(testPackageName);
  return result.state;
}

function buildPageStyleSaveRequest(heroName: string) {
  return {
    requestId: 'request-page',
    source: 'page' as const,
    packageName: testPackageName,
    sectionId: 'worldbase-cast' as const,
    payload: {
      uiFields: buildWorldBaseDraft(heroName),
    },
  };
}

function buildCoordinatorStyleSaveRequest(heroName: string) {
  return {
    requestId: 'request-coordinator',
    source: 'coordinator' as const,
    packageName: testPackageName,
    sectionId: 'worldbase-cast' as const,
    payload: {
      uiFields: buildWorldBaseDraft(heroName),
    },
  };
}

describe('saveSectionDraft', () => {
  it('routes page-style and coordinator-style adapters through one deterministic bridge', async () => {
    prepareTestPackage();
    const originalWorldBaseContents = readAuthoredFile('world-base.yaml');

    const pageStyleSave = (heroName: string) => saveSectionDraft(buildPageStyleSaveRequest(heroName));
    const coordinatorStyleSave = (heroName: string) =>
      saveSectionDraft(buildCoordinatorStyleSaveRequest(heroName));

    const pageResult = await pageStyleSave('page-main-character-update');

    const pageWorldBaseContents = readAuthoredFile('world-base.yaml');
    const pageStoryPackage = await loadSavedAuthoringPackage();

    const coordinatorResult = await coordinatorStyleSave('coordinator-main-character-update');

    const coordinatorWorldBaseContents = readAuthoredFile('world-base.yaml');
    const coordinatorStoryPackage = await loadSavedAuthoringPackage();
    const savedWorldBase = readSavedWorldBase();

    expect(pageResult.kind).toBe('save_applied');
    expect(coordinatorResult.kind).toBe('save_applied');
    expect(pageResult.kind).toBe(coordinatorResult.kind);
    expect(pageWorldBaseContents).not.toBe(originalWorldBaseContents);
    expect(pageStoryPackage.worldBase.hero.name).toBe('page-main-character-update');
    expect(coordinatorWorldBaseContents).not.toBe(pageWorldBaseContents);
    expect(coordinatorStoryPackage.worldBase.hero.name).toBe('coordinator-main-character-update');
    expect(savedWorldBase.hero).toMatchObject({
      characterId: 'chr_hero01',
      name: 'coordinator-main-character-update',
    });
  });

  it('writes deterministic bridge saves into active variant workspace and keeps package-root baseline untouched', async () => {
    prepareTestPackage();
    const baselineWorldBaseBeforeSave = readFileSync(baselineWorldBasePath, 'utf8');

    const result = await saveSectionDraft({
      requestId: 'request-variant-only-write',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          worldBaseSetting: 'variant-only-setting',
        },
      },
    });

    expect(result.kind).toBe('save_applied');
    expect(existsSync(storylineRepositoryPath)).toBe(true);
    expect(existsSync(variantWorldBasePath)).toBe(true);
    expect(readFileSync(variantWorldBasePath, 'utf8')).toContain('variant-only-setting');
    expect(readFileSync(baselineWorldBasePath, 'utf8')).toBe(baselineWorldBaseBeforeSave);
    expect(readFileSync(baselineWorldBasePath, 'utf8')).not.toContain('variant-only-setting');
  });

  it('writes structured worldbase yaml from a structured worldbase-cast save request', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: 'request-worldbase-draft',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          ...buildWorldBaseDraft('Hero Draft'),
          coreCast: [
            {
              draftId: 'core-1',
              characterId: 'chr_core01',
              name: 'Core Draft',
              identityRole: 'Anchor',
              lightNovelTrait: '',
              gender: 'Female',
              personality: 'Gentle',
              age: '',
              occupation: '',
              characterSummary: '',
              capabilityBoundary: '',
              behaviorBoundary: 'Keep the daily shell steady.',
              oocRedLine: '',
              clothing: '',
              propsWeapon: '',
            },
          ],
          antagonists: [
            {
              draftId: 'antagonist-1',
              characterId: 'chr_ant01',
              name: 'Villain Draft',
              identityRole: 'Threat',
              lightNovelTrait: '',
              gender: 'Male',
              personality: 'Chaotic',
              age: '',
              occupation: '',
              characterSummary: '',
              capabilityBoundary: '',
              behaviorBoundary: 'Always performs.',
              oocRedLine: '',
              clothing: '',
              propsWeapon: '',
              fatalWeakness: 'Attention drop',
            },
          ],
          supportingCast: ' Support One：Steady witness\n- Support Two：Sharp clue finder ',
          locationPool: '  Signal room  ',
        },
      },
    });

    expect(result.kind).toBe('save_applied');
    if (result.kind === 'save_applied') {
      expect(result.runtimeImpactSummary.changedFiles).toEqual([
        'world-base.yaml',
        'authoring-state.json',
      ]);
    }

    const savedWorldBase = readSavedWorldBase();
    const loaded = await loadSavedAuthoringPackage();

    expect(savedWorldBase.hero).toMatchObject({
      characterId: 'chr_hero01',
      name: 'Hero Draft',
    });
    expect(savedWorldBase.coreCast[0]).toMatchObject({
      characterId: 'chr_core01',
      name: 'Core Draft',
    });
    expect(savedWorldBase.antagonists[0]).toMatchObject({
      characterId: 'chr_ant01',
      name: 'Villain Draft',
      fatalWeakness: 'Attention drop',
    });
    expect(loaded.worldBase.hero.name).toBe('Hero Draft');
    expect(loaded.worldBase.coreCast[0]?.name).toBe('Core Draft');
    expect(loaded.worldBase.antagonists[0]?.name).toBe('Villain Draft');
    expect(loaded.worldBase.npcCharacters).toBe('Support One：Steady witness\nSupport Two：Sharp clue finder');
    expect(loaded.worldBase.locations).toHaveLength(sourceWorldBaseFixture.locations?.length ?? 0);
    expect(loaded.worldBase.locationPatch).toBe(savedWorldBase.locationPatch);
  });

  it('writes the authoring status marker after a successful save', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: 'request-status',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: buildWorldBaseDraft('status-marker-update'),
      },
    });

    expect(result.kind).toBe('save_applied');

    const statusPath = path.resolve(testPackagePath, 'authoring-state.json');
    const status = YAML.parse(readFileSync(statusPath, 'utf8')) as {
      hasSuccessfulSave: boolean;
      lastEditedSection: string;
      lastSavedRequestId: string;
      lastSavedAt: string;
    };

    expect(status.hasSuccessfulSave).toBe(true);
    expect(status.lastEditedSection).toBe('worldbase-cast');
    expect(status.lastSavedRequestId).toBe('request-status');
    expect(typeof status.lastSavedAt).toBe('string');
  });

  it('returns a blocked save when no deterministic worldbase content is provided', async () => {
    prepareTestPackage();
    const originalWorldBaseContents = readAuthoredFile('world-base.yaml');
    const originalWorldBase = YAML.parse(originalWorldBaseContents) as {
      worldBaseSetting?: string;
      hero?: { name: string };
      npcCharacters?: string;
      locationPatch?: string;
    };

    const result = await saveSectionDraft({
      requestId: 'request-blocked',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          unrelatedField: 'still-valid-input',
        },
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain('没有提供可确定的世界基础更新。');
    }
    expect(YAML.parse(readAuthoredFile('world-base.yaml'))).toEqual(originalWorldBase);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('blocks control-modules saves instead of treating them as failures', async () => {
    prepareTestPackage();
    const originalWorldBaseContents = readAuthoredFile('world-base.yaml');

    const result = await saveSectionDraft({
      requestId: 'request-control-modules-blocked',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'control-modules',
      payload: {
        uiFields: {
          ...buildWorldBaseDraft('scene-phase-placeholder'),
        },
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain(
        '控制模块保存需要模块范围。',
      );
    }
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
    expect(readAuthoredFile('world-base.yaml')).toBe(originalWorldBaseContents);
  });

  it('writes scene and phase authoring changes through the same shared bridge', async () => {
    prepareTestPackage();
    const originalStoryPackage = await loadStoryPackage(testPackageName);

    const result = await saveSectionDraft({
      requestId: 'request-scene-phase',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'scene-phase-authoring',
      payload: {
        uiFields: {
          sceneSpec: {
            sceneName: '炎上直播间·改',
            openingSituation: '走廊先出现异常升温，凪顺势离开人群。',
            startPoint: '日常走廊先出现异常升温，凪从人群表层脱离。',
            endLine: '灰谷烈失势，校园恢复表面平静。',
            openingHook: '午后的走廊先传来异常蜂鸣，而不是教室内的爆裂。',
            samplePurpose: '这段不应被这次保存改掉。',
            castMode: 'explicit',
            cast: ['chr_ant01', 'chr_hero01', 'chr_core01', 'chr_missing', 'chr_core01', 42 as unknown],
          },
          phasePlans: [
            {
              phaseId: 'phase-02-hunt',
              phaseName: '走廊追踪',
              phaseGoal: '先沿着走廊追踪异常信号。',
              phaseEndPoint: '锁定异常来自旧校舍方向。',
              gradientType: 'Steady',
              routerHint: '悬疑/探案',
              notes: '仍然不能发生正面高强度战斗。',
            },
            {
              phaseId: 'phase-01-prologue',
              phaseName: '序幕裂缝',
              phaseGoal: '再回看事故源头，确认直播痕迹。',
              phaseEndPoint: '确认灰谷烈正在远端引导骚动。',
              gradientType: 'Rising',
              routerHint: '日常/闲暇',
              notes: '藤花仍然必须毫不知情。',
            },
          ],
        },
      },
    });

    expect(result.kind).toBe('save_applied');
    if (result.kind === 'save_applied') {
      expect(result.runtimeImpactSummary.changedFiles).toEqual(
        expect.arrayContaining(['scene.yaml', 'phase-plans.yaml', 'authoring-state.json']),
      );
      expect(result.reloadedSectionState.sceneSpec.sceneName).toBe('炎上直播间·改');
      expect(result.reloadedSectionState.sceneSpec.startPoint).toBe(
        '日常走廊先出现异常升温，凪从人群表层脱离。',
      );
      expect(result.reloadedSectionState.sceneSpec.cast).toEqual(['chr_core01', 'chr_ant01']);
      expect(result.reloadedSectionState.sceneSpec.samplePurpose).toBe(
        originalStoryPackage.sceneSpec.samplePurpose,
      );
      expect(result.reloadedSectionState.sceneSpec.mainAxis).toBe(
        [
          '日常走廊先出现异常升温，凪从人群表层脱离。',
          '先沿着走廊追踪异常信号。',
          '再回看事故源头，确认直播痕迹。',
          '灰谷烈失势，校园恢复表面平静。',
        ].join(' -> '),
      );
      expect(result.reloadedSectionState.phasePlans[0]?.phaseId).toBe('phase-02-hunt');
      expect(result.reloadedSectionState.phasePlans[0]?.phaseIndex).toBe(1);
      expect(result.reloadedSectionState.phasePlans[0]?.phaseName).toBe('走廊追踪');
    }
  });

  it('does not mark dependent sections for review after a worldbase save', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft(buildPageStyleSaveRequest('worldbase-review-flag'));

    expect(result.kind).toBe('save_applied');

    const status = YAML.parse(readFileSync(authoringStatusPath, 'utf8')) as {
      pendingSectionReviews?: Record<string, string[]>;
    };

    expect(status.pendingSectionReviews).toBeUndefined();
  });

  it('persists a minor hero edit without dropping the rest of the cast', async () => {
    prepareTestPackage();
    const storyPackage = await loadStoryPackage(testPackageName);
    const draft = createWorldBaseCastDraft(storyPackage.worldBase);

    const result = await saveSectionDraft({
      requestId: 'request-hero-minor-edit',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          ...draft,
          hero: {
            ...draft.hero,
            gender: '女',
          },
        },
      },
    });

    expect(result.kind).toBe('save_applied');

    const reparsedDraft = createWorldBaseCastDraft(readSavedWorldBase() as Parameters<
      typeof createWorldBaseCastDraft
    >[0]);

    expect(reparsedDraft.hero.gender).toBe('女');
    expect(reparsedDraft.coreCast.map((character) => character.name)).toEqual([
      '宫下藤花',
      '不吉波普',
    ]);
    expect(reparsedDraft.antagonists.map((character) => character.name)).toEqual(['灰谷烈']);
  });

  it('persists a minor core-cast edit without dropping the rest of the cast', async () => {
    prepareTestPackage();
    const storyPackage = await loadStoryPackage(testPackageName);
    const draft = createWorldBaseCastDraft(storyPackage.worldBase);

    const result = await saveSectionDraft({
      requestId: 'request-core-cast-minor-edit',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          ...draft,
          coreCast: draft.coreCast.map((character, index) =>
            index === 0 ? { ...character, gender: '女' } : character,
          ),
        },
      },
    });

    expect(result.kind).toBe('save_applied');

    expect(readSavedWorldBase()).toMatchObject({
      coreCast: expect.arrayContaining([
        expect.objectContaining({
          characterId: draft.coreCast[0]?.draftId,
          name: '宫下藤花',
          gender: '女',
        }),
      ]),
      antagonists: expect.arrayContaining([
        expect.objectContaining({
          name: '灰谷烈',
        }),
      ]),
    });
  });

  it('persists a minor antagonist edit without dropping the rest of the cast', async () => {
    prepareTestPackage();
    const storyPackage = await loadStoryPackage(testPackageName);
    const draft = createWorldBaseCastDraft(storyPackage.worldBase);

    const result = await saveSectionDraft({
      requestId: 'request-antagonist-minor-edit',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          ...draft,
          antagonists: draft.antagonists.map((character, index) =>
            index === 0 ? { ...character, gender: '男' } : character,
          ),
        },
      },
    });

    expect(result.kind).toBe('save_applied');

    expect(readSavedWorldBase()).toMatchObject({
      coreCast: expect.arrayContaining([
        expect.objectContaining({
          name: '宫下藤花',
        }),
      ]),
      antagonists: expect.arrayContaining([
        expect.objectContaining({
          characterId: draft.antagonists[0]?.draftId,
          name: '灰谷烈',
          gender: '男',
        }),
      ]),
    });
  });

  it('does not keep dependent review blockers after a scene-phase save', async () => {
    prepareTestPackage();

    await saveSectionDraft(buildPageStyleSaveRequest('worldbase-review-flag'));

    const result = await saveSectionDraft({
      requestId: 'request-scene-phase-review-flags',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'scene-phase-authoring',
      payload: {
        uiFields: {
          sceneSpec: {
            sceneName: '炎上直播间·改',
            openingSituation: '',
            mainAxis: '先追踪信号，再拆掉直播链路，最后回归表面日常。',
            endLine: '灰谷烈失势，校园恢复表面平静。',
            openingHook: '',
            samplePurpose: '',
          },
          phasePlans: [
            {
              phaseId: 'phase-01-prologue',
              phaseName: '序幕裂缝',
              phaseGoal: '先确认事故源头。',
              phaseEndPoint: '',
              gradientType: 'Rising',
              routerHint: '日常/闲暇',
              notes: '',
            },
          ],
        },
      },
    });

    expect(result.kind).toBe('save_applied');

    const status = YAML.parse(readFileSync(authoringStatusPath, 'utf8')) as {
      pendingSectionReviews?: Record<string, string[]>;
    };

    expect(status.pendingSectionReviews).toBeUndefined();
  });

  it('blocks deleting a location that is still referenced by the current scene', async () => {
    prepareTestPackage();
    const currentStoryPackage = await loadStoryPackage(testPackageName);
    const referencedLocationId = currentStoryPackage.sceneSpec.locationIds?.[0];

    expect(referencedLocationId).toBeTruthy();

    const blockedWorldBaseSave = await saveSectionDraft({
      requestId: 'request-worldbase-location-delete-blocked',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          ...createWorldBaseCastDraft(currentStoryPackage.worldBase),
          locations: createWorldBaseCastDraft(currentStoryPackage.worldBase).locations.filter(
            (location) => location.locationId !== referencedLocationId,
          ),
        },
      },
    });

    expect(blockedWorldBaseSave.kind).toBe('save_blocked');
    if (blockedWorldBaseSave.kind === 'save_blocked') {
      expect(
        blockedWorldBaseSave.blockingIssues.some(
          (issue) =>
            issue.includes(referencedLocationId ?? '') &&
            (issue.includes('sample-yanshang-live-room') || issue.includes('炎上直播间·改')),
        ),
      ).toBe(true);
    }

    const savedScene = YAML.parse(readAuthoredFile('scene.yaml')) as {
      locationIds?: string[];
    };
    expect(savedScene.locationIds).toEqual(currentStoryPackage.sceneSpec.locationIds);
  });

  it('blocks scene-phase saves that include an unknown location id and keeps scene.yaml unchanged', async () => {
    prepareTestPackage();
    const originalSceneContents = readAuthoredFile('scene.yaml');

    const result = await saveSectionDraft({
      requestId: 'request-scene-phase-unknown-location-id',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'scene-phase-authoring',
      payload: {
        uiFields: {
          sceneSpec: {
            sceneName: '炎上直播间·改',
            openingSituation: '',
            startPoint: '日常走廊先出现异常升温，凪从人群表层脱离。',
            endLine: '灰谷烈失势，校园恢复表面平静。',
            openingHook: '',
            castMode: 'explicit',
            cast: ['chr_core01'],
            locationIds: ['loc_missing'],
          },
          phasePlans: [
            {
              phaseId: 'phase-01-prologue',
              phaseName: '序幕裂缝',
              phaseGoal: '先确认事故源头。',
              phaseEndPoint: '',
              gradientType: 'Rising',
              routerHint: '日常/闲暇',
              notes: '',
            },
          ],
        },
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain(
        '场景地点引用 "loc_missing" 不存在于当前世界地点列表中。',
      );
    }
    expect(readAuthoredFile('scene.yaml')).toBe(originalSceneContents);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('does not bootstrap legacy storyline files when the first save is blocked, but bootstraps on the first successful save', async () => {
    prepareTestPackage();

    const blockedResult = await saveSectionDraft({
      requestId: 'request-blocked-before-bootstrap',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'scene-phase-authoring',
      payload: {
        uiFields: {
          sceneSpec: {
            sceneName: '炎上直播间·改',
            openingSituation: '',
            startPoint: '日常走廊先出现异常升温，凪从人群表层脱离。',
            endLine: '灰谷烈失势，校园恢复表面平静。',
            openingHook: '',
            castMode: 'explicit',
            cast: ['chr_core01'],
            locationIds: ['loc_missing'],
          },
          phasePlans: [
            {
              phaseId: 'phase-01-prologue',
              phaseName: '序幕裂缝',
              phaseGoal: '先确认事故源头。',
              phaseEndPoint: '',
              gradientType: 'Rising',
              routerHint: '日常/闲暇',
              notes: '',
            },
          ],
        },
      },
    });

    expect(blockedResult.kind).toBe('save_blocked');
    expect(existsSync(storylineRepositoryPath)).toBe(false);
    expect(existsSync(variantRootPath)).toBe(false);

    const successfulResult = await saveSectionDraft({
      requestId: 'request-success-after-blocked',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          worldBaseSetting: 'bootstrap-after-blocked',
        },
      },
    });

    expect(successfulResult.kind).toBe('save_applied');
    expect(existsSync(storylineRepositoryPath)).toBe(true);
    expect(existsSync(variantWorldBasePath)).toBe(true);
    expect(readFileSync(variantWorldBasePath, 'utf8')).toContain('bootstrap-after-blocked');
  });

  it('preserves the existing sample purpose while clearing other optional scene fields', async () => {
    prepareTestPackage();
    const originalStoryPackage = await loadStoryPackage(testPackageName);

    const result = await saveSectionDraft({
      requestId: 'request-scene-phase-clear-optionals',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'scene-phase-authoring',
      payload: {
        uiFields: {
          sceneSpec: {
            sceneName: '炎上直播间·改',
            openingSituation: '',
            mainAxis: '先追踪信号，再拆掉直播链路，最后回归表面日常。',
            endLine: '灰谷烈失势，校园恢复表面平静。',
            openingHook: '',
            samplePurpose: '',
          },
          phasePlans: [
            {
              phaseId: 'phase-01-prologue',
              phaseName: '序幕裂缝',
              phaseGoal: '先确认事故源头。',
              phaseEndPoint: '',
              gradientType: 'Rising',
              routerHint: '日常/闲暇',
              notes: '',
            },
          ],
        },
      },
    });

    expect(result.kind).toBe('save_applied');

    const savedScene = YAML.parse(readAuthoredFile('scene.yaml')) as Record<string, unknown>;

    expect(savedScene.sceneName).toBe('炎上直播间·改');
    expect(savedScene).not.toHaveProperty('openingSituation');
    expect(savedScene).not.toHaveProperty('openingHook');
    expect(savedScene.samplePurpose).toBe(originalStoryPackage.sceneSpec.samplePurpose);
  });

  it('clears the control-modules review flag after a control-modules save', async () => {
    prepareTestPackage();

    await saveSectionDraft(buildPageStyleSaveRequest('worldbase-review-flag'));

    await saveSectionDraft({
      requestId: 'request-scene-phase-review-flags',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'scene-phase-authoring',
      payload: {
        uiFields: {
          sceneSpec: {
            sceneName: '炎上直播间·改',
            openingSituation: '',
            mainAxis: '先追踪信号，再拆掉直播链路，最后回归表面日常。',
            endLine: '灰谷烈失势，校园恢复表面平静。',
            openingHook: '',
            samplePurpose: '',
          },
          phasePlans: [
            {
              phaseId: 'phase-01-prologue',
              phaseName: '序幕裂缝',
              phaseGoal: '先确认事故源头。',
              phaseEndPoint: '',
              gradientType: 'Rising',
              routerHint: '日常/闲暇',
              notes: '',
            },
          ],
        },
      },
    });

    const currentPackage = await loadStoryPackage(testPackageName);

    const result = await saveSectionDraft({
      requestId: 'request-clear-control-review-flags',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'control-modules',
      moduleScope: 'light-cone',
      payload: {
        uiFields: {
          controlModules: currentPackage.controlModules,
          routerProfiles: currentPackage.routerProfiles,
          auditQuestionSet: currentPackage.auditQuestionSet,
        },
      },
    });

    expect(result.kind).toBe('save_applied');

    const status = YAML.parse(readFileSync(authoringStatusPath, 'utf8')) as {
      pendingSectionReviews?: Record<string, string[]>;
    };

    expect(status.pendingSectionReviews ?? {}).not.toHaveProperty('control-modules');
  });

  it('writes light-cone updates into control-modules.yaml through the shared bridge', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: 'request-light-cone',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'control-modules',
      moduleScope: 'light-cone',
      payload: {
        uiFields: {
          controlModules: {
            sceneId: 'sample-yanshang-live-room',
            lightConeCustomization: {
              boundaryGuidance: 'Keep the player state as the apex.',
              convergenceGuidance: 'Collapse harder near the end line.',
              phaseSettlementGuidance: 'Only re-evaluate after settled phases.',
            },
            directorNoteAdditions: {
              beatConstraintsAdditions: 'Keep the current beat grounded.',
            },
            beatVolumeDefinitions: {
              Low: {
                beatConstraints: 'Use summary framing.',
                optionFormatting: 'Use broad options.',
              },
              Med: {
                beatConstraints: 'Use standard pacing.',
                optionFormatting: 'Use direct options.',
              },
              High: {
                beatConstraints: 'Use dense tactile pacing.',
                optionFormatting: 'Use sharp tactical options.',
              },
            },
          },
          routerProfiles: [],
          auditQuestionSet: {
            sceneId: 'sample-yanshang-live-room',
            globalQuestions: [],
            controlQuestions: [],
            selectionPolicy: {
              default: [],
            },
          },
        },
      },
    });

    expect(result.kind).toBe('save_applied');
    expect(readAuthoredFile('control-modules.yaml')).toContain('Collapse harder near the end line.');
    if (result.kind === 'save_applied') {
      expect(result.runtimeImpactSummary.changedFiles).toEqual(
        expect.arrayContaining(['control-modules.yaml', 'authoring-state.json']),
      );
      expect(result.reloadedSectionState.controlModules.lightConeCustomization.convergenceGuidance).toBe(
        'Collapse harder near the end line.',
      );
    }
  });

  it('preserves an empty default audit selection through save and reload', async () => {
    prepareTestPackage();

    const currentPackage = await loadStoryPackage(testPackageName);

    const result = await saveSectionDraft({
      requestId: 'request-empty-audit-default-selection',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'control-modules',
      moduleScope: 'auditor-question-set',
      payload: {
        uiFields: {
          controlModules: currentPackage.controlModules,
          routerProfiles: currentPackage.routerProfiles,
          auditQuestionSet: {
            ...currentPackage.auditQuestionSet,
            selectionPolicy: {
              ...currentPackage.auditQuestionSet.selectionPolicy,
              default: [],
            },
          },
        },
      },
    });

    expect(result.kind).toBe('save_applied');
    expect(YAML.parse(readFileSync(authoringStatusPath, 'utf8'))).toMatchObject({
      hasSuccessfulSave: true,
    });

    const savedAuditQuestions = YAML.parse(readAuthoredFile('audit-questions.yaml')) as {
      selectionPolicy: {
        default: string[];
      };
    };

    expect(savedAuditQuestions.selectionPolicy.default).toEqual([]);
    if (result.kind === 'save_applied') {
      expect(result.reloadedSectionState.auditQuestionSet.selectionPolicy.default).toEqual([]);
    }
  });

  it('blocks deleting a router profile that is still referenced by scene-phase data', async () => {
    prepareTestPackage();

    const currentPackage = await loadStoryPackage(testPackageName);

    const result = await saveSectionDraft({
      requestId: 'request-router-delete-blocked',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'control-modules',
      moduleScope: 'router-profile-set',
      payload: {
        uiFields: {
          controlModules: currentPackage.controlModules,
          routerProfiles: currentPackage.routerProfiles.filter(
            (profile) => profile.routerName !== '悬疑/探案',
          ),
          auditQuestionSet: currentPackage.auditQuestionSet,
        },
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain(
        'Router 配置 "悬疑/探案" 仍被一个或多个 Phase 的 Router 提示引用。',
      );
    }
  });

  it('blocks malformed payload shapes without throwing', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: 'request-malformed-payload',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        patchCandidates: 'not-an-array' as unknown as readonly never[],
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain('补丁候选在提供时必须是数组。');
    }
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('blocks malformed explicit scene cast payloads instead of clearing cast to empty', async () => {
    prepareTestPackage();
    const originalScene = readAuthoredFile('scene.yaml');

    const result = await saveSectionDraft({
      requestId: 'request-scene-phase-malformed-cast',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'scene-phase-authoring',
      payload: {
        uiFields: {
          sceneSpec: {
            sceneName: '炎上直播间·改',
            openingSituation: '',
            startPoint: '日常走廊先出现异常升温，凪从人群表层脱离。',
            endLine: '灰谷烈失势，校园恢复表面平静。',
            openingHook: '',
            castMode: 'explicit',
            cast: [1, { characterId: 'chr_core01' }, false],
          },
          phasePlans: [
            {
              phaseId: 'phase-01-prologue',
              phaseName: '序幕裂缝',
              phaseGoal: '先确认事故源头。',
              phaseEndPoint: '',
              gradientType: 'Rising',
              routerHint: '日常/闲暇',
              notes: '',
            },
          ],
        },
      },
    });

    expect(result.kind).toBe('save_blocked');
    expect(readAuthoredFile('scene.yaml')).toBe(originalScene);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('preserves an explicit empty cast through save and reload', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: 'request-scene-phase-explicit-empty-cast',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'scene-phase-authoring',
      payload: {
        uiFields: {
          sceneSpec: {
            sceneName: '炎上直播间·改',
            openingSituation: '',
            startPoint: '日常走廊先出现异常升温，凪从人群表层脱离。',
            endLine: '灰谷烈失势，校园恢复表面平静。',
            openingHook: '',
            castMode: 'explicit',
            cast: [],
          },
          phasePlans: [
            {
              phaseId: 'phase-01-prologue',
              phaseName: '序幕裂缝',
              phaseGoal: '先确认事故源头。',
              phaseEndPoint: '',
              gradientType: 'Rising',
              routerHint: '日常/闲暇',
              notes: '',
            },
          ],
        },
      },
    });

    expect(result.kind).toBe('save_applied');
    if (result.kind === 'save_applied') {
      expect(result.reloadedSectionState.sceneSpec.cast).toEqual([]);
      expect(readAuthoredFile('scene.yaml')).toContain('cast: []');
    }
  });

  it('blocks malformed top-level request fields without throwing', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: null as unknown as string,
      source: 'page',
      packageName: 42 as unknown as string,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: buildWorldBaseDraft('top-level-malformed-request'),
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain('请求编号必须是字符串。');
      expect(result.blockingIssues).toContain('包名必须是字符串。');
    }
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('blocks control-modules saves when moduleScope is missing', async () => {
    prepareTestPackage();
    const originalWorldBase = readSavedWorldBase();

    const result = await saveSectionDraft({
      requestId: 'request-control-modules-missing-scope',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'control-modules',
      payload: {
        uiFields: {
          ...buildWorldBaseDraft('control-modules-placeholder'),
        },
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain(
        '控制模块保存需要模块范围。',
      );
    }
    expect(YAML.parse(readAuthoredFile('world-base.yaml'))).toEqual(originalWorldBase);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('keeps a successful save distinct when the authoring status marker write fails', async () => {
    prepareTestPackage();
    const writeAuthoringStatusSpy = vi
      .spyOn(authoringStatus, 'writeAuthoringStatus')
      .mockRejectedValueOnce(new Error('marker write failed'));

    const result = await saveSectionDraft({
      requestId: 'request-marker-warning',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: buildWorldBaseDraft('marker-warning-update'),
      },
    });

    expect(writeAuthoringStatusSpy).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe('save_applied_with_warnings');
    if (result.kind === 'save_applied_with_warnings') {
      expect(result.warnings).toContain('作者状态标记写入失败：marker write failed');
      expect(result.runtimeImpactSummary.changedFiles).toEqual(['world-base.yaml']);
    }
    expect(await loadSavedAuthoringPackage()).toMatchObject({
      worldBase: {
        hero: {
          name: 'marker-warning-update',
        },
      },
    });
    expect(readSavedWorldBase().hero.name).toBe('marker-warning-update');
  });

  it('restores the original world-base file when reload fails', async () => {
    prepareTestPackage();
    const originalWorldBaseContents = readAuthoredFile('world-base.yaml');
    const reloadSpy = vi.spyOn(reloadModule, 'reloadStoryPackage').mockRejectedValueOnce(
      new Error('reload failed'),
    );

    const result = await saveSectionDraft(buildPageStyleSaveRequest('reload-failure-update'));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe('save_failed');
    expect(readAuthoredFile('world-base.yaml')).toBe(originalWorldBaseContents);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('restores the original world-base file when the write step throws after clobbering contents', async () => {
    prepareTestPackage();
    const originalWorldBaseContents = readAuthoredFile('world-base.yaml');
    const persistSpy = vi
      .spyOn(repositoryModule, 'persistWorldBaseDraft')
      .mockImplementationOnce(async () => {
        const clobberedWorldBase = YAML.stringify({
          ...readSavedWorldBase(),
          hero: {
            ...readSavedWorldBase().hero,
            name: 'clobbered-before-throw',
          },
        });

        writeFileSync(resolveAuthoredFilePath('world-base.yaml'), clobberedWorldBase, 'utf8');
        throw new Error('write step failed');
      });

    const result = await saveSectionDraft(buildPageStyleSaveRequest('write-step-failure-update'));

    expect(persistSpy).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe('save_failed');
    expect(readAuthoredFile('world-base.yaml')).toBe(originalWorldBaseContents);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('returns a warning-style dryRun result without changing files', async () => {
    prepareTestPackage();
    const originalWorldBase = readSavedWorldBase();

    const result = await saveSectionDraft({
      requestId: 'request-dry-run',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      dryRun: true,
      payload: {
        uiFields: buildWorldBaseDraft('dry-run-placeholder'),
      },
    });

    expect(result.kind).toBe('save_applied_with_warnings');
    if (result.kind === 'save_applied_with_warnings') {
      expect(result.warnings).toContain('试运行已完成，但没有写入文件。');
      expect(result.runtimeImpactSummary.changedFiles).toEqual([]);
    }
    expect(YAML.parse(readAuthoredFile('world-base.yaml'))).toEqual(originalWorldBase);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });
});
