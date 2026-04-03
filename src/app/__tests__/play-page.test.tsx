import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { listStoryPackageCatalog } from '@/app/story-package-catalog';
import { loadRuntimeStoryPackage } from '@/engine/story-loader';
import { loadPlayRuntimeSessionView } from '@/runtime-sessions/views';

const loadPlayWorkbenchProps = vi.fn();
const initialRuntimeSessionView = {
  kind: 'awaiting_start',
  activeSessionId: 'sess_waiting',
  activeCheckpointId: null,
  beatHistory: [],
  stateSnapshot: null,
  relationshipSummary: {
    highlightedDeltasText: '',
    stableBackgroundText: '',
    source: 'empty',
  },
  lifecycle: 'awaiting_start',
} as const;

vi.mock('@/app/play/PlayWorkbench', () => ({
  PlayWorkbench: (props: unknown) => {
    loadPlayWorkbenchProps(props);
    return <div data-testid="play-workbench">Play Workbench</div>;
  },
}));

vi.mock('@/app/story-package-catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/story-package-catalog')>();

  return {
    ...actual,
    listStoryPackageCatalog: vi.fn(async () => [
      {
        packageName: 'sample-scene',
        sceneId: 'scene-signal-room',
        sceneName: 'Signal Room',
        mainAxis: 'Track a hostile signal through a sealed campus wing.',
        endLine: 'The source is isolated and the public space returns to calm.',
        phaseCount: 0,
        totalBeatCount: 0,
      },
    ]),
  };
});

vi.mock('@/engine/story-loader', () => ({
  loadRuntimeStoryPackage: vi.fn(async () => ({
    sceneSpec: {
      sceneId: 'scene_opening',
      sceneName: 'Signal Room',
      mainAxis: 'Track a hostile signal through a sealed campus wing.',
      endLine: 'The source is isolated and the public space returns to calm.',
    },
    phasePlans: [],
    routerProfiles: [],
    auditQuestionSet: {
      sceneId: 'scene_opening',
      globalQuestions: [],
      controlQuestions: [],
      phaseSpecificQuestions: {},
      selectionPolicy: {
        default: [],
        phaseOverrides: {},
      },
    },
    controlModules: {
      sceneId: 'scene_opening',
      lightConeCustomization: {
        boundaryGuidance: 'boundary',
        convergenceGuidance: 'convergence',
        phaseSettlementGuidance: 'settlement',
      },
      directorNoteAdditions: {
        beatConstraintsAdditions: 'beat additions',
      },
      beatVolumeDefinitions: {
        Low: {
          beatConstraints: 'low beat',
          optionFormatting: 'low option',
        },
        Med: {
          beatConstraints: 'med beat',
          optionFormatting: 'med option',
        },
        High: {
          beatConstraints: 'high beat',
          optionFormatting: 'high option',
        },
      },
    },
    worldBase: {
      worldBaseSetting: 'world',
      worldRules: 'rules',
      toneBaseline: 'tone',
      hero: {
        characterId: 'hero_01',
        name: 'Hero',
        identityRole: 'Lead',
        lightNovelTrait: 'Calm',
        gender: 'Female',
        personality: 'Cold',
        age: '17',
        occupation: 'Student',
        characterSummary: 'summary',
        capabilityBoundary: 'capability',
        behaviorBoundary: 'behavior',
        oocRedLine: 'red line',
      },
      coreCast: [],
      antagonists: [],
      npcCharacters: 'npc',
      locations: [],
    },
  })),
}));

vi.mock('@/runtime-sessions/views', () => ({
  loadPlayRuntimeSessionView: vi.fn(async () => initialRuntimeSessionView),
}));

describe('PlayPage', () => {
  it('loads the bounded runtime continuity view on the server before rendering the workbench', async () => {
    const { default: PlayPage } = await import('@/app/play/page');

    const element = await PlayPage({
      searchParams: {
        storyPackage: 'sample-scene',
      },
    });

    render(element);

    expect(loadPlayRuntimeSessionView).toHaveBeenCalledWith('sample-scene');
    expect(loadRuntimeStoryPackage).toHaveBeenCalledWith('sample-scene');
    expect(loadPlayWorkbenchProps).toHaveBeenCalledWith(
      expect.objectContaining({
        storyPackageName: 'sample-scene',
        initialRuntimeSession: initialRuntimeSessionView,
      }),
    );
    expect(screen.getByTestId('play-workbench')).toBeInTheDocument();
  });

  it('shows the existing package fallback when no loadable package exists', async () => {
    vi.mocked(listStoryPackageCatalog).mockResolvedValueOnce([]);
    const { default: PlayPage } = await import('@/app/play/page');

    const element = await PlayPage({
      searchParams: {},
    });

    render(element);

    expect(screen.getByRole('heading', { name: 'No loadable story package was found.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Title' })).toHaveAttribute('href', '/');
  });
});
