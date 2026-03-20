import type { StoryPackageCatalogReadyEntry } from '@/app/story-package-catalog';

interface SceneOverviewProps {
  readonly scene: StoryPackageCatalogReadyEntry;
  readonly eyebrow?: string | undefined;
}

export function SceneOverview({ scene, eyebrow }: SceneOverviewProps) {
  return (
    <section className="panel scene-overview">
      {eyebrow ? <p className="panel-eyebrow">{eyebrow}</p> : null}
      <div className="scene-overview__header">
        <div>
          <p className="scene-overview__label">{scene.packageName}</p>
          <h2>{scene.sceneName}</h2>
        </div>
        <div className="scene-overview__stats">
          <span>{scene.phaseCount} phases</span>
          <span>{scene.totalBeatCount} beats</span>
        </div>
      </div>
      <dl className="scene-overview__meta">
        <div>
          <dt>Scene ID</dt>
          <dd>{scene.sceneId}</dd>
        </div>
        <div>
          <dt>Main Axis</dt>
          <dd>{scene.mainAxis}</dd>
        </div>
        <div>
          <dt>End Line</dt>
          <dd>{scene.endLine}</dd>
        </div>
        {scene.samplePurpose ? (
          <div>
            <dt>Purpose</dt>
            <dd>{scene.samplePurpose}</dd>
          </div>
        ) : null}
        {scene.source ? (
          <div>
            <dt>Source</dt>
            <dd>{scene.source}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
