import type { SaveResult, SectionId } from '@/authoring/contracts';
import type {
  AuthoringState,
  AuthoringStateSource,
} from '@/authoring/persistence/package-state';
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
  readonly authoringState?: AuthoringState | null;
  readonly recentSaveResults: readonly SaveResult[];
}

const SECTION_LABELS: Record<Exclude<SectionId, 'package-wiring-validation'>, string> = {
  'worldbase-cast': '世界与角色',
  'scene-phase-authoring': '场景与阶段',
  'control-modules': '控制模块',
};

const DIAGNOSTICS_PAGE_LABEL = '控制台';

function getSectionLabel(sectionId: Exclude<SectionId, 'package-wiring-validation'>): string {
  return SECTION_LABELS[sectionId];
}

function buildIssueViewFromSaveResult(result: SaveResult): UnresolvedIssueView | null {
  if (!result.showInGlobalDiagnostics) {
    return null;
  }

  const sectionLabel =
    result.sectionId === 'package-wiring-validation'
      ? DIAGNOSTICS_PAGE_LABEL
      : getSectionLabel(result.sectionId);

  const issueTitle =
    result.kind === 'save_applied_with_warnings'
      ? '保存出现警告'
      : result.kind === 'save_blocked'
        ? '保存被阻塞'
        : '保存失败';

  if (result.kind === 'save_applied_with_warnings') {
    return {
      key: `save-result:${result.requestId}`,
      severity: 'warning',
      title: `${sectionLabel} ${issueTitle}`,
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
      title: `${sectionLabel} ${issueTitle}`,
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
      title: `${sectionLabel} ${issueTitle}`,
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
        title: 'Phase 路由选择无效',
        summary: `Phase "${phasePlan.phaseName ?? phasePlan.phaseId}" 仍引用 Router "${phasePlan.routerHint}"，但该 Router 已不存在。`,
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
    return `${blockedCount} 个阻塞问题需要修复。`;
  }

  if (warningCount > 0) {
    return `${warningCount} 个警告需要跟进。`;
  }

  return '当前没有未解决的整包问题。';
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
        label: getSectionLabel(sectionId),
        status,
        summary:
          status === 'healthy'
            ? '当前页面没有未解决的整包问题。'
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
      label: '页面输出',
      status: savePathStatus,
      summary: hasBlocked
        ? '至少有一个页面输出仍让整包保持未解决。'
        : hasWarnings
          ? '页面保存已完成，但仍有需要跟进的警告。'
          : '页面输出与当前整包状态一致。',
    },
    {
      key: 'shared-save-bridge',
      label: '共享保存链路',
      status: savePathStatus,
      summary: hasBlocked
        ? '保存链路已接收数据，但仍需要整包级修复。'
        : hasWarnings
          ? '保存链路已完成，但仍有警告需要查看。'
          : '共享保存链路已干净完成。',
    },
    {
      key: 'package-reload',
      label: '整包重新加载',
      status: 'healthy',
      summary: '最新一次成功保存后，整包仍可重新加载。',
    },
    {
      key: 'runtime-health',
      label: '运行态健康',
      status: hasBlocked ? 'blocked' : hasWarnings ? 'warning' : 'healthy',
      summary: hasBlocked
        ? '由于整包问题仍未解决，运行态暂时还不可信。'
        : hasWarnings
          ? '运行态已可用，但仍有警告需要处理。'
          : '面向运行态的数据当前健康。',
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
      `阻塞问题：${overallStatusView.blockedCount} 个`,
      `警告问题：${overallStatusView.warningCount} 个`,
    ],
  };

  const sectionDetails = sectionHealthViews.map<DetailView>((view) => ({
    key: `section:${view.sectionId}`,
    title: view.label,
    summary: view.summary,
    detailLines: [
      view.blocksPackage ? '该页面当前会阻断整包健康。' : '该页面不会阻断整包健康。',
      view.handledLocally
        ? '当前没有上升到整包级的问题。'
        : '有部分问题已经上升到整包级处理。',
    ],
    repairDestination: view.sectionId,
  }));

  const flowDetails = assemblyFlowViews.map<DetailView>((view) => ({
    key: `flow:${view.key}`,
    title: view.label,
    summary: view.summary,
    detailLines: [`当前状态：${view.status}`],
  }));

  const issueDetails = issues.map<DetailView>((issue) => ({
    key: issue.key,
    title: issue.title,
    summary: issue.summary,
    detailLines: [
      issue.sourceSection
        ? `来源页面：${getSectionLabel(issue.sourceSection)}`
        : '没有上游来源页面。',
      issue.repairDestination
        ? `修复到：${getSectionLabel(issue.repairDestination)}`
        : '没有分配修复目标。',
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
        ? distinctDestinations.map((destination) => getSectionLabel(destination))
        : ['当前没有继续修复的路由。'],
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
    title: '整包健康',
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
