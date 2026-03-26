'use client';

import { useEffect, useMemo, useState } from 'react';
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
  readonly statusMessage?: string | undefined;
  readonly isSaving?: boolean;
}

function summarizePhase(phase: ScenePhasePlanDraft): string {
  const value = phase.phaseGoal.trim() || phase.notes?.trim() || '';
  return value.length > 72 ? `${value.slice(0, 69)}...` : value;
}

export function ScenePhaseAuthoringSection({
  packageName,
  value,
  routerOptions,
  onChange,
  onSubmit,
  onReset,
  statusMessage,
  isSaving = false,
}: ScenePhaseAuthoringSectionProps) {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | undefined>(
    value.phasePlans[0]?.phaseId ?? value.phasePlans[0]?.phaseName,
  );

  const selectedPhaseIndex = useMemo(() => {
    const index = value.phasePlans.findIndex(
      (phase) => (phase.phaseId ?? phase.phaseName) === selectedPhaseId,
    );
    return index >= 0 ? index : 0;
  }, [selectedPhaseId, value.phasePlans]);

  const selectedPhase = value.phasePlans[selectedPhaseIndex];

  useEffect(() => {
    if (!selectedPhase) {
      setSelectedPhaseId(undefined);
      return;
    }

    const nextSelectedId = selectedPhase.phaseId ?? selectedPhase.phaseName;
    if (selectedPhaseId !== nextSelectedId) {
      setSelectedPhaseId(nextSelectedId);
    }
  }, [selectedPhase, selectedPhaseId]);

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
    setSelectedPhaseId(nextPhase.phaseName);
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
    const fallbackPhase = nextPhasePlans[Math.max(0, selectedPhaseIndex - 1)];
    setSelectedPhaseId(fallbackPhase?.phaseId ?? fallbackPhase?.phaseName);
  }

  return (
    <section className="panel">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="panel-eyebrow">Section Slice</p>
          <h2>Scene &amp; Phase Authoring</h2>
          <p className="panel-note">
            Field-based editing for the scene spine and bounded phase controls.
          </p>
        </div>
        <p className="panel-note">{packageName}</p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="mb-4">
              <p className="panel-eyebrow">Scene</p>
              <h3 className="text-xl font-semibold text-slate-900">Scene Frame</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-field">
                <span className="form-label">Scene Name</span>
                <input
                  aria-label="Scene Name"
                  value={value.sceneSpec.sceneName}
                  onChange={(event) => updateSceneField('sceneName', event)}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Opening Situation</span>
                <input
                  aria-label="Opening Situation"
                  value={value.sceneSpec.openingSituation}
                  onChange={(event) => updateSceneField('openingSituation', event)}
                />
              </label>
              <label className="form-field md:col-span-2">
                <span className="form-label">Main Axis</span>
                <textarea
                  aria-label="Main Axis"
                  value={value.sceneSpec.mainAxis}
                  onChange={(event) => updateSceneField('mainAxis', event)}
                />
              </label>
              <label className="form-field md:col-span-2">
                <span className="form-label">End Line</span>
                <textarea
                  aria-label="End Line"
                  value={value.sceneSpec.endLine}
                  onChange={(event) => updateSceneField('endLine', event)}
                />
              </label>
              <label className="form-field md:col-span-2">
                <span className="form-label">Opening Hook</span>
                <textarea
                  aria-label="Opening Hook"
                  value={value.sceneSpec.openingHook}
                  onChange={(event) => updateSceneField('openingHook', event)}
                />
              </label>
              <label className="form-field md:col-span-2">
                <span className="form-label">Sample Purpose</span>
                <textarea
                  aria-label="Sample Purpose"
                  value={value.sceneSpec.samplePurpose}
                  onChange={(event) => updateSceneField('samplePurpose', event)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="panel-eyebrow">Phase Rail</p>
                <h3 className="text-xl font-semibold text-slate-900">Phase Cards</h3>
              </div>
              <button type="button" className="secondary-link" onClick={handleAddPhase}>
                Add Phase
              </button>
            </div>
            <div className="overflow-x-auto pb-3" aria-label="Phase rail scrollbar">
              <div className="flex min-w-max gap-3">
                {value.phasePlans.map((phase, index) => {
                  const isSelected = index === selectedPhaseIndex;
                  const buttonLabel = phase.phaseName || `Phase ${index + 1}`;
                  return (
                    <button
                      key={phase.phaseId ?? `${buttonLabel}-${index}`}
                      type="button"
                      aria-label={buttonLabel}
                      className={`w-64 shrink-0 rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-slate-50 shadow-md'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedPhaseId(phase.phaseId ?? phase.phaseName)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <strong className="text-sm">{buttonLabel}</strong>
                        <span className="text-[10px] uppercase tracking-[0.12em] opacity-70">
                          {phase.gradientType}
                        </span>
                      </div>
                      <p className={`mt-3 text-sm ${isSelected ? 'text-slate-200' : 'text-slate-700'}`}>
                        {summarizePhase(phase)}
                      </p>
                      {phase.notes ? (
                        <p className={`mt-3 text-xs ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                          {phase.notes.length > 80 ? `${phase.notes.slice(0, 77)}...` : phase.notes}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="panel-eyebrow">Selected Phase Editor</p>
                <h3 className="text-xl font-semibold text-slate-900">
                  {selectedPhase?.phaseName || 'No phase selected'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
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
                  <label className="form-field">
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
                  <label className="form-field">
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
                  <label className="form-field">
                    <span className="form-label">Beat Count</span>
                    <input aria-label="Beat Count" value="4" disabled readOnly />
                  </label>
                </div>

                <label className="form-field">
                  <span className="form-label">Phase Name</span>
                  <input
                    aria-label="Phase Name"
                    value={selectedPhase.phaseName}
                    onChange={(event) => updatePhaseField('phaseName', event)}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Phase Goal</span>
                  <textarea
                    aria-label="Phase Goal"
                    value={selectedPhase.phaseGoal}
                    onChange={(event) => updatePhaseField('phaseGoal', event)}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Phase End Point</span>
                  <textarea
                    aria-label="Phase End Point"
                    value={selectedPhase.phaseEndPoint ?? ''}
                    onChange={(event) => updatePhaseField('phaseEndPoint', event)}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Note</span>
                  <textarea
                    aria-label="Note"
                    value={selectedPhase.notes ?? ''}
                    onChange={(event) => updatePhaseField('notes', event)}
                  />
                </label>

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

                {statusMessage ? <p className="panel-note">{statusMessage}</p> : null}
              </div>
            ) : (
              <p className="panel-note">Add a phase to begin editing.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
