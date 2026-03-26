import type { AuthoringStateLoadResult } from '@/authoring/persistence/package-state';
import type { GlobalDiagnosticsHelperView } from '@/authoring/sections/package-diagnostics';

interface PageHelperPanelProps {
  readonly packageName: string;
  readonly initialState: AuthoringStateLoadResult;
  readonly activeSectionLabel: string;
  readonly diagnosticsHelperView?: GlobalDiagnosticsHelperView;
  readonly localStatusMessage?: string;
  readonly coordinatorSummary?: string;
}

export function PageHelperPanel({
  packageName,
  initialState,
  activeSectionLabel,
  diagnosticsHelperView,
  localStatusMessage,
  coordinatorSummary,
}: PageHelperPanelProps) {
  if (diagnosticsHelperView) {
    return (
      <aside className="panel edit-helper-panel edit-helper-panel--technical">
        <p className="panel-eyebrow">Global Diagnostics Helper</p>
        <h2>Repair Guidance</h2>
        <p>{diagnosticsHelperView.summary}</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-200">
          {diagnosticsHelperView.repairOrder.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </aside>
    );
  }

  return (
    <aside className="panel edit-helper-panel edit-helper-panel--technical">
      <p className="panel-eyebrow">Page Helper</p>
      <h2>Shell status</h2>
      <dl className="edit-helper-panel__facts">
        <div>
          <dt>Package</dt>
          <dd>{packageName}</dd>
        </div>
        <div>
          <dt>State source</dt>
          <dd>{initialState.source}</dd>
        </div>
        <div>
          <dt>Active section</dt>
          <dd>{activeSectionLabel}</dd>
        </div>
      </dl>
      {localStatusMessage ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="panel-eyebrow">Current Section Status</p>
          <p className="text-sm text-slate-100">{localStatusMessage}</p>
        </div>
      ) : null}
      {coordinatorSummary ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="panel-eyebrow">Page Helper Guidance</p>
          <p className="text-sm text-slate-100">{coordinatorSummary}</p>
        </div>
      ) : null}
    </aside>
  );
}
