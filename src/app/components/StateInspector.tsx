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
    return 'volume-chip volume-chip--high text-red-400 bg-red-950/50';
  }

  if (volume === 'Med') {
    return 'volume-chip volume-chip--med text-amber-400 bg-amber-950/50';
  }

  return 'volume-chip volume-chip--low text-emerald-400 bg-emerald-950/50';
}

export function StateInspector({ state, gradientSequence, totalPhases }: StateInspectorProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const resolvedTotalPhases = totalPhases ?? state.sceneState.currentPhaseIndex;

  return (
    <aside className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg font-mono text-slate-300 text-sm break-words">
      <div className="border-b border-slate-800 pb-4 mb-4">
        <p className="text-[10px] tracking-widest uppercase text-emerald-500 mb-1">[ Narrative State Dashboard ]</p>
        <h2 className="text-lg font-bold text-slate-100 tracking-tight">State Inspector</h2>
      </div>

      <section className="inspector-section mb-6">
        <h3 className="text-slate-400 font-semibold mb-3">Scene State</h3>
        <div className="metric-grid mb-4">
          <div className="bg-slate-950 border border-slate-800 rounded-md p-3">
            <span className="block text-[10px] uppercase text-slate-500 mb-1">Phase</span>
            <strong className="text-slate-200">{`Phase ${state.sceneState.currentPhaseIndex} / ${resolvedTotalPhases}`}</strong>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-md p-3">
            <span className="block text-[10px] uppercase text-slate-500 mb-1">Beat</span>
            <strong className="text-slate-200">{`Beat ${state.sceneState.currentBeatIndexInPhase} / 4`}</strong>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-md p-3">
            <span className="block text-[10px] uppercase text-slate-500 mb-1">Volume</span>
            <strong
              className={getVolumeClass(state.roundState.currentVolume)}
              data-volume={state.roundState.currentVolume}
            >
              {state.roundState.currentVolume}
            </strong>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-md p-3">
            <span className="block text-[10px] uppercase text-slate-500 mb-1">Router</span>
            <strong className="text-slate-200">{state.roundState.currentRouter}</strong>
          </div>
        </div>
        <div className="grid gap-3">
          <article className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <h4 className="mb-1 text-slate-400">Alpha</h4>
            <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-300">{state.sceneState.alpha}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <h4 className="mb-1 text-slate-400">Beta</h4>
            <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-300">{state.sceneState.beta}</p>
          </article>
        </div>
      </section>

      <section className="inspector-section mb-6">
        <h3 className="text-slate-400 font-semibold mb-3">Phase Gradient</h3>
        <div className="gradient-bars" aria-label="Phase gradient">
          {gradientSequence.map((volume, index) => (
            <span
              key={`${volume}-${index}`}
              data-testid={`gradient-bar-${index}`}
              className={`gradient-bar gradient-bar--${volume.toLowerCase()}${
                index + 1 === state.sceneState.currentBeatIndexInPhase
                  ? ' gradient-bar--active ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900'
                  : ''
              }`}
            />
          ))}
        </div>
        <p className="panel-note text-slate-500 mt-2">Verb lexicon: {state.roundState.verbLexicon.join(', ')}</p>
      </section>

      <section className="inspector-section mb-6">
        <h3 className="text-slate-400 font-semibold mb-3">Phase Consequences</h3>
        {state.sceneState.phaseConsequences && state.sceneState.phaseConsequences.length > 0 ? (
          <ul className="stack-list space-y-2">
            {state.sceneState.phaseConsequences.map((consequence) => (
              <li key={consequence} className="bg-slate-950 border border-slate-800 p-2 rounded text-slate-300">{consequence}</li>
            ))}
          </ul>
        ) : (
          <p className="panel-note text-slate-500">No phase consequences have been settled yet.</p>
        )}
      </section>

      <section className="inspector-section mb-6">
        <div className="section-toggle flex justify-between items-center mb-3">
          <h3 className="text-slate-400 font-semibold">History Window</h3>
          <button type="button" className="text-emerald-500 hover:text-emerald-400 text-xs" onClick={() => setHistoryOpen((currentValue) => !currentValue)}>
            {historyOpen ? 'Hide History Window' : 'Show History Window'}
          </button>
        </div>
        {historyOpen ? (
          <ul className="history-list space-y-2">
            {state.roundState.historyWindow.map((entry, index) => (
              <li key={`${entry.role}-${index}`} className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                <span className={`history-role history-role--${entry.role} inline-block mb-2 px-2 py-1 rounded text-[10px] uppercase bg-slate-800 text-slate-300`}>{entry.role}</span>
                <p className="text-slate-300">{entry.content}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="inspector-section">
        <h3 className="text-slate-400 font-semibold mb-3">Audit Snapshot</h3>
        {state.evaluationState.blockingFailures.length > 0 ? (
          <ul className="stack-list space-y-2 mb-3">
            {state.evaluationState.blockingFailures.map((failure) => (
              <li key={failure} className="bg-red-950/50 border border-red-900/50 text-red-400 p-2 rounded">{failure}</li>
            ))}
          </ul>
        ) : (
          <p className="panel-note text-slate-500 mb-3">No blocking failures in the latest accepted round.</p>
        )}
        <p className="panel-note text-slate-500 mb-3">
          Latest audit answers:{' '}
          {state.evaluationState.auditAnswers.length > 0
            ? state.evaluationState.auditAnswers
                .map((answer) => (answer ? 'Pass' : 'Fail'))
                .join(', ')
            : 'pending'}
        </p>
        {state.evaluationState.rewriteFeedback ? (
          <p className="feedback-inline bg-amber-950/30 border border-amber-900/50 text-amber-200 p-3 rounded-lg whitespace-pre-wrap">{state.evaluationState.rewriteFeedback}</p>
        ) : null}
      </section>
    </aside>
  );
}
