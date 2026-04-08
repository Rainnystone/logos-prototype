'use client';

import { MAX_TEXT_IMPORT_SOURCE_LENGTH } from '@/types/storyline-management';

export type StoryPackageCreationMode = 'blank' | 'text_import';

interface StoryPackageCreationPanelProps {
  readonly mode: StoryPackageCreationMode;
  readonly draftDisplayName: string;
  readonly sourceText: string;
  readonly slugPreview: string;
  readonly feedback: string | null;
  readonly pendingCopy?: string | null;
  readonly runtimeConfigNotice?: string | null;
  readonly submitting: boolean;
  readonly onChangeMode: (value: StoryPackageCreationMode) => void;
  readonly onChangeDraftDisplayName: (value: string) => void;
  readonly onChangeSourceText: (value: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function StoryPackageCreationPanel({
  mode,
  draftDisplayName,
  sourceText,
  slugPreview,
  feedback,
  pendingCopy,
  runtimeConfigNotice,
  submitting,
  onChangeMode,
  onChangeDraftDisplayName,
  onChangeSourceText,
  onConfirm,
  onCancel,
}: StoryPackageCreationPanelProps) {
  return (
    <section className="story-package-creation-panel panel" aria-label="Story package creation">
      <div className="story-package-creation-panel__header">
        <p className="panel-eyebrow">故事包</p>
        <h3>新建故事包</h3>
      </div>

      <fieldset className="story-package-creation-panel__modes">
        <legend className="story-package-creation-panel__label">创建方式</legend>
        <label className="story-package-creation-panel__mode-option">
          <input
            type="radio"
            name="story-package-creation-mode"
            aria-label="空白创建"
            checked={mode === 'blank'}
            disabled={submitting}
            onChange={() => onChangeMode('blank')}
          />
          <span>空白创建</span>
        </label>
        <label className="story-package-creation-panel__mode-option">
          <input
            type="radio"
            name="story-package-creation-mode"
            aria-label="文本导入"
            checked={mode === 'text_import'}
            disabled={submitting}
            onChange={() => onChangeMode('text_import')}
          />
          <span>文本导入</span>
        </label>
      </fieldset>

      <label className="story-package-creation-panel__field">
        <span className="story-package-creation-panel__label">
          {mode === 'text_import' ? '故事包名称（可选）' : '故事包名称'}
        </span>
        <input
          aria-label={mode === 'text_import' ? '故事包名称（可选）' : '故事包名称'}
          value={draftDisplayName}
          disabled={submitting}
          onChange={(event) => onChangeDraftDisplayName(event.target.value)}
        />
      </label>

      {mode === 'text_import' ? (
        <label className="story-package-creation-panel__field story-package-creation-panel__field--wide">
          <span className="story-package-creation-panel__label">导入文本</span>
          <textarea
            aria-label="导入文本"
            value={sourceText}
            maxLength={MAX_TEXT_IMPORT_SOURCE_LENGTH}
            disabled={submitting}
            onChange={(event) => onChangeSourceText(event.target.value)}
          />
          <span className="story-package-creation-panel__counter">
            {`${sourceText.length} / ${MAX_TEXT_IMPORT_SOURCE_LENGTH}`}
          </span>
        </label>
      ) : null}

      <p className="story-package-creation-panel__slug">{`slug: ${slugPreview}`}</p>
      {runtimeConfigNotice ? (
        <p className="story-package-creation-panel__notice">{runtimeConfigNotice}</p>
      ) : null}
      {pendingCopy ? <p className="story-package-creation-panel__pending">{pendingCopy}</p> : null}
      <p className="story-package-creation-panel__feedback" aria-label="创建反馈">
        {feedback ?? '\u00a0'}
      </p>

      <div className="story-package-creation-panel__actions">
        <button
          type="button"
          className="story-package-creation-panel__action"
          disabled={submitting}
          onClick={onConfirm}
        >
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
