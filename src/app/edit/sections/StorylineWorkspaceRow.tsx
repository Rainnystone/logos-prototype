'use client';

import { useEffect, useRef, useState } from 'react';

import { StorylineDeleteControl } from '@/app/edit/sections/StorylineDeleteControl';
import type { StoryPackageManagementStorylineRowView } from '@/types';

interface StorylineWorkspaceRowProps {
  readonly row: StoryPackageManagementStorylineRowView;
  readonly replacementDisplayName: string | null;
  readonly onSwitchStoryline: (storylineId: string) => Promise<void>;
  readonly onContinueStoryline: (storylineId: string, isActive: boolean) => Promise<void>;
  readonly onCreateFromSource: (storylineId: string) => Promise<void>;
  readonly onBranchFromCheckpoint: (storylineId: string, checkpointId: string) => Promise<void>;
  readonly onRenameDisplayName: (storylineId: string, nextDisplayName: string) => Promise<string>;
  readonly onDeleteStoryline: (storylineId: string) => Promise<void>;
}

function normalizeDisplayName(value: string): string {
  return value.trim();
}

function formatCheckpointButtonLabel(checkpoint: StoryPackageManagementStorylineRowView['checkpointRail'][number]) {
  return `Phase ${checkpoint.phaseIndex} Beat ${checkpoint.beatIndex}`;
}

export function StorylineWorkspaceRow({
  row,
  replacementDisplayName,
  onSwitchStoryline,
  onContinueStoryline,
  onCreateFromSource,
  onBranchFromCheckpoint,
  onRenameDisplayName,
  onDeleteStoryline,
}: StorylineWorkspaceRowProps) {
  const [displayName, setDisplayName] = useState(row.displayName);
  const [draftDisplayName, setDraftDisplayName] = useState(row.displayName);
  const [openCheckpointId, setOpenCheckpointId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    'rename' | 'switch' | 'continue' | 'create' | 'branch' | 'delete' | null
  >(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const renameSubmittingRef = useRef(false);
  const createDisabled = !row.canCreateFromSource || !row.headCheckpointId;
  const continueDisabled = !row.canContinue || pendingAction !== null;

  useEffect(() => {
    setDisplayName(row.displayName);
    setDraftDisplayName(row.displayName);
  }, [row.displayName]);

  useEffect(() => {
    if (!row.checkpointRail.some((checkpoint) => checkpoint.checkpointId === openCheckpointId)) {
      setOpenCheckpointId(null);
    }
  }, [openCheckpointId, row.checkpointRail]);

  async function runRowAction(
    nextPendingAction: NonNullable<typeof pendingAction>,
    action: () => Promise<void>,
  ) {
    setOpenCheckpointId(null);
    setPendingAction(nextPendingAction);
    setFeedback(null);

    try {
      await action();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '操作失败。');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRenameSubmit() {
    if (renameSubmittingRef.current) {
      return;
    }

    setOpenCheckpointId(null);
    const normalizedDraft = normalizeDisplayName(draftDisplayName);
    const normalizedCurrent = normalizeDisplayName(displayName);
    if (normalizedDraft === normalizedCurrent) {
      setDraftDisplayName(displayName);
      setFeedback(null);
      return;
    }

    renameSubmittingRef.current = true;
    setPendingAction('rename');
    setFeedback(null);

    try {
      const nextDisplayName = await onRenameDisplayName(row.storylineId, normalizedDraft);
      setDisplayName(nextDisplayName);
      setDraftDisplayName(nextDisplayName);
    } catch (error) {
      setDraftDisplayName(displayName);
      setFeedback(error instanceof Error ? error.message : '名称更新失败。');
    } finally {
      renameSubmittingRef.current = false;
      setPendingAction(null);
    }
  }

  return (
    <article
      className={`storyline-row ${row.isActive ? 'storyline-row--active' : ''}`}
      aria-label={`${row.displayName} storyline`}
    >
      <div className="storyline-row__header">
        <div className="storyline-row__identity">
          <p className="panel-eyebrow">故事线</p>
          <h4>{displayName}</h4>
          <label className="storyline-row__rename">
            <span className="storyline-row__rename-label">名称</span>
            <input
              aria-label={`故事线名称 ${displayName}`}
              className="storyline-row__rename-input"
              value={draftDisplayName}
              disabled={pendingAction !== null}
              onChange={(event) => {
                setDraftDisplayName(event.target.value);
              }}
              onBlur={() => {
                void handleRenameSubmit();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleRenameSubmit();
                }
              }}
            />
          </label>
        </div>
        <div className="storyline-row__header-meta">
          <span className="storyline-row__status">{row.status}</span>
          <div className="storyline-row__actions">
            <button
              type="button"
              className="storyline-row__action"
              disabled={row.isActive || pendingAction !== null}
              onClick={() => {
                void runRowAction('switch', async () => {
                  await onSwitchStoryline(row.storylineId);
                });
              }}
            >
              {row.isActive ? '当前活跃' : `切换到 ${displayName}`}
            </button>
            <button
              type="button"
              className="storyline-row__action"
              disabled={continueDisabled}
              onClick={() => {
                void runRowAction('continue', async () => {
                  await onContinueStoryline(row.storylineId, row.isActive);
                });
              }}
            >
              {`继续 ${displayName}`}
            </button>
            <button
              type="button"
              className="storyline-row__action"
              disabled={createDisabled || pendingAction !== null}
              onClick={() => {
                void runRowAction('create', async () => {
                  await onCreateFromSource(row.storylineId);
                });
              }}
            >
              {`从当前线派生 ${displayName}`}
            </button>
            <StorylineDeleteControl
              displayName={displayName}
              canDelete={row.canDelete}
              deleteDisabledReason={row.deleteDisabledReason}
              replacementDisplayName={replacementDisplayName}
              disabled={pendingAction !== null}
              onDelete={() => {
                void runRowAction('delete', async () => {
                  await onDeleteStoryline(row.storylineId);
                });
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="storyline-row__rail storyline-row__rail--horizontal"
        aria-label={`${row.displayName} checkpoint rail`}
      >
        {row.checkpointRail.length > 0 ? (
          row.checkpointRail.map((checkpoint, checkpointIndex) => (
            <div key={checkpoint.checkpointId} className="storyline-row__checkpoint-node">
              <span className="storyline-row__checkpoint-phase">
                {checkpointIndex === 0 ||
                row.checkpointRail[checkpointIndex - 1]?.phaseIndex !== checkpoint.phaseIndex
                  ? `Phase ${checkpoint.phaseIndex}`
                  : ''}
              </span>
              <button
                type="button"
                className={[
                  'storyline-row__checkpoint',
                  checkpoint.isHead ? 'storyline-row__checkpoint--head' : '',
                  checkpoint.isBranchSource ? 'storyline-row__checkpoint--source' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={formatCheckpointButtonLabel(checkpoint)}
                aria-label={formatCheckpointButtonLabel(checkpoint)}
                disabled={pendingAction !== null}
                onClick={() => {
                  setFeedback(null);
                  setOpenCheckpointId((currentCheckpointId) =>
                    currentCheckpointId === checkpoint.checkpointId ? null : checkpoint.checkpointId,
                  );
                }}
              />
              <span className="storyline-row__checkpoint-beat">{`Beat ${checkpoint.beatIndex}`}</span>
              {openCheckpointId === checkpoint.checkpointId ? (
                <div className="storyline-row__branch-drawer storyline-row__branch-drawer--visible">
                  <div className="storyline-row__branch-actions">
                    <button
                      type="button"
                      className="storyline-row__branch-button"
                      disabled={pendingAction !== null}
                      onClick={() => {
                        void runRowAction('branch', async () => {
                          await onBranchFromCheckpoint(row.storylineId, checkpoint.checkpointId);
                        });
                      }}
                    >
                      确认
                    </button>
                    <button
                      type="button"
                      className="storyline-row__branch-button storyline-row__branch-button--ghost"
                      disabled={pendingAction !== null}
                      onClick={() => {
                        setOpenCheckpointId(null);
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <span className="storyline-row__rail-empty">暂无可视轨道</span>
        )}
      </div>

      {feedback ? <p className="storyline-row__feedback">{feedback}</p> : null}
    </article>
  );
}
