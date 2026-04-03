import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorldBaseCastSection } from '@/app/edit/sections/WorldBaseCastSection';
import type { WorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';
import type { EditRuntimeContinuityView } from '@/runtime-sessions/views';

const renderWorldSection = vi.hoisted(() => vi.fn());
const renderCharacterSection = vi.hoisted(() => vi.fn());

function stringifySelection(selection: unknown): string {
  if (!selection || typeof selection !== 'object') {
    return 'none';
  }

  const candidate = selection as { group?: string; characterId?: string };
  if (candidate.group === 'hero') {
    return 'hero';
  }

  if (
    (candidate.group === 'coreCast' || candidate.group === 'antagonists') &&
    typeof candidate.characterId === 'string'
  ) {
    return `${candidate.group}:${candidate.characterId}`;
  }

  return 'none';
}

vi.mock('@/app/edit/sections/WorldSection', () => ({
  WorldSection: (props: unknown) => {
    renderWorldSection(props);
    const worldProps = props as {
      selectedLocationDraftId?: string | null;
      onSelectedLocationDraftIdChange?: (nextDraftId: string | null) => void;
    };

    return (
      <div data-testid="world-section-mock">
        <p data-testid="selected-location">{worldProps.selectedLocationDraftId ?? 'none'}</p>
        <button
          type="button"
          onClick={() => worldProps.onSelectedLocationDraftIdChange?.('loc-2')}
        >
          select-location-2
        </button>
      </div>
    );
  },
}));

vi.mock('@/app/edit/sections/CharacterSection', () => ({
  CharacterSection: (props: unknown) => {
    renderCharacterSection(props);
    const characterProps = props as {
      selection?: unknown;
      onSelectionChange?: (nextSelection: unknown) => void;
    };

    return (
      <div data-testid="character-section-mock">
        <p data-testid="selected-character">{stringifySelection(characterProps.selection)}</p>
        <button
          type="button"
          onClick={() =>
            characterProps.onSelectionChange?.({
              group: 'antagonists',
              characterId: 'chr_ant001',
            })
          }
        >
          select-antagonist
        </button>
      </div>
    );
  },
}));

const draftValue: WorldBaseCastDraft = {
  worldBaseSetting: 'World base',
  worldRules: 'No open magic',
  toneBaseline: 'Cold pressure',
  hero: {
    draftId: 'hero-1',
    characterId: 'chr_hero001',
    name: 'Hero',
    identityRole: '',
    lightNovelTrait: '',
    gender: '',
    personality: '',
    age: '',
    occupation: '',
    characterSummary: '',
    capabilityBoundary: '',
    behaviorBoundary: '',
    oocRedLine: '',
    clothing: '',
    propsWeapon: '',
  },
  coreCast: [],
  antagonists: [
    {
      draftId: 'antagonist-1',
      characterId: 'chr_ant001',
      name: 'Antagonist one',
      identityRole: '',
      lightNovelTrait: '',
      gender: '',
      personality: '',
      age: '',
      occupation: '',
      characterSummary: '',
      capabilityBoundary: '',
      behaviorBoundary: '',
      oocRedLine: '',
      clothing: '',
      propsWeapon: '',
      fatalWeakness: '',
    },
  ],
  supportingCast: '',
  locations: [
    {
      draftId: 'loc-1',
      locationId: 'loc_111111',
      name: 'Location one',
      description: '',
      environmentAppearance: '',
      atmosphereDescription: '',
      humanContextDescription: '',
    },
    {
      draftId: 'loc-2',
      locationId: 'loc_222222',
      name: 'Location two',
      description: '',
      environmentAppearance: '',
      atmosphereDescription: '',
      humanContextDescription: '',
    },
  ],
  locationPool: '',
};

const activeContinuityView: EditRuntimeContinuityView = {
  kind: 'active',
  activeSession: {
    sessionId: 'sess_01',
    lifecycle: 'in_progress',
    activeCheckpointId: 'chk_01',
    acceptedBeatCount: 3,
    relationshipStatus: {
      highlightedDeltasText: 'Nagi started trusting Touka.',
      stableBackgroundText: 'Nagi and Touka stay aligned under pressure.',
      source: 'session',
    },
  },
};

function renderSection(
  activeSurface: 'world' | 'character',
  runtimeContinuityView?: EditRuntimeContinuityView,
) {
  return render(
    <WorldBaseCastSection
      packageName="sample-scene"
      activeSurface={activeSurface}
      value={draftValue}
      runtimeContinuityView={runtimeContinuityView}
      onChange={vi.fn()}
      onSubmit={vi.fn()}
      onReset={vi.fn()}
    />,
  );
}

describe('WorldBaseCastSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    renderWorldSection.mockReset();
    renderCharacterSection.mockReset();
  });

  it('renders only the active surface wrapper content', () => {
    const { rerender } = renderSection('world');

    expect(screen.getByRole('heading', { name: '世界' })).toBeInTheDocument();
    expect(screen.getByTestId('world-section-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('character-section-mock')).not.toBeInTheDocument();

    rerender(
      <WorldBaseCastSection
        packageName="sample-scene"
        activeSurface="character"
        value={draftValue}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '角色' })).toBeInTheDocument();
    expect(screen.getByTestId('character-section-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('world-section-mock')).not.toBeInTheDocument();
  });

  it('keeps selected location context when switching surfaces', async () => {
    const user = userEvent.setup();
    const { rerender } = renderSection('world');

    expect(screen.getByTestId('selected-location')).toHaveTextContent('loc-1');
    await user.click(screen.getByRole('button', { name: 'select-location-2' }));

    expect(screen.getByTestId('selected-location')).toHaveTextContent('loc-2');

    rerender(
      <WorldBaseCastSection
        packageName="sample-scene"
        activeSurface="character"
        value={draftValue}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    rerender(
      <WorldBaseCastSection
        packageName="sample-scene"
        activeSurface="world"
        value={draftValue}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByTestId('selected-location')).toHaveTextContent('loc-2');
  });

  it('keeps selected character context when switching surfaces', async () => {
    const user = userEvent.setup();
    const { rerender } = renderSection('character');

    expect(screen.getByTestId('selected-character')).toHaveTextContent('hero');
    await user.click(screen.getByRole('button', { name: 'select-antagonist' }));

    expect(screen.getByTestId('selected-character')).toHaveTextContent(
      'antagonists:chr_ant001',
    );

    rerender(
      <WorldBaseCastSection
        packageName="sample-scene"
        activeSurface="world"
        value={draftValue}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    rerender(
      <WorldBaseCastSection
        packageName="sample-scene"
        activeSurface="character"
        value={draftValue}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByTestId('selected-character')).toHaveTextContent(
      'antagonists:chr_ant001',
    );
  });

  it('passes runtime continuity through to CharacterSection on the character surface', () => {
    renderSection('character', activeContinuityView);

    const characterSectionProps = renderCharacterSection.mock.calls.at(-1)?.[0] as {
      readonly runtimeContinuityView?: EditRuntimeContinuityView;
    };

    expect(characterSectionProps.runtimeContinuityView).toEqual(activeContinuityView);
  });
});
