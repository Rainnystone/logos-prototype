'use client';

import { useMemo, useState } from 'react';

import type { PackageDiagnostics } from '@/authoring/sections/package-diagnostics';

interface PackageWiringValidationSectionProps {
  readonly packageName: string;
  readonly diagnostics: PackageDiagnostics;
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
  onRefresh,
  isRefreshing = false,
}: PackageWiringValidationSectionProps) {
  const [selectedDetailKey, setSelectedDetailKey] = useState(diagnostics.defaultDetailKey);

  const selectedDetail = useMemo(() => {
    return (
      diagnostics.detailViews.find((detail) => detail.key === selectedDetailKey) ??
      diagnostics.detailViews.find((detail) => detail.key === diagnostics.defaultDetailKey) ??
      diagnostics.detailViews[0]
    );
  }, [diagnostics.defaultDetailKey, diagnostics.detailViews, selectedDetailKey]);

  return (
    <section className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.95fr)]">
      <div className="panel space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="panel-eyebrow">高级诊断</p>
            <h2>控制台</h2>
            <p className="panel-note">查看整包保存后的状态，并按需回到对应页面修复问题。</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="panel-note">{packageName}</span>
            <button type="button" className="secondary-link" onClick={onRefresh} disabled={isRefreshing}>
              {isRefreshing ? '刷新中...' : '重新检查'}
            </button>
          </div>
        </div>

        <section
          className="rounded-none border-2 border-black bg-slate-50/80 p-4"
          aria-label="整体状态"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="panel-eyebrow">整体状态</p>
              <h3 className="text-xl font-semibold text-slate-900">
                {diagnostics.overallStatusView.title}
              </h3>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusBadgeClass(
                diagnostics.overallStatusView.status,
              )}`}
            >
              {diagnostics.overallStatusView.status}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-700">{diagnostics.overallStatusView.summary}</p>
        </section>

        <section className="rounded-none border-2 border-black bg-white p-4">
          <p className="panel-eyebrow">页面状态</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {diagnostics.sectionHealthViews.map((view) => (
              <button
                key={view.sectionId}
                type="button"
                className="rounded-none border-2 border-black p-4 text-left"
                onClick={() => setSelectedDetailKey(`section:${view.sectionId}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm text-slate-900">{view.label}</strong>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusBadgeClass(
                      view.status,
                    )}`}
                  >
                    {view.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{view.summary}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-none border-2 border-black bg-white p-4">
          <p className="panel-eyebrow">组装流程</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {diagnostics.assemblyFlowViews.map((view) => (
              <button
                key={view.key}
                type="button"
                className="rounded-none border-2 border-black p-4 text-left"
                onClick={() => setSelectedDetailKey(`flow:${view.key}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm text-slate-900">{view.label}</strong>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusBadgeClass(
                      view.status,
                    )}`}
                  >
                    {view.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{view.summary}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-none border-2 border-black bg-white p-4">
          <p className="panel-eyebrow">未解决问题</p>
          <div className="mt-4 space-y-3">
            {diagnostics.unresolvedIssueViews.length > 0 ? (
              diagnostics.unresolvedIssueViews.map((issue) => (
                <button
                  key={issue.key}
                  type="button"
                  className="w-full rounded-none border-2 border-black p-4 text-left"
                  onClick={() => setSelectedDetailKey(issue.key)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm text-slate-900">{issue.title}</strong>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusBadgeClass(
                        issue.severity,
                      )}`}
                    >
                      {issue.severity}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{issue.summary}</p>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-600">当前没有未解决的整包问题。</p>
            )}
          </div>
        </section>
      </div>

      <section className="space-y-6 xl:sticky xl:top-6" aria-label="当前详情">
        <div className="panel h-full">
          <p className="panel-eyebrow">当前详情</p>
          <h3 className="text-2xl font-semibold text-slate-900">
            {selectedDetail?.title ?? diagnostics.overallStatusView.title}
          </h3>
          <p className="mt-3 text-sm text-slate-700">
            {selectedDetail?.summary ?? diagnostics.overallStatusView.summary}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {(selectedDetail?.detailLines ?? []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>
    </section>
  );
}
