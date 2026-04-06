import { describe, expect, it, vi } from 'vitest';

const saveSectionDraft = vi.fn(async (request: { sectionId: string; requestId: string; packageName: string }) => {
  if (request.sectionId === 'story-package-management') {
    return {
      kind: 'save_blocked' as const,
      requestId: request.requestId,
      packageName: request.packageName,
      sectionId: 'story-package-management',
      showLocally: true,
      showInGlobalDiagnostics: false,
      blockingIssues: ['不支持的页面 "story-package-management"。'],
    };
  }

  return {
    kind: 'save_applied' as const,
    requestId: 'request-route',
    packageName: 'sample-scene',
    sectionId: 'worldbase-cast' as const,
    showLocally: true,
    showInGlobalDiagnostics: false,
    reloadedSectionState: {
      sceneSpec: {
        sceneId: 'scene-signal-room',
        sceneName: 'Signal Room',
        mainAxis: 'Track a hostile signal through a sealed campus wing.',
        endLine: 'The source is isolated and the public space returns to calm.',
      },
      phasePlans: [],
      routerProfiles: [],
      auditQuestionSet: {
        sceneId: 'scene-signal-room',
        globalQuestions: [],
        controlQuestions: [],
        phaseSpecificQuestions: {},
        selectionPolicy: {
          default: [],
          phaseOverrides: {},
        },
      },
      worldBase: {
        mainCharacters: '主文本',
        npcCharacters: '配角',
        locationPatch: '地点',
      },
    },
    runtimeImpactSummary: {
      changedFiles: ['world-base.yaml'],
    },
  };
});

vi.mock('@/authoring/persistence/bridge', () => ({
  saveSectionDraft,
}));

describe('PATCH section save route', () => {
  it('forwards the worldbase payload to the shared bridge', async () => {
    const { PATCH } = await import(
      '@/app/api/authoring/packages/[packageName]/sections/[sectionId]/route'
    );

    const response = await PATCH(
      new Request('http://localhost/api/authoring/packages/sample-scene/sections/worldbase-cast', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          requestId: 'request-route',
          source: 'page',
          payload: {
            uiFields: {
              worldBaseSetting: '世界基础设定',
              worldRules: '不允许公开超自然力量',
              toneBaseline: '冷静压迫',
              hero: {
                draftId: 'hero-1',
                name: '雾间凪',
                identityRole: '主动破局者',
                lightNovelTrait: '冷峻压迫感',
                gender: '女',
                personality: '冷硬',
                age: '17',
                occupation: '学生',
                characterSummary: '会直接冲向异常。',
                capabilityBoundary: '禁止魔法',
                behaviorBoundary: '绝不逃避',
                oocRedLine: '不长篇热血发言',
                clothing: '制服',
                propsWeapon: '陶瓷刀片',
              },
              coreCast: [],
              antagonists: [],
              supportingCast: '竹田启司：稳重的男友',
              locationPool: '2年C班教室',
            },
          },
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
          sectionId: 'worldbase-cast',
        }),
      },
    );

    expect(saveSectionDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-route',
        packageName: 'sample-scene',
        sectionId: 'worldbase-cast',
        source: 'page',
      }),
    );
    expect(response.status).toBe(200);
  });

  it('returns a blocked response when story-package-management is patched through the save route', async () => {
    const { PATCH } = await import(
      '@/app/api/authoring/packages/[packageName]/sections/[sectionId]/route'
    );

    const response = await PATCH(
      new Request(
        'http://localhost/api/authoring/packages/sample-scene/sections/story-package-management',
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            requestId: 'story-package-management-save',
            payload: {
              uiFields: {},
            },
          }),
        },
      ),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
          sectionId: 'story-package-management',
        }),
      },
    );

    expect(saveSectionDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'story-package-management-save',
        packageName: 'sample-scene',
        sectionId: 'story-package-management',
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      kind: 'save_blocked',
      sectionId: 'story-package-management',
    });
  });
});
