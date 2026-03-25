'use client';

import type { ChangeEvent } from 'react';

import type { WorldBase } from '@/types';

type WorldBaseField = keyof WorldBase;

const FIELD_LABELS: Record<WorldBaseField, string> = {
  mainCharacters: 'Main Characters',
  npcCharacters: 'Supporting Cast',
  locationPatch: 'Location Patch',
};

const FIELD_DESCRIPTIONS: Record<WorldBaseField, string> = {
  mainCharacters: 'Keep the world base, hero, main cast, and antagonists together in one block.',
  npcCharacters: 'Use a lightweight person-per-line format when the cast can be split safely.',
  locationPatch: 'Keep the location and scene-element pool concise and easy to scan.',
};

function formatPreview(value: string): string {
  const firstLine = value.replace(/\r\n/g, '\n').trim().split('\n')[0] ?? '';
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
}

interface WorldBaseCastSectionProps {
  readonly packageName: string;
  readonly value: WorldBase;
  readonly onChange: (nextValue: WorldBase) => void;
  readonly onSubmit: () => void;
  readonly onReset: () => void;
  readonly statusMessage?: string | undefined;
  readonly isSaving?: boolean;
}

export function WorldBaseCastSection({
  packageName,
  value,
  onChange,
  onSubmit,
  onReset,
  statusMessage,
  isSaving = false,
}: WorldBaseCastSectionProps) {
  const handleFieldChange =
    (field: WorldBaseField) => (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange({
        ...value,
        [field]: event.currentTarget.value,
      });
    };

  return (
    <section className="panel worldbase-cast">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Section Slice</p>
          <h2>WorldBase & Cast</h2>
          <p className="panel-note">
            Deterministic world-base editing for the first shared save path.
          </p>
        </div>
        <p className="panel-note">{packageName}</p>
      </div>

      <div className="worldbase-cast__layout">
        <nav className="worldbase-cast__rail" aria-label="WorldBase summaries">
          {(Object.keys(FIELD_LABELS) as WorldBaseField[]).map((field) => (
            <button
              key={field}
              type="button"
              className="worldbase-cast__summary"
              aria-label={FIELD_LABELS[field]}
              onClick={() => {
                const preview = formatPreview(value[field]);
                if (preview.length > 0) {
                  onChange({
                    ...value,
                    [field]: value[field],
                  });
                }
              }}
            >
              <span className="worldbase-cast__summary-label">{FIELD_LABELS[field]}</span>
              <span aria-hidden="true" className="worldbase-cast__summary-preview">
                {formatPreview(value[field])}
              </span>
            </button>
          ))}
        </nav>

        <section className="worldbase-cast__editor">
          <div>
            <p className="panel-eyebrow">Active Block</p>
            <h3>{FIELD_LABELS.mainCharacters}</h3>
            <p className="panel-note">{FIELD_DESCRIPTIONS.mainCharacters}</p>
          </div>

          <label className="form-field">
            <span className="form-label">{FIELD_LABELS.mainCharacters}</span>
            <textarea
              aria-label={FIELD_LABELS.mainCharacters}
              value={value.mainCharacters}
              onChange={handleFieldChange('mainCharacters')}
            />
          </label>

          <label className="form-field">
            <span className="form-label">{FIELD_LABELS.npcCharacters}</span>
            <textarea
              aria-label={FIELD_LABELS.npcCharacters}
              value={value.npcCharacters}
              onChange={handleFieldChange('npcCharacters')}
            />
          </label>

          <label className="form-field">
            <span className="form-label">{FIELD_LABELS.locationPatch}</span>
            <textarea
              aria-label={FIELD_LABELS.locationPatch}
              value={value.locationPatch}
              onChange={handleFieldChange('locationPatch')}
            />
          </label>

          <div className="panel-actions">
            <button type="button" className="secondary-link" onClick={onReset}>
              Reset Section
            </button>
            <button type="button" className="primary-link" disabled={isSaving} onClick={onSubmit}>
              {isSaving ? 'Saving...' : 'Save Section'}
            </button>
          </div>

          {statusMessage ? <p className="panel-note">{statusMessage}</p> : null}
        </section>
      </div>
    </section>
  );
}
