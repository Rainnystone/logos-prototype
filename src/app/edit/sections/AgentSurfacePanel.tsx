'use client';

import type { AgentStatePresence, AgentSurfaceItem } from '@/agents/agent-surface';

interface AgentSurfacePanelProps {
  readonly items: readonly AgentSurfaceItem[];
}

const RAW_STATE_TOKENS = ['relationshipsbysource', 'targets:', 'sourceroleid', 'targetroleid', 'meta:'];
const RAW_STATE_ID_PATTERN = /\b(?:chr|loc|node|edge|phase|beat|scene)_[a-z0-9_-]+\b/i;
const RAW_STATE_SHAPE_PATTERN = /\b(?:nodes?|edges?|children|parent|graphroot)\s*:/i;

function looksLikeStructuredDump(statusLine: string): boolean {
  const loweredStatusLine = statusLine.toLowerCase();
  if (RAW_STATE_TOKENS.some((token) => loweredStatusLine.includes(token))) {
    return true;
  }

  if (RAW_STATE_ID_PATTERN.test(statusLine)) {
    return true;
  }

  if (RAW_STATE_SHAPE_PATTERN.test(statusLine)) {
    return true;
  }

  if (/[\r\n]/.test(statusLine)) {
    return true;
  }

  const hasStructurePunctuation = /[{}\[\]]/.test(statusLine);
  const keyValueLikeSegments = statusLine.match(/[a-z0-9_-]+\s*:/gi)?.length ?? 0;

  return hasStructurePunctuation && keyValueLikeSegments >= 2;
}

function statusBadgeClass(statePresence: AgentStatePresence): string {
  if (statePresence === 'missing') {
    return 'bg-amber-100 text-amber-700';
  }

  if (statePresence === 'unreadable') {
    return 'bg-rose-100 text-rose-700';
  }

  return 'bg-emerald-100 text-emerald-700';
}

function formatStatePresenceLabel(statePresence: AgentStatePresence): string {
  if (statePresence === 'missing') {
    return 'missing';
  }

  if (statePresence === 'unreadable') {
    return 'unreadable';
  }

  return 'present';
}

function sanitizeStatusLine(statusLine: string): string {
  if (looksLikeStructuredDump(statusLine)) {
    return 'State summary is intentionally bounded for this read-only surface.';
  }

  return statusLine;
}

function formatLastUpdated(lastUpdatedAt?: string): string {
  if (!lastUpdatedAt) {
    return 'unknown';
  }

  const parsedDate = new Date(lastUpdatedAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'unknown';
  }

  return parsedDate.toISOString();
}

export function AgentSurfacePanel({ items }: AgentSurfacePanelProps) {
  return (
    <section className="rounded-none border-2 border-black bg-white p-4" aria-label="sidecar-agent-surface">
      <p className="panel-eyebrow">read-only surface</p>
      <h3 className="text-xl font-semibold text-slate-900">sidecar agents</h3>
      <p className="mt-2 text-sm text-slate-700">
        Displays bounded sidecar summaries only. This panel has no controls and no direct file dump.
      </p>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No sidecar agents are registered for this package.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article key={item.agentId} className="rounded-none border-2 border-black bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{item.displayName}</h4>
                  <p className="mt-1 text-sm text-slate-700">{item.responsibilitySummary}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusBadgeClass(
                    item.latestStateSummary.statePresence,
                  )}`}
                >
                  {formatStatePresenceLabel(item.latestStateSummary.statePresence)}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                {sanitizeStatusLine(item.latestStateSummary.statusLine)}
              </p>
              <dl className="mt-3 space-y-1 text-sm text-slate-600">
                <div className="grid gap-1 md:grid-cols-[11rem_minmax(0,1fr)]">
                  <dt className="font-semibold text-slate-900">skill ids</dt>
                  <dd>{item.skillIds.join(', ')}</dd>
                </div>
                <div className="grid gap-1 md:grid-cols-[11rem_minmax(0,1fr)]">
                  <dt className="font-semibold text-slate-900">config path</dt>
                  <dd>{item.packageConfigPath}</dd>
                </div>
                <div className="grid gap-1 md:grid-cols-[11rem_minmax(0,1fr)]">
                  <dt className="font-semibold text-slate-900">state path</dt>
                  <dd>{item.packageStatePath}</dd>
                </div>
                <div className="grid gap-1 md:grid-cols-[11rem_minmax(0,1fr)]">
                  <dt className="font-semibold text-slate-900">last updated</dt>
                  <dd>{formatLastUpdated(item.latestStateSummary.lastUpdatedAt)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
