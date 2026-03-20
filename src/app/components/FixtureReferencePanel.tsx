import type { StoryPackage } from '@/types';

interface FixtureReferencePanelProps {
  readonly storyPackage: StoryPackage;
  readonly storyPackageName: string;
}

export function FixtureReferencePanel({
  storyPackage,
  storyPackageName,
}: FixtureReferencePanelProps) {
  return (
    <section className="panel fixture-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Sample Sources</p>
          <h2>Fixture Reference</h2>
        </div>
        <p className="panel-note">Read-only source context for the active sample package.</p>
      </div>

      <div className="fixture-grid">
        <section className="fixture-card">
          <h3>Sample Source</h3>
          <dl className="scene-overview__meta">
            <div>
              <dt>Package</dt>
              <dd>{storyPackageName}</dd>
            </div>
            {storyPackage.sceneSpec.source ? (
              <div>
                <dt>Source</dt>
                <dd>{storyPackage.sceneSpec.source}</dd>
              </div>
            ) : null}
            {storyPackage.sceneSpec.samplePurpose ? (
              <div>
                <dt>Purpose</dt>
                <dd>{storyPackage.sceneSpec.samplePurpose}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="fixture-card">
          <h3>World Base</h3>
          <div className="stack-list">
            <article>
              <p className="metric-label">Main Characters</p>
              <p>{storyPackage.worldBase.mainCharacters}</p>
            </article>
            {storyPackage.worldBase.npcCharacters ? (
              <article>
                <p className="metric-label">NPC Characters</p>
                <p>{storyPackage.worldBase.npcCharacters}</p>
              </article>
            ) : null}
            <article>
              <p className="metric-label">Location Patch</p>
              <p>{storyPackage.worldBase.locationPatch}</p>
            </article>
          </div>
        </section>

        <section className="fixture-card fixture-card--wide">
          <h3>Router Reference</h3>
          <div className="router-reference-list">
            {storyPackage.routerProfiles.map((profile) => (
              <article key={profile.routerName} className="router-reference-card">
                <div className="phase-plan-card__header">
                  <strong>{profile.routerName}</strong>
                  <span>{profile.verbLexicon.length} verbs</span>
                </div>
                <p>{profile.routerSemanticCore}</p>
                <p className="panel-note">{profile.verbLexicon.join(', ')}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
