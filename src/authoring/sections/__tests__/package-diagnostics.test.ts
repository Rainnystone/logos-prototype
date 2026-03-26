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
          warnings: ['Authoring status marker write failed.'],
        },
      ],
    });

    expect(diagnostics.overallStatusView.status).toBe('warning');
    expect(diagnostics.unresolvedIssueViews).toHaveLength(1);
    expect(diagnostics.unresolvedIssueViews[0]?.severity).toBe('warning');
    expect(diagnostics.globalDiagnosticsHelperView.summary).toContain('1 warning');
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
          issue.title.includes('router') &&
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
    expect(diagnostics.globalDiagnosticsHelperView.summary).toContain('No unresolved');
  });
});
