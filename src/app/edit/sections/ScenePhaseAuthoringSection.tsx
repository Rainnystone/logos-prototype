'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import {
  GRADIENT_OPTIONS,
  createEmptyScenePhaseDraft,
  type ScenePhaseAuthoringDraft,
  type ScenePhasePlanDraft,
} from '@/authoring/sections/scene-phase-authoring';
import { useMatchedHeight } from '@/app/edit/shared/useMatchedHeight';

type SceneField = keyof ScenePhaseAuthoringDraft['sceneSpec'];
type PhaseField = keyof ScenePhasePlanDraft;

interface ScenePhaseAuthoringSectionProps {
  readonly packageName: string;
  readonly value: ScenePhaseAuthoringDraft;
  readonly routerOptions: readonly string[];
  readonly onChange: (nextValue: ScenePhaseAuthoringDraft) => void;
  readonly onSubmit: () => void;
  readonly onReset: () => void;
  readonly isSaving?: boolean;
}

function summarizeRouterHint(phase: ScenePhasePlanDraft): string {
  return phase.routerHint?.trim() || 'No router selected.';
}

export function ScenePhaseAuthoringSection({
  packageName,
  value,
  routerOptions,
  onChange,
  onSubmit,
  onReset,
  isSaving = false,
}: ScenePhaseAuthoringSectionProps) {
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const phaseRailRef = useRef<HTMLDivElement | null>(null);
  const detailColumnRef = useRef<HTMLElement | null>(null);
  const [phaseRailProgress, setPhaseRailProgress] = useState(0);
  const [phaseRailScrollable, setPhaseRailScrollable] = useState(false);

  const selectedPhase = value.phasePlans[selectedPhaseIndex];
  const matchedSceneFrameStyle = useMatchedHeight(detailColumnRef, { minWidth: 1280 });

  useEffect(() => {
    setSelectedPhaseIndex((currentIndex) => {
      if (value.phasePlans.length === 0) {
        return 0;
      }

      return Math.min(currentIndex, value.phasePlans.length - 1);
    });
  }, [value.phasePlans.length]);

  function syncPhaseRailState() {
    const railElement = phaseRailRef.current;
    if (!railElement) {
      setPhaseRailScrollable(false);
      setPhaseRailProgress(0);
      return;
    }

    const maxScrollLeft = railElement.scrollWidth - railElement.clientWidth;
    if (maxScrollLeft <= 0) {
      setPhaseRailScrollable(false);
      setPhaseRailProgress(0);
      return;
    }

    setPhaseRailScrollable(true);
    setPhaseRailProgress((railElement.scrollLeft / maxScrollLeft) * 100);
  }

  useEffect(() => {
    syncPhaseRailState();

    const handleResize = () => syncPhaseRailState();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [value.phasePlans.length]);

  function updateSceneField(field: SceneField, event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    onChange({
      ...value,
      sceneSpec: {
        ...value.sceneSpec,
        [field]: event.currentTarget.value,
      },
    });
  }

  function updatePhaseField(
    field: PhaseField,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    if (!selectedPhase) {
      return;
    }

    const nextPhasePlans = value.phasePlans.map((phase, index) =>
      index === selectedPhaseIndex
        ? {
            ...phase,
            [field]: event.currentTarget.value,
          }
        : phase,
    );

    onChange({
      ...value,
      phasePlans: nextPhasePlans,
    });
  }

  function handleAddPhase() {
    const nextPhase = createEmptyScenePhaseDraft(value.phasePlans.length + 1);
    onChange({
      ...value,
      phasePlans: [...value.phasePlans, nextPhase],
    });
    setSelectedPhaseIndex(value.phasePlans.length);
  }

  function handleRemovePhase() {
    if (!selectedPhase || value.phasePlans.length <= 1) {
      return;
    }

    const nextPhasePlans = value.phasePlans.filter((_, index) => index !== selectedPhaseIndex);
    onChange({
      ...value,
      phasePlans: nextPhasePlans,
    });
    setSelectedPhaseIndex(Math.max(0, selectedPhaseIndex - 1));
  }

  function handlePhaseRailSliderChange(event: ChangeEvent<HTMLInputElement>) {
    const railElement = phaseRailRef.current;
    if (!railElement) {
      return;
    }

    const maxScrollLeft = railElement.scrollWidth - railElement.clientWidth;
    if (maxScrollLeft <= 0) {
      return;
    }

    const nextProgress = Number(event.currentTarget.value);
    railElement.scrollLeft = (nextProgress / 100) * maxScrollLeft;
    setPhaseRailProgress(nextProgress);
  }

  return (
    <section className="panel min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="panel-eyebrow">Section Slice</p>
          <h2>SCENE &amp; PHASE</h2>
          <p className="panel-note">
            Field-based editing for one scene frame, one phase rail, and one focused phase editor.
          </p>
        </div>
        <p className="panel-note">{packageName}</p>
      </div>

      <section
        aria-label="Phase rail section"
        className="mt-6 w-full min-w-0 overflow-hidden rounded-none border-2 border-black bg-white shadow-brutal"
      >
        <div className="border-b-2 border-black px-5 pb-4 pt-5">
          <div>
            <p className="panel-eyebrow">Phase Rail</p>
            <h3 className="text-2xl font-bold uppercase tracking-tight text-black">Phase Cards</h3>
          </div>
        </div>
        <div className="min-w-0 space-y-4 bg-[#f5f5f5] px-5 py-5">
          <div
            ref={phaseRailRef}
            className="min-w-0 overflow-x-auto"
            aria-label="Phase rail scrollbar"
            onScroll={syncPhaseRailState}
          >
            <div className="flex min-w-max gap-4">
              {value.phasePlans.map((phase, index) => {
                const isSelected = index === selectedPhaseIndex;
                const buttonLabel = phase.phaseName || `Phase ${index + 1}`;
                return (
                  <button
                    key={phase.phaseId ?? `${buttonLabel}-${index}`}
                    type="button"
                    aria-label={buttonLabel}
                    className={`w-[18rem] shrink-0 rounded-none border-2 p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-black bg-black text-white shadow-brutal'
                        : 'border-black bg-white text-black hover:bg-[#e5e5e5]'
                    }`}
                    onClick={() => setSelectedPhaseIndex(index)}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-inherit pb-2 opacity-80">
                      <strong className="text-sm tracking-tight uppercase">{`PHASE ${index + 1}`}</strong>
                      <span
                        className={`text-[10px] uppercase tracking-[0.08em] ${
                          isSelected ? 'text-[#00ff00]' : 'text-black/50'
                        }`}
                      >
                        {phase.gradientType}
                      </span>
                    </div>
                    <p
                      className={`text-base font-semibold leading-relaxed ${
                        isSelected ? 'text-white' : 'text-black'
                      }`}
                    >
                      {buttonLabel}
                    </p>
                    <p
                      className={`mt-3 text-sm leading-relaxed ${
                        isSelected ? 'text-white/90' : 'text-black'
                      }`}
                    >
                      {phase.phaseGoal}
                    </p>
                    <p
                      className={`mt-3 text-xs leading-relaxed ${
                        isSelected ? 'text-white/60' : 'text-black/60'
                      }`}
                    >
                      <span className="mb-0.5 block font-semibold uppercase">Router Hint:</span>
                      {summarizeRouterHint(phase)}
                    </p>
                    {phase.notes ? (
                      <p
                        className={`mt-2 text-xs leading-relaxed italic ${
                          isSelected ? 'text-white/45' : 'text-black/45'
                        }`}
                      >
                        {phase.notes}
                      </p>
                    ) : null}
                  </button>
                );
              })}
              <button
                type="button"
                aria-label="Add Phase"
                className="flex w-[18rem] shrink-0 items-center justify-center rounded-none border-2 border-dashed border-black bg-white p-4 text-left text-sm font-semibold uppercase tracking-[0.05em] text-black transition hover:bg-[#e5e5e5]"
                onClick={handleAddPhase}
              >
                + Add Phase
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="panel-eyebrow whitespace-nowrap text-black">Rail Slider</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={phaseRailProgress}
              aria-label="Phase rail slider"
              disabled={!phaseRailScrollable}
              onChange={handlePhaseRailSliderChange}
              className="h-2 w-full cursor-pointer appearance-none rounded-none border border-black bg-white accent-black disabled:cursor-default disabled:opacity-50"
            />
          </div>
        </div>
      </section>

      <div
        role="region"
        aria-label="Scene phase workspace"
        className="mt-6 grid w-full min-w-0 items-stretch gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]"
      >
        <div
          style={matchedSceneFrameStyle}
          className="min-w-0 space-y-6 xl:min-h-[calc(100vh-16rem)] xl:overflow-y-auto xl:pr-2"
        >
          <section
            aria-label="Scene frame section"
            className="min-h-full rounded-none border-2 border-black bg-[#f5f5f5] p-5"
          >
            <div className="mb-4">
              <p className="panel-eyebrow">Scene</p>
              <h3 className="text-xl font-semibold text-slate-900">Scene Frame</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                <span className="form-label">Scene Name</span>
                <input
                  aria-label="Scene Name"
                  value={value.sceneSpec.sceneName}
                  onChange={(event) => updateSceneField('sceneName', event)}
                />
              </label>
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                <span className="form-label">Opening Hook</span>
                <textarea
                  aria-label="Opening Hook"
                  rows={3}
                  value={value.sceneSpec.openingHook}
                  onChange={(event) => updateSceneField('openingHook', event)}
                />
              </label>
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                <span className="form-label">Main Axis</span>
                <textarea
                  aria-label="Main Axis"
                  rows={4}
                  value={value.sceneSpec.mainAxis}
                  onChange={(event) => updateSceneField('mainAxis', event)}
                />
              </label>
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                <span className="form-label">End Line</span>
                <textarea
                  aria-label="End Line"
                  rows={4}
                  value={value.sceneSpec.endLine}
                  onChange={(event) => updateSceneField('endLine', event)}
                />
              </label>
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4 md:col-span-2">
                <span className="form-label">Opening Situation</span>
                <textarea
                  aria-label="Opening Situation"
                  rows={3}
                  value={value.sceneSpec.openingSituation}
                  onChange={(event) => updateSceneField('openingSituation', event)}
                />
              </label>
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4 md:col-span-2">
                <span className="form-label">Sample Purpose</span>
                <textarea
                  aria-label="Sample Purpose"
                  rows={3}
                  value={value.sceneSpec.samplePurpose}
                  onChange={(event) => updateSceneField('samplePurpose', event)}
                />
              </label>
            </div>
          </section>
        </div>

        <section ref={detailColumnRef} aria-label="Scene Phase Detail Column" className="min-w-0 space-y-4">
          <div className="rounded-none border-2 border-black bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="panel-eyebrow">Selected Phase Editor</p>
                <h3 className="text-xl font-semibold text-slate-900">
                  {selectedPhase?.phaseName || 'No phase selected'}
                </h3>
                <p className="panel-note">
                  Edit the selected phase on the right, while the left rail stays summary-first.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="secondary-link pointer-events-none">
                  Current Phase
                </span>
                <span className="secondary-link pointer-events-none">
                  4 Beats
                </span>
                <button
                  type="button"
                  className="secondary-link"
                  disabled={value.phasePlans.length <= 1}
                  onClick={handleRemovePhase}
                >
                  Remove
                </button>
              </div>
            </div>

            {selectedPhase ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                    <span className="form-label">Gradient Type</span>
                    <select
                      aria-label="Gradient Type"
                      value={selectedPhase.gradientType}
                      onChange={(event) => updatePhaseField('gradientType', event)}
                    >
                      {GRADIENT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                    <span className="form-label">Router Hint</span>
                    <select
                      aria-label="Router Hint"
                      value={selectedPhase.routerHint ?? ''}
                      onChange={(event) => updatePhaseField('routerHint', event)}
                    >
                      <option value="">Select router</option>
                      {routerOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                    <span className="form-label">Beat Count</span>
                    <input aria-label="Beat Count" value="4" disabled readOnly />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="form-field rounded-none border-2 border-black bg-white p-4">
                    <span className="form-label">Phase Name</span>
                    <input
                      aria-label="Phase Name"
                      value={selectedPhase.phaseName}
                      onChange={(event) => updatePhaseField('phaseName', event)}
                    />
                  </label>
                  <label className="form-field rounded-none border-2 border-black bg-white p-4">
                    <span className="form-label">Phase End Point</span>
                    <textarea
                      aria-label="Phase End Point"
                      rows={3}
                      value={selectedPhase.phaseEndPoint ?? ''}
                      onChange={(event) => updatePhaseField('phaseEndPoint', event)}
                    />
                  </label>
                  <label className="form-field rounded-none border-2 border-black bg-white p-4 md:col-span-2">
                    <span className="form-label">Phase Goal</span>
                    <textarea
                      aria-label="Phase Goal"
                      rows={4}
                      value={selectedPhase.phaseGoal}
                      onChange={(event) => updatePhaseField('phaseGoal', event)}
                    />
                  </label>
                  <label className="form-field rounded-none border-2 border-black bg-white p-4 md:col-span-2">
                    <span className="form-label">Note</span>
                    <textarea
                      aria-label="Note"
                      rows={4}
                      value={selectedPhase.notes ?? ''}
                      onChange={(event) => updatePhaseField('notes', event)}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <p className="panel-note">Add a phase to begin editing.</p>
            )}
          </div>

          <div className="rounded-none border-2 border-black bg-white p-4">
            <div className="panel-actions">
              <button type="button" className="secondary-link" onClick={onReset}>
                Reset Section
              </button>
              <button
                type="button"
                className="primary-link"
                disabled={isSaving}
                onClick={onSubmit}
              >
                {isSaving ? 'Saving...' : 'Save Section'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
