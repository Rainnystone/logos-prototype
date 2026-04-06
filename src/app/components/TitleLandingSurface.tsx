'use client';

import Link from 'next/link';

import { RuntimeConfigForm } from '@/app/components/RuntimeConfigForm';

interface TitleLandingSurfaceProps {
  readonly playPackageName: string | null;
}

function buildNarrativeEditorHref(packageName: string | null): string {
  if (!packageName) {
    return '/edit?section=story-package-management';
  }

  return `/edit?storyPackage=${encodeURIComponent(packageName)}&section=story-package-management`;
}

export function TitleLandingSurface({ playPackageName }: TitleLandingSurfaceProps) {
  const playHref = playPackageName
    ? `/play?storyPackage=${encodeURIComponent(playPackageName)}`
    : null;
  const editorHref = buildNarrativeEditorHref(playPackageName);

  const actionSlot =
    playHref || editorHref ? (
      <div className="title-card__actions">
        {playHref ? (
          <Link className="title-card__action title-card__action--secondary" href={playHref}>
            Play Workbench
          </Link>
        ) : null}
        <Link className="title-card__action title-card__action--secondary" href={editorHref}>
          Narrative Editor
        </Link>
      </div>
    ) : null;

  return (
    <main className="title-page">
      <section className="title-page__stage">
        <div className="title-page__stack">
          <div className="title-page__wordmark-block">
            <h1 className="title-page__wordmark">LOGOS</h1>
            <p className="title-page__subtitle">Linguistic Oriented Game Orchestration Studio</p>
            <p className="title-page__prototype">prototype</p>
          </div>
        </div>

        <section className="title-card" aria-label="Provider Setup Cabinet">
          <div className="title-card__header">
            <div>
              <p className="title-card__eyebrow">Runtime Config</p>
              <h2>Provider Setup</h2>
            </div>
            <p className="title-card__note">Stored in localStorage only.</p>
          </div>
          <RuntimeConfigForm actionSlot={actionSlot} onSave={() => {}} />
          {!playPackageName ? (
            <p className="title-card__fallback">No loadable story package is available.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
