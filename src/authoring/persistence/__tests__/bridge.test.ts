import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveSectionDraft } from '@/authoring/persistence/bridge';
import * as authoringStatus from '@/authoring/persistence/authoring-status';
import * as reloadModule from '@/authoring/persistence/reload';
import * as repositoryModule from '@/authoring/persistence/repository';
import { loadStoryPackage } from '@/engine/story-loader';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const sourcePackageName = 'sample-scene';
const testPackageName = '__authoring-bridge-test__';
const testPackagePath = path.resolve(storyPackagesRoot, testPackageName);
const worldBasePath = path.resolve(testPackagePath, 'world-base.yaml');
const authoringStatusPath = path.resolve(testPackagePath, 'authoring-state.json');

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

function buildPageStyleSaveRequest(mainCharacters: string) {
  return {
    requestId: 'request-page',
    source: 'page' as const,
    packageName: testPackageName,
    sectionId: 'worldbase-cast' as const,
    payload: {
      uiFields: {
        mainCharacters,
      },
    },
  };
}

function buildCoordinatorStyleSaveRequest(mainCharacters: string) {
  return {
    requestId: 'request-coordinator',
    source: 'coordinator' as const,
    packageName: testPackageName,
    sectionId: 'worldbase-cast' as const,
    payload: {
      patchCandidates: [
        {
          type: 'replace',
          path: 'mainCharacters',
          value: mainCharacters,
        },
      ],
    },
  };
}

describe('saveSectionDraft', () => {
  it('routes page-style and coordinator-style adapters through one deterministic bridge', async () => {
    prepareTestPackage();
    const originalWorldBaseContents = readFileSync(worldBasePath, 'utf8');

    const pageStyleSave = (mainCharacters: string) => saveSectionDraft(buildPageStyleSaveRequest(mainCharacters));
    const coordinatorStyleSave = (mainCharacters: string) =>
      saveSectionDraft(buildCoordinatorStyleSaveRequest(mainCharacters));

    const pageResult = await pageStyleSave('page-main-character-update');

    const pageWorldBaseContents = readFileSync(worldBasePath, 'utf8');
    const pageStoryPackage = await loadStoryPackage(testPackageName);

    const coordinatorResult = await coordinatorStyleSave('coordinator-main-character-update');

    const coordinatorWorldBaseContents = readFileSync(worldBasePath, 'utf8');
    const coordinatorStoryPackage = await loadStoryPackage(testPackageName);

    expect(pageResult.kind).toBe('save_applied');
    expect(coordinatorResult.kind).toBe('save_applied');
    expect(pageResult.kind).toBe(coordinatorResult.kind);
    expect(pageWorldBaseContents).not.toBe(originalWorldBaseContents);
    expect(pageStoryPackage.worldBase.mainCharacters).toBe('page-main-character-update');
    expect(coordinatorWorldBaseContents).not.toBe(pageWorldBaseContents);
    expect(coordinatorStoryPackage.worldBase.mainCharacters).toBe(
      'coordinator-main-character-update',
    );
  });

  it('renders worldbase-cast draft fields into normalized runtime blocks', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: 'request-worldbase-draft',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          mainCharacters: '  世界基础\n\n主角雾间凪  ',
          npcCharacters: ' 竹田启司：稳重的男友\n- 末真和子：敏锐的线索人\n新刻敬：正义感强 ',
          locationPatch: '  2年C班教室  ',
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

    const loaded = await loadStoryPackage(testPackageName);

    expect(loaded.worldBase.mainCharacters).toBe('世界基础\n\n主角雾间凪');
    expect(loaded.worldBase.npcCharacters).toBe(
      '竹田启司：稳重的男友\n末真和子：敏锐的线索人\n新刻敬：正义感强',
    );
    expect(loaded.worldBase.locationPatch).toBe('2年C班教室');
  });

  it('writes the authoring status marker after a successful save', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: 'request-status',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          mainCharacters: 'status-marker-update',
        },
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
    const originalWorldBaseContents = readFileSync(worldBasePath, 'utf8');
    const originalWorldBase = YAML.parse(originalWorldBaseContents) as {
      mainCharacters: string;
      npcCharacters: string;
      locationPatch: string;
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
      expect(result.blockingIssues).toContain('No deterministic world-base update was provided.');
    }
    expect(YAML.parse(readFileSync(worldBasePath, 'utf8'))).toEqual(originalWorldBase);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('blocks control-modules saves instead of treating them as failures', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: 'request-control-modules-blocked',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'control-modules',
      payload: {
        uiFields: {
          mainCharacters: 'scene-phase-placeholder',
        },
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain(
        'moduleScope is required for control-modules saves.',
      );
    }
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
    expect(YAML.parse(readFileSync(worldBasePath, 'utf8'))).toMatchObject({
      mainCharacters: expect.any(String),
      npcCharacters: expect.any(String),
      locationPatch: expect.any(String),
    });
  });

  it('writes scene and phase authoring changes through the same shared bridge', async () => {
    prepareTestPackage();

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
            mainAxis: '先追踪信号，再拆掉直播链路，最后回归表面日常。',
            endLine: '灰谷烈失势，校园恢复表面平静。',
            openingHook: '午后的走廊先传来异常蜂鸣，而不是教室内的爆裂。',
            samplePurpose: '验证重新排序后的阶段推进仍然稳定。',
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
      expect(result.reloadedSectionState.phasePlans[0]?.phaseId).toBe('phase-02-hunt');
      expect(result.reloadedSectionState.phasePlans[0]?.phaseIndex).toBe(1);
      expect(result.reloadedSectionState.phasePlans[0]?.phaseName).toBe('走廊追踪');
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
      expect(result.blockingIssues).toContain('patchCandidates must be an array when provided.');
    }
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('blocks malformed top-level request fields without throwing', async () => {
    prepareTestPackage();

    const result = await saveSectionDraft({
      requestId: null as unknown as string,
      source: 'page',
      packageName: 42 as unknown as string,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          mainCharacters: 'top-level-malformed-request',
        },
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain('requestId must be a string.');
      expect(result.blockingIssues).toContain('packageName must be a string.');
    }
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('blocks control-modules saves when moduleScope is missing', async () => {
    prepareTestPackage();
    const originalWorldBase = YAML.parse(readFileSync(worldBasePath, 'utf8')) as {
      mainCharacters: string;
      npcCharacters: string;
      locationPatch: string;
    };

    const result = await saveSectionDraft({
      requestId: 'request-control-modules-missing-scope',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'control-modules',
      payload: {
        uiFields: {
          mainCharacters: 'control-modules-placeholder',
        },
      },
    });

    expect(result.kind).toBe('save_blocked');
    if (result.kind === 'save_blocked') {
      expect(result.blockingIssues).toContain(
        'moduleScope is required for control-modules saves.',
      );
    }
    expect(YAML.parse(readFileSync(worldBasePath, 'utf8'))).toEqual(originalWorldBase);
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
        uiFields: {
          mainCharacters: 'marker-warning-update',
        },
      },
    });

    expect(writeAuthoringStatusSpy).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe('save_applied_with_warnings');
    if (result.kind === 'save_applied_with_warnings') {
      expect(result.warnings).toContain('Authoring status marker write failed: marker write failed');
      expect(result.runtimeImpactSummary.changedFiles).toEqual(['world-base.yaml']);
    }
    expect(await loadStoryPackage(testPackageName)).toMatchObject({
      worldBase: {
        mainCharacters: 'marker-warning-update',
      },
    });
    expect(readFileSync(worldBasePath, 'utf8')).toContain('marker-warning-update');
  });

  it('restores the original world-base file when reload fails', async () => {
    prepareTestPackage();
    const originalWorldBaseContents = readFileSync(worldBasePath, 'utf8');
    const reloadSpy = vi.spyOn(reloadModule, 'reloadStoryPackage').mockRejectedValueOnce(
      new Error('reload failed'),
    );

    const result = await saveSectionDraft(buildPageStyleSaveRequest('reload-failure-update'));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe('save_failed');
    expect(readFileSync(worldBasePath, 'utf8')).toBe(originalWorldBaseContents);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('restores the original world-base file when the write step throws after clobbering contents', async () => {
    prepareTestPackage();
    const originalWorldBaseContents = readFileSync(worldBasePath, 'utf8');
    const persistSpy = vi
      .spyOn(repositoryModule, 'persistWorldBaseDraft')
      .mockImplementationOnce(async () => {
        const clobberedWorldBase = YAML.stringify({
          ...YAML.parse(originalWorldBaseContents),
          mainCharacters: 'clobbered-before-throw',
        });

        writeFileSync(worldBasePath, clobberedWorldBase, 'utf8');
        throw new Error('write step failed');
      });

    const result = await saveSectionDraft(buildPageStyleSaveRequest('write-step-failure-update'));

    expect(persistSpy).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe('save_failed');
    expect(readFileSync(worldBasePath, 'utf8')).toBe(originalWorldBaseContents);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });

  it('returns a warning-style dryRun result without changing files', async () => {
    prepareTestPackage();
    const originalWorldBaseContents = readFileSync(worldBasePath, 'utf8');
    const originalWorldBase = YAML.parse(originalWorldBaseContents) as {
      mainCharacters: string;
      npcCharacters: string;
      locationPatch: string;
    };

    const result = await saveSectionDraft({
      requestId: 'request-dry-run',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      dryRun: true,
      payload: {
        uiFields: {
          mainCharacters: 'dry-run-placeholder',
        },
      },
    });

    expect(result.kind).toBe('save_applied_with_warnings');
    if (result.kind === 'save_applied_with_warnings') {
      expect(result.warnings).toContain('dryRun completed without writing files.');
      expect(result.runtimeImpactSummary.changedFiles).toEqual([]);
    }
    expect(YAML.parse(readFileSync(worldBasePath, 'utf8'))).toEqual(originalWorldBase);
    expect(() => readFileSync(authoringStatusPath, 'utf8')).toThrow();
  });
});
