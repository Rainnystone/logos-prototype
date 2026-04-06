'use client';

import { useEffect, useRef, useState } from 'react';

import type { StoryPackageManagementStorylineRowView } from '@/types';

interface StorylineWorkspaceRowProps {
  readonly packageName: string;
  readonly row: StoryPackageManagementStorylineRowView;
  readonly onSwitchStoryline: (storylineId: string) => Promise<void>;
  readonly onContinueStoryline: (storylineId: string, isActive: boolean) => Promise<void>;
  readonly onCreateFromSource: (storylineId: string) => Promise<void>;
  readonly onBranchFromCheckpoint: (storylineId: string, checkpointId: string) => Promise<void>;
  readonly onRenameDisplayName: (storylineId: string, nextDisplayName: string) => Promise<string>;
}

function getCheckpointOrdinal(
  row: StoryPackageManagementStorylineRowView,
  checkpointId: string | null,
): number | null {
  if (!checkpointId) {
    return null;
  }

  return row.checkpointRail.find((checkpoint) => checkpoint.checkpointId === checkpointId)
    ?.acceptedBeatOrdinal ?? null;
}

function formatSourceText(row: StoryPackageManagementStorylineRowView): string {
  if (!row.sourceCheckpointId) {
    return '来源：原点';
  }

  const sourceBeatOrdinal = getCheckpointOrdinal(row, row.sourceCheckpointId);
  if (sourceBeatOrdinal) {
    return `来源：从 Beat ${sourceBeatOrdinal} 分出`;
  }

  return `来源：${row.sourceCheckpointId}`;
}

function formatHeadText(row: StoryPackageManagementStorylineRowView): string {
  if (!row.headCheckpointId) {
    return '当前头部：暂无头部';
  }

  const headBeatOrdinal = getCheckpointOrdinal(row, row.headCheckpointId);
  const beatPrefix = headBeatOrdinal ? `Beat ${headBeatOrdinal}` : row.headCheckpointId;

  return `当前头部：${beatPrefix}`;
}

function formatHeadSummaryText(row: StoryPackageManagementStorylineRowView): string {
  if (!row.headSummary) {
    return '头部摘要：暂无';
  }

  return `头部摘要：${row.headSummary}`;
}

function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function StorylineWorkspaceRow({
  packageName,
  row,
  onSwitchStoryline,
  onContinueStoryline,
  onCreateFromSource,
  onBranchFromCheckpoint,
  onRenameDisplayName,
}: StorylineWorkspaceRowProps) {
  const [displayName, setDisplayName] = useState(row.displayName);
  const [draftDisplayName, setDraftDisplayName] = useState(row.displayName);
  const [openCheckpointId, setOpenCheckpointId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    'rename' | 'switch' | 'continue' | 'create' | 'branch' | null
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
    setPendingAction(nextPendingAction);
    setFeedback(null);

    try {
      await action();
      if (nextPendingAction === 'branch') {
        setOpenCheckpointId(null);
      }
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
          </div>
        </div>
      </div>

      <dl className="storyline-row__facts">
        <div>
          <dt>来源</dt>
          <dd>{formatSourceText(row)}</dd>
        </div>
        <div>
          <dt>当前头部</dt>
          <dd>{formatHeadText(row)}</dd>
        </div>
        <div>
          <dt>头部摘要</dt>
          <dd>{formatHeadSummaryText(row)}</dd>
        </div>
        <div>
          <dt>继续状态</dt>
          <dd>{row.canContinue ? '可继续' : '不可继续'}</dd>
        </div>
        <div>
          <dt>从当前包</dt>
          <dd>{packageName}</dd>
        </div>
      </dl>

      <div className="storyline-row__rail" aria-label={`${row.displayName} checkpoint rail`}>
        {row.checkpointRail.length > 0 ? (
          row.checkpointRail.map((checkpoint) => (
            <div key={checkpoint.checkpointId} className="storyline-row__checkpoint-node">
              <button
                type="button"
                className={[
                  'storyline-row__checkpoint',
                  checkpoint.isHead ? 'storyline-row__checkpoint--head' : '',
                  checkpoint.isBranchSource ? 'storyline-row__checkpoint--source' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={`Beat ${checkpoint.acceptedBeatOrdinal}`}
                aria-label={`Beat ${checkpoint.acceptedBeatOrdinal}`}
                disabled={pendingAction !== null}
                onClick={() => {
                  setFeedback(null);
                  setOpenCheckpointId((currentCheckpointId) =>
                    currentCheckpointId === checkpoint.checkpointId ? null : checkpoint.checkpointId,
                  );
                }}
              />
              <div
                className={[
                  'storyline-row__branch-drawer',
                  openCheckpointId === checkpoint.checkpointId
                    ? 'storyline-row__branch-drawer--open'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden={openCheckpointId !== checkpoint.checkpointId}
              >
                <p className="storyline-row__branch-copy">
                  {`从 Beat ${checkpoint.acceptedBeatOrdinal} 分出新故事线？`}
                </p>
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
