import type { StoryPackage } from '@/types';

interface AuthorControlPanelProps {
  readonly storyPackage: StoryPackage;
  readonly currentPhaseIndex: number;
}

export function AuthorControlPanel({ storyPackage, currentPhaseIndex }: AuthorControlPanelProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Author Controls</p>
          <h2>Phase Plans</h2>
        </div>
      </div>
      <div className="phase-plan-list">
        {storyPackage.phasePlans.map((phasePlan) => (
          <article
            key={phasePlan.phaseId}
            className={`phase-plan-card${
              phasePlan.phaseIndex === currentPhaseIndex ? ' phase-plan-card--active' : ''
            }`}
          >
            <div className="phase-plan-card__header">
              <strong>{`Phase ${phasePlan.phaseIndex}`}</strong>
              <span>{phasePlan.gradientType}</span>
            </div>
            <p>{phasePlan.phaseGoal}</p>
            {phasePlan.routerHint ? <p className="panel-note">{phasePlan.routerHint}</p> : null}
            {phasePlan.notes ? <p className="panel-note">{phasePlan.notes}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
