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
    <section className="bg-white border-2 border-black rounded-none shadow-brutal font-mono flex flex-col">
      <div className="p-5 border-b-2 border-black flex justify-between items-start">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-black/50 mb-1">Accepted Beats</p>
          <h2 className="text-lg font-bold text-black tracking-tight uppercase">Beat History</h2>
        </div>
      </div>
      <div className="p-5 max-h-[20rem] overflow-auto flex flex-col gap-3 font-mono">
        {entries.length === 0 ? (
          <p className="text-sm text-black/50 font-mono">No accepted beats yet.</p>
        ) : (
          entries.map((entry) => (
            <article key={entry.beatNumber} className="p-4 border-2 border-black bg-[#f5f5f5] rounded-none">
              <div className="flex justify-between items-center mb-3 font-mono border-b-2 border-black pb-2">
                <strong className="text-sm text-black uppercase">{`Beat ${entry.beatNumber}`}</strong>
                <span className="text-xs text-black bg-[#e5e5e5] border border-black px-2 py-1 rounded-none">{entry.playerInput}</span>
              </div>
              <p className="text-black leading-relaxed text-[1.05rem] whitespace-pre-wrap">{entry.beatText}</p>
            </article>
          ))
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
