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
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm font-serif">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Accepted Beats</p>
          <h2>Beat History</h2>
        </div>
      </div>
      <div className="history-scroll">
        {entries.length === 0 ? (
          <p className="panel-note">No accepted beats yet.</p>
        ) : (
          entries.map((entry) => (
            <article key={entry.beatNumber} className="p-4 border-b border-slate-100 last:border-0 bg-slate-50/50 rounded-lg mb-2">
              <div className="history-card__header">
                <strong>{`Beat ${entry.beatNumber}`}</strong>
                <span>{entry.playerInput}</span>
              </div>
              <p>{entry.beatText}</p>
            </article>
          ))
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
