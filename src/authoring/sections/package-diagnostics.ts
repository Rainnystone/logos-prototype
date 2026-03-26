import type { SaveResult, SectionId } from '@/authoring/contracts';
import type { AuthoringStateSource } from '@/authoring/persistence/package-state';
import type { StoryPackage } from '@/types';

export type PackageDiagnosticsStatus = 'healthy' | 'warning' | 'blocked';
export type PackageDiagnosticsSeverity = 'warning' | 'blocked';

export interface OverallStatusView {
  readonly status: PackageDiagnosticsStatus;
  readonly title: string;
  readonly summary: string;
  readonly blockedCount: number;
  readonly warningCount: number;
}

export interface SectionHealthView {
  readonly sectionId: Exclude<SectionId, 'package-wiring-validation'>;
  readonly label: string;
  readonly status: PackageDiagnosticsStatus;
  readonly summary: string;
  readonly blocksPackage: boolean;
  readonly handledLocally: boolean;
}

export interface AssemblyFlowView {
  readonly key: string;
  readonly label: string;
  readonly status: PackageDiagnosticsStatus;
  readonly summary: string;
}

export interface UnresolvedIssueView {
  readonly key: string;
  readonly severity: PackageDiagnosticsSeverity;
  readonly title: string;
  readonly summary: string;
  readonly repairDestination?: Exclude<SectionId, 'package-wiring-validation'>;
  readonly sourceSection?: Exclude<SectionId, 'package-wiring-validation'>;
}

export interface DetailView {
  readonly key: string;
  readonly title: string;
  readonly summary: string;
  readonly detailLines: readonly string[];
  readonly repairDestination?: Exclude<SectionId, 'package-wiring-validation'>;
}

export interface GlobalDiagnosticsHelperView {
  readonly summary: string;
  readonly repairOrder: readonly string[];
}

export interface PackageDiagnostics {
  readonly packageName: string;
  readonly source: AuthoringStateSource;
  readonly overallStatusView: OverallStatusView;
  readonly sectionHealthViews: readonly SectionHealthView[];
  readonly assemblyFlowViews: readonly AssemblyFlowView[];
  readonly unresolvedIssueViews: readonly UnresolvedIssueView[];
  readonly detailViews: readonly DetailView[];
  readonly defaultDetailKey: string;
  readonly globalDiagnosticsHelperView: GlobalDiagnosticsHelperView;
}

interface BuildPackageDiagnosticsInput {
  readonly packageName: string;
  readonly source: AuthoringStateSource;
  readonly storyPackage: StoryPackage;
  readonly recentSaveResults: readonly SaveResult[];
}

const SECTION_LABELS: Record<Exclude<SectionId, 'package-wiring-validation'>, string> = {
  'worldbase-cast': '世界与角色',
  'scene-phase-authoring': '故事结构',
  'control-modules': '控制模块',
};

function titleCaseSection(sectionId: Exclude<SectionId, 'package-wiring-validation'>): string {
  return SECTION_LABELS[sectionId];
}

function buildIssueViewFromSaveResult(result: SaveResult): UnresolvedIssueView | null {
  if (!result.showInGlobalDiagnostics) {
    return null;
  }

  const sectionLabel =
    result.sectionId === 'package-wiring-validation'
      ? '组装与校验'
      : result.sectionId === 'worldbase-cast'
        ? 'WorldBase & Cast'
        : result.sectionId === 'scene-phase-authoring'
          ? 'Scene & Phase Authoring'
          : 'Control Modules';

  if (result.kind === 'save_applied_with_warnings') {
    return {
      key: `save-result:${result.requestId}`,
      severity: 'warning',
      title: `${sectionLabel} save returned warnings`,
      summary: result.warnings.join(' '),
      ...(result.sectionId === 'package-wiring-validation'
        ? {}
        : {
            repairDestination: result.sectionId as Exclude<
              SectionId,
              'package-wiring-validation'
            >,
            sourceSection: result.sectionId as Exclude<SectionId, 'package-wiring-validation'>,
          }),
    };
  }

  if (result.kind === 'save_blocked') {
    return {
      key: `save-result:${result.requestId}`,
      severity: 'blocked',
      title: `${sectionLabel} save remains blocked`,
      summary: result.blockingIssues.join(' '),
      ...(result.sectionId === 'package-wiring-validation'
        ? {}
        : {
            repairDestination: result.sectionId as Exclude<
              SectionId,
              'package-wiring-validation'
            >,
            sourceSection: result.sectionId as Exclude<SectionId, 'package-wiring-validation'>,
          }),
    };
  }

  if (result.kind === 'save_failed') {
    return {
      key: `save-result:${result.requestId}`,
      severity: 'blocked',
      title: `${sectionLabel} save failed`,
      summary: result.errorMessage,
      ...(result.sectionId === 'package-wiring-validation'
        ? {}
        : {
            repairDestination: result.sectionId as Exclude<
              SectionId,
              'package-wiring-validation'
            >,
            sourceSection: result.sectionId as Exclude<SectionId, 'package-wiring-validation'>,
          }),
    };
  }

  return null;
}

function buildRouterBreakageIssues(storyPackage: StoryPackage): UnresolvedIssueView[] {
  const availableRouters = new Set(storyPackage.routerProfiles.map((profile) => profile.routerName));

  return storyPackage.phasePlans.flatMap((phasePlan) => {
    if (!phasePlan.routerHint || availableRouters.has(phasePlan.routerHint)) {
      return [];
    }

    return [
      {
        key: `router-breakage:${phasePlan.phaseId}`,
        severity: 'blocked' as const,
        title: `Phase router selection is invalid`,
        summary: `Phase "${phasePlan.phaseName ?? phasePlan.phaseId}" still references router "${phasePlan.routerHint}", but that router no longer exists.`,
        repairDestination: 'scene-phase-authoring' as const,
        sourceSection: 'control-modules' as const,
      },
    ];
  });
}

function toStatus(blockedCount: number, warningCount: number): PackageDiagnosticsStatus {
  if (blockedCount > 0) {
    return 'blocked';
  }

  if (warningCount > 0) {
    return 'warning';
  }

  return 'healthy';
}

function buildOverallSummary(blockedCount: number, warningCount: number): string {
  if (blockedCount > 0) {
    return `${blockedCount} blocking issue${blockedCount === 1 ? ' requires' : 's require'} repair.`;
  }

  if (warningCount > 0) {
    return `${warningCount} warning${warningCount === 1 ? ' requires' : 's require'} follow-up.`;
  }

  return 'No unresolved package-wide issues remain.';
}

function buildSectionHealthViews(issues: readonly UnresolvedIssueView[]): SectionHealthView[] {
  return (Object.keys(SECTION_LABELS) as Array<Exclude<SectionId, 'package-wiring-validation'>>).map(
    (sectionId) => {
      const relatedIssues = issues.filter((issue) => issue.repairDestination === sectionId);
      const blockedCount = relatedIssues.filter((issue) => issue.severity === 'blocked').length;
      const warningCount = relatedIssues.filter((issue) => issue.severity === 'warning').length;
      const status = toStatus(blockedCount, warningCount);

      return {
        sectionId,
        label: titleCaseSection(sectionId),
        status,
        summary:
          status === 'healthy'
            ? 'No unresolved package-level issues remain for this section.'
            : buildOverallSummary(blockedCount, warningCount),
        blocksPackage: blockedCount > 0,
        handledLocally: relatedIssues.length === 0,
      };
    },
  );
}

function buildAssemblyFlowViews(issues: readonly UnresolvedIssueView[]): AssemblyFlowView[] {
  const hasBlocked = issues.some((issue) => issue.severity === 'blocked');
  const hasWarnings = issues.some((issue) => issue.severity === 'warning');
  const savePathStatus = hasBlocked ? 'blocked' : hasWarnings ? 'warning' : 'healthy';

  return [
    {
      key: 'section-outputs',
      label: 'Section Outputs',
      status: savePathStatus,
      summary: hasBlocked
        ? 'At least one section output still leaves the package unresolved.'
        : hasWarnings
          ? 'Section saves completed, but follow-up warnings remain.'
          : 'Section outputs are consistent with the current package state.',
    },
    {
      key: 'shared-save-bridge',
      label: 'Shared Save Bridge',
      status: savePathStatus,
      summary: hasBlocked
        ? 'The save bridge accepted data, but package-level repair is still required.'
        : hasWarnings
          ? 'The save bridge completed with warnings that should be reviewed.'
          : 'The shared save bridge completed cleanly.',
    },
    {
      key: 'package-reload',
      label: 'Package Reload',
      status: 'healthy',
      summary: 'The package can still be reloaded after the latest successful save.',
    },
    {
      key: 'runtime-health',
      label: 'Runtime Health',
      status: hasBlocked ? 'blocked' : hasWarnings ? 'warning' : 'healthy',
      summary: hasBlocked
        ? 'Runtime setup is not yet trustworthy because unresolved package issues remain.'
        : hasWarnings
          ? 'Runtime setup is available, but some warnings still need attention.'
          : 'Runtime-facing data is currently healthy.',
    },
  ];
}

function buildDetailViews(
  overallStatusView: OverallStatusView,
  sectionHealthViews: readonly SectionHealthView[],
  assemblyFlowViews: readonly AssemblyFlowView[],
  issues: readonly UnresolvedIssueView[],
): DetailView[] {
  const overallDetail: DetailView = {
    key: 'overall',
    title: overallStatusView.title,
    summary: overallStatusView.summary,
    detailLines: [
      `${overallStatusView.blockedCount} blocking issue(s)`,
      `${overallStatusView.warningCount} warning(s)`,
    ],
  };

  const sectionDetails = sectionHealthViews.map<DetailView>((view) => ({
    key: `section:${view.sectionId}`,
    title: view.label,
    summary: view.summary,
    detailLines: [
      view.blocksPackage ? 'This section currently blocks whole-package health.' : 'This section does not block whole-package health.',
      view.handledLocally
        ? 'No unresolved package-wide issues remain for this section.'
        : 'Some issues were promoted beyond section-local handling.',
    ],
    repairDestination: view.sectionId,
  }));

  const flowDetails = assemblyFlowViews.map<DetailView>((view) => ({
    key: `flow:${view.key}`,
    title: view.label,
    summary: view.summary,
    detailLines: [`Current status: ${view.status}`],
  }));

  const issueDetails = issues.map<DetailView>((issue) => ({
    key: issue.key,
    title: issue.title,
    summary: issue.summary,
    detailLines: [
      issue.sourceSection
        ? `Upstream source: ${titleCaseSection(issue.sourceSection)}`
        : 'No upstream source section is attached.',
      issue.repairDestination
        ? `Repair in: ${titleCaseSection(issue.repairDestination)}`
        : 'Repair destination is not assigned.',
    ],
    ...(issue.repairDestination ? { repairDestination: issue.repairDestination } : {}),
  }));

  return [overallDetail, ...sectionDetails, ...flowDetails, ...issueDetails];
}

function buildGlobalHelperView(issues: readonly UnresolvedIssueView[]): GlobalDiagnosticsHelperView {
  const blockedCount = issues.filter((issue) => issue.severity === 'blocked').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const distinctDestinations = Array.from(
    new Set(
      issues
        .map((issue) => issue.repairDestination)
        .filter((value): value is Exclude<SectionId, 'package-wiring-validation'> => value !== undefined),
    ),
  );

  return {
    summary: buildOverallSummary(blockedCount, warningCount),
    repairOrder:
      distinctDestinations.length > 0
        ? distinctDestinations.map((destination) => titleCaseSection(destination))
        : ['No further repair routing is required.'],
  };
}

export function buildPackageDiagnostics({
  packageName,
  source,
  storyPackage,
  recentSaveResults,
}: BuildPackageDiagnosticsInput): PackageDiagnostics {
  const issues = [
    ...recentSaveResults.map(buildIssueViewFromSaveResult).filter((value): value is UnresolvedIssueView => value !== null),
    ...buildRouterBreakageIssues(storyPackage),
  ];

  const blockedCount = issues.filter((issue) => issue.severity === 'blocked').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const overallStatusView: OverallStatusView = {
    status: toStatus(blockedCount, warningCount),
    title: 'Package Health',
    summary: buildOverallSummary(blockedCount, warningCount),
    blockedCount,
    warningCount,
  };
  const sectionHealthViews = buildSectionHealthViews(issues);
  const assemblyFlowViews = buildAssemblyFlowViews(issues);
  const detailViews = buildDetailViews(
    overallStatusView,
    sectionHealthViews,
    assemblyFlowViews,
    issues,
  );

  return {
    packageName,
    source,
    overallStatusView,
    sectionHealthViews,
    assemblyFlowViews,
    unresolvedIssueViews: issues,
    detailViews,
    defaultDetailKey: issues[0]?.key ?? 'overall',
    globalDiagnosticsHelperView: buildGlobalHelperView(issues),
  };
}
