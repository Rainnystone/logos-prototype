import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { buildPackageDiagnostics } from '@/authoring/sections/package-diagnostics';
import { AgentSurfacePanel } from '@/app/edit/sections/AgentSurfacePanel';
import { PackageWiringValidationSection } from '@/app/edit/sections/PackageWiringValidationSection';

describe('PackageWiringValidationSection', () => {
  it('renders package-wide health with unresolved issue details', () => {
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
    const agentSurfaceItems = [
      {
        agentId: 'gossipelog',
        displayName: 'gossipelog agent',
        responsibilitySummary: 'Tracks persisted relationship state after accepted beats.',
        skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
        packageConfigPath: 'agents/gossipelog/config.yaml',
        packageStatePath: 'agents/gossipelog/character-relationships.yaml',
        latestStateSummary: {
          statePresence: 'present' as const,
          lastUpdatedAt: '2026-04-02T08:00:00.000Z',
          statusLine: '1 relationship link tracked in the latest state snapshot.',
        },
      },
    ];

    render(
      <PackageWiringValidationSection
        packageName="sample-scene"
        diagnostics={diagnostics}
        agentSurfaceItems={agentSurfaceItems}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByRole('region', { name: '整体状态' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '当前详情' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '控制台' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'sidecar agents' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'gossipelog agent' })).toBeInTheDocument();
    expect(screen.getByText('Tracks persisted relationship state after accepted beats.')).toBeInTheDocument();
    expect(screen.getByText('1 relationship link tracked in the latest state snapshot.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '控制模块 保存出现警告' })).toBeInTheDocument();
    expect(screen.getAllByText('1 个警告需要跟进。').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /控制模块 保存出现警告/i })).toBeInTheDocument();
    expect(screen.getAllByText(/作者状态标记写入失败/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /重新检查/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /整包重新加载 healthy/i }));
    expect(screen.getByRole('heading', { name: '整包重新加载' })).toBeInTheDocument();
  });

  it('does not render raw yaml/tree details inside the read-only agent panel', () => {
    const items = [
      {
        agentId: 'gossipelog',
        displayName: 'gossipelog agent',
        responsibilitySummary: 'Tracks persisted relationship state after accepted beats.',
        skillIds: ['relationship-update-skill'],
        packageConfigPath: 'agents/gossipelog/config.yaml',
        packageStatePath: 'agents/gossipelog/character-relationships.yaml',
        latestStateSummary: {
          statePresence: 'present' as const,
          lastUpdatedAt: '2026-04-02T08:00:00.000Z',
          statusLine: 'relationshipsBySource: chr_core01 -> chr_hero01',
        },
      },
    ];

    render(<AgentSurfacePanel items={items} />);

    expect(screen.getByRole('heading', { name: 'gossipelog agent' })).toBeInTheDocument();
    expect(screen.queryByText(/relationshipsBySource/i)).not.toBeInTheDocument();
  });

  it('falls back to bounded text for suspicious structured status lines outside the known raw-token list', () => {
    const items = [
      {
        agentId: 'gossipelog',
        displayName: 'gossipelog agent',
        responsibilitySummary: 'Tracks persisted relationship state after accepted beats.',
        skillIds: ['relationship-update-skill'],
        packageConfigPath: 'agents/gossipelog/config.yaml',
        packageStatePath: 'agents/gossipelog/character-relationships.yaml',
        latestStateSummary: {
          statePresence: 'present' as const,
          lastUpdatedAt: '2026-04-02T08:00:00.000Z',
          statusLine:
            'graphRoot:{nodes:[{id:node_01,parent:node_00}],edges:[{from:node_00,to:node_01}]}',
        },
      },
    ];

    render(<AgentSurfacePanel items={items} />);

    expect(screen.getByRole('heading', { name: 'gossipelog agent' })).toBeInTheDocument();
    expect(
      screen.getByText('State summary is intentionally bounded for this read-only surface.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/node_01/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/graphRoot/i)).not.toBeInTheDocument();
  });
});
