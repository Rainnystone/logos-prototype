'use client';

import { useState } from 'react';

import type { StateSnapshot, Volume } from '@/types';

interface StateInspectorProps {
  readonly state: StateSnapshot;
  readonly gradientSequence: readonly Volume[];
  readonly totalPhases?: number | undefined;
}

function getVolumeClass(volume: Volume) {
  if (volume === 'High') {
    return 'volume-chip volume-chip--high';
  }

  if (volume === 'Med') {
    return 'volume-chip volume-chip--med';
  }

  return 'volume-chip volume-chip--low';
}

export function StateInspector({ state, gradientSequence, totalPhases }: StateInspectorProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const resolvedTotalPhases = totalPhases ?? state.sceneState.currentPhaseIndex;

  return (
    <aside className="panel inspector-panel break-words">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Narrative State Dashboard</p>
          <h2>State Inspector</h2>
        </div>
      </div>

      <section className="inspector-section">
        <h3>Scene State</h3>
        <div className="metric-grid">
          <div>
            <span className="metric-label">Phase</span>
            <strong>{`Phase ${state.sceneState.currentPhaseIndex} / ${resolvedTotalPhases}`}</strong>
          </div>
          <div>
            <span className="metric-label">Beat</span>
            <strong>{`Beat ${state.sceneState.currentBeatIndexInPhase} / 4`}</strong>
          </div>
          <div>
            <span className="metric-label">Volume</span>
            <strong
              className={getVolumeClass(state.roundState.currentVolume)}
              data-volume={state.roundState.currentVolume}
            >
              {state.roundState.currentVolume}
            </strong>
          </div>
          <div>
            <span className="metric-label">Router</span>
            <strong>{state.roundState.currentRouter}</strong>
          </div>
        </div>
        <div className="grid gap-3">
          <article className="rounded-xl border border-[rgba(31,26,21,0.12)] bg-[rgba(255,255,255,0.45)] p-3">
            <h4 className="mb-1">Alpha</h4>
            <p className="whitespace-pre-wrap break-words leading-relaxed">{state.sceneState.alpha}</p>
          </article>
          <article className="rounded-xl border border-[rgba(31,26,21,0.12)] bg-[rgba(255,255,255,0.45)] p-3">
            <h4 className="mb-1">Beta</h4>
            <p className="whitespace-pre-wrap break-words leading-relaxed">{state.sceneState.beta}</p>
          </article>
        </div>
      </section>

      <section className="inspector-section">
        <h3>Phase Gradient</h3>
        <div className="gradient-bars" aria-label="Phase gradient">
          {gradientSequence.map((volume, index) => (
            <span
              key={`${volume}-${index}`}
              data-testid={`gradient-bar-${index}`}
              className={`gradient-bar gradient-bar--${volume.toLowerCase()}${
                index + 1 === state.sceneState.currentBeatIndexInPhase
                  ? ' gradient-bar--active'
                  : ''
              }`}
            />
          ))}
        </div>
        <p className="panel-note">Verb lexicon: {state.roundState.verbLexicon.join(', ')}</p>
      </section>

      <section className="inspector-section">
        <h3>Phase Consequences</h3>
        {state.sceneState.phaseConsequences && state.sceneState.phaseConsequences.length > 0 ? (
          <ul className="stack-list">
            {state.sceneState.phaseConsequences.map((consequence) => (
              <li key={consequence}>{consequence}</li>
            ))}
          </ul>
        ) : (
          <p className="panel-note">No phase consequences have been settled yet.</p>
        )}
      </section>

      <section className="inspector-section">
        <div className="section-toggle">
          <h3>History Window</h3>
          <button type="button" onClick={() => setHistoryOpen((currentValue) => !currentValue)}>
            {historyOpen ? 'Hide History Window' : 'Show History Window'}
          </button>
        </div>
        {historyOpen ? (
          <ul className="history-list">
            {state.roundState.historyWindow.map((entry, index) => (
              <li key={`${entry.role}-${index}`}>
                <span className={`history-role history-role--${entry.role}`}>{entry.role}</span>
                <p>{entry.content}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="inspector-section">
        <h3>Audit Snapshot</h3>
        {state.evaluationState.blockingFailures.length > 0 ? (
          <ul className="stack-list">
            {state.evaluationState.blockingFailures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        ) : (
          <p className="panel-note">No blocking failures in the latest accepted round.</p>
        )}
        <p className="panel-note">
          Latest audit answers:{' '}
          {state.evaluationState.auditAnswers.length > 0
            ? state.evaluationState.auditAnswers
                .map((answer) => (answer ? 'Pass' : 'Fail'))
                .join(', ')
            : 'pending'}
        </p>
        {state.evaluationState.rewriteFeedback ? (
          <p className="feedback-inline">{state.evaluationState.rewriteFeedback}</p>
        ) : null}
      </section>
    </aside>
  );
}
