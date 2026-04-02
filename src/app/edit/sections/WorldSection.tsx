'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import type { WorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';
import {
  normalizeWorldLocationDraft,
  type WorldLocationDraft,
} from '@/authoring/sections/world-locations';
import { useMatchedHeight } from '@/app/edit/shared/useMatchedHeight';

type TextField = 'worldBaseSetting' | 'worldRules' | 'toneBaseline' | 'supportingCast';
type LocationField =
  | 'name'
  | 'description'
  | 'environmentAppearance'
  | 'atmosphereDescription'
  | 'humanContextDescription';

const WORLD_TEXT_FIELDS: readonly {
  readonly key: TextField;
  readonly label: string;
  readonly description: string;
  readonly rows: number;
}[] = [
  {
    key: 'worldBaseSetting',
    label: '世界基础设定',
    description: '用一块文本写清世界底座。',
    rows: 4,
  },
  {
    key: 'worldRules',
    label: '世界规则 / 禁忌 / 异常性质',
    description: '把硬规则、禁忌和异常表现放在这里。',
    rows: 5,
  },
  {
    key: 'toneBaseline',
    label: '文风基线',
    description: '保持后续内容的语气和笔调一致。',
    rows: 4,
  },
] as const;

const LOCATION_FIELDS: readonly {
  readonly key: LocationField;
  readonly label: string;
  readonly rows: number;
  readonly multiline?: boolean;
}[] = [
  {
    key: 'name',
    label: '地点名称',
    rows: 1,
  },
  {
    key: 'description',
    label: '地点说明',
    rows: 4,
    multiline: true,
  },
  {
    key: 'environmentAppearance',
    label: '环境外观描述',
    rows: 3,
    multiline: true,
  },
  {
    key: 'atmosphereDescription',
    label: '氛围描述',
    rows: 3,
    multiline: true,
  },
  {
    key: 'humanContextDescription',
    label: '人文描述',
    rows: 3,
    multiline: true,
  },
] as const;

export interface WorldSectionProps {
  readonly packageName: string;
  readonly value: WorldBaseCastDraft;
  readonly onChange: (nextValue: WorldBaseCastDraft) => void;
  readonly onSubmit: () => void;
  readonly onReset: () => void;
  readonly selectedLocationDraftId?: string | null;
  readonly onSelectedLocationDraftIdChange?: (nextDraftId: string | null) => void;
  readonly isSaving?: boolean;
}

function summarizeLocation(location: WorldLocationDraft): string {
  return location.name.trim() || '未命名地点';
}

function summarizeLocationSecondaryLine(location: WorldLocationDraft): string {
  const summary =
    location.atmosphereDescription.trim() ||
    location.environmentAppearance.trim() ||
    location.description.trim();

  return summary || '地点细节待补充';
}

function createEmptyLocationDraft(index: number): WorldLocationDraft {
  return normalizeWorldLocationDraft(
    {
      draftId: `location-draft-${index}-${Date.now()}`,
      locationId: '',
      name: '',
      description: '',
      environmentAppearance: '',
      atmosphereDescription: '',
      humanContextDescription: '',
    },
    index,
  );
}

export function WorldSection({
  packageName,
  value,
  onChange,
  onSubmit,
  onReset,
  selectedLocationDraftId: controlledSelectedLocationDraftId,
  onSelectedLocationDraftIdChange,
  isSaving = false,
}: WorldSectionProps) {
  const [localSelectedLocationDraftId, setLocalSelectedLocationDraftId] = useState<string | null>(
    value.locations[0]?.draftId ?? null,
  );
  const isLocationSelectionControlled = controlledSelectedLocationDraftId !== undefined;
  const selectedLocationDraftId = controlledSelectedLocationDraftId ?? localSelectedLocationDraftId;
  const locationEditorRef = useRef<HTMLElement | null>(null);
  const matchedWorkspaceStyle = useMatchedHeight(locationEditorRef);

  function setSelectedLocationDraftId(nextDraftId: string | null) {
    onSelectedLocationDraftIdChange?.(nextDraftId);

    if (!isLocationSelectionControlled) {
      setLocalSelectedLocationDraftId(nextDraftId);
    }
  }

  useEffect(() => {
    const hasLocations = value.locations.length > 0;
    if (!hasLocations) {
      onSelectedLocationDraftIdChange?.(null);
      if (!isLocationSelectionControlled) {
        setLocalSelectedLocationDraftId(null);
      }
      return;
    }

    if (
      selectedLocationDraftId &&
      value.locations.some((location) => location.draftId === selectedLocationDraftId)
    ) {
      return;
    }

    const fallbackDraftId = value.locations[0]?.draftId ?? null;
    onSelectedLocationDraftIdChange?.(fallbackDraftId);
    if (!isLocationSelectionControlled) {
      setLocalSelectedLocationDraftId(fallbackDraftId);
    }
  }, [
    isLocationSelectionControlled,
    onSelectedLocationDraftIdChange,
    selectedLocationDraftId,
    value.locations,
  ]);

  const selectedLocation = useMemo(() => {
    if (!selectedLocationDraftId) {
      return value.locations[0] ?? null;
    }

    return value.locations.find((location) => location.draftId === selectedLocationDraftId) ?? value.locations[0] ?? null;
  }, [selectedLocationDraftId, value.locations]);

  function updateTextField(field: TextField, event: ChangeEvent<HTMLTextAreaElement>) {
    onChange({
      ...value,
      [field]: event.currentTarget.value,
    });
  }

  function updateSelectedLocation(field: LocationField, nextValue: string) {
    if (!selectedLocation) {
      return;
    }

    onChange({
      ...value,
      locations: value.locations.map((location) =>
        location.draftId === selectedLocation.draftId
          ? {
              ...location,
              [field]: nextValue,
            }
          : location,
      ),
    });
  }

  function addLocation() {
    const nextLocation = createEmptyLocationDraft(value.locations.length + 1);

    onChange({
      ...value,
      locations: [...value.locations, nextLocation],
    });
    setSelectedLocationDraftId(nextLocation.draftId);
  }

  function removeSelectedLocation() {
    if (!selectedLocation) {
      return;
    }

    const selectedIndex = value.locations.findIndex(
      (location) => location.draftId === selectedLocation.draftId,
    );
    const nextLocations = value.locations.filter(
      (location) => location.draftId !== selectedLocation.draftId,
    );

    onChange({
      ...value,
      locations: nextLocations,
    });

    const fallbackLocation =
      nextLocations[Math.max(0, selectedIndex - 1)] ?? nextLocations[0] ?? null;
    setSelectedLocationDraftId(fallbackLocation?.draftId ?? null);
  }

  return (
    <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
      <section
        aria-label="World workspace"
        style={matchedWorkspaceStyle}
        className="min-h-[calc(100vh-16rem)] space-y-6 overflow-y-auto pr-2"
      >
        <section className="rounded-none border-2 border-black bg-[#f5f5f5] p-4">
          <div className="mb-4">
            <p className="panel-eyebrow">世界页</p>
            <h3 className="text-xl font-semibold text-black uppercase">世界文本块</h3>
          </div>
          <div className="space-y-4">
            {WORLD_TEXT_FIELDS.map((field) => (
              <label key={field.key} className="form-field">
                <span className="form-label">{field.label}</span>
                <span className="panel-note">{field.description}</span>
                <textarea
                  aria-label={field.label}
                  rows={field.rows}
                  value={value[field.key]}
                  onChange={(event) => updateTextField(field.key, event)}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-none border-2 border-black bg-[#f5f5f5] p-4">
          <div className="mb-4">
            <p className="panel-eyebrow">世界补充</p>
            <h3 className="text-xl font-semibold text-black uppercase">普通配角</h3>
          </div>
          <label className="form-field">
            <span className="form-label">普通配角</span>
            <span className="panel-note">保留松散的世界人口与次要见证者。</span>
            <textarea
              aria-label="普通配角"
              rows={5}
              value={value.supportingCast}
              onChange={(event) => updateTextField('supportingCast', event)}
            />
          </label>
        </section>

        <section className="rounded-none border-2 border-black bg-[#f5f5f5] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="panel-eyebrow">地点轨道</p>
              <h3 className="text-xl font-semibold text-black uppercase">结构化地点</h3>
              <p className="panel-note">左侧挑当前地点，右侧写完整明细。</p>
            </div>
            <button
              type="button"
              className="secondary-link"
              onClick={addLocation}
              aria-label="新增地点"
            >
              新增地点
            </button>
          </div>
          <div className="space-y-3">
            {value.locations.map((location) => {
              const isSelected = selectedLocation?.draftId === location.draftId;

              return (
                <button
                  key={location.draftId}
                  type="button"
                  className={`w-full rounded-none border-2 p-4 text-left transition ${
                    isSelected
                      ? 'border-black bg-black text-white shadow-brutal'
                      : 'border-black bg-white text-black hover:bg-[#e5e5e5]'
                  }`}
                  onClick={() => setSelectedLocationDraftId(location.draftId)}
                >
                  <strong className="block text-sm">{summarizeLocation(location)}</strong>
                  <p className={`mt-3 text-sm ${isSelected ? 'text-white/80' : 'text-black/60'}`}>
                    {summarizeLocationSecondaryLine(location)}
                  </p>
                </button>
              );
            })}
            {value.locations.length === 0 ? (
              <div className="rounded-none border-2 border-dashed border-black bg-white p-4 text-sm text-black">
                还没有地点。先新增一个地点，再在右侧补完整明细。
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <section ref={locationEditorRef} aria-label="Location editor column" className="space-y-4">
        <div className="rounded-none border-2 border-black bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="panel-eyebrow">当前地点</p>
              <h3 className="text-xl font-semibold text-black uppercase">
                {selectedLocation ? summarizeLocation(selectedLocation) : '当前没有地点'}
              </h3>
              <p className="panel-note">{packageName}</p>
            </div>
            {selectedLocation ? (
              <button type="button" className="secondary-link" onClick={removeSelectedLocation}>
                删除当前地点
              </button>
            ) : null}
          </div>

          {selectedLocation ? (
            <div className="space-y-4">
              {LOCATION_FIELDS.map((field) => {
                const fieldValue = selectedLocation[field.key];

                return (
                  <label key={field.key} className="form-field">
                    <span className="form-label">{field.label}</span>
                    {field.multiline ? (
                      <textarea
                        aria-label={field.label}
                        rows={field.rows}
                        value={fieldValue}
                        onChange={(event) => updateSelectedLocation(field.key, event.currentTarget.value)}
                      />
                    ) : (
                      <input
                        aria-label={field.label}
                        value={fieldValue}
                        onChange={(event) => updateSelectedLocation(field.key, event.currentTarget.value)}
                      />
                    )}
                  </label>
                );
              })}

              <div className="panel-actions border-t-2 border-black pt-4">
                <button type="button" className="secondary-link" onClick={onReset}>
                  重置本页
                </button>
                <button type="button" className="primary-link" disabled={isSaving} onClick={onSubmit}>
                  {isSaving ? '保存中...' : '保存本页'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="panel-note">当前还没有可编辑地点，先从左侧新增一个。</p>
              <button type="button" className="primary-link" onClick={addLocation}>
                新增地点
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
