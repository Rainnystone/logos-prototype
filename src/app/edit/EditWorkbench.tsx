'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { type ModuleScope, type SaveResult, type SectionId } from '@/authoring/contracts';
import type { CoordinatorRunResult } from '@/authoring/coordinator/dispatch';
import type { AuthoringState } from '@/authoring/persistence/package-state';
import type { AuthoringStateLoadResult } from '@/authoring/persistence/package-state';
import { PageActionBar } from '@/app/edit/shared/PageActionBar';
import { PageHelperPanel } from '@/app/edit/shared/PageHelperPanel';
import { ControlModulesSection } from '@/app/edit/sections/ControlModulesSection';
import { PackageWiringValidationSection } from '@/app/edit/sections/PackageWiringValidationSection';
import { ScenePhaseAuthoringSection } from '@/app/edit/sections/ScenePhaseAuthoringSection';
import { SectionTabs } from '@/app/edit/shared/SectionTabs';
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
    eyebrow: 'WorldBase & Cast',
    title: 'WorldBase & Cast',
    description: 'Shape the shared world description, named cast, and fixed location details.',
  },
  'scene-phase-authoring': {
    eyebrow: 'SCENE & PHASE',
    title: 'SCENE & PHASE',
    description: 'Adjust the scene spine and phase progression before the beat loop runs.',
  },
  'control-modules': {
    eyebrow: 'Control Modules',
    title: 'Control Modules',
    description: 'Prepare the control slices that steer generation, auditing, and recovery.',
  },
  'package-wiring-validation': {
    eyebrow: 'Package Wiring Validation',
    title: 'Package Wiring Validation',
    description: 'Check whether the package pieces still connect cleanly after edits.',
  },
};

interface EditWorkbenchProps {
  readonly packageName: string;
  readonly activeSection: SectionId;
  readonly initialState: AuthoringStateLoadResult;
}

type EditableSectionId = Exclude<SectionId, 'package-wiring-validation'>;
type PendingSectionReviews = NonNullable<AuthoringState['pendingSectionReviews']>;

const SECTION_REVIEW_DEPENDENCIES: Record<EditableSectionId, readonly EditableSectionId[]> = {
  'worldbase-cast': ['scene-phase-authoring', 'control-modules'],
  'scene-phase-authoring': ['control-modules'],
  'control-modules': [],
};

function advancePendingSectionReviews(
  currentReviews: PendingSectionReviews | undefined,
  editedSection: EditableSectionId,
): PendingSectionReviews | undefined {
  const nextReviews = {
    ...(currentReviews ?? {}),
  };

  delete nextReviews[editedSection];

  for (const dependentSection of SECTION_REVIEW_DEPENDENCIES[editedSection]) {
    const sources = new Set(nextReviews[dependentSection] ?? []);
    sources.add(editedSection);
    nextReviews[dependentSection] = Array.from(sources);
  }

  const populatedEntries = Object.entries(nextReviews).filter((entry) => {
    const [, sources] = entry;
    return Array.isArray(sources) && sources.length > 0;
  });

  if (populatedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(populatedEntries) as PendingSectionReviews;
}

function didPersistAuthoringState(result: SaveResult): boolean {
  return (
    (result.kind === 'save_applied' || result.kind === 'save_applied_with_warnings') &&
    result.runtimeImpactSummary.changedFiles.includes('authoring-state.json')
  );
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

export function EditWorkbench({
  packageName,
  activeSection,
  initialState,
}: EditWorkbenchProps) {
  const [currentState, setCurrentState] = useState(initialState.state);
  const [currentSource, setCurrentSource] = useState(initialState.source);
  const [currentAuthoringState, setCurrentAuthoringState] = useState(initialState.authoringState ?? null);
  const [recentSaveResults, setRecentSaveResults] = useState<SaveResult[]>([]);
  const [remoteDiagnostics, setRemoteDiagnostics] = useState<PackageDiagnostics | null>(null);
  const [isDiagnosticsRefreshing, setIsDiagnosticsRefreshing] = useState(false);
  const [coordinatorSummaries, setCoordinatorSummaries] = useState<
    Partial<Record<SectionId, string | null>>
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

  const pageHelperPanel = (
    <PageHelperPanel
      packageName={packageName}
      initialState={{
        source: currentSource,
        state: currentState,
      }}
      activeSectionLabel={activeSectionSummary.title}
      {...(activeLocalStatusMessage ? { localStatusMessage: activeLocalStatusMessage } : {})}
      {...(activeCoordinatorSummary
        ? { coordinatorSummary: activeCoordinatorSummary }
        : {})}
      {...(activeSection === 'package-wiring-validation'
        ? { diagnosticsHelperView: diagnostics.globalDiagnosticsHelperView }
        : {})}
    />
  );

  useEffect(() => {
    setCurrentState(initialState.state);
    setCurrentSource(initialState.source);
    setCurrentAuthoringState(initialState.authoringState ?? null);
    setRecentSaveResults([]);
    setRemoteDiagnostics(null);
    setCoordinatorSummaries({});
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
  }, [initialState.authoringState, initialState.source, initialState.state, packageName]);

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

  function rememberSuccessfulAuthoringSave(sectionId: EditableSectionId) {
    setCurrentAuthoringState((currentAuthoringStatus) => ({
      hasSuccessfulSave: true,
      lastSavedAt: new Date().toISOString(),
      lastEditedSection: sectionId,
      ...(currentAuthoringStatus?.lastSavedRequestId
        ? { lastSavedRequestId: currentAuthoringStatus.lastSavedRequestId }
        : {}),
      ...(advancePendingSectionReviews(currentAuthoringStatus?.pendingSectionReviews, sectionId)
        ? {
            pendingSectionReviews: advancePendingSectionReviews(
              currentAuthoringStatus?.pendingSectionReviews,
              sectionId,
            ),
          }
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
      setCoordinatorSummary(sectionId, result.coordinatorSummary);
      rememberSaveResult(result.saveResult);
      return result;
    } catch {
      setCoordinatorSummary(
        sectionId,
        'The page helper could not reach the shared save path.',
      );
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
        return;
      }

      const result = (await response.json()) as PackageDiagnostics;
      setRemoteDiagnostics(result);
    } finally {
      setIsDiagnosticsRefreshing(false);
    }
  }

  async function handleWorldBaseCastSubmit() {
    setIsWorldBaseSaving(true);
    setWorldBaseSaveStatus(null);

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
        setWorldBaseSaveStatus('Saved and normalized.');
        setCoordinatorSummary('worldbase-cast', null);
        return;
      }

      if (result.kind === 'save_blocked' && result.blockingIssues) {
        setWorldBaseSaveStatus(result.blockingIssues.join(' '));
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
          setWorldBaseSaveStatus('Saved through the page helper.');
        }
        return;
      }

      setWorldBaseSaveStatus(result.kind === 'save_failed' ? result.errorMessage : 'Save failed.');
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
          setWorldBaseSaveStatus('Saved through the page helper.');
        }
      }
    } catch {
      setWorldBaseSaveStatus('Save failed.');
    } finally {
      setIsWorldBaseSaving(false);
    }
  }

  function handleWorldBaseCastReset() {
    setDraftWorldBase(savedWorldBase);
    setWorldBaseSaveStatus('Reverted to the latest saved state.');
    setCoordinatorSummary('worldbase-cast', null);
  }

  async function handleScenePhaseSubmit() {
    setIsScenePhaseSaving(true);
    setScenePhaseSaveStatus(null);

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
        setScenePhaseSaveStatus('Saved and reindexed.');
        setCoordinatorSummary('scene-phase-authoring', null);
        return;
      }

      if (result.kind === 'save_blocked' && result.blockingIssues) {
        setScenePhaseSaveStatus(result.blockingIssues.join(' '));
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
          setScenePhaseSaveStatus('Saved through the page helper.');
        }
        return;
      }

      setScenePhaseSaveStatus(result.kind === 'save_failed' ? result.errorMessage : 'Save failed.');
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
          setScenePhaseSaveStatus('Saved through the page helper.');
        }
      }
    } catch {
      setScenePhaseSaveStatus('Save failed.');
    } finally {
      setIsScenePhaseSaving(false);
    }
  }

  function handleScenePhaseReset() {
    setDraftScenePhase(savedScenePhase);
    setScenePhaseSaveStatus('Reverted to the latest saved state.');
    setCoordinatorSummary('scene-phase-authoring', null);
  }

  async function handleControlModulesSubmit(moduleScope: ModuleScope) {
    setIsControlModulesSaving(true);
    setControlModulesSaveStatus(null);

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
        setControlModulesSaveStatus('Saved the active control module.');
        setCoordinatorSummary('control-modules', null);
        return;
      }

      if (result.kind === 'save_blocked' && result.blockingIssues) {
        setControlModulesSaveStatus(result.blockingIssues.join(' '));
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
          setControlModulesSaveStatus('Saved through the page helper.');
        }
        return;
      }

      setControlModulesSaveStatus(result.kind === 'save_failed' ? result.errorMessage : 'Save failed.');
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
          setControlModulesSaveStatus('Saved through the page helper.');
        }
      }
    } catch {
      setControlModulesSaveStatus('Save failed.');
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
        <SectionTabs packageName={packageName} activeSection={activeSection} />
      </section>

      <PageActionBar packageName={packageName} />

      <section className="edit-layout">
        {activeSection === 'worldbase-cast' ? (
          <WorldBaseCastSection
            packageName={packageName}
            value={draftWorldBase}
            onChange={setDraftWorldBase}
            onSubmit={handleWorldBaseCastSubmit}
            onReset={handleWorldBaseCastReset}
            statusMessage={worldBaseSaveStatus ?? undefined}
            isSaving={isWorldBaseSaving}
          />
        ) : activeSection === 'scene-phase-authoring' ? (
          <ScenePhaseAuthoringSection
            packageName={packageName}
            value={draftScenePhase}
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
              setControlModulesSaveStatus('Reverted to the latest saved state.');
              setCoordinatorSummary('control-modules', null);
            }}
            statusMessage={controlModulesSaveStatus ?? undefined}
            isSaving={isControlModulesSaving}
          />
        ) : activeSection === 'package-wiring-validation' ? (
          <PackageWiringValidationSection
            packageName={packageName}
            diagnostics={diagnostics}
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
