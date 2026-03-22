'use client';

import type { WorkbenchDiagnostics, WorkbenchOperation } from '@/app/play/runtime';
import type { StateSnapshot } from '@/types';

interface PromptStatusPanelProps {
  readonly state: StateSnapshot | null;
  readonly diagnostics: WorkbenchDiagnostics;
}

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

export function PromptStatusPanel({ state, diagnostics }: PromptStatusPanelProps) {
  const promptLayerCount = resolvePromptLayerCount(state);
  const contextEntryCount = resolveContextEntryCount(state);

  return (
    <aside className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg font-mono text-slate-300 text-sm break-words mb-[1.25rem]">
      <div className="border-b border-slate-800 pb-4 mb-4">
        <p className="text-[10px] tracking-widest uppercase text-emerald-500 mb-1">[ Prompt Assembly Status ]</p>
        <h2 className="text-lg font-bold text-slate-100 tracking-tight">Prompt Status</h2>
        <p className="text-slate-500 mt-2 text-xs">
          {diagnostics.latestOperation
            ? `> Latest observed call: ${formatOperationLabel(diagnostics.latestOperation)}`
            : '> Awaiting first assembled prompt.'}
        </p>
      </div>

      <section className="inspector-section mb-6">
        <h3 className="text-slate-400 font-semibold mb-3">Director Note</h3>
        <p className="bg-slate-950 border border-slate-800 p-3 rounded-md text-slate-300">
          {state?.generationState.directorNoteSummary ??
            'Director note will appear after the first accepted round.'}
        </p>
      </section>

      <section className="inspector-section">
        <h3 className="text-slate-400 font-semibold mb-3">Prompt Object</h3>
        {promptLayerCount > 0 ? (
          <>
            <div className="metric-grid mb-4">
              <div className="bg-slate-950 border border-slate-800 rounded-md p-3">
                <span className="block text-[10px] uppercase text-slate-500 mb-1">Layers</span>
                <strong className="text-slate-200">{`${promptLayerCount} layers`}</strong>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-md p-3">
                <span className="block text-[10px] uppercase text-slate-500 mb-1">Context Window</span>
                <strong className="text-slate-200">{`${contextEntryCount} entries`}</strong>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-md p-3">
                <span className="block text-[10px] uppercase text-slate-500 mb-1">Retry Count</span>
                <strong className="text-slate-200">{state?.evaluationState.retryCount ?? 0}</strong>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-md p-3">
                <span className="block text-[10px] uppercase text-slate-500 mb-1">Router</span>
                <strong className="text-slate-200">{state?.roundState.currentRouter ?? 'Pending'}</strong>
              </div>
            </div>
            <p className="text-slate-500 text-xs">
              Layers: {Object.keys(state?.generationState.promptObject ?? {}).join(', ')}
            </p>
          </>
        ) : (
          <p className="text-slate-500">Prompt object details will appear after the first accepted round.</p>
        )}
      </section>
    </aside>
  );
}
