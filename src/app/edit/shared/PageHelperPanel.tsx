import type { AuthoringStateLoadResult } from '@/authoring/persistence/package-state';

interface PageHelperPanelProps {
  readonly packageName: string;
  readonly initialState: AuthoringStateLoadResult;
  readonly activeSectionLabel: string;
}

export function PageHelperPanel({
  packageName,
  initialState,
  activeSectionLabel,
}: PageHelperPanelProps) {
  return (
    <aside className="panel edit-helper-panel">
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
    </aside>
  );
}
