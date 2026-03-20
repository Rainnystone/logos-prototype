'use client';

import type { WorkbenchDiagnostics, WorkbenchOperation } from '@/app/play/runtime';
import type { StateSnapshot, UsageInfo } from '@/types';

interface PromptStatusPanelProps {
  readonly state: StateSnapshot | null;
  readonly diagnostics: WorkbenchDiagnostics;
}

const DIAGNOSTIC_ORDER: readonly WorkbenchOperation[] = [
  'collapse',
  'route',
  'generate',
  'audit',
  'settlement',
];

function formatOperationLabel(operation: WorkbenchOperation) {
  return operation.charAt(0).toUpperCase() + operation.slice(1);
}

function resolvePromptLayerCount(state: StateSnapshot | null) {
  if (!state) {
    return 0;
  }

  return Object.keys(state.generationState.promptObject).length;
}

function resolveContextEntryCount(state: StateSnapshot | null) {
  if (!state) {
    return 0;
  }

  const promptHistory = state.generationState.promptObject.history;

  return Array.isArray(promptHistory)
    ? promptHistory.length
    : state.roundState.historyWindow.length;
}

function formatUsageHeadline(usage: UsageInfo | null) {
  if (!usage) {
    return 'Not reported';
  }

  if (usage.totalTokens !== undefined) {
    return `${usage.totalTokens} tokens`;
  }

  const derivedTotal = (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0);

  return derivedTotal > 0 ? `${derivedTotal} tokens` : 'Not reported';
}

function formatUsageBreakdown(usage: UsageInfo | null) {
  if (!usage) {
    return 'Prompt -, Completion -';
  }

  return `Prompt ${usage.promptTokens ?? '-'}, Completion ${usage.completionTokens ?? '-'}`;
}

export function PromptStatusPanel({ state, diagnostics }: PromptStatusPanelProps) {
  const promptLayerCount = resolvePromptLayerCount(state);
  const contextEntryCount = resolveContextEntryCount(state);

  return (
    <aside className="panel prompt-status-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Prompt Assembly Status</p>
          <h2>Prompt Status</h2>
        </div>
        <p className="panel-note">
          {diagnostics.latestOperation
            ? `Latest observed call: ${formatOperationLabel(diagnostics.latestOperation)}`
            : 'Awaiting first assembled prompt.'}
        </p>
      </div>

      <section className="inspector-section">
        <h3>Director Note</h3>
        <p>
          {state?.generationState.directorNoteSummary ??
            'Director note will appear after the first accepted round.'}
        </p>
      </section>

      <section className="inspector-section">
        <h3>Prompt Object</h3>
        {promptLayerCount > 0 ? (
          <>
            <div className="metric-grid">
              <div>
                <span className="metric-label">Layers</span>
                <strong>{`${promptLayerCount} layers`}</strong>
              </div>
              <div>
                <span className="metric-label">Context Window</span>
                <strong>{`${contextEntryCount} entries`}</strong>
              </div>
              <div>
                <span className="metric-label">Retry Count</span>
                <strong>{state?.evaluationState.retryCount ?? 0}</strong>
              </div>
              <div>
                <span className="metric-label">Router</span>
                <strong>{state?.roundState.currentRouter ?? 'Pending'}</strong>
              </div>
            </div>
            <p className="panel-note">
              Layers: {Object.keys(state?.generationState.promptObject ?? {}).join(', ')}
            </p>
          </>
        ) : (
          <p>Prompt object details will appear after the first accepted round.</p>
        )}
      </section>

      <section className="inspector-section">
        <h3>Runtime Usage</h3>
        {diagnostics.latestOperation ? (
          <div className="usage-grid">
            {DIAGNOSTIC_ORDER.map((operation) => {
              const usage = diagnostics.usage[operation];

              return (
                <article key={operation} className="usage-card">
                  <span className="metric-label">{formatOperationLabel(operation)}</span>
                  <strong>{formatUsageHeadline(usage)}</strong>
                  <p className="panel-note">{formatUsageBreakdown(usage)}</p>
                </article>
              );
            })}
          </div>
        ) : (
          <p>Runtime usage will appear after the first adapter call.</p>
        )}
      </section>
    </aside>
  );
}
