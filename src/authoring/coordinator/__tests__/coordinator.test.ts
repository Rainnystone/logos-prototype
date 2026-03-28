import { beforeEach, describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import {
  createSaveAppliedResult,
  createSaveBlockedResult,
} from '@/authoring/persistence/save-results';

const saveSectionDraft = vi.fn();

vi.mock('@/authoring/persistence/bridge', () => ({
  saveSectionDraft,
}));

describe('runCoordinatorSave', () => {
  beforeEach(() => {
    saveSectionDraft.mockReset();
  });

  it('routes a section-assist request through the shared bridge as a coordinator save', async () => {
    saveSectionDraft.mockResolvedValueOnce(
      createSaveAppliedResult(
        {
          requestId: 'coordinator-worldbase',
          packageName: 'sample-scene',
          sectionId: 'worldbase-cast',
          showLocally: true,
          showInGlobalDiagnostics: false,
        },
        storyPackageFixture,
        ['world-base.yaml'],
      ),
    );

    const { runCoordinatorSave } = await import('@/authoring/coordinator/coordinator');

    const result = await runCoordinatorSave({
      requestId: 'coordinator-worldbase',
      packageName: 'sample-scene',
      activeSection: 'worldbase-cast',
      actorInput: {
        source: 'form',
        uiFields: {
          worldBaseSetting: 'Updated world base',
          worldRules: 'No open magic',
          toneBaseline: 'Cold pressure',
          hero: {
            draftId: 'hero-1',
            name: 'Hero One',
            identityRole: 'Lead breaker',
            lightNovelTrait: 'Silent pressure',
            gender: 'Female',
            personality: 'Cold',
            age: '17',
            occupation: 'Student',
            characterSummary: 'Keeps moving at the threat.',
            capabilityBoundary: 'No magic.',
            behaviorBoundary: 'Never abandons the trace.',
            oocRedLine: 'No speeches.',
            clothing: 'Uniform',
            propsWeapon: 'Ceramic blade',
          },
          coreCast: [],
          antagonists: [],
          supportingCast: 'Supporting cast',
          locationPool: 'Signal corridor',
        },
      },
    });

    expect(saveSectionDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'coordinator-worldbase',
        packageName: 'sample-scene',
        sectionId: 'worldbase-cast',
        source: 'coordinator',
        payload: {
          uiFields: {
            worldBaseSetting: 'Updated world base',
            worldRules: 'No open magic',
            toneBaseline: 'Cold pressure',
            hero: expect.any(Object),
            coreCast: [],
            antagonists: [],
            supportingCast: 'Supporting cast',
            locationPool: 'Signal corridor',
          },
        },
      }),
    );
    expect(result.saveResult.kind).toBe('save_applied');
    expect(result.coordinatorSummary).toContain('通过共享保存路径保存当前页面');
    expect(result.usedRepair).toBe(false);
  });

  it('blocks control-modules coordinator saves that omit the active module scope', async () => {
    const { runCoordinatorSave } = await import('@/authoring/coordinator/coordinator');

    const result = await runCoordinatorSave({
      requestId: 'coordinator-control-modules',
      packageName: 'sample-scene',
      activeSection: 'control-modules',
      actorInput: {
        source: 'form',
        uiFields: storyPackageFixture.controlModules as unknown as Record<string, unknown>,
      },
    });

    expect(saveSectionDraft).not.toHaveBeenCalled();
    expect(result.saveResult.kind).toBe('save_blocked');
    expect(result.coordinatorSummary).toContain('当前激活的控制模块');
    expect(result.usedRepair).toBe(false);
  });

  it('returns the blocked save result unchanged when no safe repair exists', async () => {
    saveSectionDraft.mockResolvedValueOnce(
      createSaveBlockedResult(
        {
          requestId: 'coordinator-scene-phase',
          packageName: 'sample-scene',
          sectionId: 'scene-phase-authoring',
          showLocally: true,
          showInGlobalDiagnostics: false,
        },
        ['Phase "Signal Trace" 使用了不可用的 Router 选择 "Missing"。'],
      ),
    );

    const { runCoordinatorSave } = await import('@/authoring/coordinator/coordinator');

    const result = await runCoordinatorSave({
      requestId: 'coordinator-scene-phase',
      packageName: 'sample-scene',
      activeSection: 'scene-phase-authoring',
      actorInput: {
        source: 'form',
        uiFields: {
          sceneSpec: storyPackageFixture.sceneSpec,
          phasePlans: [
            {
              ...storyPackageFixture.phasePlans[0],
              routerHint: 'Missing',
            },
          ],
        },
      },
    });

    expect(saveSectionDraft).toHaveBeenCalledTimes(1);
    expect(result.saveResult.kind).toBe('save_blocked');
    expect(result.coordinatorSummary).toContain('无法修复阻塞问题');
    expect(result.usedRepair).toBe(false);
  });
});
