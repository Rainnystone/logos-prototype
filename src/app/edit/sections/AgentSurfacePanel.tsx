'use client';

import Link from 'next/link';

import type { AgentSurfaceItem } from '@/agents/agent-surface';

interface AgentSurfacePanelProps {
  readonly packageName: string;
  readonly items: readonly AgentSurfaceItem[];
}

const OPERATIONAL_HINT_COPY: Record<NonNullable<AgentSurfaceItem['operationalHint']>, string> = {
  ready: '当前状态：可用',
  warning: '当前状态：需要关注',
  pending_bootstrap: '当前状态：等待初始化',
};

const SKILL_SUMMARY_COPY: Record<string, string> = {
  'weaver-import-skill': '把作者原文整理成可导入的结构化摘要。',
  'relationship-update-skill': '在接受新剧情后更新持久关系状态。',
  'relationship-injection-skill': '为下一轮生成准备关系上下文摘要。',
};

function resolveOperationalHintCopy(item: AgentSurfaceItem): string {
  if (item.operationalHint) {
    return OPERATIONAL_HINT_COPY[item.operationalHint];
  }

  return '当前状态：待确认';
}

function resolveLatestStateLine(item: AgentSurfaceItem): string {
  return item.latestStateLine ?? item.latestStateSummary.statusLine;
}

function resolveSkillSummaries(skillIds: readonly string[]): string[] {
  return skillIds
    .map((skillId) => SKILL_SUMMARY_COPY[skillId])
    .filter((summary): summary is string => typeof summary === 'string');
}

function buildWeaverCreateHref(packageName: string): string {
  return `/edit?storyPackage=${encodeURIComponent(packageName)}&section=story-package-management&creationMode=text_import`;
}

export function AgentSurfacePanel({ packageName, items }: AgentSurfacePanelProps) {
  return (
    <section className="agent-surface-panel" aria-label="sidecar-agent-surface">
      <div className="agent-surface-panel__header">
        <p className="panel-eyebrow">built-in sidecars</p>
        <h3>内置 agent</h3>
        <p className="panel-note">查看当前故事包内置 agent 的状态，并在需要时回到文本导入创建。</p>
      </div>

      {items.length === 0 ? (
        <p className="agent-surface-panel__empty">当前故事包还没有可显示的 agent 状态。</p>
      ) : (
        <div className="agent-surface-panel__list">
          {items.map((item) => {
            const skillSummaries = resolveSkillSummaries(item.skillIds);

            return (
              <article key={item.agentId} className="agent-surface-panel__card">
                <div className="agent-surface-panel__title-row">
                  <div className="agent-surface-panel__title-block">
                    <h4>{item.displayName}</h4>
                    <p className="agent-surface-panel__state-line">{resolveLatestStateLine(item)}</p>
                  </div>
                  <span className="agent-surface-panel__hint">{resolveOperationalHintCopy(item)}</span>
                </div>

                <p className="agent-surface-panel__summary">{item.responsibilitySummary}</p>

                {skillSummaries.length > 0 ? (
                  <ul className="agent-surface-panel__skills">
                    {skillSummaries.map((summary) => (
                      <li key={`${item.agentId}-${summary}`}>{summary}</li>
                    ))}
                  </ul>
                ) : null}

                {item.agentId === 'weaver' ? (
                  <div className="agent-surface-panel__actions">
                    <Link className="secondary-link" href={buildWeaverCreateHref(packageName)}>
                      回到故事包管理并使用文本导入
                    </Link>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
