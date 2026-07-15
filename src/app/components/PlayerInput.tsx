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
            ? 'border-dashed border-black text-black/40 bg-[#f5f5f5]' 
            : 'border-black bg-white hover:bg-[#e5e5e5] text-black shadow-brutal-sm';

          return (
            <button
              key={`${index + 1}-${slot.label}`}
              type="button"
              className={`flex items-start gap-3 p-3 text-left w-full border-2 rounded-none font-mono ${dynamicClass}`}
              disabled={isSlotDisabled}
              aria-label={slot.label}
              onClick={() => {
                if (!slot.value) {
                  return;
                }

                onSubmit(slot.value);
              }}
            >
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-none border border-black bg-[#e5e5e5] text-black text-xs font-medium">{index + 1}</span>
              <span className="leading-snug pt-0.5">{slot.label}</span>
            </button>
          );
        })}
      </div>
      <div className="px-4 pb-4">
        <label className="flex flex-col gap-2 mb-3">
          <span className="text-sm font-medium text-black font-mono uppercase">Free text action</span>
          <textarea
            aria-label="Free text action"
            value={freeText}
            disabled={isInputDisabled}
            className="w-full px-3 py-2 border-2 border-black rounded-none bg-white focus:ring-2 focus:ring-[#00ff00] focus:outline-none font-mono min-h-[6rem] resize-y"
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
          className="bg-[#00ff00] hover:bg-[#00cc00] text-black font-bold px-4 py-2 rounded-none border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase text-sm"
        >
          Submit Action
        </button>
      </div>
    </>
  );

  if (variant === 'embedded') {
    return (
      <div className="border-t-2 border-black mt-2 pt-4 min-w-0 font-mono">
        <div className="px-4 flex flex-col gap-1">
          <p className="text-[10px] tracking-widest uppercase text-black/50 mb-1">Option Pool</p>
          <h3 className="text-lg font-bold text-black tracking-tight uppercase">Choose the Next Action</h3>
        </div>
        {controls}
      </div>
    );
  }

  return (
    <section className="bg-white border-2 border-black rounded-none shadow-brutal font-mono">
      <div className="p-5 border-b-2 border-black">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-black/50 mb-1">Player Input</p>
          <h2 className="text-lg font-bold text-black tracking-tight uppercase">Drive the Next Beat</h2>
        </div>
      </div>
      {controls}
    </section>
  );
}
