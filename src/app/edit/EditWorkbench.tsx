'use client';

import type { ReactNode } from 'react';

import { type SectionId } from '@/authoring/contracts';
import type { AuthoringStateLoadResult } from '@/authoring/persistence/package-state';
import { PageActionBar } from '@/app/edit/shared/PageActionBar';
import { PageHelperPanel } from '@/app/edit/shared/PageHelperPanel';
import { SectionTabs } from '@/app/edit/shared/SectionTabs';

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
        <PageHelperPanel
          packageName={packageName}
          initialState={initialState}
          activeSectionLabel={activeSectionSummary.title}
        />
      </section>
    </main>
  );
}
