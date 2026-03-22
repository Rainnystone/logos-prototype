import type { ReactNode } from 'react';

import type { StoryPackage } from '@/types';

interface AuthorControlPanelProps {
  readonly storyPackage: StoryPackage;
  readonly currentPhaseIndex: number;
  readonly metaItems?: readonly string[] | undefined;
  readonly actions?: ReactNode;
}

export function AuthorControlPanel({
  storyPackage,
  currentPhaseIndex,
  metaItems = [],
  actions,
}: AuthorControlPanelProps) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 px-5 pb-3 pt-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="panel-eyebrow">Author Controls</p>
          <h2 className="text-[1.35rem] leading-tight">{storyPackage.sceneSpec.sceneName}</h2>
          <p className="text-sm text-[rgba(31,26,21,0.62)]">Phase Plans</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:items-end">
          {metaItems.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-2">
              {metaItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex rounded-full bg-[rgba(31,26,21,0.07)] px-3 py-1 text-xs text-[rgba(31,26,21,0.76)]"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {actions ? <div className="flex justify-end">{actions}</div> : null}
        </div>
      </div>
      <div className="overflow-x-auto px-5 pb-5">
        <div className="flex min-w-max gap-3">
        {storyPackage.phasePlans.map((phasePlan) => (
          <article
            key={phasePlan.phaseId}
            className={`w-[17rem] shrink-0 rounded-2xl border p-4 ${
              phasePlan.phaseIndex === currentPhaseIndex
                ? 'border-[rgba(53,95,118,0.42)] bg-[rgba(53,95,118,0.1)]'
                : 'border-[rgba(31,26,21,0.12)] bg-[rgba(255,255,255,0.5)]'
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <strong className="text-sm">{`Phase ${phasePlan.phaseIndex}`}</strong>
              <span className="text-xs uppercase tracking-[0.08em] text-[rgba(31,26,21,0.62)]">
                {phasePlan.gradientType}
              </span>
            </div>
            <p className="text-sm leading-relaxed">{phasePlan.phaseGoal}</p>
            {phasePlan.routerHint ? (
              <p className="mt-2 text-xs leading-relaxed text-[rgba(31,26,21,0.68)]">
                {phasePlan.routerHint}
              </p>
            ) : null}
            {phasePlan.notes ? (
              <p className="mt-1 text-xs leading-relaxed text-[rgba(31,26,21,0.68)]">
                {phasePlan.notes}
              </p>
            ) : null}
          </article>
        ))}
        </div>
      </div>
    </section>
  );
}
