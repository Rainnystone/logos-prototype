'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { type ModuleScope, type SectionId } from '@/authoring/contracts';
import type { AuthoringStateLoadResult } from '@/authoring/persistence/package-state';
import { PageActionBar } from '@/app/edit/shared/PageActionBar';
import { PageHelperPanel } from '@/app/edit/shared/PageHelperPanel';
import { ControlModulesSection } from '@/app/edit/sections/ControlModulesSection';
import { ScenePhaseAuthoringSection } from '@/app/edit/sections/ScenePhaseAuthoringSection';
import { SectionTabs } from '@/app/edit/shared/SectionTabs';
import { WorldBaseCastSection } from '@/app/edit/sections/WorldBaseCastSection';
import {
  createControlModulesDraft,
  type ControlModulesDraft,
} from '@/authoring/sections/control-modules';
import {
  createScenePhaseAuthoringDraft,
  getRouterOptions,
  type ScenePhaseAuthoringDraft,
} from '@/authoring/sections/scene-phase-authoring';
import type { WorldBase } from '@/types';

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
    eyebrow: 'Scene & Phase Authoring',
    title: 'Scene & Phase Authoring',
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
  const activeSectionSummary = SECTION_SUMMARIES[activeSection];
  const sceneName = initialState.state.sceneSpec.sceneName;
  const [draftWorldBase, setDraftWorldBase] = useState<WorldBase>(initialState.state.worldBase);
  const [savedWorldBase, setSavedWorldBase] = useState<WorldBase>(initialState.state.worldBase);
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
  const routerOptions = getRouterOptions(initialState.state.routerProfiles);
  const phaseIds = initialState.state.phasePlans.map((phase) => phase.phaseId);

  useEffect(() => {
    setDraftWorldBase(initialState.state.worldBase);
    setSavedWorldBase(initialState.state.worldBase);
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
  }, [initialState.state, packageName]);

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

      const result = (await response.json()) as {
        readonly kind?: string;
        readonly reloadedSectionState?: { readonly worldBase?: WorldBase };
        readonly blockingIssues?: readonly string[];
        readonly errorMessage?: string;
      };

      if (
        response.ok &&
        (result.kind === 'save_applied' || result.kind === 'save_applied_with_warnings') &&
        result.reloadedSectionState?.worldBase
      ) {
        setDraftWorldBase(result.reloadedSectionState.worldBase);
        setSavedWorldBase(result.reloadedSectionState.worldBase);
        setWorldBaseSaveStatus('Saved and normalized.');
        return;
      }

      if (result.kind === 'save_blocked' && result.blockingIssues) {
        setWorldBaseSaveStatus(result.blockingIssues.join(' '));
        return;
      }

      setWorldBaseSaveStatus(result.errorMessage ?? 'Save failed.');
    } catch {
      setWorldBaseSaveStatus('Save failed.');
    } finally {
      setIsWorldBaseSaving(false);
    }
  }

  function handleWorldBaseCastReset() {
    setDraftWorldBase(savedWorldBase);
    setWorldBaseSaveStatus('Reverted to the latest saved state.');
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

      const result = (await response.json()) as {
        readonly kind?: string;
        readonly reloadedSectionState?: EditWorkbenchProps['initialState']['state'];
        readonly blockingIssues?: readonly string[];
        readonly errorMessage?: string;
      };

      if (
        response.ok &&
        (result.kind === 'save_applied' || result.kind === 'save_applied_with_warnings') &&
        result.reloadedSectionState
      ) {
        const nextDraft = createScenePhaseAuthoringDraft(result.reloadedSectionState);
        setDraftScenePhase(nextDraft);
        setSavedScenePhase(nextDraft);
        setScenePhaseSaveStatus('Saved and reindexed.');
        return;
      }

      if (result.kind === 'save_blocked' && result.blockingIssues) {
        setScenePhaseSaveStatus(result.blockingIssues.join(' '));
        return;
      }

      setScenePhaseSaveStatus(result.errorMessage ?? 'Save failed.');
    } catch {
      setScenePhaseSaveStatus('Save failed.');
    } finally {
      setIsScenePhaseSaving(false);
    }
  }

  function handleScenePhaseReset() {
    setDraftScenePhase(savedScenePhase);
    setScenePhaseSaveStatus('Reverted to the latest saved state.');
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

      const result = (await response.json()) as {
        readonly kind?: string;
        readonly reloadedSectionState?: EditWorkbenchProps['initialState']['state'];
        readonly blockingIssues?: readonly string[];
        readonly errorMessage?: string;
      };

      if (
        response.ok &&
        (result.kind === 'save_applied' || result.kind === 'save_applied_with_warnings') &&
        result.reloadedSectionState
      ) {
        const nextDraft = createControlModulesDraft(result.reloadedSectionState);
        setDraftControlModules(nextDraft);
        setSavedControlModules(nextDraft);
        setControlModulesSaveStatus('Saved the active control module.');
        return;
      }

      if (result.kind === 'save_blocked' && result.blockingIssues) {
        setControlModulesSaveStatus(result.blockingIssues.join(' '));
        return;
      }

      setControlModulesSaveStatus(result.errorMessage ?? 'Save failed.');
    } catch {
      setControlModulesSaveStatus('Save failed.');
    } finally {
      setIsControlModulesSaving(false);
    }
  }

  return (
    <main className="workspace-page edit-page">
      <section className="panel edit-hero">
        <div>
          <p className="panel-eyebrow">Authoring Editor</p>
          <h1>LOGOS Authoring Editor</h1>
          <p>
            Reopen the latest saved package state when it exists, then move across the four
            authoring surfaces from one shell.
          </p>
        </div>
        <div className="edit-hero__meta">
          <span>{packageName}</span>
          <span>{sceneName}</span>
          <span>{initialState.source}</span>
        </div>
      </section>

      <PageActionBar packageName={packageName} />

      <section className="edit-layout">
        <SectionTabs packageName={packageName} activeSection={activeSection} />
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
            statusMessage={scenePhaseSaveStatus ?? undefined}
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
            }}
            statusMessage={controlModulesSaveStatus ?? undefined}
            isSaving={isControlModulesSaving}
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
        <PageHelperPanel
          packageName={packageName}
          initialState={initialState}
          activeSectionLabel={activeSectionSummary.title}
        />
      </section>
    </main>
  );
}
