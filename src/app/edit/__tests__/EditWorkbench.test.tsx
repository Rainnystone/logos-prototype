import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { EditWorkbench } from '@/app/edit/EditWorkbench';

describe('EditWorkbench', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the shared shell copy in Chinese while keeping the shell chrome English', () => {
    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="control-modules"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'LOGOS Narrative Editor' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'LOGOS Authoring Editor' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '世界与角色' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=worldbase-cast',
    );
    expect(screen.getByRole('link', { name: '场景与阶段' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '控制模块' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=control-modules',
    );
    expect(screen.getByRole('link', { name: '控制台' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=package-wiring-validation',
    );
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
    expect(within(pageHelper).getByText('控制模块')).toBeInTheDocument();
  });

  it('shows localized save-warning and reset status copy in the shared helper', async () => {
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

    expect(
      await screen.findByText('已保存，但仍有提示：主角仍需复核。'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重置本页' }));

    expect(await screen.findByText('已恢复到最新保存版本。')).toBeInTheDocument();
  });

  it('shows the helper-save copy after a blocked save is repaired through the shared path', async () => {
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

    const pageHelper = screen.getByLabelText('Page helper');
    expect(await within(pageHelper).findByText('已通过页面助手保存。')).toBeInTheDocument();

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

  it('shows the shared save-path reachability failure when the helper cannot connect', async () => {
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
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: '保存本页' }));

    const pageHelper = screen.getByLabelText('Page helper');
    expect(await within(pageHelper).findByText('保存被阻止：主角阵列尚未准备好。')).toBeInTheDocument();

    const rejectPendingSave =
      rejectCoordinatorAssist as ((reason?: unknown) => void) | null;

    if (rejectPendingSave) {
      rejectPendingSave(new Error('network down'));
    }

    expect(
      await within(pageHelper).findByText('页面助手无法连通共享保存路径。'),
    ).toBeInTheDocument();
  });

  it('embeds the page helper inside the scene-phase workspace instead of keeping a third outer column', () => {
    const { container } = render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="scene-phase-authoring"
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
