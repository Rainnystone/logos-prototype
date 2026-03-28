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
  return phase.routerHint?.trim() || '当前没有 Router';
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
          <p className="panel-eyebrow">当前页</p>
          <h2>场景与阶段</h2>
          <p className="panel-note">编辑一个场景框架、一个 Phase 轨道和当前 Phase。</p>
        </div>
        <p className="panel-note">{packageName}</p>
      </div>

      <section
        aria-label="Phase 轨道区"
        className="mt-6 w-full min-w-0 overflow-hidden rounded-none border-2 border-black bg-white shadow-brutal"
      >
        <div className="border-b-2 border-black px-5 pb-4 pt-5">
          <div>
            <p className="panel-eyebrow">Phase 轨道</p>
            <h3 className="text-2xl font-bold uppercase tracking-tight text-black">Phase 卡片</h3>
          </div>
        </div>
        <div className="min-w-0 space-y-4 bg-[#f5f5f5] px-5 py-5">
          <div
            ref={phaseRailRef}
            className="min-w-0 overflow-x-auto"
            aria-label="Phase 轨道滚动条"
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
                      <span className="mb-0.5 block font-semibold uppercase">Router 提示</span>
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
                aria-label="新增 Phase"
                className="flex w-[18rem] shrink-0 items-center justify-center rounded-none border-2 border-dashed border-black bg-white p-4 text-left text-sm font-semibold uppercase tracking-[0.05em] text-black transition hover:bg-[#e5e5e5]"
                onClick={handleAddPhase}
              >
                + 新增 Phase
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="panel-eyebrow whitespace-nowrap text-black">轨道滑块</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={phaseRailProgress}
              aria-label="轨道滑块"
              disabled={!phaseRailScrollable}
              onChange={handlePhaseRailSliderChange}
              className="h-2 w-full cursor-pointer appearance-none rounded-none border border-black bg-white accent-black disabled:cursor-default disabled:opacity-50"
            />
          </div>
        </div>
      </section>

      <div
        role="region"
        aria-label="场景与阶段工作区"
        className="mt-6 grid w-full min-w-0 items-stretch gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]"
      >
        <div
          style={matchedSceneFrameStyle}
          className="min-w-0 space-y-6 xl:min-h-[calc(100vh-16rem)] xl:overflow-y-auto xl:pr-2"
        >
          <section
            aria-label="场景框架区"
            className="min-h-full rounded-none border-2 border-black bg-[#f5f5f5] p-5"
          >
            <div className="mb-4">
              <p className="panel-eyebrow">场景</p>
              <h3 className="text-xl font-semibold text-slate-900">场景框架</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                <span className="form-label">场景名</span>
                <input
                  aria-label="场景名"
                  value={value.sceneSpec.sceneName}
                  onChange={(event) => updateSceneField('sceneName', event)}
                />
              </label>
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                <span className="form-label">开场钩子</span>
                <textarea
                  aria-label="开场钩子"
                  rows={3}
                  value={value.sceneSpec.openingHook}
                  onChange={(event) => updateSceneField('openingHook', event)}
                />
              </label>
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                <span className="form-label">起点</span>
                <textarea
                  aria-label="起点"
                  rows={4}
                  value={value.sceneSpec.startPoint}
                  onChange={(event) => updateSceneField('startPoint', event)}
                />
              </label>
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                <span className="form-label">终点线</span>
                <textarea
                  aria-label="终点线"
                  rows={4}
                  value={value.sceneSpec.endLine}
                  onChange={(event) => updateSceneField('endLine', event)}
                />
              </label>
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4 md:col-span-2">
                <span className="form-label">开场情况</span>
                <textarea
                  aria-label="开场情况"
                  rows={3}
                  value={value.sceneSpec.openingSituation}
                  onChange={(event) => updateSceneField('openingSituation', event)}
                />
              </label>
              <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4 md:col-span-2">
                <span className="form-label">示例用途</span>
                <textarea
                  aria-label="示例用途"
                  rows={3}
                  value={value.sceneSpec.samplePurpose}
                  onChange={(event) => updateSceneField('samplePurpose', event)}
                />
              </label>
            </div>
          </section>
        </div>

        <section ref={detailColumnRef} aria-label="当前阶段编辑区" className="min-w-0 space-y-4">
          <div className="rounded-none border-2 border-black bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="panel-eyebrow">当前阶段</p>
                <h3 className="text-xl font-semibold text-slate-900">
                  {selectedPhase?.phaseName || '当前没有 Phase'}
                </h3>
                <p className="panel-note">在右侧编辑当前 Phase，左侧轨道只保留摘要。</p>
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
                  删除
                </button>
              </div>
            </div>

            {selectedPhase ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                    <span className="form-label">Gradient 类型</span>
                    <select
                      aria-label="Gradient 类型"
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
                    <span className="form-label">Router 提示</span>
                    <select
                      aria-label="Router 提示"
                      value={selectedPhase.routerHint ?? ''}
                      onChange={(event) => updatePhaseField('routerHint', event)}
                    >
                      <option value="">选择 Router</option>
                      {routerOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field rounded-none border-2 border-black bg-[#f5f5f5] p-4">
                    <span className="form-label">Beat 数</span>
                    <input aria-label="Beat 数" value="4" disabled readOnly />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="form-field rounded-none border-2 border-black bg-white p-4">
                    <span className="form-label">Phase 名</span>
                    <input
                      aria-label="Phase 名"
                      value={selectedPhase.phaseName}
                      onChange={(event) => updatePhaseField('phaseName', event)}
                    />
                  </label>
                  <label className="form-field rounded-none border-2 border-black bg-white p-4">
                    <span className="form-label">Phase 终点</span>
                    <textarea
                      aria-label="Phase 终点"
                      rows={3}
                      value={selectedPhase.phaseEndPoint ?? ''}
                      onChange={(event) => updatePhaseField('phaseEndPoint', event)}
                    />
                  </label>
                  <label className="form-field rounded-none border-2 border-black bg-white p-4 md:col-span-2">
                    <span className="form-label">Phase 目标</span>
                    <textarea
                      aria-label="Phase 目标"
                      rows={4}
                      value={selectedPhase.phaseGoal}
                      onChange={(event) => updatePhaseField('phaseGoal', event)}
                    />
                  </label>
                  <label className="form-field rounded-none border-2 border-black bg-white p-4 md:col-span-2">
                    <span className="form-label">备注</span>
                    <textarea
                      aria-label="备注"
                      rows={4}
                      value={selectedPhase.notes ?? ''}
                      onChange={(event) => updatePhaseField('notes', event)}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <p className="panel-note">新增一个 Phase 开始编辑。</p>
            )}
          </div>

          <div className="rounded-none border-2 border-black bg-white p-4">
            <div className="panel-actions">
              <button type="button" className="secondary-link" onClick={onReset}>
                重置本页
              </button>
              <button
                type="button"
                className="primary-link"
                disabled={isSaving}
                onClick={onSubmit}
              >
                {isSaving ? '保存中...' : '保存本页'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
