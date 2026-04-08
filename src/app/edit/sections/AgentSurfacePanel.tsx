'use client';

import Link from 'next/link';

import type { AgentSurfaceItem } from '@/agents/agent-surface';

interface AgentSurfacePanelProps {
  readonly packageName: string;
  readonly items: readonly AgentSurfaceItem[];
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
            return (
              <article key={item.agentId} className="agent-surface-panel__card">
                <div className="agent-surface-panel__title-row">
                  <div className="agent-surface-panel__title-block">
                    <h4>{item.displayName}</h4>
                    <p className="agent-surface-panel__state-line">{item.latestStateLine}</p>
                  </div>
                  <span className="agent-surface-panel__hint">{item.operationalHintLabel}</span>
                </div>

                <p className="agent-surface-panel__summary">{item.responsibilitySummary}</p>

                {item.skillDisplayMetadata.length > 0 ? (
                  <ul className="agent-surface-panel__skills">
                    {item.skillDisplayMetadata.map((skill) => (
                      <li key={`${item.agentId}-${skill.skillId}`}>{skill.description}</li>
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
