'use client';

import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';

import type { ModuleScope } from '@/authoring/contracts';
import type { ControlModulesDraft } from '@/authoring/sections/control-modules';
import type { AuditQuestion } from '@/types';

type AuditBucketKey = 'global' | 'control' | `phase:${string}`;

const MODULE_CARDS: readonly {
  readonly key: ModuleScope;
  readonly label: string;
  readonly typeLabel: string;
  readonly groupLabel: string;
  readonly description: string;
}[] = [
  {
    key: 'light-cone',
    label: 'Light Cone Collapse',
    typeLabel: 'Replacement',
    groupLabel: 'Layer 3',
    description: 'Define how the boundary cone tightens toward the end line after each phase.',
  },
  {
    key: 'director-note-additions',
    label: 'Director Note Additions',
    typeLabel: 'Additive',
    groupLabel: 'Layer 4',
    description: 'Add author-managed note constraints on top of the system-generated base.',
  },
  {
    key: 'beat-volume-definitions',
    label: 'Beat Volume Definitions',
    typeLabel: 'Definition',
    groupLabel: 'Layer 4',
    description: 'Define what Low, Med, and High actually mean for beats and options.',
  },
  {
    key: 'router-profile-set',
    label: 'Router Profile Set',
    typeLabel: 'Structured',
    groupLabel: 'Layer 4',
    description: 'Create and edit router profiles that feed downstream router selection.',
  },
  {
    key: 'auditor-question-set',
    label: 'Auditor Question Set',
    typeLabel: 'Parallel Control',
    groupLabel: 'Parallel',
    description: 'Maintain audit questions and selection policy outside the prompt stack.',
  },
] as const;

function createDraftQuestion(scope: string): AuditQuestion {
  return {
    id: `AQ-DRAFT-${scope.toUpperCase()}-${Date.now()}`,
    question: '',
    expected: true,
    blocking: false,
  };
}

function formatVerbLexicon(value: readonly string[]): string {
  return value.join(', ');
}

function parseVerbLexicon(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toggleString(values: readonly string[], target: string): string[] {
  return values.includes(target)
    ? values.filter((value) => value !== target)
    : [...values, target];
}

function buildAuditBucketKeys(
  phaseIds: readonly string[],
  draft: ControlModulesDraft,
): readonly AuditBucketKey[] {
  const knownPhaseIds = new Set<string>(phaseIds);
  Object.keys(draft.auditQuestionSet.phaseSpecificQuestions ?? {}).forEach((phaseId) =>
    knownPhaseIds.add(phaseId),
  );
  Object.keys(draft.auditQuestionSet.selectionPolicy.phaseOverrides ?? {}).forEach((phaseId) =>
    knownPhaseIds.add(phaseId),
  );

  return ['global', 'control', ...Array.from(knownPhaseIds).map((phaseId) => `phase:${phaseId}` as const)];
}

interface ControlModulesSectionProps {
  readonly packageName: string;
  readonly phaseIds: readonly string[];
  readonly value: ControlModulesDraft;
  readonly onChange: (nextValue: ControlModulesDraft) => void;
  readonly onSubmit: (moduleScope: ModuleScope) => void;
  readonly onReset: () => void;
  readonly statusMessage?: string | undefined;
  readonly isSaving?: boolean;
}

export function ControlModulesSection({
  packageName,
  phaseIds,
  value,
  onChange,
  onSubmit,
  onReset,
  statusMessage,
  isSaving = false,
}: ControlModulesSectionProps) {
  const [selectedModule, setSelectedModule] = useState<ModuleScope>('light-cone');
  const auditBuckets = useMemo(() => buildAuditBucketKeys(phaseIds, value), [phaseIds, value]);
  const [selectedAuditBucket, setSelectedAuditBucket] = useState<AuditBucketKey>('global');

  const activeModule =
    MODULE_CARDS.find((card) => card.key === selectedModule) ?? MODULE_CARDS[0]!;

  const allAuditQuestions = useMemo(() => {
    const questions: AuditQuestion[] = [
      ...value.auditQuestionSet.globalQuestions,
      ...value.auditQuestionSet.controlQuestions,
      ...Object.values(value.auditQuestionSet.phaseSpecificQuestions ?? {}).flat(),
    ];

    return questions.filter((question, index) => {
      return questions.findIndex((candidate) => candidate.id === question.id) === index;
    });
  }, [value.auditQuestionSet]);

  function updateDraft(nextValue: ControlModulesDraft) {
    onChange(nextValue);
  }

  function updateSelectedBucket(nextBucket: AuditBucketKey) {
    setSelectedAuditBucket(nextBucket);
  }

  function updateLightCone(field: 'boundaryGuidance' | 'convergenceGuidance' | 'phaseSettlementGuidance') {
    return (event: ChangeEvent<HTMLTextAreaElement>) => {
      updateDraft({
        ...value,
        controlModules: {
          ...value.controlModules,
          lightConeCustomization: {
            ...value.controlModules.lightConeCustomization,
            [field]: event.currentTarget.value,
          },
        },
      });
    };
  }

  function updateDirectorNote(field: 'beatConstraintsAdditions' | 'optionConstraintsAdditions') {
    return (event: ChangeEvent<HTMLTextAreaElement>) => {
      updateDraft({
        ...value,
        controlModules: {
          ...value.controlModules,
          directorNoteAdditions: {
            ...value.controlModules.directorNoteAdditions,
            [field]: event.currentTarget.value,
          },
        },
      });
    };
  }

  function updateBeatVolume(
    volume: 'Low' | 'Med' | 'High',
    field: 'beatConstraints' | 'optionFormatting',
  ) {
    return (event: ChangeEvent<HTMLTextAreaElement>) => {
      updateDraft({
        ...value,
        controlModules: {
          ...value.controlModules,
          beatVolumeDefinitions: {
            ...value.controlModules.beatVolumeDefinitions,
            [volume]: {
              ...value.controlModules.beatVolumeDefinitions[volume],
              [field]: event.currentTarget.value,
            },
          },
        },
      });
    };
  }

  function updateRouterProfile(
    index: number,
    field: 'routerName' | 'routerSemanticCore' | 'verbLexicon',
    nextValue: string,
  ) {
    const nextProfiles = value.routerProfiles.map((profile, profileIndex) =>
      profileIndex === index
        ? {
            ...profile,
            [field]:
              field === 'verbLexicon' ? parseVerbLexicon(nextValue) : nextValue,
          }
        : profile,
    );

    updateDraft({
      ...value,
      routerProfiles: nextProfiles,
    });
  }

  function addRouterProfile() {
    updateDraft({
      ...value,
      routerProfiles: [
        ...value.routerProfiles,
        {
          routerName: '',
          routerSemanticCore: '',
          verbLexicon: [],
        },
      ],
    });
  }

  function removeRouterProfile(index: number) {
    updateDraft({
      ...value,
      routerProfiles: value.routerProfiles.filter((_, profileIndex) => profileIndex !== index),
    });
  }

  function getCurrentAuditQuestions(): readonly AuditQuestion[] {
    if (selectedAuditBucket === 'global') {
      return value.auditQuestionSet.globalQuestions;
    }

    if (selectedAuditBucket === 'control') {
      return value.auditQuestionSet.controlQuestions;
    }

    const phaseId = selectedAuditBucket.replace('phase:', '');
    return value.auditQuestionSet.phaseSpecificQuestions?.[phaseId] ?? [];
  }

  function replaceCurrentAuditQuestions(nextQuestions: readonly AuditQuestion[]) {
    if (selectedAuditBucket === 'global') {
      updateDraft({
        ...value,
        auditQuestionSet: {
          ...value.auditQuestionSet,
          globalQuestions: [...nextQuestions],
        },
      });
      return;
    }

    if (selectedAuditBucket === 'control') {
      updateDraft({
        ...value,
        auditQuestionSet: {
          ...value.auditQuestionSet,
          controlQuestions: [...nextQuestions],
        },
      });
      return;
    }

    const phaseId = selectedAuditBucket.replace('phase:', '');
    updateDraft({
      ...value,
      auditQuestionSet: {
        ...value.auditQuestionSet,
        phaseSpecificQuestions: {
          ...(value.auditQuestionSet.phaseSpecificQuestions ?? {}),
          [phaseId]: [...nextQuestions],
        },
      },
    });
  }

  function updateAuditQuestionField(
    index: number,
    field: keyof AuditQuestion,
    nextValue: string | boolean,
  ) {
    const nextQuestions = getCurrentAuditQuestions().map((question, questionIndex) =>
      questionIndex === index
        ? {
            ...question,
            [field]: nextValue,
          }
        : question,
    );

    replaceCurrentAuditQuestions(nextQuestions);
  }

  function addAuditQuestion() {
    const scope =
      selectedAuditBucket === 'global'
        ? 'global'
        : selectedAuditBucket === 'control'
          ? 'control'
          : selectedAuditBucket.replace('phase:', '');

    replaceCurrentAuditQuestions([...getCurrentAuditQuestions(), createDraftQuestion(scope)]);
  }

  function removeAuditQuestion(index: number) {
    replaceCurrentAuditQuestions(
      getCurrentAuditQuestions().filter((_, questionIndex) => questionIndex !== index),
    );
  }

  function toggleDefaultSelection(questionId: string) {
    updateDraft({
      ...value,
      auditQuestionSet: {
        ...value.auditQuestionSet,
        selectionPolicy: {
          ...value.auditQuestionSet.selectionPolicy,
          default: toggleString(value.auditQuestionSet.selectionPolicy.default, questionId),
        },
      },
    });
  }

  function togglePhaseOverrideSelection(phaseId: string, questionId: string) {
    const currentOverride = value.auditQuestionSet.selectionPolicy.phaseOverrides?.[phaseId]?.append ?? [];
    const nextAppend = toggleString(currentOverride, questionId);
    const nextOverrides = {
      ...(value.auditQuestionSet.selectionPolicy.phaseOverrides ?? {}),
    };

    if (nextAppend.length === 0) {
      delete nextOverrides[phaseId];
    } else {
      nextOverrides[phaseId] = { append: nextAppend };
    }

    updateDraft({
      ...value,
      auditQuestionSet: {
        ...value.auditQuestionSet,
        selectionPolicy: {
          ...value.auditQuestionSet.selectionPolicy,
          ...(Object.keys(nextOverrides).length > 0 ? { phaseOverrides: nextOverrides } : {}),
        },
      },
    });
  }

  return (
    <section className="panel">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="panel-eyebrow">Section Slice</p>
          <h2>Control Modules</h2>
          <p className="panel-note">
            Shape the shared control layers that steer collapse, director notes, routing, and audit.
          </p>
        </div>
        <p className="panel-note">{packageName}</p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="mb-4">
            <p className="panel-eyebrow">Control Stack</p>
            <h3 className="text-xl font-semibold text-slate-900">Layered Modules</h3>
          </div>
          <div className="space-y-3">
            {MODULE_CARDS.map((card) => {
              const isSelected = card.key === selectedModule;
              return (
                <button
                  key={card.key}
                  type="button"
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-slate-50 shadow-md'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                  }`}
                  aria-label={card.label}
                  onClick={() => setSelectedModule(card.key)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] opacity-70">
                        {card.groupLabel}
                      </div>
                      <div className="mt-1 text-base font-semibold">{card.label}</div>
                    </div>
                    <span className="rounded-full border border-current/20 px-3 py-1 text-[10px] uppercase tracking-[0.12em] opacity-80">
                      {card.typeLabel}
                    </span>
                  </div>
                  <p className={`mt-3 text-sm ${isSelected ? 'text-slate-200' : 'text-slate-600'}`}>
                    {card.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="panel-eyebrow">Selected Module Editor</p>
                <h3 className="text-xl font-semibold text-slate-900">{activeModule.label}</h3>
                <p className="panel-note">{activeModule.description}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {activeModule.typeLabel}
              </span>
            </div>

            {selectedModule === 'light-cone' ? (
              <div className="space-y-4">
                <label className="form-field">
                  <span className="form-label">Boundary Guidance</span>
                  <textarea
                    aria-label="Boundary Guidance"
                    value={value.controlModules.lightConeCustomization.boundaryGuidance}
                    onChange={updateLightCone('boundaryGuidance')}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Convergence Guidance</span>
                  <textarea
                    aria-label="Convergence Guidance"
                    value={value.controlModules.lightConeCustomization.convergenceGuidance}
                    onChange={updateLightCone('convergenceGuidance')}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Phase Settlement Guidance</span>
                  <textarea
                    aria-label="Phase Settlement Guidance"
                    value={value.controlModules.lightConeCustomization.phaseSettlementGuidance}
                    onChange={updateLightCone('phaseSettlementGuidance')}
                  />
                </label>
              </div>
            ) : null}

            {selectedModule === 'director-note-additions' ? (
              <div className="space-y-4">
                <label className="form-field">
                  <span className="form-label">Beat Constraint Additions</span>
                  <textarea
                    aria-label="Beat Constraint Additions"
                    value={value.controlModules.directorNoteAdditions.beatConstraintsAdditions}
                    onChange={updateDirectorNote('beatConstraintsAdditions')}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Option Constraint Additions</span>
                  <textarea
                    aria-label="Option Constraint Additions"
                    value={value.controlModules.directorNoteAdditions.optionConstraintsAdditions}
                    onChange={updateDirectorNote('optionConstraintsAdditions')}
                  />
                </label>
              </div>
            ) : null}

            {selectedModule === 'beat-volume-definitions' ? (
              <div className="space-y-4">
                {(['Low', 'Med', 'High'] as const).map((volume) => (
                  <section key={volume} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-base font-semibold text-slate-900">{volume}</h4>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500">
                        Volume Definition
                      </span>
                    </div>
                    <div className="space-y-4">
                      <label className="form-field">
                        <span className="form-label">Beat Constraints</span>
                        <textarea
                          aria-label={`${volume} Beat Constraints`}
                          value={value.controlModules.beatVolumeDefinitions[volume].beatConstraints}
                          onChange={updateBeatVolume(volume, 'beatConstraints')}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">Option Formatting</span>
                        <textarea
                          aria-label={`${volume} Option Formatting`}
                          value={value.controlModules.beatVolumeDefinitions[volume].optionFormatting}
                          onChange={updateBeatVolume(volume, 'optionFormatting')}
                        />
                      </label>
                    </div>
                  </section>
                ))}
              </div>
            ) : null}

            {selectedModule === 'router-profile-set' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="panel-note">Edit the router profiles that feed the scene-phase selector.</p>
                  <button type="button" className="secondary-link" onClick={addRouterProfile}>
                    Add Router
                  </button>
                </div>
                <div className="space-y-4">
                  {value.routerProfiles.map((profile, index) => (
                    <section
                      key={`${profile.routerName || 'router'}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-base font-semibold text-slate-900">
                          {profile.routerName || `Router ${index + 1}`}
                        </h4>
                        <button
                          type="button"
                          className="secondary-link"
                          onClick={() => removeRouterProfile(index)}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="space-y-4">
                        <label className="form-field">
                          <span className="form-label">Router Name</span>
                          <input
                            aria-label={`Router Name ${index + 1}`}
                            value={profile.routerName}
                            onChange={(event) =>
                              updateRouterProfile(index, 'routerName', event.currentTarget.value)
                            }
                          />
                        </label>
                        <label className="form-field">
                          <span className="form-label">Semantic Core</span>
                          <textarea
                            aria-label={`Router Semantic Core ${index + 1}`}
                            value={profile.routerSemanticCore}
                            onChange={(event) =>
                              updateRouterProfile(
                                index,
                                'routerSemanticCore',
                                event.currentTarget.value,
                              )
                            }
                          />
                        </label>
                        <label className="form-field">
                          <span className="form-label">Verb Lexicon</span>
                          <input
                            aria-label={`Router Verb Lexicon ${index + 1}`}
                            value={formatVerbLexicon(profile.verbLexicon)}
                            onChange={(event) =>
                              updateRouterProfile(index, 'verbLexicon', event.currentTarget.value)
                            }
                          />
                        </label>
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedModule === 'auditor-question-set' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {auditBuckets.map((bucket) => {
                    const label =
                      bucket === 'global'
                        ? 'Global Questions'
                        : bucket === 'control'
                          ? 'Control Questions'
                          : `Phase ${bucket.replace('phase:', '')}`;

                    return (
                      <button
                        key={bucket}
                        type="button"
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          bucket === selectedAuditBucket
                            ? 'bg-slate-900 text-slate-50'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                        onClick={() => updateSelectedBucket(bucket)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="panel-note">
                    Add, remove, and adjust audit questions for the current bucket.
                  </p>
                  <button type="button" className="secondary-link" onClick={addAuditQuestion}>
                    Add Question
                  </button>
                </div>

                <div
                  className="max-h-[28rem] space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                  role="region"
                  aria-label="Audit question list"
                >
                  {getCurrentAuditQuestions().map((question, index) => (
                    <section
                      key={`${question.id || 'question'}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            {question.id || 'New Question'}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="secondary-link"
                          onClick={() => removeAuditQuestion(index)}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="space-y-4">
                        <label className="form-field">
                          <span className="form-label">Question</span>
                          <textarea
                            aria-label={`Audit Question ${index + 1}`}
                            value={question.question}
                            onChange={(event) =>
                              updateAuditQuestionField(index, 'question', event.currentTarget.value)
                            }
                          />
                        </label>
                        <label className="form-field">
                          <span className="form-label">Rationale</span>
                          <textarea
                            aria-label={`Audit Rationale ${index + 1}`}
                            value={question.rationale ?? ''}
                            onChange={(event) =>
                              updateAuditQuestionField(index, 'rationale', event.currentTarget.value)
                            }
                          />
                        </label>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={question.expected}
                              onChange={(event) =>
                                updateAuditQuestionField(index, 'expected', event.currentTarget.checked)
                              }
                            />
                            Expected true
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={question.blocking}
                              onChange={(event) =>
                                updateAuditQuestionField(index, 'blocking', event.currentTarget.checked)
                              }
                            />
                            Blocking
                          </label>
                        </div>
                      </div>
                    </section>
                  ))}
                  {getCurrentAuditQuestions().length === 0 ? (
                    <p className="panel-note">No questions in this bucket yet.</p>
                  ) : null}
                </div>

                <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-4">
                    <p className="panel-eyebrow">Selection Policy</p>
                    <h4 className="text-base font-semibold text-slate-900">Default and Phase Overrides</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700">Default Questions</p>
                      <div className="grid gap-2">
                        {allAuditQuestions.map((question) => (
                          <label key={`default-${question.id}`} className="flex items-start gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={value.auditQuestionSet.selectionPolicy.default.includes(question.id)}
                              onChange={() => toggleDefaultSelection(question.id)}
                            />
                            <span>{question.id}: {question.question || 'Untitled question'}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {phaseIds.length > 0 ? (
                      <div className="space-y-4">
                        {phaseIds.map((phaseId) => (
                          <section key={phaseId}>
                            <p className="mb-2 text-sm font-medium text-slate-700">{phaseId}</p>
                            <div className="grid gap-2">
                              {allAuditQuestions.map((question) => (
                                <label
                                  key={`${phaseId}-${question.id}`}
                                  className="flex items-start gap-2 text-sm text-slate-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      value.auditQuestionSet.selectionPolicy.phaseOverrides?.[
                                        phaseId
                                      ]?.append.includes(question.id) ?? false
                                    }
                                    onChange={() => togglePhaseOverrideSelection(phaseId, question.id)}
                                  />
                                  <span>{question.id}: {question.question || 'Untitled question'}</span>
                                </label>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            ) : null}

            <div className="panel-actions mt-6">
              <button type="button" className="secondary-link" onClick={onReset}>
                Reset Section
              </button>
              <button
                type="button"
                className="primary-link"
                disabled={isSaving}
                onClick={() => onSubmit(selectedModule)}
              >
                {isSaving ? 'Saving...' : 'Save Section'}
              </button>
            </div>

            {statusMessage ? <p className="panel-note mt-3">{statusMessage}</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
