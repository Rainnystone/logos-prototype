'use client';

import { useEffect, useState } from 'react';

interface StorylineDeleteControlProps {
  readonly displayName: string;
  readonly canDelete: boolean;
  readonly deleteDisabledReason: string | null;
  readonly disabled: boolean;
  readonly onDelete: () => void;
}

export function StorylineDeleteControl({
  displayName,
  canDelete,
  deleteDisabledReason,
  disabled,
  onDelete,
}: StorylineDeleteControlProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (disabled) {
      setConfirming(false);
    }
  }, [disabled]);

  return (
    <div className="storyline-delete-control">
      {confirming && canDelete ? (
        <div className="storyline-delete-control__confirm">
          <button
            type="button"
            className="storyline-row__action storyline-delete-control__action storyline-delete-control__action--danger"
            disabled={disabled}
            onClick={onDelete}
          >
            确认删除
          </button>
          <button
            type="button"
            className="storyline-row__action storyline-delete-control__action"
            disabled={disabled}
            onClick={() => {
              setConfirming(false);
            }}
          >
            取消删除
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="storyline-row__action storyline-delete-control__action"
          disabled={!canDelete || disabled}
          aria-label={`删除 ${displayName}`}
          onClick={() => {
            setConfirming(true);
          }}
        >
          {`删除 ${displayName}`}
        </button>
      )}

      {!canDelete && deleteDisabledReason ? (
        <p className="storyline-delete-control__reason">{deleteDisabledReason}</p>
      ) : null}
    </div>
  );
}
