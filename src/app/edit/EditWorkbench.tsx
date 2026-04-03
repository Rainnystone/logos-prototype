'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { AgentSurfaceItem } from '@/agents/agent-surface';
import { type ModuleScope, type SaveResult, type SectionId } from '@/authoring/contracts';
import type { CoordinatorRunResult } from '@/authoring/coordinator/dispatch';
import type { AuthoringStateLoadResult } from '@/authoring/persistence/package-state';
import { PageActionBar } from '@/app/edit/shared/PageActionBar';
import { PageHelperPanel } from '@/app/edit/shared/PageHelperPanel';
import { ControlModulesSection } from '@/app/edit/sections/ControlModulesSection';
import { PackageWiringValidationSection } from '@/app/edit/sections/PackageWiringValidationSection';
import { ScenePhaseAuthoringSection } from '@/app/edit/sections/ScenePhaseAuthoringSection';
import { SectionTabs, type WorldbaseSurface } from '@/app/edit/shared/SectionTabs';
import { WorldBaseCastSection } from '@/app/edit/sections/WorldBaseCastSection';
import {
  createControlModulesDraft,
  type ControlModulesDraft,
} from '@/authoring/sections/control-modules';
import {
  createWorldBaseCastDraft,
  type WorldBaseCastDraft,
} from '@/authoring/sections/worldbase-cast';
import {
  createScenePhaseAuthoringDraft,
  getRouterOptions,
  type ScenePhaseAuthoringDraft,
} from '@/authoring/sections/scene-phase-authoring';
import {
  buildPackageDiagnostics,
  type PackageDiagnostics,
} from '@/authoring/sections/package-diagnostics';
import { isSuccessfulSaveResult } from '@/authoring/persistence/save-results';

const SECTION_SUMMARIES: Record<
  SectionId,
  {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
  }
> = {
  'worldbase-cast': {
    eyebrow: '当前页',
    title: '世界与角色',
    description: '在世界页与角色页之间切换，但继续共用同一套保存。',
  },
  'scene-phase-authoring': {
    eyebrow: '当前页',
    title: '场景与阶段',
    description: '编辑场景框架、Phase 轨道和当前阶段内容。',
  },
  'control-modules': {
    eyebrow: '当前页',
    title: '控制模块',
    description: '整理控制层、路由配置和审计问题。',
  },
  'package-wiring-validation': {
    eyebrow: '当前页',
    title: '控制台',
    description: '检查整包连线、健康状态和修复建议。',
  },
};

const SAVE_FAILED_STATUS = '保存失败。';
const SAVE_PATH_FAILURE_STATUS = '页面助手无法连通共享保存路径。';
const PAGE_HELPER_SAVE_STATUS = '已通过页面助手保存。';
const RESET_STATUS = '已恢复到最新保存版本。';

interface EditWorkbenchProps {
  readonly packageName: string;
  readonly activeSection: SectionId;
  readonly activeSurface: WorldbaseSurface;
  readonly initialState: AuthoringStateLoadResult;
}

type EditableSectionId = Exclude<SectionId, 'package-wiring-validation'>;

function didPersistAuthoringState(result: SaveResult): boolean {
  return (
    (result.kind === 'save_applied' || result.kind === 'save_applied_with_warnings') &&
    result.runtimeImpactSummary.changedFiles.includes('authoring-state.json')
  );
}

function formatSaveFailureMessage(result: SaveResult | null): string {
  if (result?.kind === 'save_failed') {
    return `保存失败：${result.errorMessage}`;
  }

  return SAVE_FAILED_STATUS;
}

function formatAppliedSaveMessage(
  result: Extract<SaveResult, { kind: 'save_applied' | 'save_applied_with_warnings' }>,
  successMessage: string,
): string {
  const warnings = 'warnings' in result ? result.warnings ?? [] : [];
  if (result.kind === 'save_applied_with_warnings' || warnings.length > 0) {
    return warnings.length > 0 ? `已保存，但仍有提示：${warnings.join(' ')}` : '已保存，但仍有提示。';
  }

  return successMessage;
}

function formatHelperSaveMessage(
  result: Extract<SaveResult, { kind: 'save_applied' | 'save_applied_with_warnings' }>,
): string {
  const warnings = 'warnings' in result ? result.warnings ?? [] : [];
  if (result.kind === 'save_applied_with_warnings' || warnings.length > 0) {
    return warnings.length > 0
      ? `已通过页面助手保存，但仍有提示：${warnings.join(' ')}`
      : '已通过页面助手保存，但仍有提示。';
  }

  return PAGE_HELPER_SAVE_STATUS;
}

function formatBlockedSaveMessage(issues: readonly string[]): string {
  return `保存被阻止：${issues.join(' ')}`;
}

interface DiagnosticsRefreshResult extends PackageDiagnostics {
  readonly agentSurfaceItems?: readonly AgentSurfaceItem[];
}

function SectionSurface({
  sectionId,
  children,
}: {
  readonly sectionId: SectionId;
  readonly children?: ReactNode;
}) {
  const sectionSummary = SECTION_SUMMARIES[sectionId];

  return (
    <section className="panel edit-surface">
      <p className="panel-eyebrow">{sectionSummary.eyebrow}</p>
      <h2>{sectionSummary.title}</h2>
      <p>{sectionSummary.description}</p>
      {children}
    </section>
  );
}

function CurrentPageStatus({
  message,
  failureNote,
}: {
  readonly message: string;
  readonly failureNote?: string | null;
}) {
  return (
    <section className="panel edit-page-status edit-surface" aria-label="Current page status">
      <p className="panel-eyebrow">当前页状态</p>
      <h2>保存结果</h2>
      <p className="panel-note">{message}</p>
      {failureNote ? <p className="panel-note">{failureNote}</p> : null}
    </section>
  );
}

export function EditWorkbench({
  packageName,
  activeSection,
  activeSurface,
  initialState,
}: EditWorkbenchProps) {
  const [currentState, setCurrentState] = useState(initialState.state);
  const [currentSource, setCurrentSource] = useState(initialState.source);
  const [agentSurfaceItems, setAgentSurfaceItems] = useState<readonly AgentSurfaceItem[]>(
    initialState.agentSurfaceItems ?? [],
  );
  const [currentAuthoringState, setCurrentAuthoringState] = useState(initialState.authoringState ?? null);
  const [runtimeContinuityView, setRuntimeContinuityView] = useState(
    initialState.runtimeContinuityView,
  );
  const [recentSaveResults, setRecentSaveResults] = useState<SaveResult[]>([]);
  const [remoteDiagnostics, setRemoteDiagnostics] = useState<PackageDiagnostics | null>(null);
  const [isDiagnosticsRefreshing, setIsDiagnosticsRefreshing] = useState(false);
  const [coordinatorSummaries, setCoordinatorSummaries] = useState<
    Partial<Record<SectionId, string | null>>
  >({});
  const [coordinatorPathFailures, setCoordinatorPathFailures] = useState<
    Partial<Record<SectionId, boolean>>
  >({});
  const [draftWorldBase, setDraftWorldBase] = useState<WorldBaseCastDraft>(
    createWorldBaseCastDraft(initialState.state.worldBase),
  );
  const [savedWorldBase, setSavedWorldBase] = useState<WorldBaseCastDraft>(
    createWorldBaseCastDraft(initialState.state.worldBase),
  );
  const [worldBaseSaveStatus, setWorldBaseSaveStatus] = useState<string | null>(null);
  const [isWorldBaseSaving, setIsWorldBaseSaving] = useState(false);
  const [draftScenePhase, setDraftScenePhase] = useState<ScenePhaseAuthoringDraft>(
    createScenePhaseAuthoringDraft(initialState.state),
  );
  const [savedScenePhase, setSavedScenePhase] = useState<ScenePhaseAuthoringDraft>(
    createScenePhaseAuthoringDraft(initialState.state),
  );
  const [scenePhaseSaveStatus, setScenePhaseSaveStatus] = useState<string | null>(null);
  const [isScenePhaseSaving, setIsScenePhaseSaving] = useState(false);
  const [draftControlModules, setDraftControlModules] = useState<ControlModulesDraft>(
    createControlModulesDraft(initialState.state),
  );
  const [savedControlModules, setSavedControlModules] = useState<ControlModulesDraft>(
    createControlModulesDraft(initialState.state),
  );
  const [controlModulesSaveStatus, setControlModulesSaveStatus] = useState<string | null>(null);
  const [isControlModulesSaving, setIsControlModulesSaving] = useState(false);
  const previousRouteRef = useRef<{
    readonly packageName: string;
    readonly activeSection: SectionId;
    readonly activeSurface: WorldbaseSurface;
  } | null>(null);
  const activeSectionSummary = SECTION_SUMMARIES[activeSection];
  const sceneName = currentState.sceneSpec.sceneName;
  const routerOptions = getRouterOptions(currentState.routerProfiles);
  const phaseIds = currentState.phasePlans.map((phase) => phase.phaseId);
  const localDiagnostics = useMemo(
    () =>
      buildPackageDiagnostics({
        packageName,
        source: currentSource,
        storyPackage: currentState,
        authoringState: currentAuthoringState,
        recentSaveResults,
      }),
    [currentAuthoringState, currentSource, currentState, packageName, recentSaveResults],
  );
  const diagnostics = remoteDiagnostics ?? localDiagnostics;
  const activeLocalStatusMessage =
    activeSection === 'worldbase-cast'
      ? worldBaseSaveStatus
      : activeSection === 'scene-phase-authoring'
        ? scenePhaseSaveStatus
        : activeSection === 'control-modules'
          ? controlModulesSaveStatus
          : null;
  const activeCoordinatorSummary = coordinatorSummaries[activeSection] ?? null;
  const activeCoordinatorPathFailure = coordinatorPathFailures[activeSection] ?? false;

  const pageHelperPanel = (
    <PageHelperPanel
      packageName={packageName}
      initialState={{
        source: currentSource,
        state: currentState,
      }}
      activeSectionLabel={activeSectionSummary.title}
      {...(activeCoordinatorSummary ? { coordinatorSummary: activeCoordinatorSummary } : {})}
      {...(activeSection === 'package-wiring-validation'
        ? { diagnosticsHelperView: diagnostics.globalDiagnosticsHelperView }
        : {})}
    />
  );

  const currentPageStatus = activeLocalStatusMessage ? (
    <CurrentPageStatus
      message={activeLocalStatusMessage}
      {...(activeCoordinatorPathFailure
        ? { failureNote: SAVE_PATH_FAILURE_STATUS }
        : {})}
    />
  ) : null;

  useEffect(() => {
    const previousRoute = previousRouteRef.current;
    previousRouteRef.current = {
      packageName,
      activeSection,
      activeSurface,
    };

    const isWorldbaseSurfaceSwitchOnly =
      previousRoute?.packageName === packageName &&
      previousRoute.activeSection === 'worldbase-cast' &&
      activeSection === 'worldbase-cast' &&
      previousRoute.activeSurface !== activeSurface;

    if (isWorldbaseSurfaceSwitchOnly) {
      setRuntimeContinuityView(initialState.runtimeContinuityView);
      return;
    }
    setCurrentState(initialState.state);
    setCurrentSource(initialState.source);
    setAgentSurfaceItems(initialState.agentSurfaceItems ?? []);
    setCurrentAuthoringState(initialState.authoringState ?? null);
    setRuntimeContinuityView(initialState.runtimeContinuityView);
    setRecentSaveResults([]);
    setRemoteDiagnostics(null);
    setCoordinatorSummaries({});
    setCoordinatorPathFailures({});
    const nextWorldBaseDraft = createWorldBaseCastDraft(initialState.state.worldBase);
    setDraftWorldBase(nextWorldBaseDraft);
    setSavedWorldBase(nextWorldBaseDraft);
    setWorldBaseSaveStatus(null);
    setIsWorldBaseSaving(false);
    const nextScenePhaseDraft = createScenePhaseAuthoringDraft(initialState.state);
    setDraftScenePhase(nextScenePhaseDraft);
    setSavedScenePhase(nextScenePhaseDraft);
    setScenePhaseSaveStatus(null);
    setIsScenePhaseSaving(false);
    const nextControlModulesDraft = createControlModulesDraft(initialState.state);
    setDraftControlModules(nextControlModulesDraft);
    setSavedControlModules(nextControlModulesDraft);
    setControlModulesSaveStatus(null);
    setIsControlModulesSaving(false);
  }, [
    activeSection,
    activeSurface,
    initialState.authoringState,
    initialState.agentSurfaceItems,
    initialState.runtimeContinuityView,
    initialState.source,
    initialState.state,
    packageName,
  ]);

  function rememberSaveResult(result: SaveResult) {
    setRecentSaveResults((currentResults) => {
      const nextResults = currentResults.filter(
        (existingResult) => existingResult.sectionId !== result.sectionId,
      );

      if (!result.showInGlobalDiagnostics) {
        return nextResults;
      }

      return [result, ...nextResults].slice(0, 10);
    });
    setRemoteDiagnostics(null);
  }

  function setCoordinatorSummary(sectionId: SectionId, summary: string | null) {
    setCoordinatorSummaries((currentSummaries) => ({
      ...currentSummaries,
      [sectionId]: summary,
    }));
  }

  function setCoordinatorPathFailure(sectionId: SectionId, isPathFailure: boolean) {
    setCoordinatorPathFailures((currentPathFailures) => ({
      ...currentPathFailures,
      [sectionId]: isPathFailure,
    }));
  }

  function rememberSuccessfulAuthoringSave(sectionId: EditableSectionId) {
    setCurrentAuthoringState((currentAuthoringStatus) => ({
      hasSuccessfulSave: true,
      lastSavedAt: new Date().toISOString(),
      lastEditedSection: sectionId,
      ...(currentAuthoringStatus?.lastSavedRequestId
        ? { lastSavedRequestId: currentAuthoringStatus.lastSavedRequestId }
        : {}),
    }));
  }

  async function requestCoordinatorAssist(
    sectionId: 'worldbase-cast' | 'scene-phase-authoring' | 'control-modules',
    uiFields: Record<string, unknown>,
    moduleScope?: ModuleScope,
  ): Promise<CoordinatorRunResult | null> {
    try {
      const response = await fetch(
        `/api/authoring/packages/${encodeURIComponent(packageName)}/coordinator`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            requestId: `coordinator-${sectionId}-${Date.now()}`,
            activeSection: sectionId,
            actorInput: {
              source: 'form',
              uiFields,
            },
            ...(moduleScope ? { moduleScope } : {}),
          }),
        },
      );

      const result = (await response.json()) as CoordinatorRunResult;
      setCoordinatorSummary(
        sectionId,
        isSuccessfulSaveResult(result.saveResult) ? null : result.coordinatorSummary,
      );
      setCoordinatorPathFailure(sectionId, false);
      rememberSaveResult(result.saveResult);
      return result;
    } catch {
      setCoordinatorSummary(sectionId, null);
      setCoordinatorPathFailure(sectionId, true);
      return null;
    }
  }

  async function handleDiagnosticsRefresh() {
    setIsDiagnosticsRefreshing(true);

    try {
      const response = await fetch(
        `/api/authoring/packages/${encodeURIComponent(packageName)}/diagnostics`,
      );

      if (!response.ok) {
        setRemoteDiagnostics(null);
        setAgentSurfaceItems(initialState.agentSurfaceItems ?? []);
        return;
      }

      const result = (await response.json()) as DiagnosticsRefreshResult;
      setRemoteDiagnostics(result);
      if (Array.isArray(result.agentSurfaceItems)) {
        setAgentSurfaceItems(result.agentSurfaceItems);
      }
    } catch {
      setRemoteDiagnostics(null);
      setAgentSurfaceItems(initialState.agentSurfaceItems ?? []);
    } finally {
      setIsDiagnosticsRefreshing(false);
    }
  }

  async function handleWorldBaseCastSubmit() {
    setIsWorldBaseSaving(true);
    setWorldBaseSaveStatus(null);
    setCoordinatorPathFailure('worldbase-cast', false);

    try {
      const response = await fetch(
        `/api/authoring/packages/${encodeURIComponent(packageName)}/sections/worldbase-cast`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            requestId: `worldbase-cast-${Date.now()}`,
            source: 'page',
            payload: {
              uiFields: draftWorldBase,
            },
          }),
        },
      );

      const result = (await response.json()) as SaveResult;
      rememberSaveResult(result);

      if (
        response.ok &&
        (result.kind === 'save_applied' || result.kind === 'save_applied_with_warnings') &&
        result.reloadedSectionState?.worldBase
      ) {
        setCurrentState(result.reloadedSectionState);
        setCurrentSource('latest-saved');
        if (didPersistAuthoringState(result)) {
          rememberSuccessfulAuthoringSave('worldbase-cast');
        }
        const nextDraft = createWorldBaseCastDraft(result.reloadedSectionState.worldBase);
        setDraftWorldBase(nextDraft);
        setSavedWorldBase(nextDraft);
        setWorldBaseSaveStatus(formatAppliedSaveMessage(result, '已保存并归一化。'));
        setCoordinatorSummary('worldbase-cast', null);
        setCoordinatorPathFailure('worldbase-cast', false);
        return;
      }

      if (result.kind === 'save_blocked' && result.blockingIssues) {
        setWorldBaseSaveStatus(formatBlockedSaveMessage(result.blockingIssues));
        const coordinatorResult = await requestCoordinatorAssist(
          'worldbase-cast',
          draftWorldBase as unknown as Record<string, unknown>,
        );
        if (
          coordinatorResult &&
          isSuccessfulSaveResult(coordinatorResult.saveResult) &&
          coordinatorResult.saveResult.reloadedSectionState?.worldBase
        ) {
          setCurrentState(coordinatorResult.saveResult.reloadedSectionState);
          setCurrentSource('latest-saved');
          if (didPersistAuthoringState(coordinatorResult.saveResult)) {
            rememberSuccessfulAuthoringSave('worldbase-cast');
          }
          const nextDraft = createWorldBaseCastDraft(
            coordinatorResult.saveResult.reloadedSectionState.worldBase,
          );
          setDraftWorldBase(nextDraft);
          setSavedWorldBase(nextDraft);
          setWorldBaseSaveStatus(formatHelperSaveMessage(coordinatorResult.saveResult));
        }
        return;
      }

      setWorldBaseSaveStatus(formatSaveFailureMessage(result));
      if (result.kind === 'save_failed') {
        const coordinatorResult = await requestCoordinatorAssist(
          'worldbase-cast',
          draftWorldBase as unknown as Record<string, unknown>,
        );
        if (
          coordinatorResult &&
          isSuccessfulSaveResult(coordinatorResult.saveResult) &&
          coordinatorResult.saveResult.reloadedSectionState?.worldBase
        ) {
          setCurrentState(coordinatorResult.saveResult.reloadedSectionState);
          setCurrentSource('latest-saved');
          if (didPersistAuthoringState(coordinatorResult.saveResult)) {
            rememberSuccessfulAuthoringSave('worldbase-cast');
          }
          const nextDraft = createWorldBaseCastDraft(
            coordinatorResult.saveResult.reloadedSectionState.worldBase,
          );
          setDraftWorldBase(nextDraft);
          setSavedWorldBase(nextDraft);
          setWorldBaseSaveStatus(formatHelperSaveMessage(coordinatorResult.saveResult));
        }
      }
    } catch {
      setWorldBaseSaveStatus(SAVE_FAILED_STATUS);
    } finally {
      setIsWorldBaseSaving(false);
    }
  }

  function handleWorldBaseCastReset() {
    setDraftWorldBase(savedWorldBase);
    setWorldBaseSaveStatus(RESET_STATUS);
    setCoordinatorSummary('worldbase-cast', null);
    setCoordinatorPathFailure('worldbase-cast', false);
  }

  async function handleScenePhaseSubmit() {
    setIsScenePhaseSaving(true);
    setScenePhaseSaveStatus(null);
    setCoordinatorPathFailure('scene-phase-authoring', false);

    try {
      const response = await fetch(
        `/api/authoring/packages/${encodeURIComponent(packageName)}/sections/scene-phase-authoring`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            requestId: `scene-phase-authoring-${Date.now()}`,
            source: 'page',
            payload: {
              uiFields: draftScenePhase,
            },
          }),
        },
      );

      const result = (await response.json()) as SaveResult;
      rememberSaveResult(result);

      if (
        response.ok &&
        (result.kind === 'save_applied' || result.kind === 'save_applied_with_warnings') &&
        result.reloadedSectionState
      ) {
        setCurrentState(result.reloadedSectionState);
        setCurrentSource('latest-saved');
        if (didPersistAuthoringState(result)) {
          rememberSuccessfulAuthoringSave('scene-phase-authoring');
        }
        const nextDraft = createScenePhaseAuthoringDraft(result.reloadedSectionState);
        setDraftScenePhase(nextDraft);
        setSavedScenePhase(nextDraft);
        setScenePhaseSaveStatus(formatAppliedSaveMessage(result, '已保存并重新编排。'));
        setCoordinatorSummary('scene-phase-authoring', null);
        setCoordinatorPathFailure('scene-phase-authoring', false);
        return;
      }

      if (result.kind === 'save_blocked' && result.blockingIssues) {
        setScenePhaseSaveStatus(formatBlockedSaveMessage(result.blockingIssues));
        const coordinatorResult = await requestCoordinatorAssist(
          'scene-phase-authoring',
          draftScenePhase as unknown as Record<string, unknown>,
        );
        if (
          coordinatorResult &&
          isSuccessfulSaveResult(coordinatorResult.saveResult) &&
          coordinatorResult.saveResult.reloadedSectionState
        ) {
          setCurrentState(coordinatorResult.saveResult.reloadedSectionState);
          setCurrentSource('latest-saved');
          if (didPersistAuthoringState(coordinatorResult.saveResult)) {
            rememberSuccessfulAuthoringSave('scene-phase-authoring');
          }
          const nextDraft = createScenePhaseAuthoringDraft(
            coordinatorResult.saveResult.reloadedSectionState,
          );
          setDraftScenePhase(nextDraft);
          setSavedScenePhase(nextDraft);
          setScenePhaseSaveStatus(formatHelperSaveMessage(coordinatorResult.saveResult));
        }
        return;
      }

      setScenePhaseSaveStatus(formatSaveFailureMessage(result));
      if (result.kind === 'save_failed') {
        const coordinatorResult = await requestCoordinatorAssist(
          'scene-phase-authoring',
          draftScenePhase as unknown as Record<string, unknown>,
        );
        if (
          coordinatorResult &&
          isSuccessfulSaveResult(coordinatorResult.saveResult) &&
          coordinatorResult.saveResult.reloadedSectionState
        ) {
          setCurrentState(coordinatorResult.saveResult.reloadedSectionState);
          setCurrentSource('latest-saved');
          if (didPersistAuthoringState(coordinatorResult.saveResult)) {
            rememberSuccessfulAuthoringSave('scene-phase-authoring');
          }
          const nextDraft = createScenePhaseAuthoringDraft(
            coordinatorResult.saveResult.reloadedSectionState,
          );
          setDraftScenePhase(nextDraft);
          setSavedScenePhase(nextDraft);
          setScenePhaseSaveStatus(formatHelperSaveMessage(coordinatorResult.saveResult));
        }
      }
    } catch {
      setScenePhaseSaveStatus(SAVE_FAILED_STATUS);
    } finally {
      setIsScenePhaseSaving(false);
    }
  }

  function handleScenePhaseReset() {
    setDraftScenePhase(savedScenePhase);
    setScenePhaseSaveStatus(RESET_STATUS);
    setCoordinatorSummary('scene-phase-authoring', null);
    setCoordinatorPathFailure('scene-phase-authoring', false);
  }

  async function handleControlModulesSubmit(moduleScope: ModuleScope) {
    setIsControlModulesSaving(true);
    setControlModulesSaveStatus(null);
    setCoordinatorPathFailure('control-modules', false);

    try {
      const response = await fetch(
        `/api/authoring/packages/${encodeURIComponent(packageName)}/sections/control-modules`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            requestId: `control-modules-${moduleScope}-${Date.now()}`,
            source: 'page',
            moduleScope,
            payload: {
              uiFields: draftControlModules,
            },
          }),
        },
      );

      const result = (await response.json()) as SaveResult;
      rememberSaveResult(result);

      if (
        response.ok &&
        (result.kind === 'save_applied' || result.kind === 'save_applied_with_warnings') &&
        result.reloadedSectionState
      ) {
        setCurrentState(result.reloadedSectionState);
        setCurrentSource('latest-saved');
        if (didPersistAuthoringState(result)) {
          rememberSuccessfulAuthoringSave('control-modules');
        }
        const nextDraft = createControlModulesDraft(result.reloadedSectionState);
        setDraftControlModules(nextDraft);
        setSavedControlModules(nextDraft);
        setControlModulesSaveStatus(formatAppliedSaveMessage(result, '已保存当前控制模块。'));
        setCoordinatorSummary('control-modules', null);
        setCoordinatorPathFailure('control-modules', false);
        return;
      }

      if (result.kind === 'save_blocked' && result.blockingIssues) {
        setControlModulesSaveStatus(formatBlockedSaveMessage(result.blockingIssues));
        const coordinatorResult = await requestCoordinatorAssist(
          'control-modules',
          {
            controlModules: draftControlModules.controlModules,
            routerProfiles: draftControlModules.routerProfiles,
            auditQuestionSet: draftControlModules.auditQuestionSet,
          },
          moduleScope,
        );
        if (
          coordinatorResult &&
          isSuccessfulSaveResult(coordinatorResult.saveResult) &&
          coordinatorResult.saveResult.reloadedSectionState
        ) {
          setCurrentState(coordinatorResult.saveResult.reloadedSectionState);
          setCurrentSource('latest-saved');
          if (didPersistAuthoringState(coordinatorResult.saveResult)) {
            rememberSuccessfulAuthoringSave('control-modules');
          }
          const nextDraft = createControlModulesDraft(
            coordinatorResult.saveResult.reloadedSectionState,
          );
          setDraftControlModules(nextDraft);
          setSavedControlModules(nextDraft);
          setControlModulesSaveStatus(formatHelperSaveMessage(coordinatorResult.saveResult));
        }
        return;
      }

      setControlModulesSaveStatus(formatSaveFailureMessage(result));
      if (result.kind === 'save_failed') {
        const coordinatorResult = await requestCoordinatorAssist(
          'control-modules',
          {
            controlModules: draftControlModules.controlModules,
            routerProfiles: draftControlModules.routerProfiles,
            auditQuestionSet: draftControlModules.auditQuestionSet,
          },
          moduleScope,
        );
        if (
          coordinatorResult &&
          isSuccessfulSaveResult(coordinatorResult.saveResult) &&
          coordinatorResult.saveResult.reloadedSectionState
        ) {
          setCurrentState(coordinatorResult.saveResult.reloadedSectionState);
          setCurrentSource('latest-saved');
          if (didPersistAuthoringState(coordinatorResult.saveResult)) {
            rememberSuccessfulAuthoringSave('control-modules');
          }
          const nextDraft = createControlModulesDraft(
            coordinatorResult.saveResult.reloadedSectionState,
          );
          setDraftControlModules(nextDraft);
          setSavedControlModules(nextDraft);
          setControlModulesSaveStatus(formatHelperSaveMessage(coordinatorResult.saveResult));
        }
      }
    } catch {
      setControlModulesSaveStatus(SAVE_FAILED_STATUS);
    } finally {
      setIsControlModulesSaving(false);
    }
  }

  return (
    <main className="workspace-page edit-page">
      <section className="panel edit-shell">
        <div className="edit-shell__bar">
          <div className="edit-shell__identity">
            <p className="panel-eyebrow">Unified Editor Shell</p>
            <h1>LOGOS Narrative Editor</h1>
            <p>
              Move across the four authoring pages from one compact shell while keeping page-level
              save and reset actions local to the active page.
            </p>
          </div>
          {pageHelperPanel}
        </div>
        <div className="edit-shell__meta">
          <span>{packageName}</span>
          <span>{sceneName}</span>
          <span>{initialState.source}</span>
        </div>
        <SectionTabs
          packageName={packageName}
          activeSection={activeSection}
          activeSurface={activeSurface}
        />
      </section>

      <PageActionBar packageName={packageName} />

      <section className="edit-layout">
        {currentPageStatus}
        {activeSection === 'worldbase-cast' ? (
          <WorldBaseCastSection
            packageName={packageName}
            activeSurface={activeSurface}
            value={draftWorldBase}
            runtimeContinuityView={runtimeContinuityView}
            onChange={setDraftWorldBase}
            onSubmit={handleWorldBaseCastSubmit}
            onReset={handleWorldBaseCastReset}
            isSaving={isWorldBaseSaving}
          />
        ) : activeSection === 'scene-phase-authoring' ? (
          <ScenePhaseAuthoringSection
            packageName={packageName}
            value={draftScenePhase}
            sceneCastLibrary={currentState.worldBase}
            sceneLocations={currentState.worldBase.locations}
            routerOptions={routerOptions}
            onChange={setDraftScenePhase}
            onSubmit={handleScenePhaseSubmit}
            onReset={handleScenePhaseReset}
            isSaving={isScenePhaseSaving}
          />
        ) : activeSection === 'control-modules' ? (
          <ControlModulesSection
            packageName={packageName}
            phaseIds={phaseIds}
            value={draftControlModules}
            onChange={setDraftControlModules}
            onSubmit={handleControlModulesSubmit}
            onReset={() => {
              setDraftControlModules(savedControlModules);
              setControlModulesSaveStatus(RESET_STATUS);
              setCoordinatorSummary('control-modules', null);
              setCoordinatorPathFailure('control-modules', false);
            }}
            isSaving={isControlModulesSaving}
          />
        ) : activeSection === 'package-wiring-validation' ? (
          <PackageWiringValidationSection
            packageName={packageName}
            diagnostics={diagnostics}
            agentSurfaceItems={agentSurfaceItems}
            onRefresh={handleDiagnosticsRefresh}
            isRefreshing={isDiagnosticsRefreshing}
          />
        ) : (
          <SectionSurface sectionId={activeSection}>
            <dl className="edit-surface__facts">
              <div>
                <dt>Package name</dt>
                <dd>{packageName}</dd>
              </div>
              <div>
                <dt>Scene name</dt>
                <dd>{sceneName}</dd>
              </div>
              <div>
                <dt>State source</dt>
                <dd>{initialState.source}</dd>
              </div>
              <div>
                <dt>Section</dt>
                <dd>{activeSectionSummary.title}</dd>
              </div>
            </dl>
          </SectionSurface>
        )}
      </section>
    </main>
  );
}
