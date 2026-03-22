import type { ReactNode } from 'react';

import type { WorkbenchStatus } from '@/app/play/runtime';

interface BeatDisplayProps {
  readonly status: WorkbenchStatus;
  readonly beatText: string | null;
  readonly rewriteFeedback: string | null;
  readonly forceAccepted: boolean;
  readonly error: string | null;
  readonly summary?: string | null;
  readonly children?: ReactNode;
}

function getStatusLabel(status: WorkbenchStatus): string {
  switch (status) {
    case 'initializing':
      return 'Initializing Scene...';
    case 'generating':
      return 'Generating...';
    case 'auditing':
      return 'Auditing...';
    case 'rewriting':
      return 'Rewriting...';
    case 'accepted':
      return 'Accepted';
    case 'force-accepted':
      return 'Accepted';
    case 'error':
      return 'Error';
    default:
      return 'Ready';
  }
}

export function BeatDisplay({
  status,
  beatText,
  rewriteFeedback,
  forceAccepted,
  error,
  summary,
  children,
}: BeatDisplayProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col gap-4 font-serif">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs tracking-wider uppercase text-slate-500 font-sans mb-1">GameView</p>
          <h2 className="text-2xl font-semibold text-slate-800 font-sans">Current Beat</h2>
        </div>
        <div className="beat-display__summary">
          {summary ? <p className="panel-note">{summary}</p> : null}
          <span className={`status-badge status-badge--${status}`}>{getStatusLabel(status)}</span>
        </div>
      </div>

      {forceAccepted ? <p className="warning-banner">Force accepted after retry limit</p> : null}
      {rewriteFeedback ? <pre className="rewrite-feedback">{rewriteFeedback}</pre> : null}
      {error ? <p className="error-banner">{error}</p> : null}

      <div className="beat-display__body">
        {beatText ? (
          <article className="beat-prose">
            <p>{beatText}</p>
          </article>
        ) : (
          <div className="beat-placeholder">
            <p>Beat output will appear here after the next run.</p>
          </div>
        )}

        {children}
      </div>
    </section>
  );
}
