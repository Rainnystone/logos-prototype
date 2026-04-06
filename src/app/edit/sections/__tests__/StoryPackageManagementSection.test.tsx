import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StoryPackageManagementSection } from '@/app/edit/sections/StoryPackageManagementSection';
import {
  workspaceViewFixture,
  workspaceViewWithoutHeadFixture,
} from '@/app/edit/sections/__tests__/story-package-management.fixtures';

const mockPush = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe('StoryPackageManagementSection', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, displayName: 'Side Route' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders a two-column package selector plus storyline workspace layout', () => {
    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    expect(screen.getByLabelText('Story package selector')).toBeInTheDocument();
    expect(screen.getByLabelText('Storyline workspace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'sample-scene' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('renders the package headline while keeping storyline rows focused on actions and rail only', () => {
    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    expect(screen.getByRole('heading', { name: 'sample-scene' })).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.queryAllByText('来源')).toHaveLength(0);
    expect(screen.queryAllByText(/来源：/)).toHaveLength(0);
    expect(screen.queryAllByText('当前头部')).toHaveLength(0);
    expect(screen.queryAllByText(/当前头部：/)).toHaveLength(0);
    expect(screen.queryAllByText('头部摘要')).toHaveLength(0);
    expect(screen.queryAllByText(/头部摘要：/)).toHaveLength(0);
    expect(screen.queryAllByText('继续状态')).toHaveLength(0);
    expect(screen.queryAllByText('从当前包')).toHaveLength(0);
  });

  it('renders package switching as bounded navigation instead of client-side repository parsing', () => {
    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    expect(screen.getByRole('link', { name: 'alt-scene' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=alt-scene&section=story-package-management',
    );
  });

  it('shows ready package selector cards as package-name-only choices', () => {
    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    expect(screen.getByRole('link', { name: 'sample-scene' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'alt-scene' })).toBeInTheDocument();
    expect(screen.queryByText('Sample Scene')).not.toBeInTheDocument();
    expect(screen.queryByText(/个 Phase/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/The corridor opens into daylight\./i)).not.toBeInTheDocument();
  });

  it('keeps the active package visually distinct in the name-only selector', () => {
    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    expect(screen.getByRole('link', { name: 'sample-scene' }).closest('.story-package-selector__card')).toHaveClass(
      'story-package-selector__card--active',
    );
    expect(screen.getByRole('link', { name: 'alt-scene' }).closest('.story-package-selector__card')).not.toHaveClass(
      'story-package-selector__card--active',
    );
  });

  it('keeps the workspace structure visible when a storyline has no head checkpoint', () => {
    render(
      <StoryPackageManagementSection
        packageName="sample-scene"
        view={workspaceViewWithoutHeadFixture}
      />,
    );

    expect(screen.getByLabelText('Story package selector')).toBeInTheDocument();
    expect(screen.getByLabelText('Storyline workspace')).toBeInTheDocument();
    expect(screen.getByText('Main Line')).toBeInTheDocument();
  });

  it('opens a split-down confirm drawer when a beat dot is clicked and closes it on cancel', async () => {
    const user = userEvent.setup();
    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    const branchRow = screen.getByLabelText('Branch Line storyline');
    expect(within(branchRow).queryAllByRole('button', { name: '确认', hidden: true })).toHaveLength(0);
    expect(within(branchRow).queryAllByRole('button', { name: '取消', hidden: true })).toHaveLength(0);
    await user.click(within(branchRow).getByRole('button', { name: 'Phase 1 Beat 2' }));

    expect(within(branchRow).getByRole('button', { name: '确认' })).toBeInTheDocument();
    expect(within(branchRow).getByRole('button', { name: '取消' })).toBeInTheDocument();
    expect(within(branchRow).queryByText(/分出新故事线/i)).not.toBeInTheDocument();
    await user.click(within(branchRow).getByRole('button', { name: '取消' }));

    await waitFor(() => {
      expect(within(branchRow).queryByRole('button', { name: '确认' })).not.toBeInTheDocument();
    });
    expect(within(branchRow).queryAllByRole('button', { name: '确认', hidden: true })).toHaveLength(0);
  });

  it('clears an open beat drawer when an unrelated row action starts', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ kind: 'switch_active_storyline', activeStorylineId: 'storyline_branch' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    const branchRow = screen.getByLabelText('Branch Line storyline');
    await user.click(within(branchRow).getByRole('button', { name: 'Phase 1 Beat 2' }));
    expect(within(branchRow).getByRole('button', { name: '确认' })).toBeInTheDocument();

    await user.click(within(branchRow).getByRole('button', { name: '切换到 Branch Line' }));

    await waitFor(() => {
      expect(within(branchRow).queryByRole('button', { name: '确认' })).not.toBeInTheDocument();
    });
  });

  it('confirms a beat dot by calling branch_from_checkpoint and then refreshing the workspace', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ kind: 'branch_from_checkpoint', activeStorylineId: 'storyline_new' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    const branchRow = screen.getByLabelText('Branch Line storyline');
    await user.click(within(branchRow).getByRole('button', { name: 'Phase 1 Beat 2' }));
    await user.click(within(branchRow).getByRole('button', { name: '确认' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/authoring/packages/sample-scene/storylines/actions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"kind":"branch_from_checkpoint"'),
        }),
      );
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('continues an inactive row by switching it first and then navigating into the world editor flow', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ kind: 'switch_active_storyline', activeStorylineId: 'storyline_branch' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    await user.click(screen.getByRole('button', { name: '继续 Branch Line' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/authoring/packages/sample-scene/storylines/actions',
        expect.objectContaining({
          body: expect.stringContaining('"kind":"switch_active_storyline"'),
        }),
      );
    });
    expect(mockPush).toHaveBeenCalledWith(
      '/edit?storyPackage=sample-scene&section=worldbase-cast&surface=world',
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('switches to another storyline from a row action without leaving 故事包管理', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ kind: 'switch_active_storyline', activeStorylineId: 'storyline_branch' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    await user.click(screen.getByRole('button', { name: '切换到 Branch Line' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/authoring/packages/sample-scene/storylines/actions',
        expect.objectContaining({
          body: expect.stringContaining('"kind":"switch_active_storyline"'),
        }),
      );
    });
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('creates a new storyline from the source row action and refreshes into the new active row', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ kind: 'create_from_source', activeStorylineId: 'storyline_created' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    await user.click(screen.getByRole('button', { name: '从当前线派生 Branch Line' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/authoring/packages/sample-scene/storylines/actions',
        expect.objectContaining({
          body: expect.stringContaining('"kind":"create_from_source"'),
        }),
      );
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('disables create-from-source when the row has no head checkpoint', () => {
    render(
      <StoryPackageManagementSection
        packageName="sample-scene"
        view={workspaceViewWithoutHeadFixture}
      />,
    );

    expect(screen.getByRole('button', { name: '从当前线派生 Main Line' })).toBeDisabled();
  });

  it('submits inline rename through the metadata-only action seam on Enter while preserving internal whitespace', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ kind: 'rename_display_name', displayName: 'Side   Route' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    const renameInput = screen.getByRole('textbox', { name: '故事线名称 Main Line' });
    await user.clear(renameInput);
    await user.type(renameInput, '  Side   Route  {enter}');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/authoring/packages/sample-scene/storylines/actions',
        expect.objectContaining({
          body: expect.stringContaining('"nextDisplayName":"Side   Route"'),
        }),
      );
    });
  });

  it('renders dynamic phase and beat labels from checkpointRail as the history extends across phases', () => {
    const extendedView = {
      ...workspaceViewFixture,
      storylines: workspaceViewFixture.storylines.map((row) =>
        row.storylineId === 'storyline_branch'
          ? {
              ...row,
              headCheckpointId: 'chk_06',
              headSummary: 'Beat 6 · Branch reaches the phase-two control room',
              checkpointRail: [
                {
                  checkpointId: 'chk_01',
                  acceptedBeatOrdinal: 1,
                  phaseIndex: 1,
                  beatIndex: 1,
                  isHead: false,
                  isBranchSource: false,
                },
                {
                  checkpointId: 'chk_02',
                  acceptedBeatOrdinal: 2,
                  phaseIndex: 1,
                  beatIndex: 2,
                  isHead: false,
                  isBranchSource: true,
                },
                {
                  checkpointId: 'chk_04',
                  acceptedBeatOrdinal: 4,
                  phaseIndex: 1,
                  beatIndex: 4,
                  isHead: false,
                  isBranchSource: false,
                },
                {
                  checkpointId: 'chk_05',
                  acceptedBeatOrdinal: 5,
                  phaseIndex: 2,
                  beatIndex: 1,
                  isHead: false,
                  isBranchSource: false,
                },
                {
                  checkpointId: 'chk_06',
                  acceptedBeatOrdinal: 6,
                  phaseIndex: 2,
                  beatIndex: 2,
                  isHead: true,
                  isBranchSource: false,
                },
              ],
            }
          : row,
      ),
    };

    render(<StoryPackageManagementSection packageName="sample-scene" view={extendedView} />);

    const branchRow = screen.getByLabelText('Branch Line storyline');
    expect(within(branchRow).getByLabelText('Branch Line checkpoint rail')).toHaveClass(
      'storyline-row__rail--horizontal',
    );
    expect(within(branchRow).getByText('Phase 1')).toBeInTheDocument();
    expect(within(branchRow).getByText('Phase 2')).toBeInTheDocument();
    expect(within(branchRow).getAllByText(/^Beat \d+$/)).toHaveLength(5);
    expect(within(branchRow).getByRole('button', { name: 'Phase 1 Beat 4' })).toBeInTheDocument();
    expect(within(branchRow).getByRole('button', { name: 'Phase 2 Beat 2' })).toBeInTheDocument();
  });

  it('treats an unchanged normalized rename as success without calling the action route', async () => {
    const user = userEvent.setup();
    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    const renameInput = screen.getByRole('textbox', { name: '故事线名称 Main Line' });
    await user.clear(renameInput);
    await user.type(renameInput, '  Main Line  ');
    await user.tab();

    await waitFor(() => {
      expect(renameInput).toHaveValue('Main Line');
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
