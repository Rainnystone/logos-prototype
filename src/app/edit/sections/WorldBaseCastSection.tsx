'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import {
  createEmptyWorldBaseCharacterDraft,
  type WorldBaseCastDraft,
  type WorldBaseCharacterDraft,
} from '@/authoring/sections/worldbase-cast';
import { useMatchedHeight } from '@/app/edit/shared/useMatchedHeight';

type TextField = 'worldBaseSetting' | 'worldRules' | 'toneBaseline' | 'supportingCast' | 'locationPool';
type CharacterField =
  | 'name'
  | 'identityRole'
  | 'lightNovelTrait'
  | 'gender'
  | 'personality'
  | 'age'
  | 'occupation'
  | 'characterSummary'
  | 'capabilityBoundary'
  | 'behaviorBoundary'
  | 'oocRedLine'
  | 'clothing'
  | 'propsWeapon'
  | 'fatalWeakness';

type CharacterSelection =
  | { readonly group: 'hero' }
  | { readonly group: 'coreCast'; readonly characterId: string }
  | { readonly group: 'antagonists'; readonly characterId: string };

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

const CHARACTER_FIELD_GROUPS: readonly {
  readonly label: string;
  readonly fields: readonly {
    readonly key: CharacterField;
    readonly label: string;
    readonly textarea?: boolean;
    readonly rows?: number;
  }[];
}[] = [
  {
    label: '当前条目',
    fields: [
      { key: 'name', label: '角色名' },
      { key: 'identityRole', label: '身份 / 叙事定位' },
      { key: 'lightNovelTrait', label: '轻小说特征', textarea: true, rows: 3 },
      { key: 'gender', label: '性别' },
      { key: 'personality', label: '性格' },
      { key: 'age', label: '年龄' },
      { key: 'occupation', label: '身份职业' },
      { key: 'characterSummary', label: '角色概述', textarea: true, rows: 4 },
    ],
  },
  {
    label: '完整卡片',
    fields: [
      { key: 'capabilityBoundary', label: '能力边界', textarea: true, rows: 4 },
      { key: 'behaviorBoundary', label: '行为边界', textarea: true, rows: 4 },
      { key: 'oocRedLine', label: 'OOC 红线', textarea: true, rows: 3 },
      { key: 'clothing', label: '外观 / 穿着', textarea: true, rows: 2 },
      { key: 'propsWeapon', label: '道具 / 武器', textarea: true, rows: 2 },
      { key: 'fatalWeakness', label: '致命弱点', textarea: true, rows: 3 },
    ],
  },
] as const;

interface CharacterRailProps {
  readonly title: string;
  readonly subtitle: string;
  readonly cards: readonly WorldBaseCharacterDraft[];
  readonly selection: CharacterSelection;
  readonly onSelect: (characterId: string) => void;
  readonly onAdd: () => void;
  readonly addLabel: string;
}

interface WorldBaseCastSectionProps {
  readonly packageName: string;
  readonly value: WorldBaseCastDraft;
  readonly onChange: (nextValue: WorldBaseCastDraft) => void;
  readonly onSubmit: () => void;
  readonly onReset: () => void;
  readonly statusMessage?: string | undefined;
  readonly isSaving?: boolean;
}

function summarizeCharacter(character: WorldBaseCharacterDraft): string {
  return character.name.trim() || '未命名角色';
}

function summarizeSecondaryLine(character: WorldBaseCharacterDraft): string {
  const parts = [character.gender.trim(), character.personality.trim()].filter((value) => value.length > 0);
  return parts.length > 0 ? parts.join(' / ') : '性别 / 性格';
}

function CharacterRail({
  title,
  subtitle,
  cards,
  selection,
  onSelect,
  onAdd,
  addLabel,
}: CharacterRailProps) {
  return (
    <section className="rounded-none border-2 border-black bg-[#f5f5f5] p-4">
      <div className="mb-4">
        <p className="panel-eyebrow">{title}</p>
        <p className="panel-note">{subtitle}</p>
      </div>
      <div className="overflow-x-auto pb-3" aria-label={`${title} scrollbar`}>
        <div className="flex min-w-max gap-3">
          {cards.map((character) => {
            const isSelected =
              selection.group !== 'hero' && selection.characterId === character.characterId;

            return (
              <button
                key={character.characterId}
                type="button"
                className={`w-52 shrink-0 rounded-none border-2 p-4 text-left transition ${
                  isSelected
                    ? 'border-black bg-black text-white shadow-brutal'
                    : 'border-black bg-white text-black hover:bg-[#e5e5e5]'
                }`}
                onClick={() => onSelect(character.characterId)}
              >
                <strong className="block text-sm">{summarizeCharacter(character)}</strong>
                <p className={`mt-3 text-sm ${isSelected ? 'text-white/80' : 'text-black/60'}`}>
                  {summarizeSecondaryLine(character)}
                </p>
              </button>
            );
          })}

          <button
            type="button"
            className="w-44 shrink-0 rounded-none border-2 border-dashed border-black bg-white p-4 text-left text-sm font-semibold text-black transition hover:bg-[#e5e5e5]"
            onClick={onAdd}
            aria-label={addLabel}
          >
            + {addLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

export function WorldBaseCastSection({
  packageName,
  value,
  onChange,
  onSubmit,
  onReset,
  isSaving = false,
}: WorldBaseCastSectionProps) {
  const [selection, setSelection] = useState<CharacterSelection>({ group: 'hero' });
  const characterEditorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (selection.group === 'hero') {
      return;
    }

    const pool = selection.group === 'coreCast' ? value.coreCast : value.antagonists;
    if (pool.some((character) => character.characterId === selection.characterId)) {
      return;
    }

    setSelection({ group: 'hero' });
  }, [selection, value.antagonists, value.coreCast]);

  const selectedCharacter = useMemo(() => {
    if (selection.group === 'hero') {
      return { character: value.hero, group: 'hero' as const };
    }

    const pool = selection.group === 'coreCast' ? value.coreCast : value.antagonists;
    const character = pool.find((entry) => entry.characterId === selection.characterId) ?? pool[0];

    if (!character) {
      return null;
    }

    return {
      character,
      group: selection.group,
    };
  }, [selection, value.antagonists, value.coreCast, value.hero]);
  const matchedWorkspaceStyle = useMatchedHeight(characterEditorRef);

  function updateTextField(
    field: TextField,
    event: ChangeEvent<HTMLTextAreaElement>,
  ) {
    onChange({
      ...value,
      [field]: event.currentTarget.value,
    });
  }

  function updateSelectedCharacter(field: CharacterField, nextValue: string) {
    if (!selectedCharacter) {
      return;
    }

    if (selectedCharacter.group === 'hero') {
      onChange({
        ...value,
        hero: {
          ...value.hero,
          [field]: nextValue,
        },
      });
      return;
    }

    const targetGroup = selectedCharacter.group;
    const nextList = value[targetGroup].map((character) =>
      character.characterId === selectedCharacter.character.characterId
        ? {
            ...character,
            [field]: nextValue,
          }
        : character,
    );

    onChange({
      ...value,
      [targetGroup]: nextList,
    });
  }

  function addCharacter(group: 'coreCast' | 'antagonists') {
    const nextCharacter = createEmptyWorldBaseCharacterDraft(
      group === 'coreCast' ? 'core' : 'antagonist',
      value[group].length + 1,
    );

    onChange({
      ...value,
      [group]: [...value[group], nextCharacter],
    });
    setSelection({ group, characterId: nextCharacter.characterId });
  }

  function removeSelectedCharacter() {
    if (!selectedCharacter || selectedCharacter.group === 'hero') {
      return;
    }

    const targetGroup = selectedCharacter.group;
    const nextCharacters = value[targetGroup].filter(
      (character) => character.characterId !== selectedCharacter.character.characterId,
    );

    onChange({
      ...value,
      [targetGroup]: nextCharacters,
    });

    const fallbackCharacter = nextCharacters[Math.max(0, nextCharacters.length - 1)];
    if (fallbackCharacter) {
      setSelection({ group: targetGroup, characterId: fallbackCharacter.characterId });
      return;
    }

    setSelection({ group: 'hero' });
  }

  return (
    <section className="panel worldbase-cast">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">当前页</p>
          <h2>世界与角色</h2>
          <p className="panel-note">编辑世界文本块、角色轨道和右侧当前卡片。</p>
        </div>
        <p className="panel-note">{packageName}</p>
      </div>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
        <section
          aria-label="WorldBase workspace"
          style={matchedWorkspaceStyle}
          className="min-h-[calc(100vh-16rem)] space-y-6 overflow-y-auto pr-2"
        >
          <section className="rounded-none border-2 border-black bg-[#f5f5f5] p-4">
            <div className="mb-4">
              <p className="panel-eyebrow">世界基础</p>
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
              <p className="panel-eyebrow">主角</p>
              <p className="panel-note">固定主角卡，右侧编辑完整卡。</p>
            </div>
            <button
              type="button"
              className={`w-full rounded-none border-2 p-4 text-left transition ${
                selection.group === 'hero'
                  ? 'border-black bg-black text-white shadow-brutal'
                  : 'border-black bg-white text-black hover:bg-[#e5e5e5]'
              }`}
              onClick={() => setSelection({ group: 'hero' })}
              aria-label={`主角 ${summarizeCharacter(value.hero)}`}
            >
              <strong className="block text-sm">{summarizeCharacter(value.hero)}</strong>
              <p className={`mt-3 text-sm ${selection.group === 'hero' ? 'text-white/80' : 'text-black/60'}`}>
                {summarizeSecondaryLine(value.hero)}
              </p>
            </button>
          </section>

          <CharacterRail
            title="核心角色"
            subtitle="这里只放摘要卡，完整卡在右侧展开。"
            cards={value.coreCast}
            selection={selection}
            onSelect={(characterId) => setSelection({ group: 'coreCast', characterId })}
            onAdd={() => addCharacter('coreCast')}
            addLabel="新增核心角色"
          />

          <CharacterRail
            title="反派"
            subtitle="这里只放摘要卡，完整卡在右侧展开。"
            cards={value.antagonists}
            selection={selection}
            onSelect={(characterId) => setSelection({ group: 'antagonists', characterId })}
            onAdd={() => addCharacter('antagonists')}
            addLabel="新增反派"
          />

          <section className="rounded-none border-2 border-black bg-[#f5f5f5] p-4">
            <div className="mb-4">
              <p className="panel-eyebrow">杂项块</p>
              <h3 className="text-xl font-semibold text-black uppercase">普通配角与地点</h3>
            </div>
            <div className="space-y-4">
              <label className="form-field">
                <span className="form-label">普通配角</span>
                <textarea
                  aria-label="普通配角"
                  rows={5}
                  value={value.supportingCast}
                  onChange={(event) => updateTextField('supportingCast', event)}
                />
              </label>
              <label className="form-field">
                <span className="form-label">地点词池 / 场景元素</span>
                <textarea
                  aria-label="地点词池 / 场景元素"
                  rows={5}
                  value={value.locationPool}
                  onChange={(event) => updateTextField('locationPool', event)}
                />
              </label>
            </div>
          </section>
        </section>

        <section ref={characterEditorRef} aria-label="Character editor column" className="space-y-4">
          <div className="rounded-none border-2 border-black bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="panel-eyebrow">当前角色</p>
                <h3 className="text-xl font-semibold text-black uppercase">
                  {selectedCharacter ? summarizeCharacter(selectedCharacter.character) : '当前没有角色'}
                </h3>
              </div>
              {selectedCharacter && selectedCharacter.group !== 'hero' ? (
                <button type="button" className="secondary-link" onClick={removeSelectedCharacter}>
                  删除
                </button>
              ) : null}
            </div>

            {selectedCharacter ? (
              <div className="space-y-4">
                {CHARACTER_FIELD_GROUPS.map((group) => (
                  <section key={group.label} className="space-y-4">
                    <p className="panel-eyebrow">{group.label}</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {group.fields.map((field) => {
                        if (field.key === 'fatalWeakness' && selectedCharacter.group !== 'antagonists') {
                          return null;
                        }

                        const fieldValue =
                          field.key === 'fatalWeakness'
                            ? selectedCharacter.character.fatalWeakness ?? ''
                            : selectedCharacter.character[field.key];

                        return (
                          <label
                            key={field.key}
                            className={`form-field ${field.textarea ? 'md:col-span-2' : ''}`}
                          >
                            <span className="form-label">{field.label}</span>
                            {field.textarea ? (
                              <textarea
                                aria-label={field.label}
                                rows={field.rows ?? 3}
                                value={fieldValue}
                                onChange={(event) => updateSelectedCharacter(field.key, event.currentTarget.value)}
                              />
                            ) : (
                              <input
                                aria-label={field.label}
                                value={fieldValue}
                                onChange={(event) => updateSelectedCharacter(field.key, event.currentTarget.value)}
                              />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))}

                <div className="panel-actions border-t-2 border-black pt-4">
                  <button type="button" className="secondary-link" onClick={onReset}>
                    重置本页
                  </button>
                  <button type="button" className="primary-link" disabled={isSaving} onClick={onSubmit}>
                    {isSaving ? '保存中...' : '保存本页'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
