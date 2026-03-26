import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { EditWorkbench } from '@/app/edit/EditWorkbench';

describe('EditWorkbench', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the initial editor shell with package context and section navigation', () => {
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
    expect(screen.getByRole('link', { name: 'Control Modules' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=control-modules',
    );
    expect(screen.getByRole('link', { name: 'Open Scene' })).toHaveAttribute(
      'href',
      '/play?storyPackage=sample-scene',
    );
    expect(screen.getByRole('link', { name: 'Return to Title' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByText('Package Wiring Validation')).toBeInTheDocument();
  });

  it('shows coordinator guidance in the page helper after a blocked section save', async () => {
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
            blockingIssues: ['Main characters are required.'],
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
              kind: 'save_blocked',
              requestId: 'worldbase-cast-1',
              packageName: 'sample-scene',
              sectionId: 'worldbase-cast',
              showLocally: true,
              showInGlobalDiagnostics: false,
              blockingIssues: ['Main characters are required.'],
            },
            coordinatorSummary:
              'The page helper kept the request local and could not repair the blocking issue.',
            usedRepair: false,
          }),
          {
            status: 400,
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

    await user.click(screen.getByRole('button', { name: 'Save Section' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      '/api/authoring/packages/sample-scene/coordinator',
    );
    expect(
      await screen.findByText(
        'The page helper kept the request local and could not repair the blocking issue.',
      ),
    ).toBeInTheDocument();
  });

  it('submits structured worldbase draft fields through the shared save path', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
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

    await user.clear(screen.getByRole('textbox', { name: 'World Base Setting' }));
    await user.type(screen.getByRole('textbox', { name: 'World Base Setting' }), 'Updated world');
    await user.click(screen.getByRole('button', { name: 'Save Section' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      payload: { uiFields: Record<string, unknown> };
    };

    expect(request.payload.uiFields).toMatchObject({
      worldBaseSetting: 'Updated world',
      hero: expect.any(Object),
      coreCast: expect.any(Array),
      antagonists: expect.any(Array),
      supportingCast: expect.any(String),
      locationPool: expect.any(String),
    });
    expect(request.payload.uiFields).not.toHaveProperty('mainCharacters');
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
