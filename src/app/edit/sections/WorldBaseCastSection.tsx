'use client';

import { useEffect, useState } from 'react';

import type { WorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';
import { type WorldbaseSurface } from '@/app/edit/shared/SectionTabs';
import { CharacterSection, type CharacterSelection } from '@/app/edit/sections/CharacterSection';
import { WorldSection } from '@/app/edit/sections/WorldSection';

interface WorldBaseCastSectionProps {
  readonly packageName: string;
  readonly activeSurface?: WorldbaseSurface;
  readonly value: WorldBaseCastDraft;
  readonly onChange: (nextValue: WorldBaseCastDraft) => void;
  readonly onSubmit: () => void;
  readonly onReset: () => void;
  readonly statusMessage?: string | undefined;
  readonly isSaving?: boolean;
}

export function WorldBaseCastSection({
  packageName,
  activeSurface = 'world',
  value,
  onChange,
  onSubmit,
  onReset,
  isSaving = false,
}: WorldBaseCastSectionProps) {
  const [selectedLocationDraftId, setSelectedLocationDraftId] = useState<string | null>(
    value.locations[0]?.draftId ?? null,
  );
  const [characterSelection, setCharacterSelection] = useState<CharacterSelection>({
    group: 'hero',
  });

  useEffect(() => {
    if (value.locations.length === 0) {
      setSelectedLocationDraftId(null);
      return;
    }

    if (
      selectedLocationDraftId &&
      value.locations.some((location) => location.draftId === selectedLocationDraftId)
    ) {
      return;
    }

    setSelectedLocationDraftId(value.locations[0]?.draftId ?? null);
  }, [selectedLocationDraftId, value.locations]);

  useEffect(() => {
    if (characterSelection.group === 'hero') {
      return;
    }

    const selectedPool =
      characterSelection.group === 'coreCast' ? value.coreCast : value.antagonists;

    if (
      selectedPool.some((character) => character.characterId === characterSelection.characterId)
    ) {
      return;
    }

    setCharacterSelection({ group: 'hero' });
  }, [characterSelection, value.antagonists, value.coreCast]);

  const panelCopy =
    activeSurface === 'world'
      ? {
          title: '世界',
          description: '编辑世界文本、普通配角和结构化地点。',
        }
      : {
          title: '角色',
          description: '编辑主角、核心角色、反派和关系区。',
        };

  return (
    <section className="panel worldbase-cast">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">当前页</p>
          <h2>{panelCopy.title}</h2>
          <p className="panel-note">{panelCopy.description}</p>
        </div>
        <p className="panel-note">{packageName}</p>
      </div>

      {activeSurface === 'world' ? (
        <WorldSection
          packageName={packageName}
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          onReset={onReset}
          selectedLocationDraftId={selectedLocationDraftId}
          onSelectedLocationDraftIdChange={setSelectedLocationDraftId}
          isSaving={isSaving}
        />
      ) : (
        <CharacterSection
          packageName={packageName}
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          onReset={onReset}
          selection={characterSelection}
          onSelectionChange={setCharacterSelection}
          isSaving={isSaving}
        />
      )}
    </section>
  );
}
