'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import {
  GRADIENT_OPTIONS,
  createEmptyScenePhaseDraft,
  type ScenePhaseAuthoringDraft,
  type ScenePhasePlanDraft,
} from '@/authoring/sections/scene-phase-authoring';

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

function summarizePhase(phase: ScenePhasePlanDraft): string {
  const value = phase.phaseGoal.trim() || phase.notes?.trim() || '';
  return value.length > 72 ? `${value.slice(0, 69)}...` : value;
}

function summarizeRouterHint(phase: ScenePhasePlanDraft): string {
  return phase.routerHint?.trim() || 'No router selected.';
}

function summarizeNote(phase: ScenePhasePlanDraft): string {
  const value = phase.notes?.trim() || '';
  return value.length > 88 ? `${value.slice(0, 85)}...` : value;
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
  const [phaseRailProgress, setPhaseRailProgress] = useState(0);
  const [phaseRailScrollable, setPhaseRailScrollable] = useState(false);

  const selectedPhase = value.phasePlans[selectedPhaseIndex];

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
    <section className="panel">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="panel-eyebrow">Section Slice</p>
          <h2>Scene &amp; Phase Authoring</h2>
          <p className="panel-note">
            Field-based editing for one scene frame, one phase rail, and one focused phase editor.
          </p>
        </div>
        <p className="panel-note">{packageName}</p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(21rem,0.94fr)]">
        <div className="max-h-[72vh] space-y-6 overflow-y-auto pr-2">
          <section className="rounded-[1.75rem] border border-[#eadfce] bg-[#f9f5ee] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            <div className="mb-4">
              <p className="panel-eyebrow">Scene</p>
              <h3 className="text-xl font-semibold text-slate-900">Scene Frame</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-field rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
                <span className="form-label">Scene Name</span>
                <input
                  aria-label="Scene Name"
                  value={value.sceneSpec.sceneName}
                  onChange={(event) => updateSceneField('sceneName', event)}
                />
              </label>
              <label className="form-field rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
                <span className="form-label">Opening Hook</span>
                <textarea
                  aria-label="Opening Hook"
                  rows={3}
                  value={value.sceneSpec.openingHook}
                  onChange={(event) => updateSceneField('openingHook', event)}
                />
              </label>
              <label className="form-field rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
                <span className="form-label">Main Axis</span>
                <textarea
                  aria-label="Main Axis"
                  rows={4}
                  value={value.sceneSpec.mainAxis}
                  onChange={(event) => updateSceneField('mainAxis', event)}
                />
              </label>
              <label className="form-field rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
                <span className="form-label">End Line</span>
                <textarea
                  aria-label="End Line"
                  rows={4}
                  value={value.sceneSpec.endLine}
                  onChange={(event) => updateSceneField('endLine', event)}
                />
              </label>
              <label className="form-field rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4 md:col-span-2">
                <span className="form-label">Opening Situation</span>
                <textarea
                  aria-label="Opening Situation"
                  rows={3}
                  value={value.sceneSpec.openingSituation}
                  onChange={(event) => updateSceneField('openingSituation', event)}
                />
              </label>
              <label className="form-field rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4 md:col-span-2">
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

          <section className="rounded-[1.75rem] border border-[#eadfce] bg-[#f9f5ee] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            <div className="mb-4">
              <div>
                <p className="panel-eyebrow">Phase Rail</p>
                <h3 className="text-xl font-semibold text-slate-900">Phase Cards</h3>
              </div>
            </div>
            <div
              ref={phaseRailRef}
              className="overflow-x-auto pb-3"
              aria-label="Phase rail scrollbar"
              onScroll={syncPhaseRailState}
            >
              <div className="flex min-w-max gap-3">
                {value.phasePlans.map((phase, index) => {
                  const isSelected = index === selectedPhaseIndex;
                  const buttonLabel = phase.phaseName || `Phase ${index + 1}`;
                  return (
                    <button
                      key={phase.phaseId ?? `${buttonLabel}-${index}`}
                      type="button"
                      aria-label={buttonLabel}
                      className={`w-60 shrink-0 rounded-[1.4rem] border p-4 text-left transition ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-slate-50 shadow-md'
                          : 'border-[#eadfce] bg-[#fffdf8] text-slate-900 hover:border-[#cdb391]'
                      }`}
                      onClick={() => setSelectedPhaseIndex(index)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <strong className="text-sm">{buttonLabel}</strong>
                        <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] opacity-70">
                          {phase.gradientType}
                        </span>
                      </div>
                      <p className={`mt-3 text-sm ${isSelected ? 'text-slate-200' : 'text-slate-700'}`}>
                        {summarizePhase(phase)}
                      </p>
                      <p className={`mt-3 text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {summarizeRouterHint(phase)}
                      </p>
                      {phase.notes ? (
                        <p className={`mt-3 text-xs ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                          {summarizeNote(phase)}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-label="Add Phase"
                  className="flex w-40 shrink-0 items-center justify-center rounded-[1.4rem] border border-dashed border-[#d7c2a3] bg-[#fffdf8] px-5 py-6 text-left text-sm font-semibold text-[#8a6e4c] transition hover:border-[#b89264]"
                  onClick={handleAddPhase}
                >
                  + Add Phase
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="panel-eyebrow whitespace-nowrap">Rail Slider</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={phaseRailProgress}
                aria-label="Phase rail slider"
                disabled={!phaseRailScrollable}
                onChange={handlePhaseRailSliderChange}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#d8c8b3] accent-[#8a6e4c] disabled:cursor-default disabled:opacity-50"
              />
            </div>
          </section>
        </div>

        <section aria-label="Scene Phase Detail Column" className="space-y-4">
          <div className="rounded-[1.75rem] border border-[#eadfce] bg-[#fffdf8] p-5 shadow-[0_12px_30px_rgba(31,26,21,0.06)]">
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
                <span className="rounded-full bg-[#f2eadc] px-3 py-1 text-xs font-medium text-[#8a6e4c]">
                  Current Phase
                </span>
                <span className="rounded-full bg-[#f2eadc] px-3 py-1 text-xs font-medium text-[#8a6e4c]">
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
                  <label className="form-field rounded-2xl border border-[#eadfce] bg-[#f6efe1] p-4">
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
                  <label className="form-field rounded-2xl border border-[#eadfce] bg-[#f6efe1] p-4">
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
                  <label className="form-field rounded-2xl border border-[#eadfce] bg-[#f6efe1] p-4">
                    <span className="form-label">Beat Count</span>
                    <input aria-label="Beat Count" value="4" disabled readOnly />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="form-field rounded-2xl border border-[#eadfce] bg-white p-4">
                    <span className="form-label">Phase Name</span>
                    <input
                      aria-label="Phase Name"
                      value={selectedPhase.phaseName}
                      onChange={(event) => updatePhaseField('phaseName', event)}
                    />
                  </label>
                  <label className="form-field rounded-2xl border border-[#eadfce] bg-white p-4">
                    <span className="form-label">Phase End Point</span>
                    <textarea
                      aria-label="Phase End Point"
                      rows={3}
                      value={selectedPhase.phaseEndPoint ?? ''}
                      onChange={(event) => updatePhaseField('phaseEndPoint', event)}
                    />
                  </label>
                  <label className="form-field rounded-2xl border border-[#eadfce] bg-white p-4 md:col-span-2">
                    <span className="form-label">Phase Goal</span>
                    <textarea
                      aria-label="Phase Goal"
                      rows={4}
                      value={selectedPhase.phaseGoal}
                      onChange={(event) => updatePhaseField('phaseGoal', event)}
                    />
                  </label>
                  <label className="form-field rounded-2xl border border-[#eadfce] bg-white p-4 md:col-span-2">
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

          <div className="rounded-[1.5rem] border border-[#eadfce] bg-[#fffdf8] p-4">
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
