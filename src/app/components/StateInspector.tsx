'use client';

import { useState } from 'react';
import type { FocusEvent } from 'react';

import { usePrefersReducedMotion } from '@/app/hooks/usePrefersReducedMotion';
import type { StateSnapshot, Volume } from '@/types';

interface StateInspectorProps {
  readonly state: StateSnapshot;
  readonly gradientSequence: readonly Volume[];
  readonly totalPhases?: number | undefined;
}

type ConstraintKey = 'alpha' | 'beta';

const CONSTRAINT_PREVIEW_LIMIT = 50;
const WIDE_CHARACTER_PATTERN = /[\u1100-\u11ff\u2e80-\u9fff\uf900-\ufaff\uff01-\uff60]/u;

function getVolumeClass(volume: Volume) {
  if (volume === 'High') {
    return 'volume-chip volume-chip--high';
  }

  if (volume === 'Med') {
    return 'volume-chip volume-chip--med';
  }

  return 'volume-chip volume-chip--low';
}

function getConstraintVisualLength(text: string) {
  return Array.from(text).reduce((total, character) => {
    return total + (WIDE_CHARACTER_PATTERN.test(character) ? 2 : 1);
  }, 0);
}

function getConstraintPreview(text: string) {
  if (getConstraintVisualLength(text) <= CONSTRAINT_PREVIEW_LIMIT) {
    return text;
  }

  return '...';
}

export function StateInspector({ state, gradientSequence, totalPhases }: StateInspectorProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedConstraint, setExpandedConstraint] = useState<ConstraintKey | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const resolvedTotalPhases = totalPhases ?? state.sceneState.currentPhaseIndex;

  function handleConstraintBlur(key: ConstraintKey, event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setExpandedConstraint((currentValue) => (currentValue === key ? null : currentValue));
  }

  function renderConstraintCard(key: ConstraintKey, label: string, text: string) {
    const isExpandable = getConstraintVisualLength(text) > CONSTRAINT_PREVIEW_LIMIT;
    const isExpanded = isExpandable && expandedConstraint === key;
    const preview = getConstraintPreview(text);

    return (
      <div className="relative min-h-[4.75rem]">
        <article
          data-testid={`constraint-card-${key}`}
          data-expanded={isExpanded}
          data-reduced-motion={prefersReducedMotion}
          className={`absolute inset-x-0 top-0 rounded-none border-2 bg-[#0a0a0a] p-3 transition-[transform,opacity] duration-150 ease-[var(--ease-out)] ${
            isExpanded
              ? 'z-20 border-[#00ff00] bg-black shadow-[6px_6px_0_0_rgba(0,255,0,0.12)]'
              : 'z-0 border-white/20 bg-white/5'
          } ${isExpandable ? 'cursor-pointer focus:outline-none focus-visible:border-[#00ff00]' : ''}`}
          onMouseEnter={() => {
            if (isExpandable) {
              setExpandedConstraint(key);
            }
          }}
          onMouseLeave={() => {
            if (isExpandable) {
              setExpandedConstraint((currentValue) => (currentValue === key ? null : currentValue));
            }
          }}
          onFocus={() => {
            if (isExpandable) {
              setExpandedConstraint(key);
            }
          }}
          onBlur={(event) => handleConstraintBlur(key, event)}
          tabIndex={isExpandable ? 0 : undefined}
        >
          <h4 className="mb-2 text-[#00ff00] uppercase text-xs tracking-wider">{label}</h4>
          <p
            data-testid={`constraint-body-${key}`}
            className={`whitespace-pre-wrap break-words leading-relaxed ${
              isExpanded ? 'text-white' : 'text-white/80'
            }`}
          >
            {isExpanded ? text : preview}
          </p>
        </article>
      </div>
    );
  }

  return (
    <aside className="bg-black border-2 border-black p-5 shadow-brutal font-mono text-white text-sm break-words">
      <div className="border-b-2 border-white/20 pb-4 mb-4">
        <p className="text-[10px] tracking-widest uppercase text-[#00ff00] mb-1">[ Narrative State Dashboard ]</p>
        <h2 className="text-lg font-bold text-white tracking-tight">State Inspector</h2>
      </div>

      <section className="inspector-section mb-6">
        <h3 className="text-white/60 font-semibold mb-3 uppercase tracking-wider text-xs">Scene State</h3>
        <div className="metric-grid mb-4">
          <div className="bg-white/5 border-2 border-white/20 rounded-none p-3">
            <span className="block text-[10px] uppercase text-white/40 mb-1">Phase</span>
            <strong className="text-white">{`Phase ${state.sceneState.currentPhaseIndex} / ${resolvedTotalPhases}`}</strong>
          </div>
          <div className="bg-white/5 border-2 border-white/20 rounded-none p-3">
            <span className="block text-[10px] uppercase text-white/40 mb-1">Beat</span>
            <strong className="text-white">{`Beat ${state.sceneState.currentBeatIndexInPhase} / 4`}</strong>
          </div>
          <div className="bg-white/5 border-2 border-white/20 rounded-none p-3">
            <span className="block text-[10px] uppercase text-white/40 mb-1">Volume</span>
            <strong
              className={getVolumeClass(state.roundState.currentVolume)}
              data-volume={state.roundState.currentVolume}
            >
              {state.roundState.currentVolume}
            </strong>
          </div>
          <div className="bg-white/5 border-2 border-white/20 rounded-none p-3">
            <span className="block text-[10px] uppercase text-white/40 mb-1">Router</span>
            <strong className="text-white">{state.roundState.currentRouter}</strong>
          </div>
        </div>
        <div className="grid gap-3">
          {renderConstraintCard('alpha', 'Alpha', state.sceneState.alpha)}
          {renderConstraintCard('beta', 'Beta', state.sceneState.beta)}
        </div>
      </section>

      <section className="inspector-section mb-6">
        <h3 className="text-white/60 font-semibold mb-3 uppercase tracking-wider text-xs">Phase Gradient</h3>
        <div className="gradient-bars" aria-label="Phase gradient">
          {gradientSequence.map((volume, index) => (
            <span
              key={`${volume}-${index}`}
              data-testid={`gradient-bar-${index}`}
              className={`gradient-bar gradient-bar--${volume.toLowerCase()}${
                index + 1 === state.sceneState.currentBeatIndexInPhase
                  ? ' gradient-bar--active ring-2 ring-[#00ff00] ring-offset-2 ring-offset-black'
                  : ''
              }`}
            />
          ))}
        </div>
        <p className="text-white/40 mt-2">Verb lexicon: {state.roundState.verbLexicon.join(', ')}</p>
      </section>

      <section className="inspector-section mb-6">
        <h3 className="text-white/60 font-semibold mb-3 uppercase tracking-wider text-xs">Phase Consequences</h3>
        {state.sceneState.phaseConsequences && state.sceneState.phaseConsequences.length > 0 ? (
          <ul className="stack-list space-y-2">
            {state.sceneState.phaseConsequences.map((consequence) => (
              <li key={consequence} className="bg-white/5 border-2 border-white/20 p-2 rounded-none text-white/80">{consequence}</li>
            ))}
          </ul>
        ) : (
          <p className="text-white/40">No phase consequences have been settled yet.</p>
        )}
      </section>

      <section className="inspector-section mb-6">
        <div className="section-toggle flex justify-between items-center mb-3">
          <h3 className="text-white/60 font-semibold uppercase tracking-wider text-xs">History Window</h3>
          <button type="button" className="text-[#00ff00] hover:text-[#00cc00] text-xs border border-[#00ff00] px-2 py-1 rounded-none uppercase" onClick={() => setHistoryOpen((currentValue) => !currentValue)}>
            {historyOpen ? 'Hide History Window' : 'Show History Window'}
          </button>
        </div>
        {historyOpen ? (
          <ul className="history-list space-y-2">
            {state.roundState.historyWindow.map((entry, index) => (
              <li key={`${entry.role}-${index}`} className="bg-white/5 border-2 border-white/20 p-3 rounded-none">
                <span className={`history-role history-role--${entry.role} inline-block mb-2 px-2 py-1 rounded-none text-[10px] uppercase`}>{entry.role}</span>
                <p className="text-white/80">{entry.content}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="inspector-section">
        <h3 className="text-white/60 font-semibold mb-3 uppercase tracking-wider text-xs">Audit Snapshot</h3>
        {state.evaluationState.blockingFailures.length > 0 ? (
          <ul className="stack-list space-y-2 mb-3">
            {state.evaluationState.blockingFailures.map((failure) => (
              <li key={failure} className="bg-red-900/30 border-2 border-red-500 text-red-300 p-2 rounded-none">{failure}</li>
            ))}
          </ul>
        ) : (
          <p className="text-white/40 mb-3">No blocking failures in the latest accepted round.</p>
        )}
        <p className="text-white/40 mb-3">
          Latest audit answers:{' '}
          {state.evaluationState.auditAnswers.length > 0
            ? state.evaluationState.auditAnswers
                .map((answer) => (answer ? 'Pass' : 'Fail'))
                .join(', ')
            : 'pending'}
        </p>
        {state.evaluationState.rewriteFeedback ? (
          <p className="feedback-inline bg-white/5 border-2 border-[#00ff00] text-[#00ff00] p-3 rounded-none whitespace-pre-wrap">{state.evaluationState.rewriteFeedback}</p>
        ) : null}
      </section>
    </aside>
  );
}
