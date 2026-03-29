'use client';

import { useId, useMemo, useState } from 'react';

import { normalizeSceneCastSelection } from '@/authoring/sections/scene-cast';
import type { WorldBase } from '@/types';

export type SceneCastLibrary = Pick<WorldBase, 'hero' | 'coreCast' | 'antagonists'>;
export type SceneCastCharacter = SceneCastLibrary['hero'];

export interface SceneCastSelectionValue {
  readonly castMode: 'unset' | 'explicit';
  readonly cast?: readonly string[];
}

interface SceneCastSelectorProps {
  readonly sceneCastLibrary: SceneCastLibrary;
  readonly value: SceneCastSelectionValue;
  readonly onChange: (nextValue: SceneCastSelectionValue) => void;
}

interface SceneCastEntry {
  readonly groupLabel: '核心角色' | '反派';
  readonly character: SceneCastCharacter;
}

function buildSelectableEntries(sceneCastLibrary: SceneCastLibrary): readonly SceneCastEntry[] {
  return [
    ...sceneCastLibrary.coreCast.map((character) => ({
      groupLabel: '核心角色' as const,
      character,
    })),
    ...sceneCastLibrary.antagonists.map((character) => ({
      groupLabel: '反派' as const,
      character,
    })),
  ];
}

function getSummaryCopy(selectedCount: number, castMode: SceneCastSelectionValue['castMode']): string {
  if (castMode === 'unset') {
    return '沿用默认阵容，未显式选择。';
  }

  if (selectedCount === 0) {
    return '已明确为空阵容。';
  }

  return `已选 ${selectedCount} 个非主角角色。`;
}

function buildNextCast(
  currentCast: readonly string[],
  staleIds: readonly string[],
  targetId: string,
  orderedSelectableIds: readonly string[],
): string[] {
  const nextRequestedIds = currentCast.includes(targetId)
    ? currentCast.filter((characterId) => characterId !== targetId)
    : [...currentCast, targetId];

  const requestedIdSet = new Set(nextRequestedIds);
  return [...staleIds, ...orderedSelectableIds.filter((characterId) => requestedIdSet.has(characterId))];
}

export function SceneCastSelector({
  sceneCastLibrary,
  value,
  onChange,
}: SceneCastSelectorProps) {
  const bodyId = useId();
  const warningId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const selectableEntries = useMemo(
    () => buildSelectableEntries(sceneCastLibrary),
    [sceneCastLibrary],
  );
  const orderedSelectableIds = useMemo(
    () => selectableEntries.map((entry) => entry.character.characterId),
    [selectableEntries],
  );
  const normalizedSelection = useMemo(
    () =>
      value.castMode === 'explicit'
        ? normalizeSceneCastSelection(sceneCastLibrary, value.cast)
        : { cast: [], staleIds: [] },
    [sceneCastLibrary, value.cast, value.castMode],
  );
  const selectedIds = normalizedSelection.cast;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedEntries = selectableEntries.filter((entry) => selectedIdSet.has(entry.character.characterId));
  const staleIds = normalizedSelection.staleIds;
  const hasWarnings = staleIds.length > 0;
  const summaryCopy = getSummaryCopy(selectedEntries.length, value.castMode);
  const warningCopy = hasWarnings ? `有 ${staleIds.length} 个旧编号不在当前角色库中。` : null;

  function updateSelection(targetId: string) {
    const nextCast = buildNextCast(selectedIds, staleIds, targetId, orderedSelectableIds);
    onChange({
      castMode: 'explicit',
      cast: nextCast,
    });
  }

  function restoreDefaultInheritance() {
    onChange({
      castMode: 'unset',
    });
  }

  return (
    <section className="rounded-none border-2 border-black bg-white shadow-brutal">
      <div className="border-b-2 border-black bg-[#f5f5f5] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            aria-controls={bodyId}
            aria-expanded={isExpanded}
            className="min-w-0 flex-1 text-left"
            onClick={() => setIsExpanded((currentExpanded) => !currentExpanded)}
          >
            <p className="panel-eyebrow">场景阵容</p>
            <h4 className="text-xl font-semibold text-black">Scene Cast</h4>
            <p className="mt-2 text-sm leading-relaxed text-black">{summaryCopy}</p>
          </button>
          <button
            type="button"
            aria-controls={bodyId}
            aria-expanded={isExpanded}
            className="secondary-link shrink-0"
            onClick={() => setIsExpanded((currentExpanded) => !currentExpanded)}
          >
            <span className="mr-2">场景阵容</span>
            <span aria-hidden="true">{isExpanded ? '收起' : '展开'}</span>
          </button>
        </div>

        <div className="mt-3 flex min-h-10 flex-wrap gap-2">
          {selectedEntries.length > 0 ? (
            selectedEntries.map((entry) => (
              <button
                key={entry.character.characterId}
                type="button"
                className="inline-flex items-center gap-2 rounded-none border-2 border-black bg-black px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#111111]"
                aria-label={`移除 ${entry.character.name}`}
                onClick={() => updateSelection(entry.character.characterId)}
              >
                <span>{entry.character.name}</span>
              </button>
            ))
          ) : (
            <span className="inline-flex items-center border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-black">
              主角默认继承，不在这里选择
            </span>
          )}

          {staleIds.map((characterId) => (
            <button
              key={characterId}
              type="button"
              className="inline-flex items-center gap-2 rounded-none border-2 border-dashed border-black bg-[#f5f5f5] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-black opacity-70"
              aria-label={`失效编号 ${characterId}`}
              aria-disabled="true"
              disabled
            >
              <span>{characterId}</span>
            </button>
          ))}

          {value.castMode === 'unset' ? null : (
            <button
              type="button"
              className="inline-flex items-center border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-black transition hover:bg-[#e5e5e5]"
              onClick={restoreDefaultInheritance}
            >
              使用默认继承
            </button>
          )}
        </div>

        {warningCopy ? (
          <div
            role="region"
            aria-label="场景阵容警告"
            aria-describedby={warningId}
            className="mt-3 rounded-none border-2 border-dashed border-black bg-[#fff7d0] px-3 py-2"
          >
            <p id={warningId} className="text-xs font-bold uppercase tracking-[0.08em] text-black">
              {warningCopy}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-black/80">
              这些编号不在当前角色库中。
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {staleIds.map((characterId) => (
                <span
                  key={`${characterId}-warning`}
                  className="inline-flex items-center border-2 border-black bg-white px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-black"
                >
                  {`失效编号 ${characterId}`}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {isExpanded ? (
        <div id={bodyId} className="grid gap-4 bg-white p-4 md:grid-cols-2">
          {(['核心角色', '反派'] as const).map((groupLabel) => {
            const entries = selectableEntries.filter((entry) => entry.groupLabel === groupLabel);

            return (
              <section
                key={groupLabel}
                aria-label={groupLabel}
                className="rounded-none border-2 border-black bg-[#f5f5f5] p-4"
              >
                <div className="mb-3">
                  <p className="panel-eyebrow">{groupLabel}</p>
                  <p className="text-sm text-black/80">
                    只显示当前场景可选的非主角角色。
                  </p>
                </div>
                <div className="space-y-2">
                  {entries.map((entry) => {
                    const isSelected = selectedIdSet.has(entry.character.characterId);

                    return (
                      <button
                        key={entry.character.characterId}
                        type="button"
                        aria-label={`选择 ${entry.groupLabel} ${entry.character.name}`}
                        aria-pressed={isSelected}
                        className={`w-full rounded-none border-2 p-3 text-left transition ${
                          isSelected
                            ? 'border-black bg-black text-white shadow-brutal'
                            : 'border-black bg-white text-black hover:bg-[#e5e5e5]'
                        }`}
                        onClick={() => updateSelection(entry.character.characterId)}
                      >
                        <strong className="block text-sm">{entry.character.name}</strong>
                        <span className={`mt-2 block text-xs ${isSelected ? 'text-white/75' : 'text-black/70'}`}>
                          {entry.groupLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
