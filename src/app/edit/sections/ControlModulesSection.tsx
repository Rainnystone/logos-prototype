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
    label: '光锥收束',
    typeLabel: '替换型',
    groupLabel: '第 3 层',
    description: '收拢边界光锥，控制结算后的可行动范围。',
  },
  {
    key: 'director-note-additions',
    label: '导演提示补充',
    typeLabel: '补充型',
    groupLabel: '第 4 层',
    description: '在系统提示上追加作者侧的约束补充。',
  },
  {
    key: 'beat-volume-definitions',
    label: 'Beat Volume 定义',
    typeLabel: '定义型',
    groupLabel: '第 4 层',
    description: '把 Low、Med、High 的节奏和选项标准写清楚。',
  },
  {
    key: 'router-profile-set',
    label: 'Router 配置组',
    typeLabel: '结构型',
    groupLabel: '第 4 层',
    description: '管理送入阶段路由的 Router 配置。',
  },
  {
    key: 'auditor-question-set',
    label: '审查问题组',
    typeLabel: '并行控制',
    groupLabel: '并行层',
    description: '维护审查问题与选择策略。',
  },
] as const;

const LIGHT_CONE_FIELD_NOTES = {
  boundaryGuidance: '边界要如何收口',
  convergenceGuidance: '每个 Phase 结算后如何继续收拢',
  phaseSettlementGuidance: 'Phase 结束时如何结算光锥状态',
} as const;

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
          <p className="panel-eyebrow">当前页</p>
          <h2>控制模块</h2>
          <p className="panel-note">整理控制层、路由配置和审查问题。</p>
        </div>
        <p className="panel-note">{packageName}</p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.1fr)]">
        <section
          className="rounded-none border-2 border-black bg-[#f5f5f5] p-4"
          role="region"
          aria-label="控制栈"
        >
          <div className="mb-4">
            <p className="panel-eyebrow">控制栈</p>
            <h3 className="text-xl font-semibold text-slate-900">模块层</h3>
          </div>
          <div className="space-y-3">
            {MODULE_CARDS.map((card) => {
              const isSelected = card.key === selectedModule;
              return (
                <button
                  key={card.key}
                  type="button"
                  className={`w-full rounded-none border-2 p-4 text-left transition ${
                    isSelected
                      ? 'border-black bg-black text-white shadow-brutal'
                      : 'border-black bg-white text-black hover:bg-[#e5e5e5]'
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
                    <span className="rounded-none border border-current/20 px-3 py-1 text-[10px] uppercase tracking-[0.12em] opacity-80">
                      {card.typeLabel}
                    </span>
                  </div>
                  <p className={`mt-3 text-sm ${isSelected ? 'text-white/80' : 'text-black/60'}`}>
                    {card.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4" role="region" aria-label="模块编辑">
          <div className="rounded-none border-2 border-black bg-white p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="panel-eyebrow">模块编辑</p>
                <h3 className="text-xl font-semibold text-slate-900">{activeModule.label}</h3>
                <p className="panel-note">{activeModule.description}</p>
              </div>
              <span className="rounded-none border border-black bg-[#e5e5e5] px-3 py-1 text-xs font-medium text-black">
                {activeModule.typeLabel}
              </span>
            </div>

            {selectedModule === 'light-cone' ? (
              <div className="space-y-4">
                <label className="form-field">
                  <span className="form-label">边界说明</span>
                  <p className="panel-note">{LIGHT_CONE_FIELD_NOTES.boundaryGuidance}</p>
                  <textarea
                    aria-label="边界说明"
                    value={value.controlModules.lightConeCustomization.boundaryGuidance}
                    onChange={updateLightCone('boundaryGuidance')}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">收束说明</span>
                  <p className="panel-note">{LIGHT_CONE_FIELD_NOTES.convergenceGuidance}</p>
                  <textarea
                    aria-label="收束说明"
                    value={value.controlModules.lightConeCustomization.convergenceGuidance}
                    onChange={updateLightCone('convergenceGuidance')}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Phase 收束说明</span>
                  <p className="panel-note">{LIGHT_CONE_FIELD_NOTES.phaseSettlementGuidance}</p>
                  <textarea
                    aria-label="Phase 收束说明"
                    value={value.controlModules.lightConeCustomization.phaseSettlementGuidance}
                    onChange={updateLightCone('phaseSettlementGuidance')}
                  />
                </label>
              </div>
            ) : null}

            {selectedModule === 'director-note-additions' ? (
              <div className="space-y-4">
                <label className="form-field">
                  <span className="form-label">Beat 限制补充</span>
                  <textarea
                    aria-label="Beat 限制补充"
                    value={value.controlModules.directorNoteAdditions.beatConstraintsAdditions}
                    onChange={updateDirectorNote('beatConstraintsAdditions')}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">选项限制补充</span>
                  <textarea
                    aria-label="选项限制补充"
                    value={value.controlModules.directorNoteAdditions.optionConstraintsAdditions}
                    onChange={updateDirectorNote('optionConstraintsAdditions')}
                  />
                </label>
              </div>
            ) : null}

            {selectedModule === 'beat-volume-definitions' ? (
              <div className="space-y-4">
                {(['Low', 'Med', 'High'] as const).map((volume) => (
                  <section key={volume} className="rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-base font-semibold text-slate-900">{volume}</h4>
                      <span className="rounded-none border border-black bg-white px-3 py-1 text-xs font-medium text-black">
                        Volume 定义
                      </span>
                    </div>
                    <div className="space-y-4">
                      <label className="form-field">
                        <span className="form-label">Beat 限制</span>
                        <textarea
                          aria-label={`${volume} Beat 限制`}
                          value={value.controlModules.beatVolumeDefinitions[volume].beatConstraints}
                          onChange={updateBeatVolume(volume, 'beatConstraints')}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">选项格式</span>
                        <textarea
                          aria-label={`${volume} 选项格式`}
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
                  <p className="panel-note">编辑送入场景阶段选择器的 Router 配置。</p>
                  <button type="button" className="secondary-link" onClick={addRouterProfile}>
                    新增 Router
                  </button>
                </div>
                <div className="space-y-4">
                  {value.routerProfiles.map((profile, index) => (
                    <section
                      key={`${profile.routerName || 'router'}-${index}`}
                      className="rounded-none border-2 border-black bg-[#f5f5f5] p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-base font-semibold text-slate-900">
                          {profile.routerName || `未命名 Router ${index + 1}`}
                        </h4>
                        <button
                          type="button"
                          className="secondary-link"
                          onClick={() => removeRouterProfile(index)}
                        >
                          删除
                        </button>
                      </div>
                      <div className="space-y-4">
                        <label className="form-field">
                          <span className="form-label">Router 名</span>
                          <input
                            aria-label={`Router 名 ${index + 1}`}
                            value={profile.routerName}
                            onChange={(event) =>
                              updateRouterProfile(index, 'routerName', event.currentTarget.value)
                            }
                          />
                        </label>
                        <label className="form-field">
                          <span className="form-label">语义核心</span>
                          <textarea
                            aria-label={`语义核心 ${index + 1}`}
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
                          <span className="form-label">动词词库</span>
                          <input
                            aria-label={`动词词库 ${index + 1}`}
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
                        ? '全局问题'
                        : bucket === 'control'
                          ? '控制问题'
                          : `Phase ${bucket.replace('phase:', '')}`;

                    return (
                      <button
                        key={bucket}
                        type="button"
                        className={`rounded-none px-3 py-1 text-xs font-medium border ${
                          bucket === selectedAuditBucket
                            ? 'bg-black text-white border-black'
                            : 'bg-[#e5e5e5] text-black border-black'
                        }`}
                        onClick={() => updateSelectedBucket(bucket)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="panel-note">为当前分组新增、删除并调整审查问题。</p>
                  <button type="button" className="secondary-link" onClick={addAuditQuestion}>
                    新增问题
                  </button>
                </div>

                <div
                  className="max-h-[28rem] space-y-4 overflow-y-auto rounded-none border-2 border-black bg-[#f5f5f5] p-4"
                  role="region"
                  aria-label="审查问题列表"
                >
                  {getCurrentAuditQuestions().map((question, index) => (
                    <section
                      key={`${question.id || 'question'}-${index}`}
                      className="rounded-none border-2 border-black bg-white p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            {question.id || '未命名问题'}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="secondary-link"
                          onClick={() => removeAuditQuestion(index)}
                        >
                          删除
                        </button>
                      </div>
                      <div className="space-y-4">
                        <label className="form-field">
                          <span className="form-label">问题</span>
                          <textarea
                            aria-label={`问题 ${index + 1}`}
                            value={question.question}
                            onChange={(event) =>
                              updateAuditQuestionField(index, 'question', event.currentTarget.value)
                            }
                          />
                        </label>
                        <label className="form-field">
                          <span className="form-label">理由</span>
                          <textarea
                            aria-label={`理由 ${index + 1}`}
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
                            期望为真
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={question.blocking}
                              onChange={(event) =>
                                updateAuditQuestionField(index, 'blocking', event.currentTarget.checked)
                              }
                            />
                            阻断
                          </label>
                        </div>
                      </div>
                    </section>
                  ))}
                  {getCurrentAuditQuestions().length === 0 ? (
                    <p className="panel-note">当前分组还没有问题。</p>
                  ) : null}
                </div>

                <section className="rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                  <div className="mb-4">
                    <p className="panel-eyebrow">选择策略</p>
                    <h4 className="text-base font-semibold text-slate-900">默认项与 Phase 覆盖</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700">默认问题</p>
                      <div className="grid gap-2">
                        {allAuditQuestions.map((question) => (
                          <label key={`default-${question.id}`} className="flex items-start gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={value.auditQuestionSet.selectionPolicy.default.includes(question.id)}
                              onChange={() => toggleDefaultSelection(question.id)}
                            />
                            <span>{question.id}: {question.question || '未命名问题'}</span>
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
                                  <span>{question.id}: {question.question || '未命名问题'}</span>
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
                重置本页
              </button>
              <button
                type="button"
                className="primary-link"
                disabled={isSaving}
                onClick={() => onSubmit(selectedModule)}
              >
                {isSaving ? '保存中...' : '保存本页'}
              </button>
            </div>

            {statusMessage ? <p className="panel-note mt-3">{statusMessage}</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
