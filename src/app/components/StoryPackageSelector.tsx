import Link from 'next/link';

import {
  type StoryPackageCatalogEntry,
  isReadyStoryPackageEntry,
} from '@/app/story-package-catalog';
import { SceneOverview } from '@/app/components/SceneOverview';

interface StoryPackageSelectorProps {
  readonly packages: readonly StoryPackageCatalogEntry[];
}

export function StoryPackageSelector({ packages }: StoryPackageSelectorProps) {
  return (
    <section className="selector-panel">
      <div className="selector-panel__intro">
        <p className="panel-eyebrow">Sample Dashboard</p>
        <h1>Choose a Scene Package</h1>
        <p>
          Start from a verified sample package, confirm the narrative context, then move into the
          runtime workbench.
        </p>
      </div>
      <div className="selector-grid">
        {packages.map((entry) =>
          isReadyStoryPackageEntry(entry) ? (
            <article key={entry.packageName} className="selector-card">
              <SceneOverview scene={entry} />
              <div className="selector-card__actions">
                <Link
                  className="primary-link"
                  href={`/edit?storyPackage=${encodeURIComponent(entry.packageName)}`}
                >
                  Open Editor
                </Link>
                <Link
                  className="secondary-link"
                  href={`/play?storyPackage=${encodeURIComponent(entry.packageName)}`}
                >
                  {`Open ${entry.sceneName}`}
                </Link>
              </div>
            </article>
          ) : (
            <article key={entry.packageName} className="selector-card selector-card--error">
              <p className="scene-overview__label">{entry.packageName}</p>
              <h2>Unavailable Package</h2>
              <p>{entry.error}</p>
            </article>
          ),
        )}
      </div>
    </section>
  );
}
