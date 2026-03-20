'use client';

import { useState } from 'react';

interface PlayerInputProps {
  readonly options: readonly string[];
  readonly isLoading: boolean;
  readonly onSubmit: (input: string) => void;
}

export function PlayerInput({ options, isLoading, onSubmit }: PlayerInputProps) {
  const [freeText, setFreeText] = useState('');

  function submitFreeText() {
    const normalizedInput = freeText.trim();

    if (normalizedInput.length === 0 || isLoading) {
      return;
    }

    onSubmit(normalizedInput);
    setFreeText('');
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Player Input</p>
          <h2>Drive the Next Beat</h2>
        </div>
      </div>
      <div className="option-grid">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="option-card"
            disabled={isLoading}
            aria-label={option}
            onClick={() => onSubmit(option)}
          >
            <span className="option-card__index">{options.indexOf(option) + 1}</span>
            <span>{option}</span>
          </button>
        ))}
      </div>
      <div className="free-text-panel">
        <label className="form-field">
          <span>Free text action</span>
          <textarea
            aria-label="Free text action"
            value={freeText}
            disabled={isLoading}
            placeholder="Or type your own action..."
            onChange={(event) => setFreeText(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submitFreeText();
              }
            }}
          />
        </label>
        <button type="button" disabled={isLoading} onClick={submitFreeText}>
          Submit Action
        </button>
      </div>
    </section>
  );
}
