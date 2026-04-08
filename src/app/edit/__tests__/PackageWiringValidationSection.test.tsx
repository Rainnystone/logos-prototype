import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { AgentSurfacePanel } from '@/app/edit/sections/AgentSurfacePanel';
import { PackageWiringValidationSection } from '@/app/edit/sections/PackageWiringValidationSection';
import { buildPackageDiagnostics } from '@/authoring/sections/package-diagnostics';

describe('PackageWiringValidationSection', () => {
  it('renders agent 管理 as the primary surface and keeps diagnostics in a bounded status area', () => {
    const diagnostics = buildPackageDiagnostics({
      packageName: 'sample-scene',
      source: 'latest-saved',
      storyPackage: storyPackageFixture,
      recentSaveResults: [
        {
          kind: 'save_applied_with_warnings',
          requestId: 'request-warning',
          packageName: 'sample-scene',
          sectionId: 'control-modules',
          showLocally: true,
          showInGlobalDiagnostics: true,
          reloadedSectionState: storyPackageFixture,
          runtimeImpactSummary: {
            changedFiles: ['control-modules.yaml'],
          },
          warnings: ['作者状态标记写入失败。'],
        },
      ],
    });
    const onRefresh = vi.fn();

    render(
      <PackageWiringValidationSection
        packageName="sample-scene"
        diagnostics={diagnostics}
        agentSurfaceItems={[
          {
            agentId: 'weaver',
            displayName: 'Weaver',
            responsibilitySummary: '负责把外部作者文本抽取为可导入的结构化启动摘要，并维护导入状态。',
            skillIds: ['weaver-import-skill'],
            skillDisplayMetadata: [
              {
                skillId: 'weaver-import-skill',
                displayName: 'Weaver Import',
                description: '把作者原文整理成可导入的结构化摘要，并维护可启动的导入结果。',
              },
            ],
            packageConfigPath: 'agents/weaver/config.yaml',
            packageStatePath: 'agents/weaver/import-summary.yaml',
            operationalHint: 'warning',
            operationalHintLabel: '当前状态：需要关注',
            latestStateLine: '导入摘要存在 2 条待处理提示。',
            latestStateSummary: {
              statePresence: 'present' as const,
              lastUpdatedAt: '2026-04-08T08:00:00.000Z',
              statusLine: 'LEGACY_WEAVER_STATE',
            },
          },
          {
            agentId: 'gossipelog',
            displayName: 'gossipelog agent',
            responsibilitySummary: '负责追踪已接受剧情后的角色关系状态，并为后续生成提供连续性摘要。',
            skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
            skillDisplayMetadata: [
              {
                skillId: 'relationship-update-skill',
                displayName: 'Relationship Update',
                description: '在接受新剧情后更新持久关系状态。',
              },
              {
                skillId: 'relationship-injection-skill',
                displayName: 'Relationship Injection',
                description: '为下一轮生成准备关系上下文摘要。',
              },
            ],
            packageConfigPath: 'agents/gossipelog/config.yaml',
            packageStatePath: 'agents/gossipelog/character-relationships.yaml',
            operationalHint: 'ready',
            operationalHintLabel: '当前状态：可用',
            latestStateLine: '最近一次关系状态已同步完成。',
            latestStateSummary: {
              statePresence: 'present' as const,
              lastUpdatedAt: '2026-04-02T08:00:00.000Z',
              statusLine: 'LEGACY_GOSSIPELOG_STATE',
            },
          },
        ]}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByRole('heading', { name: 'agent 管理' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '控制台' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('agent-management-status')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '当前详情' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Weaver' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'gossipelog agent' })).toBeInTheDocument();
    expect(screen.getByText('导入摘要存在 2 条待处理提示。')).toBeInTheDocument();
    expect(screen.getByText('最近一次关系状态已同步完成。')).toBeInTheDocument();
    expect(screen.getByText('当前状态：需要关注')).toBeInTheDocument();
    expect(screen.getByText('当前状态：可用')).toBeInTheDocument();
    expect(screen.getByText('负责把外部作者文本抽取为可导入的结构化启动摘要，并维护导入状态。')).toBeInTheDocument();
    expect(
      screen.getByText('负责追踪已接受剧情后的角色关系状态，并为后续生成提供连续性摘要。'),
    ).toBeInTheDocument();
    expect(screen.getByText('把作者原文整理成可导入的结构化摘要，并维护可启动的导入结果。')).toBeInTheDocument();
    expect(screen.getByText('在接受新剧情后更新持久关系状态。')).toBeInTheDocument();
    expect(screen.getByText('为下一轮生成准备关系上下文摘要。')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '回到故事包管理并使用文本导入' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=story-package-management&creationMode=text_import',
    );
    expect(screen.getAllByRole('link', { name: '回到故事包管理并使用文本导入' })).toHaveLength(1);
    expect(screen.getByText('1 个警告需要跟进。')).toBeInTheDocument();
    expect(screen.getByText(/作者状态标记写入失败/)).toBeInTheDocument();
    expect(screen.queryByText('skill ids')).not.toBeInTheDocument();
    expect(screen.queryByText('config path')).not.toBeInTheDocument();
    expect(screen.queryByText('state path')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /重新检查/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders loader-produced latestStateLine directly instead of falling back to legacy statusLine text', () => {
    render(
      <AgentSurfacePanel
        packageName="sample-scene"
        items={[
          {
            agentId: 'weaver',
            displayName: 'Weaver',
            responsibilitySummary: '负责把外部作者文本抽取为可导入的结构化启动摘要，并维护导入状态。',
            skillIds: ['weaver-import-skill'],
            skillDisplayMetadata: [
              {
                skillId: 'weaver-import-skill',
                displayName: 'Weaver Import',
                description: '把作者原文整理成可导入的结构化摘要，并维护可启动的导入结果。',
              },
            ],
            packageConfigPath: 'agents/weaver/config.yaml',
            packageStatePath: 'agents/weaver/import-summary.yaml',
            operationalHint: 'pending_bootstrap',
            operationalHintLabel: '当前状态：等待初始化',
            latestStateLine: 'LOADER_PRODUCED_STATE_LINE',
            latestStateSummary: {
              statePresence: 'missing' as const,
              statusLine: 'LEGACY_STATUS_LINE',
            },
          },
        ]}
      />,
    );

    expect(screen.getByText('LOADER_PRODUCED_STATE_LINE')).toBeInTheDocument();
    expect(screen.queryByText('LEGACY_STATUS_LINE')).not.toBeInTheDocument();
    expect(screen.getByText('当前状态：等待初始化')).toBeInTheDocument();
  });
});
