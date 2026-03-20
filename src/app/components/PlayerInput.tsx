'use client';

import { useState } from 'react';

const FIXED_OPTION_SLOT_COUNT = 4;

interface PlayerInputProps {
  readonly options: readonly string[];
  readonly isLoading: boolean;
  readonly disabled?: boolean | undefined;
  readonly variant?: 'panel' | 'embedded' | undefined;
  readonly onSubmit: (input: string) => void;
}

interface OptionSlot {
  readonly label: string;
  readonly value: string | null;
}

function buildOptionSlots(options: readonly string[]): readonly OptionSlot[] {
  return Array.from({ length: FIXED_OPTION_SLOT_COUNT }, (_, index) => {
    const option = options[index];

    if (option) {
      return {
        label: option,
        value: option,
      };
    }

    return {
      label: `Awaiting option ${index + 1}`,
      value: null,
    };
  });
}

export function PlayerInput({
  options,
  isLoading,
  disabled = false,
  variant = 'panel',
  onSubmit,
}: PlayerInputProps) {
  const [freeText, setFreeText] = useState('');
  const isInputDisabled = isLoading || disabled;
  const optionSlots = buildOptionSlots(options);

  function submitFreeText() {
    const normalizedInput = freeText.trim();

    if (normalizedInput.length === 0 || isInputDisabled) {
      return;
    }

    onSubmit(normalizedInput);
    setFreeText('');
  }

  const controls = (
    <>
      <div className="option-grid" data-fixed-slot-count={FIXED_OPTION_SLOT_COUNT}>
        {optionSlots.map((slot, index) => {
          const isSlotDisabled = isInputDisabled || slot.value === null;

          return (
            <button
              key={`${index + 1}-${slot.label}`}
              type="button"
              className={`option-card${slot.value === null ? ' option-card--placeholder' : ''}`}
              disabled={isSlotDisabled}
              aria-label={slot.label}
              onClick={() => {
                if (!slot.value) {
                  return;
                }

                onSubmit(slot.value);
              }}
            >
              <span className="option-card__index">{index + 1}</span>
              <span>{slot.label}</span>
            </button>
          );
        })}
      </div>
      <div className="free-text-panel">
        <label className="form-field">
          <span>Free text action</span>
          <textarea
            aria-label="Free text action"
            value={freeText}
            disabled={isInputDisabled}
            placeholder={
              disabled
                ? 'Start the round first to unlock player input.'
                : 'Or type your own action...'
            }
            onChange={(event) => setFreeText(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submitFreeText();
              }
            }}
          />
        </label>
        <button type="button" disabled={isInputDisabled} onClick={submitFreeText}>
          Submit Action
        </button>
      </div>
    </>
  );

  if (variant === 'embedded') {
    return (
      <div className="player-input player-input--embedded">
        <div className="player-input__heading">
          <p className="panel-eyebrow">Option Pool</p>
          <h3>Choose the Next Action</h3>
        </div>
        {controls}
      </div>
    );
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Player Input</p>
          <h2>Drive the Next Beat</h2>
        </div>
      </div>
      {controls}
    </section>
  );
}
