'use client';

import type { AgentSurfaceItem } from '@/agents/agent-surface';
import type { PackageDiagnostics } from '@/authoring/sections/package-diagnostics';
import { AgentSurfacePanel } from '@/app/edit/sections/AgentSurfacePanel';

interface PackageWiringValidationSectionProps {
  readonly packageName: string;
  readonly diagnostics: PackageDiagnostics;
  readonly agentSurfaceItems?: readonly AgentSurfaceItem[];
  readonly onRefresh: () => void;
  readonly isRefreshing?: boolean;
}

function statusBadgeClass(status: 'healthy' | 'warning' | 'blocked'): string {
  if (status === 'blocked') {
    return 'bg-rose-100 text-rose-700';
  }

  if (status === 'warning') {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-emerald-100 text-emerald-700';
}

export function PackageWiringValidationSection({
  packageName,
  diagnostics,
  agentSurfaceItems = [],
  onRefresh,
  isRefreshing = false,
}: PackageWiringValidationSectionProps) {
  return (
    <section className="package-wiring-validation">
      <div className="package-wiring-validation__header">
        <div>
          <p className="panel-eyebrow">built-in sidecars</p>
          <h2>agent 管理</h2>
          <p className="panel-note">这里以 agent 状态为主，诊断结果只保留为一个小范围状态提示。</p>
        </div>
        <div className="package-wiring-validation__header-actions">
          <span className="panel-note">{packageName}</span>
          <button type="button" className="secondary-link" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? '刷新中...' : '重新检查'}
          </button>
        </div>
      </div>

      <div className="package-wiring-validation__layout">
        <AgentSurfacePanel packageName={packageName} items={agentSurfaceItems} />

        <aside className="package-wiring-validation__status panel" aria-label="agent-management-status">
          <div className="package-wiring-validation__status-header">
            <div>
              <p className="panel-eyebrow">状态提示</p>
              <h3>{diagnostics.overallStatusView.title}</h3>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusBadgeClass(
                diagnostics.overallStatusView.status,
              )}`}
            >
              {diagnostics.overallStatusView.status}
            </span>
          </div>

          <p className="package-wiring-validation__status-summary">
            {diagnostics.overallStatusView.summary}
          </p>

          {diagnostics.unresolvedIssueViews.length > 0 ? (
            <div className="package-wiring-validation__issues">
              {diagnostics.unresolvedIssueViews.map((issue) => (
                <div key={issue.key} className="package-wiring-validation__issue">
                  <strong>{issue.title}</strong>
                  <p>{issue.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="package-wiring-validation__status-summary">当前没有额外的整包问题。</p>
          )}
        </aside>
      </div>
    </section>
  );
}
