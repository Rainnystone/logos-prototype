'use client';

import { useEffect, useRef } from 'react';

export interface BeatHistoryEntry {
  readonly beatNumber: number;
  readonly playerInput: string;
  readonly beatText: string;
}

interface BeatHistoryProps {
  readonly entries: readonly BeatHistoryEntry[];
}

export function BeatHistory({ entries }: BeatHistoryProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm font-sans flex flex-col">
      <div className="p-5 border-b border-slate-100 flex justify-between items-start">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-slate-500 mb-1">Accepted Beats</p>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Beat History</h2>
        </div>
      </div>
      <div className="p-5 max-h-[20rem] overflow-auto flex flex-col gap-3 font-serif">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500 font-sans">No accepted beats yet.</p>
        ) : (
          entries.map((entry) => (
            <article key={entry.beatNumber} className="p-4 border border-slate-200 bg-slate-50/50 rounded-lg">
              <div className="flex justify-between items-center mb-3 font-sans border-b border-slate-200 pb-2">
                <strong className="text-sm text-slate-700">{`Beat ${entry.beatNumber}`}</strong>
                <span className="text-xs text-slate-500 bg-slate-200/50 px-2 py-1 rounded">{entry.playerInput}</span>
              </div>
              <p className="text-slate-800 leading-relaxed text-[1.05rem] whitespace-pre-wrap">{entry.beatText}</p>
            </article>
          ))
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
