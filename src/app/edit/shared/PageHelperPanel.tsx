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
      <aside className="edit-helper-panel edit-helper-panel--compact" aria-label="Page helper">
        <p className="panel-eyebrow">Diagnostics helper</p>
        <h2>Repair Guidance</h2>
        <p>{diagnosticsHelperView.summary}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {diagnosticsHelperView.repairOrder.slice(0, 2).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </aside>
    );
  }

  return (
    <aside className="edit-helper-panel edit-helper-panel--compact" aria-label="Page helper">
      <p className="panel-eyebrow">Page helper</p>
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
        <div className="edit-helper-panel__note">
          <p className="panel-eyebrow">Current section</p>
          <p className="text-sm">{localStatusMessage}</p>
        </div>
      ) : null}
      {coordinatorSummary ? (
        <div className="edit-helper-panel__note">
          <p className="panel-eyebrow">Guidance</p>
          <p className="text-sm">{coordinatorSummary}</p>
        </div>
      ) : null}
    </aside>
  );
}
