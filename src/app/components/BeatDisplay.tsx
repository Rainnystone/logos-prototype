import type { WorkbenchStatus } from '@/app/play/runtime';

interface BeatDisplayProps {
  readonly status: WorkbenchStatus;
  readonly beatText: string | null;
  readonly rewriteFeedback: string | null;
  readonly forceAccepted: boolean;
  readonly error: string | null;
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
}: BeatDisplayProps) {
  return (
    <section className="panel beat-display">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">GameView</p>
          <h2>Current Beat</h2>
        </div>
        <span className={`status-badge status-badge--${status}`}>{getStatusLabel(status)}</span>
      </div>

      {forceAccepted ? <p className="warning-banner">Force accepted after retry limit</p> : null}
      {rewriteFeedback ? <pre className="rewrite-feedback">{rewriteFeedback}</pre> : null}
      {error ? <p className="error-banner">{error}</p> : null}

      {beatText ? (
        <article className="beat-prose">
          <p>{beatText}</p>
        </article>
      ) : (
        <div className="beat-placeholder">
          <p>Beat output will appear here after the next run.</p>
        </div>
      )}
    </section>
  );
}
