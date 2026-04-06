import type { StoryPackageManagementStorylineRowView } from '@/types';

interface StorylineWorkspaceRowProps {
  readonly packageName: string;
  readonly row: StoryPackageManagementStorylineRowView;
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

export function StorylineWorkspaceRow({ packageName, row }: StorylineWorkspaceRowProps) {
  return (
    <article
      className={`storyline-row ${row.isActive ? 'storyline-row--active' : ''}`}
      aria-label={`${row.displayName} storyline`}
    >
      <div className="storyline-row__header">
        <div>
          <p className="panel-eyebrow">故事线</p>
          <h4>{row.displayName}</h4>
        </div>
        <span className="storyline-row__status">{row.status}</span>
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
            <span
              key={checkpoint.checkpointId}
              className={[
                'storyline-row__checkpoint',
                checkpoint.isHead ? 'storyline-row__checkpoint--head' : '',
                checkpoint.isBranchSource ? 'storyline-row__checkpoint--source' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={`Beat ${checkpoint.acceptedBeatOrdinal}`}
              aria-label={`Beat ${checkpoint.acceptedBeatOrdinal}`}
            />
          ))
        ) : (
          <span className="storyline-row__rail-empty">暂无可视轨道</span>
        )}
      </div>
    </article>
  );
}
