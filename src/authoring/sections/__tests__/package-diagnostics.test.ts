import { describe, expect, it } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { buildPackageDiagnostics } from '@/authoring/sections/package-diagnostics';

describe('package-diagnostics', () => {
  it('promotes save_applied_with_warnings into the global diagnostics issue queue', () => {
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

    expect(diagnostics.overallStatusView.status).toBe('warning');
    expect(diagnostics.overallStatusView.summary).toBe('1 个警告需要跟进。');
    expect(diagnostics.unresolvedIssueViews).toHaveLength(1);
    expect(diagnostics.unresolvedIssueViews[0]?.severity).toBe('warning');
    expect(diagnostics.unresolvedIssueViews[0]?.title).toBe('控制模块 保存出现警告');
    expect(diagnostics.globalDiagnosticsHelperView.summary).toBe('1 个警告需要跟进。');
    expect(diagnostics.globalDiagnosticsHelperView.repairOrder).toEqual(['控制模块']);
  });

  it('flags cross-section router breakage as a blocking package issue', () => {
    const diagnostics = buildPackageDiagnostics({
      packageName: 'sample-scene',
      source: 'latest-saved',
      storyPackage: {
        ...storyPackageFixture,
        routerProfiles: storyPackageFixture.routerProfiles.filter(
          (profile) => profile.routerName !== 'Counterplay',
        ),
      },
      recentSaveResults: [],
    });

    expect(diagnostics.overallStatusView.status).toBe('blocked');
    expect(
      diagnostics.unresolvedIssueViews.some(
        (issue) =>
          issue.severity === 'blocked' &&
          issue.title === 'Phase 路由选择无效' &&
          issue.repairDestination === 'scene-phase-authoring',
      ),
    ).toBe(true);
  });

  it('ignores stale dependent review markers when computing package health', () => {
    const diagnostics = buildPackageDiagnostics({
      packageName: 'sample-scene',
      source: 'latest-saved',
      storyPackage: storyPackageFixture,
      authoringState: {
        hasSuccessfulSave: true,
        lastEditedSection: 'worldbase-cast',
        pendingSectionReviews: {
          'scene-phase-authoring': ['worldbase-cast'],
          'control-modules': ['worldbase-cast', 'scene-phase-authoring'],
        },
      } as never,
      recentSaveResults: [],
    });

    expect(diagnostics.overallStatusView.status).toBe('healthy');
    expect(
      diagnostics.unresolvedIssueViews.some((issue) => issue.title.includes('review')),
    ).toBe(false);
    expect(diagnostics.globalDiagnosticsHelperView.summary).toBe('当前没有未解决的整包问题。');
  });
});
