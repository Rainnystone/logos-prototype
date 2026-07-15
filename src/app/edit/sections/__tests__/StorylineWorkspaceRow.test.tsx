import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StorylineWorkspaceRow } from '@/app/edit/sections/StorylineWorkspaceRow';
import type { StoryPackageManagementStorylineRowView } from '@/types';

function buildStorylineRow(
  overrides: Partial<StoryPackageManagementStorylineRowView> = {},
): StoryPackageManagementStorylineRowView {
  return {
    storylineId: 'storyline-1',
    displayName: 'Main Line',
    status: 'active',
    isActive: true,
    sourceCheckpointId: null,
    headCheckpointId: 'checkpoint-2',
    headSummary: 'Latest beat summary',
    canCreateFromSource: true,
    canContinue: true,
    canDelete: false,
    deleteDisabledReason: 'Cannot delete the active storyline',
    checkpointRail: [
      {
        checkpointId: 'checkpoint-1',
        acceptedBeatOrdinal: 1,
        phaseIndex: 1,
        beatIndex: 1,
        isHead: false,
        isBranchSource: true,
      },
      {
        checkpointId: 'checkpoint-2',
        acceptedBeatOrdinal: 2,
        phaseIndex: 1,
        beatIndex: 2,
        isHead: true,
        isBranchSource: false,
      },
    ],
    ...overrides,
  };
}

describe('StorylineWorkspaceRow', () => {
  it('renders the storyline display name and status', () => {
    render(
      <StorylineWorkspaceRow
        row={buildStorylineRow()}
        replacementDisplayName={null}
        onSwitchStoryline={vi.fn()}
        onContinueStoryline={vi.fn()}
        onCreateFromSource={vi.fn()}
        onBranchFromCheckpoint={vi.fn()}
        onRenameDisplayName={vi.fn()}
        onDeleteStoryline={vi.fn()}
      />,
    );

    expect(screen.getByText('Main Line')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('opens the branch drawer when a checkpoint button is clicked and closes on cancel', async () => {
    const user = userEvent.setup();

    render(
      <StorylineWorkspaceRow
        row={buildStorylineRow()}
        replacementDisplayName={null}
        onSwitchStoryline={vi.fn()}
        onContinueStoryline={vi.fn()}
        onCreateFromSource={vi.fn()}
        onBranchFromCheckpoint={vi.fn()}
        onRenameDisplayName={vi.fn()}
        onDeleteStoryline={vi.fn()}
      />,
    );

    const checkpointButton = screen.getByRole('button', { name: 'Phase 1 Beat 2' });

    expect(screen.queryByRole('button', { name: '确认' })).not.toBeInTheDocument();

    await user.click(checkpointButton);

    expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(screen.queryByRole('button', { name: '确认' })).not.toBeInTheDocument();
  });

  it('toggles the branch drawer closed when the same checkpoint button is clicked again', async () => {
    const user = userEvent.setup();

    render(
      <StorylineWorkspaceRow
        row={buildStorylineRow()}
        replacementDisplayName={null}
        onSwitchStoryline={vi.fn()}
        onContinueStoryline={vi.fn()}
        onCreateFromSource={vi.fn()}
        onBranchFromCheckpoint={vi.fn()}
        onRenameDisplayName={vi.fn()}
        onDeleteStoryline={vi.fn()}
      />,
    );

    const checkpointButton = screen.getByRole('button', { name: 'Phase 1 Beat 1' });

    await user.click(checkpointButton);

    expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument();

    await user.click(checkpointButton);

    expect(screen.queryByRole('button', { name: '确认' })).not.toBeInTheDocument();
  });

  it('calls onBranchFromCheckpoint when the branch is confirmed', async () => {
    const user = userEvent.setup();
    const onBranchFromCheckpoint = vi.fn();

    render(
      <StorylineWorkspaceRow
        row={buildStorylineRow()}
        replacementDisplayName={null}
        onSwitchStoryline={vi.fn()}
        onContinueStoryline={vi.fn()}
        onCreateFromSource={vi.fn()}
        onBranchFromCheckpoint={onBranchFromCheckpoint}
        onRenameDisplayName={vi.fn()}
        onDeleteStoryline={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Phase 1 Beat 1' }));
    await user.click(screen.getByRole('button', { name: '确认' }));

    expect(onBranchFromCheckpoint).toHaveBeenCalledWith('storyline-1', 'checkpoint-1');
  });

  it('renders a placeholder rail when the checkpoint rail is empty', () => {
    render(
      <StorylineWorkspaceRow
        row={buildStorylineRow({ checkpointRail: [] })}
        replacementDisplayName={null}
        onSwitchStoryline={vi.fn()}
        onContinueStoryline={vi.fn()}
        onCreateFromSource={vi.fn()}
        onBranchFromCheckpoint={vi.fn()}
        onRenameDisplayName={vi.fn()}
        onDeleteStoryline={vi.fn()}
      />,
    );

    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Beat 1')).toBeInTheDocument();
  });
});
