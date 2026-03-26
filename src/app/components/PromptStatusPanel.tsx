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
    <aside className="bg-black border-2 border-black p-5 shadow-brutal font-mono text-white text-sm break-words mb-[1.25rem]">
      <div className="border-b-2 border-white/20 pb-4 mb-4">
        <p className="text-[10px] tracking-widest uppercase text-[#00ff00] mb-1">[ Prompt Assembly Status ]</p>
        <h2 className="text-lg font-bold text-white tracking-tight">Prompt Status</h2>
        <p className="text-white/40 mt-2 text-xs">
          {diagnostics.latestOperation
            ? `Latest observed call: ${formatOperationLabel(diagnostics.latestOperation)}`
            : 'Awaiting first assembled prompt.'}
        </p>
      </div>

      <section className="inspector-section mb-6">
        <h3 className="text-white/60 font-semibold mb-3 uppercase tracking-wider text-xs">Director Note</h3>
        <p className="bg-white/5 border-2 border-white/20 p-3 rounded-none text-white/80">
          {state?.generationState.directorNoteSummary ??
            'Director note will appear after the first accepted round.'}
        </p>
      </section>

      <section className="inspector-section">
        <h3 className="text-white/60 font-semibold mb-3 uppercase tracking-wider text-xs">Prompt Object</h3>
        {promptLayerCount > 0 ? (
          <>
            <div className="metric-grid mb-4">
              <div className="bg-white/5 border-2 border-white/20 rounded-none p-3">
                <span className="block text-[10px] uppercase text-white/40 mb-1">Layers</span>
                <strong className="text-white">{`${promptLayerCount} layers`}</strong>
              </div>
              <div className="bg-white/5 border-2 border-white/20 rounded-none p-3">
                <span className="block text-[10px] uppercase text-white/40 mb-1">Context Window</span>
                <strong className="text-white">{`${contextEntryCount} entries`}</strong>
              </div>
              <div className="bg-white/5 border-2 border-white/20 rounded-none p-3">
                <span className="block text-[10px] uppercase text-white/40 mb-1">Retry Count</span>
                <strong className="text-white">{state?.evaluationState.retryCount ?? 0}</strong>
              </div>
              <div className="bg-white/5 border-2 border-white/20 rounded-none p-3">
                <span className="block text-[10px] uppercase text-white/40 mb-1">Router</span>
                <strong className="text-white">{state?.roundState.currentRouter ?? 'Pending'}</strong>
              </div>
            </div>
            <p className="text-white/40 text-xs">
              Layers: {Object.keys(state?.generationState.promptObject ?? {}).join(', ')}
            </p>
          </>
        ) : (
          <p className="text-white/40">Prompt object details will appear after the first accepted round.</p>
        )}
      </section>
    </aside>
  );
}
