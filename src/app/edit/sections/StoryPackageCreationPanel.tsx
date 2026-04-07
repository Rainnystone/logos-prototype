'use client';

interface StoryPackageCreationPanelProps {
  readonly draftDisplayName: string;
  readonly slugPreview: string;
  readonly feedback: string | null;
  readonly submitting: boolean;
  readonly onChangeDraftDisplayName: (value: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function StoryPackageCreationPanel({
  draftDisplayName,
  slugPreview,
  feedback,
  submitting,
  onChangeDraftDisplayName,
  onConfirm,
  onCancel,
}: StoryPackageCreationPanelProps) {
  return (
    <section className="story-package-creation-panel panel" aria-label="Story package creation">
      <div className="story-package-creation-panel__header">
        <p className="panel-eyebrow">故事包</p>
        <h3>新建故事包</h3>
      </div>

      <label className="story-package-creation-panel__field">
        <span className="story-package-creation-panel__label">故事包名称</span>
        <input
          aria-label="故事包名称"
          value={draftDisplayName}
          disabled={submitting}
          onChange={(event) => onChangeDraftDisplayName(event.target.value)}
        />
      </label>

      <p className="story-package-creation-panel__slug">{`slug: ${slugPreview}`}</p>
      {feedback ? <p className="story-package-creation-panel__feedback">{feedback}</p> : null}

      <div className="story-package-creation-panel__actions">
        <button type="button" className="story-package-creation-panel__action" disabled={submitting} onClick={onConfirm}>
          确认创建
        </button>
        <button
          type="button"
          className="story-package-creation-panel__action story-package-creation-panel__action--ghost"
          disabled={submitting}
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </section>
  );
}
