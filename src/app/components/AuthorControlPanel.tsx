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
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden font-sans mb-[1.25rem]">
      <div className="flex flex-col gap-3 px-5 pb-4 pt-5 md:flex-row md:items-start md:justify-between border-b border-slate-100">
        <div className="space-y-1">
          <p className="text-[10px] tracking-widest uppercase text-slate-500 mb-1">Author Controls</p>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight leading-tight">{storyPackage.sceneSpec.sceneName}</h2>
          <p className="text-sm text-slate-500">Phase Plans</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:items-end">
          {metaItems.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-2">
              {metaItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {actions ? <div className="flex justify-end pt-2">{actions}</div> : null}
        </div>
      </div>
      <div className="overflow-x-auto px-5 py-5 bg-slate-50/50">
        <div className="flex min-w-max gap-4">
        {storyPackage.phasePlans.map((phasePlan) => (
          <article
            key={phasePlan.phaseId}
            className={`w-[18rem] shrink-0 rounded-xl border p-4 transition-colors ${
              phasePlan.phaseIndex === currentPhaseIndex
                ? 'border-slate-800 bg-slate-900 text-slate-200 shadow-md'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-inherit pb-2 opacity-80">
              <strong className="text-sm tracking-tight">{`Phase ${phasePlan.phaseIndex}`}</strong>
              <span className={`text-[10px] uppercase tracking-[0.08em] ${phasePlan.phaseIndex === currentPhaseIndex ? 'text-emerald-400' : 'text-slate-500'}`}>
                {phasePlan.gradientType}
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${phasePlan.phaseIndex === currentPhaseIndex ? 'text-slate-100' : 'text-slate-800'}`}>{phasePlan.phaseGoal}</p>
            {phasePlan.routerHint ? (
              <p className={`mt-3 text-xs leading-relaxed ${phasePlan.phaseIndex === currentPhaseIndex ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-semibold block mb-0.5">Router Hint:</span>
                {phasePlan.routerHint}
              </p>
            ) : null}
            {phasePlan.notes ? (
              <p className={`mt-2 text-xs leading-relaxed italic ${phasePlan.phaseIndex === currentPhaseIndex ? 'text-slate-500' : 'text-slate-400'}`}>
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
