import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { listStoryPackageCatalog } from '@/app/story-package-catalog';
import { loadRuntimeStoryPackage } from '@/engine/story-loader';
import { loadPlayRuntimeSessionView } from '@/runtime-sessions/views';
import { resolveActiveStorylineContext } from '@/storylines/substrate';

const loadPlayWorkbenchProps = vi.fn();
const activeStorylineContext = {
  packageName: 'sample-scene',
  repository: {
    version: 1,
    activeStorylineId: 'storyline_main',
    storylinesById: {
      storyline_main: {
        storylineId: 'storyline_main',
        name: 'Main Line',
        status: 'active',
        sourceCheckpointId: null,
        headCheckpointId: null,
        variantId: 'variant_main',
        activeSessionId: 'sess_waiting',
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
    },
    variantsById: {
      variant_main: {
        variantId: 'variant_main',
        workspaceRoot: 'variants/variant_main',
        createdFromStorylineId: null,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
    },
  },
  storyline: {
    storylineId: 'storyline_main',
    headCheckpointId: null,
    variantId: 'variant_main',
    activeSessionId: 'sess_waiting',
  },
  variant: {
    variantId: 'variant_main',
    workspaceRoot: 'variants/variant_main',
  },
  session: null,
  runtimeFile: null,
  authoredRoot: '/tmp/sample-scene/variants/variant_main',
  isLegacyImplicit: false,
} as const;
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

vi.mock('@/storylines/substrate', () => ({
  resolveActiveStorylineContext: vi.fn(async () => activeStorylineContext),
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

    expect(resolveActiveStorylineContext).toHaveBeenCalledWith('sample-scene', {
      forWrite: false,
    });
    expect(loadPlayRuntimeSessionView).toHaveBeenCalledWith('sample-scene', {
      storylineContext: activeStorylineContext,
    });
    expect(loadRuntimeStoryPackage).toHaveBeenCalledWith('sample-scene', {
      authoredRootOverride: activeStorylineContext.authoredRoot,
    });
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
