'use client';

import { useId, useMemo, useState } from 'react';

import type { Location } from '@/types';

interface SceneLocationSelectorProps {
  readonly sceneLocations: readonly Location[];
  readonly value: readonly string[] | undefined;
  readonly onChange: (nextValue: readonly string[] | undefined) => void;
}

function normalizeLocationSelection(
  sceneLocations: readonly Location[],
  locationIds: readonly string[] | undefined,
): { readonly selectedIds: readonly string[]; readonly staleIds: readonly string[] } {
  const normalizedIds = (locationIds ?? []).map((locationId) => locationId.trim()).filter(Boolean);
  const availableIds = new Set(sceneLocations.map((location) => location.locationId));
  const selectedIdSet = new Set(normalizedIds);

  return {
    selectedIds: sceneLocations
      .map((location) => location.locationId)
      .filter((locationId) => selectedIdSet.has(locationId)),
    staleIds: normalizedIds.filter((locationId) => !availableIds.has(locationId)),
  };
}

function buildNextLocationIds(
  currentLocationIds: readonly string[],
  staleIds: readonly string[],
  targetId: string,
  orderedSelectableIds: readonly string[],
): string[] {
  const nextRequestedIds = currentLocationIds.includes(targetId)
    ? currentLocationIds.filter((locationId) => locationId !== targetId)
    : [...currentLocationIds, targetId];

  const requestedIdSet = new Set(nextRequestedIds);
  return [...staleIds, ...orderedSelectableIds.filter((locationId) => requestedIdSet.has(locationId))];
}

function getSummaryCopy(selectedCount: number): string {
  if (selectedCount === 0) {
    return '当前场景未指定地点。';
  }

  return `已选 ${selectedCount} 个地点。`;
}

function summarizeLocationDescription(location: Location): string {
  const segments = [
    location.description.trim(),
    location.environmentAppearance.trim(),
    location.atmosphereDescription.trim(),
  ].filter(Boolean);

  return segments[0] ?? '';
}

export function SceneLocationSelector({
  sceneLocations,
  value,
  onChange,
}: SceneLocationSelectorProps) {
  const bodyId = useId();
  const warningId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const normalizedSelection = useMemo(
    () => normalizeLocationSelection(sceneLocations, value),
    [sceneLocations, value],
  );
  const selectedIds = normalizedSelection.selectedIds;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const staleIds = normalizedSelection.staleIds;
  const orderedSelectableIds = useMemo(
    () => sceneLocations.map((location) => location.locationId),
    [sceneLocations],
  );
  const selectedLocations = sceneLocations.filter((location) => selectedIdSet.has(location.locationId));
  const warningCopy = staleIds.length > 0 ? `有 ${staleIds.length} 个旧编号不在当前地点库中。` : null;

  function updateSelection(targetId: string) {
    const nextLocationIds = buildNextLocationIds(
      selectedIds,
      staleIds,
      targetId,
      orderedSelectableIds,
    );

    onChange(nextLocationIds.length > 0 ? nextLocationIds : undefined);
  }

  function clearExplicitLocations() {
    onChange(undefined);
  }

  return (
    <section className="rounded-none border-2 border-black bg-white shadow-brutal">
      <div className={`px-4 py-4 transition-colors ${isExpanded ? 'border-b-2 border-black bg-white' : 'bg-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            aria-controls={bodyId}
            aria-expanded={isExpanded}
            className="min-w-0 flex-1 text-left"
            onClick={() => setIsExpanded((currentExpanded) => !currentExpanded)}
          >
            <p className="panel-eyebrow">Scene Location</p>
            <h4 className="text-xl font-bold uppercase tracking-[0.08em] text-black">可选地点</h4>
            <p className="mt-2 text-sm leading-relaxed text-black/80">{getSummaryCopy(selectedLocations.length)}</p>
          </button>
          <button
            type="button"
            aria-controls={bodyId}
            aria-expanded={isExpanded}
            className={`shrink-0 rounded-none border-2 border-black bg-white px-4 py-2 text-sm font-bold uppercase transition hover:bg-[#e5e5e5] ${!isExpanded ? 'shadow-[2px_2px_0_0_#000]' : ''}`}
            onClick={() => setIsExpanded((currentExpanded) => !currentExpanded)}
          >
            <span aria-hidden="true">{isExpanded ? '收起 ▲' : '展开 ▼'}</span>
            <span className="sr-only">场景地点</span>
          </button>
        </div>

        <div className="mt-4 flex min-h-10 flex-wrap gap-2">
          {selectedLocations.length > 0 ? (
            selectedLocations.map((location) => (
              <button
                key={location.locationId}
                type="button"
                className="inline-flex items-center gap-2 rounded-none border-2 border-black bg-black px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#111111]"
                aria-label={`移除 ${location.name.trim() || location.locationId}`}
                onClick={() => updateSelection(location.locationId)}
              >
                <span>{location.name.trim() || location.locationId}</span>
              </button>
            ))
          ) : (
            <span className="inline-flex items-center border-2 border-black bg-[#f5f5f5] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-black">
              未显式指定地点
            </span>
          )}

          {staleIds.map((locationId) => (
            <button
              key={locationId}
              type="button"
              className="inline-flex items-center gap-2 rounded-none border-2 border-dashed border-black bg-[#f5f5f5] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-black opacity-70"
              aria-label={`失效地点编号 ${locationId}`}
              aria-disabled="true"
              disabled
            >
              <span>{locationId}</span>
            </button>
          ))}

          {selectedLocations.length > 0 || staleIds.length > 0 ? (
            <button
              type="button"
              className="inline-flex items-center border-2 border-black bg-[#f5f5f5] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-black transition hover:bg-[#e5e5e5]"
              onClick={clearExplicitLocations}
            >
              清空显式地点
            </button>
          ) : null}
        </div>

        {warningCopy ? (
          <div
            role="region"
            aria-label="场景地点警告"
            aria-describedby={warningId}
            className="mt-3 rounded-none border-2 border-dashed border-black bg-[#fff7d0] px-3 py-2"
          >
            <p id={warningId} className="text-xs font-bold uppercase tracking-[0.08em] text-black">
              {warningCopy}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-black/80">
              这些编号不在当前地点库中。
            </p>
          </div>
        ) : null}
      </div>

      {isExpanded ? (
        <div id={bodyId} className="bg-[#f5f5f5] p-4">
          <section aria-label="地点库" className="rounded-none border-2 border-black bg-white p-4">
            <div className="mb-3">
              <p className="panel-eyebrow">地点库</p>
              <p className="text-sm text-black/80">
                只显示当前世界页已经整理好的可选地点。
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sceneLocations.map((location) => {
                const label = location.name.trim() || location.locationId;
                const isSelected = selectedIdSet.has(location.locationId);
                const summary = summarizeLocationDescription(location);

                return (
                  <button
                    key={location.locationId}
                    type="button"
                    aria-label={`选择地点 ${label}`}
                    aria-pressed={isSelected}
                    className={`w-full rounded-none border-2 p-3 text-left transition ${
                      isSelected
                        ? 'border-black bg-black text-white shadow-brutal'
                        : 'border-black bg-white text-black hover:bg-[#e5e5e5]'
                    }`}
                    onClick={() => updateSelection(location.locationId)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold uppercase tracking-[0.08em]">{label}</p>
                        {summary ? (
                          <p className={`mt-2 text-sm leading-relaxed ${isSelected ? 'text-white/85' : 'text-black/75'}`}>
                            {summary}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`mt-0.5 inline-flex h-4 w-4 shrink-0 border-2 ${
                          isSelected ? 'border-white bg-white' : 'border-black bg-white'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
