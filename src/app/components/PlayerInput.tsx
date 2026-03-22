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
      <div className="grid gap-3 p-4" data-fixed-slot-count={FIXED_OPTION_SLOT_COUNT}>
        {optionSlots.map((slot, index) => {
          const isSlotDisabled = isInputDisabled || slot.value === null;
          const dynamicClass = slot.value === null 
            ? 'border-dashed border-slate-300 text-slate-400 bg-slate-50' 
            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm';

          return (
            <button
              key={`${index + 1}-${slot.label}`}
              type="button"
              className={`flex items-start gap-3 p-3 text-left w-full border rounded-lg transition-colors font-sans ${dynamicClass}`}
              disabled={isSlotDisabled}
              aria-label={slot.label}
              onClick={() => {
                if (!slot.value) {
                  return;
                }

                onSubmit(slot.value);
              }}
            >
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">{index + 1}</span>
              <span className="leading-snug pt-0.5">{slot.label}</span>
            </button>
          );
        })}
      </div>
      <div className="px-4 pb-4">
        <label className="flex flex-col gap-2 mb-3">
          <span className="text-sm font-medium text-slate-700 font-sans">Free text action</span>
          <textarea
            aria-label="Free text action"
            value={freeText}
            disabled={isInputDisabled}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-slate-400 focus:outline-none font-sans min-h-[6rem] resize-y"
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
        <button 
          type="button" 
          disabled={isInputDisabled} 
          onClick={submitFreeText}
          className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans"
        >
          Submit Action
        </button>
      </div>
    </>
  );

  if (variant === 'embedded') {
    return (
      <div className="border-t border-slate-200 mt-2 pt-4 min-w-0 font-sans">
        <div className="px-4 flex flex-col gap-1">
          <p className="text-[10px] tracking-widest uppercase text-slate-500 mb-1">Option Pool</p>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Choose the Next Action</h3>
        </div>
        {controls}
      </div>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm font-sans">
      <div className="p-5 border-b border-slate-100">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-slate-500 mb-1">Player Input</p>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Drive the Next Beat</h2>
        </div>
      </div>
      {controls}
    </section>
  );
}
