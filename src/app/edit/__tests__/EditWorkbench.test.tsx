import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { EditWorkbench } from '@/app/edit/EditWorkbench';
import { workspaceViewFixture } from '@/app/edit/sections/__tests__/story-package-management.fixtures';
import { buildPackageDiagnostics } from '@/authoring/sections/package-diagnostics';

const renderScenePhaseAuthoringSection = vi.hoisted(() => vi.fn());
const renderStoryPackageManagementSection = vi.hoisted(() => vi.fn());

vi.mock('@/app/edit/sections/StoryPackageManagementSection', () => ({
  StoryPackageManagementSection: (props: unknown) => {
    renderStoryPackageManagementSection(props);
    return (
      <section aria-label="Storyline workspace">
        <h2>故事包管理</h2>
        <div data-testid="story-package-management-section-mock" />
      </section>
    );
  },
}));

vi.mock('@/app/edit/sections/ScenePhaseAuthoringSection', () => ({
  ScenePhaseAuthoringSection: (props: unknown) => {
    renderScenePhaseAuthoringSection(props);
    return <div data-testid="scene-phase-authoring-section-mock" />;
  },
}));

describe('EditWorkbench', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    renderScenePhaseAuthoringSection.mockReset();
    renderStoryPackageManagementSection.mockReset();
  });

  it('renders six tabs with story-package-management first while keeping agent 管理 reachable', () => {
    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="story-package-management"
        activeSurface="world"
        storyPackageManagementView={workspaceViewFixture}
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'LOGOS Narrative Editor' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'LOGOS Authoring Editor' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '故事包管理' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '故事包管理' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=story-package-management',
    );
    expect(screen.getByRole('link', { name: '世界' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=worldbase-cast&surface=world',
    );
    expect(screen.getByRole('link', { name: '角色' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=worldbase-cast&surface=character',
    );
    expect(screen.getByRole('link', { name: '场景与阶段' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=scene-phase-authoring',
    );
    expect(screen.getByRole('link', { name: '控制模块' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=control-modules',
    );
    expect(screen.getByRole('link', { name: 'agent 管理' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=package-wiring-validation',
    );
    expect(
      screen.getByRole('navigation', { name: 'Editor sections' }).querySelectorAll('a'),
    ).toHaveLength(6);
    expect(screen.getByRole('link', { name: '故事包管理' })).toHaveAttribute('aria-current', 'page');
    expect(
      Array.from(screen.getByRole('navigation', { name: 'Editor sections' }).querySelectorAll('a')).map(
        (link) => link.textContent,
      ),
    ).toEqual(['故事包管理', '世界', '角色', '场景与阶段', '控制模块', 'agent 管理']);
    expect(screen.getByRole('link', { name: '打开场景' })).toHaveAttribute(
      'href',
      '/play?storyPackage=sample-scene',
    );
    expect(screen.getByRole('link', { name: '返回标题' })).toHaveAttribute(
      'href',
      '/',
    );

    const pageHelper = screen.getByLabelText('Page helper');
    expect(within(pageHelper).getByText('Page helper')).toBeInTheDocument();
    expect(within(pageHelper).getByText('Shell status')).toBeInTheDocument();
    expect(within(pageHelper).getByText('Package')).toBeInTheDocument();
    expect(within(pageHelper).getByText('State source')).toBeInTheDocument();
    expect(within(pageHelper).getByText('Active section')).toBeInTheDocument();
    expect(within(pageHelper).getByText('故事包管理')).toBeInTheDocument();
    expect(screen.getByTestId('story-package-management-section-mock')).toBeInTheDocument();
    expect(renderStoryPackageManagementSection).toHaveBeenCalledWith({
      packageName: 'sample-scene',
      view: workspaceViewFixture,
    });
  });

  it('ignores the surface selector outside worldbase-cast', () => {
    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="control-modules"
        activeSurface="character"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    expect(screen.getByRole('link', { name: '控制模块' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '世界' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: '角色' })).not.toHaveAttribute('aria-current');
  });

  it('switches between the world and character surfaces under the shared worldbase contract', () => {
    const { rerender } = render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    expect(screen.getByRole('textbox', { name: '地点说明' })).toHaveValue(
      'A sealed corridor with old lights, cameras, and echoing vents.',
    );
    expect(screen.queryByText('关系区')).not.toBeInTheDocument();

    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="character"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    expect(screen.getByText('关系区')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '地点说明' })).not.toBeInTheDocument();
  });

  it('projects runtime continuity relationship status into the character surface', () => {
    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="character"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
          runtimeContinuityView: {
            kind: 'active',
            activeSession: {
              sessionId: 'sess_100',
              lifecycle: 'in_progress',
              activeCheckpointId: 'chk_100',
              acceptedBeatCount: 2,
              relationshipStatus: {
                highlightedDeltasText: 'Nagi now treats Touka as a trusted witness.',
                stableBackgroundText: 'They remain aligned against the corridor threat.',
                source: 'session',
              },
            },
          },
        }}
      />,
    );

    expect(screen.getByText('当前活跃会话：sess_100')).toBeInTheDocument();
    expect(
      screen.getByText('关系变化：Nagi now treats Touka as a trusted witness.'),
    ).toBeInTheDocument();
  });

  it('shows only safe unavailable continuity copy on the edit character surface', () => {
    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="character"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
          runtimeContinuityView: {
            kind: 'unavailable',
            activeSession: null,
            reason: 'Runtime continuity is temporarily unavailable for this story package.',
          },
        }}
      />,
    );

    expect(screen.getByText('Runtime 连续性暂不可用。')).toBeInTheDocument();
    expect(screen.getByText('当前无法读取编辑态连续关系摘要。')).toBeInTheDocument();
    expect(screen.queryByText(/temporarily unavailable for this story package/i)).not.toBeInTheDocument();
  });

  it('keeps the selected location after switching away from and back to the world surface', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: '新增地点' }));
    await user.type(screen.getByRole('textbox', { name: '地点名称' }), 'Bridge rooftop');
    expect(screen.getByRole('textbox', { name: '地点名称' })).toHaveValue('Bridge rooftop');

    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="character"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );
    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    expect(screen.getByRole('textbox', { name: '地点名称' })).toHaveValue('Bridge rooftop');
  });

  it('keeps the selected core cast or antagonist after switching away from and back to the character surface', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="character"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Retsu Haitani/ }));
    expect(screen.getByRole('textbox', { name: '角色名' })).toHaveValue('Retsu Haitani');
    expect(screen.getByRole('textbox', { name: '致命弱点' })).toHaveValue(
      'Loses power when attention drops to zero.',
    );

    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );
    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="character"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    expect(screen.getByRole('textbox', { name: '角色名' })).toHaveValue('Retsu Haitani');
    expect(screen.getByRole('textbox', { name: '致命弱点' })).toHaveValue(
      'Loses power when attention drops to zero.',
    );
  });

  it('keeps unsaved worldbase edits when rerendering with a fresh surface-specific initialState', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    await user.clear(screen.getByRole('textbox', { name: '世界基础设定' }));
    await user.type(screen.getByRole('textbox', { name: '世界基础设定' }), 'shared draft');

    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="character"
        initialState={{
          source: 'latest-saved',
          state: {
            ...storyPackageFixture,
          },
        }}
      />,
    );

    expect(screen.getByRole('link', { name: '角色' })).toHaveAttribute('aria-current', 'page');

    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: {
            ...storyPackageFixture,
          },
        }}
      />,
    );

    expect(screen.getByRole('textbox', { name: '世界基础设定' })).toHaveDisplayValue(
      'shared draft',
    );
  });

  it('restores the latest saved worldbase draft when reset from the character surface', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    await user.clear(screen.getByRole('textbox', { name: '世界基础设定' }));
    await user.type(screen.getByRole('textbox', { name: '世界基础设定' }), 'reset candidate');

    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="character"
        initialState={{
          source: 'latest-saved',
          state: {
            ...storyPackageFixture,
          },
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: '重置本页' }));

    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: {
            ...storyPackageFixture,
          },
        }}
      />,
    );

    expect(screen.getByRole('textbox', { name: '世界基础设定' })).toHaveDisplayValue(
      storyPackageFixture.worldBase.worldBaseSetting,
    );
    expect(screen.getByText('已恢复到最新保存版本。')).toBeInTheDocument();
  });

  it('applies a fresh same-package initial state when the active worldbase surface does not change', () => {
    const updatedState = {
      ...storyPackageFixture,
      worldBase: {
        ...storyPackageFixture.worldBase,
        worldBaseSetting: 'server refreshed world',
      },
    };

    const { rerender } = render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: updatedState,
        }}
      />,
    );

    expect(screen.getByRole('textbox', { name: '世界基础设定' })).toHaveDisplayValue(
      'server refreshed world',
    );
  });

  it('reloads the latest package state after leaving the shared worldbase surface family', async () => {
    const user = userEvent.setup();
    const updatedStoryPackage = {
      ...storyPackageFixture,
      worldBase: {
        ...storyPackageFixture.worldBase,
        worldBaseSetting: 'server replacement',
      },
    };
    const { rerender } = render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    await user.clear(screen.getByRole('textbox', { name: '世界基础设定' }));
    await user.type(screen.getByRole('textbox', { name: '世界基础设定' }), 'shared draft');

    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="scene-phase-authoring"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: updatedStoryPackage,
        }}
      />,
    );

    rerender(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: updatedStoryPackage,
        }}
      />,
    );

    expect(screen.getByRole('textbox', { name: '世界基础设定' })).toHaveDisplayValue(
      'server replacement',
    );
  });

  it('shows localized save-warning and reset status copy above the current page content', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            kind: 'save_applied_with_warnings',
            requestId: 'worldbase-cast-1',
            packageName: 'sample-scene',
            sectionId: 'worldbase-cast',
            showLocally: true,
            showInGlobalDiagnostics: false,
            warnings: ['主角仍需复核。'],
            reloadedSectionState: storyPackageFixture,
            runtimeImpactSummary: {
              changedFiles: ['world-base.yaml', 'authoring-state.json'],
            },
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: '保存本页' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const pageStatus = screen.getByLabelText('Current page status');
    expect(within(pageStatus).getByText('已保存，但仍有提示：主角仍需复核。')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Page helper')).queryByText('已保存，但仍有提示：主角仍需复核。'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重置本页' }));

    expect(within(screen.getByLabelText('Current page status')).getByText('已恢复到最新保存版本。')).toBeInTheDocument();
  });

  it('shows the helper-save copy above the current page content after a blocked save is repaired', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            kind: 'save_blocked',
            requestId: 'worldbase-cast-1',
            packageName: 'sample-scene',
            sectionId: 'worldbase-cast',
            showLocally: true,
            showInGlobalDiagnostics: false,
            blockingIssues: ['主角阵列尚未准备好。'],
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            saveResult: {
              kind: 'save_applied',
              requestId: 'worldbase-cast-1',
              packageName: 'sample-scene',
              sectionId: 'worldbase-cast',
              showLocally: true,
              showInGlobalDiagnostics: false,
              reloadedSectionState: storyPackageFixture,
              runtimeImpactSummary: {
                changedFiles: ['world-base.yaml', 'authoring-state.json'],
              },
            },
            coordinatorSummary: '页面助手已经补回共享保存路径。',
            usedRepair: true,
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    await user.clear(screen.getByRole('textbox', { name: '世界基础设定' }));
    await user.type(screen.getByRole('textbox', { name: '世界基础设定' }), 'Updated world');
    await user.click(screen.getByRole('button', { name: '保存本页' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const pageStatus = screen.getByLabelText('Current page status');
    expect(within(pageStatus).getByText('已通过页面助手保存。')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Page helper')).queryByText('已通过页面助手保存。')).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Page helper')).queryByText('页面助手已经补回共享保存路径。'),
    ).not.toBeInTheDocument();

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      payload: { uiFields: Record<string, unknown> };
    };

    expect(request.payload.uiFields).toMatchObject({
      worldBaseSetting: 'Updated world',
      hero: expect.objectContaining({
        characterId: expect.stringMatching(/^chr_/),
      }),
      coreCast: expect.arrayContaining([
        expect.objectContaining({
          characterId: expect.stringMatching(/^chr_/),
        }),
      ]),
      antagonists: expect.arrayContaining([
        expect.objectContaining({
          characterId: expect.stringMatching(/^chr_/),
        }),
      ]),
      supportingCast: expect.any(String),
      locationPool: expect.any(String),
    });
    expect(request.payload.uiFields).not.toHaveProperty('mainCharacters');
  });

  it('passes the shared scene cast library into the scene authoring section', () => {
    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="scene-phase-authoring"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    expect(screen.getByTestId('scene-phase-authoring-section-mock')).toBeInTheDocument();
    expect(renderScenePhaseAuthoringSection).toHaveBeenCalled();

    const props = renderScenePhaseAuthoringSection.mock.calls.at(-1)?.[0] as {
      readonly sceneCastLibrary: {
        readonly hero: { readonly characterId: string; readonly name: string };
        readonly coreCast: readonly { readonly characterId: string; readonly name: string }[];
        readonly antagonists: readonly { readonly characterId: string; readonly name: string }[];
      };
      readonly value: {
        readonly sceneSpec: {
          readonly castMode: 'unset' | 'explicit';
          readonly cast?: readonly string[];
        };
      };
    };

    expect(props.sceneCastLibrary.hero.characterId).toBe(storyPackageFixture.worldBase.hero.characterId);
    expect(props.sceneCastLibrary.coreCast).toHaveLength(storyPackageFixture.worldBase.coreCast.length);
    expect(props.sceneCastLibrary.antagonists).toHaveLength(
      storyPackageFixture.worldBase.antagonists.length,
    );
    expect(props.value.sceneSpec.castMode).toBe('explicit');
    expect(props.value.sceneSpec.cast).toEqual([
      storyPackageFixture.worldBase.coreCast[0]!.characterId,
      storyPackageFixture.worldBase.antagonists[0]!.characterId,
    ]);
  });

  it('shows the shared save-path reachability failure above the current page content when the helper cannot connect', async () => {
    const user = userEvent.setup();
    let rejectCoordinatorAssist: ((reason?: unknown) => void) | null = null;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            kind: 'save_blocked',
            requestId: 'worldbase-cast-1',
            packageName: 'sample-scene',
            sectionId: 'worldbase-cast',
            showLocally: true,
            showInGlobalDiagnostics: false,
            blockingIssues: ['主角阵列尚未准备好。'],
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((_resolve, reject) => {
            rejectCoordinatorAssist = reject;
          }),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: '保存本页' }));

    const pageStatus = screen.getByLabelText('Current page status');
    expect(within(pageStatus).getByText('保存被阻止：主角阵列尚未准备好。')).toBeInTheDocument();

    const rejectPendingSave =
      rejectCoordinatorAssist as ((reason?: unknown) => void) | null;

    if (rejectPendingSave) {
      rejectPendingSave(new Error('network down'));
    }

    expect(
      await within(pageStatus).findByText('页面助手无法连通共享保存路径。'),
    ).toBeInTheDocument();
    expect(within(screen.getByLabelText('Page helper')).queryByText('页面助手无法连通共享保存路径。')).not.toBeInTheDocument();
  });

  it('clears the helper-path failure note after resetting the page', async () => {
    const user = userEvent.setup();
    let rejectCoordinatorAssist: ((reason?: unknown) => void) | null = null;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            kind: 'save_blocked',
            requestId: 'worldbase-cast-1',
            packageName: 'sample-scene',
            sectionId: 'worldbase-cast',
            showLocally: true,
            showInGlobalDiagnostics: false,
            blockingIssues: ['主角阵列尚未准备好。'],
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((_resolve, reject) => {
            rejectCoordinatorAssist = reject;
          }),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: '保存本页' }));

    const pageStatus = screen.getByLabelText('Current page status');
    expect(within(pageStatus).getByText('保存被阻止：主角阵列尚未准备好。')).toBeInTheDocument();

    if (rejectCoordinatorAssist) {
      (rejectCoordinatorAssist as (reason?: unknown) => void)(new Error('network down'));
    }

    expect(await within(pageStatus).findByText('页面助手无法连通共享保存路径。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重置本页' }));

    expect(within(pageStatus).getByText('已恢复到最新保存版本。')).toBeInTheDocument();
    expect(
      within(pageStatus).queryByText('页面助手无法连通共享保存路径。'),
    ).not.toBeInTheDocument();
  });

  it('clears the helper-path failure note after a later direct save succeeds', async () => {
    const user = userEvent.setup();
    let rejectCoordinatorAssist: ((reason?: unknown) => void) | null = null;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            kind: 'save_blocked',
            requestId: 'worldbase-cast-1',
            packageName: 'sample-scene',
            sectionId: 'worldbase-cast',
            showLocally: true,
            showInGlobalDiagnostics: false,
            blockingIssues: ['主角阵列尚未准备好。'],
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((_resolve, reject) => {
            rejectCoordinatorAssist = reject;
          }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            kind: 'save_applied',
            requestId: 'worldbase-cast-2',
            packageName: 'sample-scene',
            sectionId: 'worldbase-cast',
            showLocally: true,
            showInGlobalDiagnostics: false,
            reloadedSectionState: storyPackageFixture,
            runtimeImpactSummary: {
              changedFiles: ['world-base.yaml', 'authoring-state.json'],
            },
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: '保存本页' }));

    const pageStatus = screen.getByLabelText('Current page status');
    if (rejectCoordinatorAssist) {
      (rejectCoordinatorAssist as (reason?: unknown) => void)(new Error('network down'));
    }
    expect(await within(pageStatus).findByText('页面助手无法连通共享保存路径。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '保存本页' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    const updatedPageStatus = screen.getByLabelText('Current page status');
    expect(await within(updatedPageStatus).findByText('已保存并归一化。')).toBeInTheDocument();
    expect(
      within(updatedPageStatus).queryByText('页面助手无法连通共享保存路径。'),
    ).not.toBeInTheDocument();
  });

  it('does not render a page-top status region before any local save result exists', () => {
    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="worldbase-cast"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    expect(screen.queryByLabelText('Current page status')).not.toBeInTheDocument();
  });

  it('does not render a page-top status region on the diagnostics workspace', () => {
    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="package-wiring-validation"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    expect(screen.queryByLabelText('Current page status')).not.toBeInTheDocument();
  });

  it('renders agent-management cards from the editor load payload on the diagnostics workspace', () => {
    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="package-wiring-validation"
        activeSurface="world"
        initialState={
          {
            source: 'latest-saved',
            state: storyPackageFixture,
            agentSurfaceItems: [
              {
                agentId: 'gossipelog',
                displayName: 'gossipelog agent',
                responsibilitySummary: '负责追踪已接受剧情后的角色关系状态，并为后续生成提供连续性摘要。',
                skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
                skillDisplayMetadata: [
                  {
                    skillId: 'relationship-update-skill',
                    displayName: 'Relationship Update',
                    description: '在接受新剧情后更新持久关系状态。',
                  },
                  {
                    skillId: 'relationship-injection-skill',
                    displayName: 'Relationship Injection',
                    description: '为下一轮生成准备关系上下文摘要。',
                  },
                ],
                packageConfigPath: 'agents/gossipelog/config.yaml',
                packageStatePath: 'agents/gossipelog/character-relationships.yaml',
                operationalHintLabel: '当前状态：可用',
                latestStateLine: '1 relationship link tracked in the latest state snapshot.',
                latestStateSummary: {
                  statePresence: 'present',
                  lastUpdatedAt: '2026-04-02T08:00:00.000Z',
                  statusLine: 'LEGACY_STATUS_LINE',
                },
              },
            ],
          } as never
        }
      />,
    );

    expect(screen.getByLabelText('sidecar-agent-surface')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'gossipelog agent' })).toBeInTheDocument();
    expect(screen.getByText('1 relationship link tracked in the latest state snapshot.')).toBeInTheDocument();
    expect(screen.getByText('当前状态：可用')).toBeInTheDocument();
    expect(screen.getByText('在接受新剧情后更新持久关系状态。')).toBeInTheDocument();
    expect(screen.queryByText('LEGACY_STATUS_LINE')).not.toBeInTheDocument();
  });

  it('refreshes sidecar-agent cards together with diagnostics when rechecking the package', async () => {
    const user = userEvent.setup();
    const refreshedDiagnostics = buildPackageDiagnostics({
      packageName: 'sample-scene',
      source: 'latest-saved',
      storyPackage: storyPackageFixture,
      recentSaveResults: [],
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...refreshedDiagnostics,
          agentSurfaceItems: [
            {
              agentId: 'gossipelog',
              displayName: 'gossipelog agent',
              responsibilitySummary: '负责追踪已接受剧情后的角色关系状态，并为后续生成提供连续性摘要。',
              skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
              skillDisplayMetadata: [
                {
                  skillId: 'relationship-update-skill',
                  displayName: 'Relationship Update',
                  description: '在接受新剧情后更新持久关系状态。',
                },
                {
                  skillId: 'relationship-injection-skill',
                  displayName: 'Relationship Injection',
                  description: '为下一轮生成准备关系上下文摘要。',
                },
              ],
              packageConfigPath: 'agents/gossipelog/config.yaml',
              packageStatePath: 'agents/gossipelog/character-relationships.yaml',
              operationalHintLabel: '当前状态：需要关注',
              latestStateLine: 'State file is missing. No persisted sidecar state is available yet.',
              latestStateSummary: {
                statePresence: 'missing',
                statusLine:
                  'State file is missing. No persisted sidecar state is available yet.',
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="package-wiring-validation"
        activeSurface="world"
        initialState={
          {
            source: 'latest-saved',
            state: storyPackageFixture,
            agentSurfaceItems: [
              {
                agentId: 'gossipelog',
                displayName: 'gossipelog agent',
                responsibilitySummary: '负责追踪已接受剧情后的角色关系状态，并为后续生成提供连续性摘要。',
                skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
                skillDisplayMetadata: [
                  {
                    skillId: 'relationship-update-skill',
                    displayName: 'Relationship Update',
                    description: '在接受新剧情后更新持久关系状态。',
                  },
                  {
                    skillId: 'relationship-injection-skill',
                    displayName: 'Relationship Injection',
                    description: '为下一轮生成准备关系上下文摘要。',
                  },
                ],
                packageConfigPath: 'agents/gossipelog/config.yaml',
                packageStatePath: 'agents/gossipelog/character-relationships.yaml',
                operationalHintLabel: '当前状态：可用',
                latestStateLine: '1 relationship link tracked in the latest state snapshot.',
                latestStateSummary: {
                  statePresence: 'present',
                  lastUpdatedAt: '2026-04-02T08:00:00.000Z',
                  statusLine: '1 relationship link tracked in the latest state snapshot.',
                },
              },
            ],
          } as never
        }
      />,
    );

    expect(screen.getByText('1 relationship link tracked in the latest state snapshot.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新检查' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/authoring/packages/sample-scene/diagnostics');
    });

    expect(
      await screen.findByText('State file is missing. No persisted sidecar state is available yet.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('1 relationship link tracked in the latest state snapshot.'),
    ).not.toBeInTheDocument();
  });

  it('clears previously loaded remote diagnostics when a later refresh returns non-ok', async () => {
    const user = userEvent.setup();
    const localDiagnostics = buildPackageDiagnostics({
      packageName: 'sample-scene',
      source: 'latest-saved',
      storyPackage: storyPackageFixture,
      recentSaveResults: [],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...localDiagnostics,
            overallStatusView: {
              ...localDiagnostics.overallStatusView,
              summary: 'REMOTE_DIAGNOSTICS_SUMMARY',
            },
            agentSurfaceItems: [
              {
                agentId: 'gossipelog',
                displayName: 'gossipelog agent',
                responsibilitySummary: '负责追踪已接受剧情后的角色关系状态，并为后续生成提供连续性摘要。',
                skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
                skillDisplayMetadata: [
                  {
                    skillId: 'relationship-update-skill',
                    displayName: 'Relationship Update',
                    description: '在接受新剧情后更新持久关系状态。',
                  },
                  {
                    skillId: 'relationship-injection-skill',
                    displayName: 'Relationship Injection',
                    description: '为下一轮生成准备关系上下文摘要。',
                  },
                ],
                packageConfigPath: 'agents/gossipelog/config.yaml',
                packageStatePath: 'agents/gossipelog/character-relationships.yaml',
                operationalHintLabel: '当前状态：需要关注',
                latestStateLine: 'REMOTE_AGENT_SUMMARY',
                latestStateSummary: {
                  statePresence: 'missing',
                  statusLine: 'REMOTE_AGENT_SUMMARY',
                },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(new Response('refresh failed', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="package-wiring-validation"
        activeSurface="world"
        initialState={
          {
            source: 'latest-saved',
            state: storyPackageFixture,
            agentSurfaceItems: [
              {
                agentId: 'gossipelog',
                displayName: 'gossipelog agent',
                responsibilitySummary: '负责追踪已接受剧情后的角色关系状态，并为后续生成提供连续性摘要。',
                skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
                skillDisplayMetadata: [
                  {
                    skillId: 'relationship-update-skill',
                    displayName: 'Relationship Update',
                    description: '在接受新剧情后更新持久关系状态。',
                  },
                  {
                    skillId: 'relationship-injection-skill',
                    displayName: 'Relationship Injection',
                    description: '为下一轮生成准备关系上下文摘要。',
                  },
                ],
                packageConfigPath: 'agents/gossipelog/config.yaml',
                packageStatePath: 'agents/gossipelog/character-relationships.yaml',
                operationalHintLabel: '当前状态：可用',
                latestStateLine: 'INITIAL_AGENT_SUMMARY',
                latestStateSummary: {
                  statePresence: 'present',
                  statusLine: 'INITIAL_AGENT_SUMMARY',
                },
              },
            ],
          } as never
        }
      />,
    );

    expect(screen.getByText('INITIAL_AGENT_SUMMARY')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重新检查' }));
    expect(await screen.findByText('REMOTE_DIAGNOSTICS_SUMMARY')).toBeInTheDocument();
    expect(screen.getByText('REMOTE_AGENT_SUMMARY')).toBeInTheDocument();
    expect(screen.queryByText('INITIAL_AGENT_SUMMARY')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新检查' }));

    await waitFor(() => {
      expect(screen.queryByText('REMOTE_DIAGNOSTICS_SUMMARY')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('REMOTE_AGENT_SUMMARY')).not.toBeInTheDocument();
    expect(screen.getByText('INITIAL_AGENT_SUMMARY')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新检查' })).toBeInTheDocument();
  });

  it('keeps diagnostics workspace stable and exits refreshing state when refresh fetch rejects', async () => {
    const user = userEvent.setup();
    const localDiagnostics = buildPackageDiagnostics({
      packageName: 'sample-scene',
      source: 'latest-saved',
      storyPackage: storyPackageFixture,
      recentSaveResults: [],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...localDiagnostics,
            overallStatusView: {
              ...localDiagnostics.overallStatusView,
              summary: 'REMOTE_DIAGNOSTICS_SUMMARY',
            },
            agentSurfaceItems: [
              {
                agentId: 'gossipelog',
                displayName: 'gossipelog agent',
                responsibilitySummary: '负责追踪已接受剧情后的角色关系状态，并为后续生成提供连续性摘要。',
                skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
                skillDisplayMetadata: [
                  {
                    skillId: 'relationship-update-skill',
                    displayName: 'Relationship Update',
                    description: '在接受新剧情后更新持久关系状态。',
                  },
                  {
                    skillId: 'relationship-injection-skill',
                    displayName: 'Relationship Injection',
                    description: '为下一轮生成准备关系上下文摘要。',
                  },
                ],
                packageConfigPath: 'agents/gossipelog/config.yaml',
                packageStatePath: 'agents/gossipelog/character-relationships.yaml',
                operationalHintLabel: '当前状态：需要关注',
                latestStateLine: 'REMOTE_AGENT_SUMMARY',
                latestStateSummary: {
                  statePresence: 'missing',
                  statusLine: 'REMOTE_AGENT_SUMMARY',
                },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockRejectedValueOnce(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="package-wiring-validation"
        activeSurface="world"
        initialState={
          {
            source: 'latest-saved',
            state: storyPackageFixture,
            agentSurfaceItems: [
              {
                agentId: 'gossipelog',
                displayName: 'gossipelog agent',
                responsibilitySummary: '负责追踪已接受剧情后的角色关系状态，并为后续生成提供连续性摘要。',
                skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
                skillDisplayMetadata: [
                  {
                    skillId: 'relationship-update-skill',
                    displayName: 'Relationship Update',
                    description: '在接受新剧情后更新持久关系状态。',
                  },
                  {
                    skillId: 'relationship-injection-skill',
                    displayName: 'Relationship Injection',
                    description: '为下一轮生成准备关系上下文摘要。',
                  },
                ],
                packageConfigPath: 'agents/gossipelog/config.yaml',
                packageStatePath: 'agents/gossipelog/character-relationships.yaml',
                operationalHintLabel: '当前状态：可用',
                latestStateLine: 'INITIAL_AGENT_SUMMARY',
                latestStateSummary: {
                  statePresence: 'present',
                  statusLine: 'INITIAL_AGENT_SUMMARY',
                },
              },
            ],
          } as never
        }
      />,
    );

    expect(screen.getByText('INITIAL_AGENT_SUMMARY')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重新检查' }));
    expect(await screen.findByText('REMOTE_DIAGNOSTICS_SUMMARY')).toBeInTheDocument();
    expect(screen.getByText('REMOTE_AGENT_SUMMARY')).toBeInTheDocument();
    expect(screen.queryByText('INITIAL_AGENT_SUMMARY')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新检查' }));

    await waitFor(() => {
      expect(screen.queryByText('REMOTE_DIAGNOSTICS_SUMMARY')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('REMOTE_AGENT_SUMMARY')).not.toBeInTheDocument();
    expect(screen.getByText('INITIAL_AGENT_SUMMARY')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'agent 管理' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新检查' })).toBeInTheDocument();
  });

  it('embeds the page helper inside the scene-phase workspace instead of keeping a third outer column', () => {
    const { container } = render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="scene-phase-authoring"
        activeSurface="world"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    const editShell = container.querySelector('.edit-shell');
    expect(editShell).not.toBeNull();
    expect(container.querySelector('.edit-hero')).toBeNull();
    const editLayout = container.querySelector('.edit-layout');
    expect(editLayout).not.toBeNull();
    expect(editLayout).not.toHaveAttribute('style');
    expect(screen.getByText('Shell status')).toBeInTheDocument();
  });
});
