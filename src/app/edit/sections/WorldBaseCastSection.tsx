'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';

import {
  createEmptyWorldBaseCharacterDraft,
  type WorldBaseCastDraft,
  type WorldBaseCharacterDraft,
} from '@/authoring/sections/worldbase-cast';

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
  | { readonly group: 'coreCast'; readonly draftId: string }
  | { readonly group: 'antagonists'; readonly draftId: string };

const WORLD_TEXT_FIELDS: readonly {
  readonly key: TextField;
  readonly label: string;
  readonly description: string;
  readonly rows: number;
}[] = [
  {
    key: 'worldBaseSetting',
    label: 'World Base Setting',
    description: 'Describe the world foundation in one broad block.',
    rows: 4,
  },
  {
    key: 'worldRules',
    label: 'World Rules / Prohibitions / Anomalous Properties',
    description: 'Capture the hard rules, bans, and anomaly behavior here.',
    rows: 5,
  },
  {
    key: 'toneBaseline',
    label: 'Genre Tone & Prose Baseline',
    description: 'Keep the tonal and prose baseline stable across later beats.',
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
    label: 'Current Selection',
    fields: [
      { key: 'name', label: 'Character Name' },
      { key: 'identityRole', label: 'Identity / Narrative Role' },
      { key: 'lightNovelTrait', label: 'Light-Novel Trait', textarea: true, rows: 3 },
      { key: 'gender', label: 'Gender' },
      { key: 'personality', label: 'Personality' },
      { key: 'age', label: 'Age' },
      { key: 'occupation', label: 'Occupation' },
      { key: 'characterSummary', label: 'Character Summary', textarea: true, rows: 4 },
    ],
  },
  {
    label: 'Full Card',
    fields: [
      { key: 'capabilityBoundary', label: 'Capability Boundary', textarea: true, rows: 4 },
      { key: 'behaviorBoundary', label: 'Behavior Boundary', textarea: true, rows: 4 },
      { key: 'oocRedLine', label: 'OOC Red Line', textarea: true, rows: 3 },
      { key: 'clothing', label: 'Clothing', textarea: true, rows: 2 },
      { key: 'propsWeapon', label: 'Props / Weapon', textarea: true, rows: 2 },
      { key: 'fatalWeakness', label: 'Fatal Weakness', textarea: true, rows: 3 },
    ],
  },
] as const;

interface CharacterRailProps {
  readonly title: string;
  readonly subtitle: string;
  readonly cards: readonly WorldBaseCharacterDraft[];
  readonly selection: CharacterSelection;
  readonly onSelect: (draftId: string) => void;
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
  return character.name.trim() || 'Untitled Character';
}

function summarizeSecondaryLine(character: WorldBaseCharacterDraft): string {
  const parts = [character.gender.trim(), character.personality.trim()].filter((value) => value.length > 0);
  return parts.length > 0 ? parts.join(' / ') : 'Gender / Personality';
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
    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-4">
        <p className="panel-eyebrow">{title}</p>
        <p className="panel-note">{subtitle}</p>
      </div>
      <div className="overflow-x-auto pb-3" aria-label={`${title} scrollbar`}>
        <div className="flex min-w-max gap-3">
          {cards.map((character) => {
            const isSelected =
              selection.group !== 'hero' && selection.draftId === character.draftId;

            return (
              <button
                key={character.draftId}
                type="button"
                className={`w-52 shrink-0 rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-slate-50 shadow-md'
                    : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                }`}
                onClick={() => onSelect(character.draftId)}
              >
                <strong className="block text-sm">{summarizeCharacter(character)}</strong>
                <p className={`mt-3 text-sm ${isSelected ? 'text-slate-200' : 'text-slate-700'}`}>
                  {summarizeSecondaryLine(character)}
                </p>
              </button>
            );
          })}

          <button
            type="button"
            className="w-44 shrink-0 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-500"
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

  useEffect(() => {
    if (selection.group === 'hero') {
      return;
    }

    const pool = selection.group === 'coreCast' ? value.coreCast : value.antagonists;
    if (pool.some((character) => character.draftId === selection.draftId)) {
      return;
    }

    setSelection({ group: 'hero' });
  }, [selection, value.antagonists, value.coreCast]);

  const selectedCharacter = useMemo(() => {
    if (selection.group === 'hero') {
      return { character: value.hero, group: 'hero' as const };
    }

    const pool = selection.group === 'coreCast' ? value.coreCast : value.antagonists;
    const character = pool.find((entry) => entry.draftId === selection.draftId) ?? pool[0];

    if (!character) {
      return null;
    }

    return {
      character,
      group: selection.group,
    };
  }, [selection, value.antagonists, value.coreCast, value.hero]);

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
      character.draftId === selectedCharacter.character.draftId
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
    setSelection({ group, draftId: nextCharacter.draftId });
  }

  function removeSelectedCharacter() {
    if (!selectedCharacter || selectedCharacter.group === 'hero') {
      return;
    }

    const targetGroup = selectedCharacter.group;
    const nextCharacters = value[targetGroup].filter(
      (character) => character.draftId !== selectedCharacter.character.draftId,
    );

    onChange({
      ...value,
      [targetGroup]: nextCharacters,
    });

    const fallbackCharacter = nextCharacters[Math.max(0, nextCharacters.length - 1)];
    if (fallbackCharacter) {
      setSelection({ group: targetGroup, draftId: fallbackCharacter.draftId });
      return;
    }

    setSelection({ group: 'hero' });
  }

  return (
    <section className="panel worldbase-cast">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Section Slice</p>
          <h2>WorldBase & Cast</h2>
          <p className="panel-note">
            Mixed authoring for world text blocks, summary rails, and one focused character editor.
          </p>
        </div>
        <p className="panel-note">{packageName}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.9fr)]">
        <div className="max-h-[72vh] space-y-6 overflow-y-auto pr-2">
          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="mb-4">
              <p className="panel-eyebrow">World Base</p>
              <h3 className="text-xl font-semibold text-slate-900">World Blocks</h3>
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

          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="mb-4">
              <p className="panel-eyebrow">Hero</p>
              <p className="panel-note">One fixed hero card, edited on the right.</p>
            </div>
            <button
              type="button"
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selection.group === 'hero'
                  ? 'border-slate-900 bg-slate-900 text-slate-50 shadow-md'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
              }`}
              onClick={() => setSelection({ group: 'hero' })}
              aria-label={`Hero ${summarizeCharacter(value.hero)}`}
            >
              <strong className="block text-sm">{summarizeCharacter(value.hero)}</strong>
              <p className={`mt-3 text-sm ${selection.group === 'hero' ? 'text-slate-200' : 'text-slate-700'}`}>
                {summarizeSecondaryLine(value.hero)}
              </p>
            </button>
          </section>

          <CharacterRail
            title="Core Cast"
            subtitle="Summary cards only. The full card opens on the right."
            cards={value.coreCast}
            selection={selection}
            onSelect={(draftId) => setSelection({ group: 'coreCast', draftId })}
            onAdd={() => addCharacter('coreCast')}
            addLabel="Add Core Cast Character"
          />

          <CharacterRail
            title="Antagonists"
            subtitle="Summary cards only. The full card opens on the right."
            cards={value.antagonists}
            selection={selection}
            onSelect={(draftId) => setSelection({ group: 'antagonists', draftId })}
            onAdd={() => addCharacter('antagonists')}
            addLabel="Add Antagonist Character"
          />

          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="mb-4">
              <p className="panel-eyebrow">Loose Blocks</p>
              <h3 className="text-xl font-semibold text-slate-900">Supporting Cast &amp; Locations</h3>
            </div>
            <div className="space-y-4">
              <label className="form-field">
                <span className="form-label">Ordinary Supporting Cast</span>
                <textarea
                  aria-label="Ordinary Supporting Cast"
                  rows={5}
                  value={value.supportingCast}
                  onChange={(event) => updateTextField('supportingCast', event)}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Location Pool / Scene Elements</span>
                <textarea
                  aria-label="Location Pool / Scene Elements"
                  rows={5}
                  value={value.locationPool}
                  onChange={(event) => updateTextField('locationPool', event)}
                />
              </label>
            </div>
          </section>
        </div>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="panel-eyebrow">Selected Character Editor</p>
                <h3 className="text-xl font-semibold text-slate-900">
                  {selectedCharacter ? summarizeCharacter(selectedCharacter.character) : 'No character selected'}
                </h3>
              </div>
              {selectedCharacter && selectedCharacter.group !== 'hero' ? (
                <button type="button" className="secondary-link" onClick={removeSelectedCharacter}>
                  Remove
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

                <div className="panel-actions border-t border-slate-100 pt-4">
                  <button type="button" className="secondary-link" onClick={onReset}>
                    Reset Section
                  </button>
                  <button type="button" className="primary-link" disabled={isSaving} onClick={onSubmit}>
                    {isSaving ? 'Saving...' : 'Save Section'}
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
