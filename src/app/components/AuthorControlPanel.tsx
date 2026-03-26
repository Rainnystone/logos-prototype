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
    <section className="bg-white border-2 border-black rounded-none shadow-brutal overflow-hidden font-mono mb-[1.25rem]">
      <div className="flex flex-col gap-3 px-5 pb-4 pt-5 md:flex-row md:items-start md:justify-between border-b-2 border-black">
        <div className="space-y-1">
          <p className="text-[10px] tracking-widest uppercase text-black/50 mb-1">Author Controls</p>
          <h2 className="text-2xl font-bold text-black tracking-tight leading-tight uppercase">{storyPackage.sceneSpec.sceneName}</h2>
          <p className="text-sm text-black/50 uppercase">Phase Plans</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:items-end">
          {metaItems.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-2">
              {metaItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex rounded-none bg-[#e5e5e5] border border-black px-3 py-1 text-xs font-medium text-black uppercase"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {actions ? <div className="flex justify-end pt-2">{actions}</div> : null}
        </div>
      </div>
      <div className="overflow-x-auto px-5 py-5 bg-[#f5f5f5]">
        <div className="flex min-w-max gap-4">
        {storyPackage.phasePlans.map((phasePlan) => (
          <article
            key={phasePlan.phaseId}
            className={`w-[18rem] shrink-0 rounded-none border-2 p-4 transition-colors ${
              phasePlan.phaseIndex === currentPhaseIndex
                ? 'border-black bg-black text-white shadow-brutal'
                : 'border-black bg-white text-black hover:bg-[#e5e5e5]'
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-inherit pb-2 opacity-80">
              <strong className="text-sm tracking-tight uppercase">{`Phase ${phasePlan.phaseIndex}`}</strong>
              <span className={`text-[10px] uppercase tracking-[0.08em] ${phasePlan.phaseIndex === currentPhaseIndex ? 'text-[#00ff00]' : 'text-black/50'}`}>
                {phasePlan.gradientType}
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${phasePlan.phaseIndex === currentPhaseIndex ? 'text-white/90' : 'text-black'}`}>{phasePlan.phaseGoal}</p>
            {phasePlan.routerHint ? (
              <p className={`mt-3 text-xs leading-relaxed ${phasePlan.phaseIndex === currentPhaseIndex ? 'text-white/50' : 'text-black/50'}`}>
                <span className="font-semibold block mb-0.5">Router Hint:</span>
                {phasePlan.routerHint}
              </p>
            ) : null}
            {phasePlan.notes ? (
              <p className={`mt-2 text-xs leading-relaxed italic ${phasePlan.phaseIndex === currentPhaseIndex ? 'text-white/40' : 'text-black/40'}`}>
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
