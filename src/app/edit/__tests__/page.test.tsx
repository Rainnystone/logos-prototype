import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { listStoryPackageCatalog } from '@/app/story-package-catalog';

const loadAuthoringState = vi.fn(async () => ({
  source: 'latest-saved' as const,
  state: {
    sceneSpec: {
      sceneId: 'scene-signal-room',
      sceneName: 'Signal Room',
      mainAxis: 'Track a hostile signal through a sealed campus wing.',
      endLine: 'The source is isolated and the public space returns to calm.',
    },
    phasePlans: [],
    routerProfiles: [],
    auditQuestionSet: {
      sceneId: 'scene-signal-room',
      globalQuestions: [],
      controlQuestions: [],
      phaseSpecificQuestions: {},
      selectionPolicy: {
        default: [],
        phaseOverrides: {},
      },
    },
    controlModules: {
      sceneId: 'scene-signal-room',
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
      mainCharacters: 'An operator who keeps a calm surface under pressure.',
      npcCharacters: 'A nearby witness who should stay outside the real danger.',
      locationPatch: 'A sealed corridor with old lights, cameras, and echoing vents.',
    },
  },
}));

vi.mock('@/authoring/persistence/package-state', () => ({
  loadAuthoringState,
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

describe('EditPage', () => {
  it('loads the selected package and opens the requested editor section', async () => {
    const { default: EditPage } = await import('@/app/edit/page');

    const element = await EditPage({
      searchParams: {
        storyPackage: 'sample-scene',
        section: 'control-modules',
      },
    });

    render(element);

    expect(loadAuthoringState).toHaveBeenCalledWith('sample-scene');
    expect(screen.getByRole('heading', { name: 'LOGOS Narrative Editor' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'LOGOS Authoring Editor' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '世界与角色' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=worldbase-cast',
    );
    expect(screen.getByRole('link', { name: '场景与阶段' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=scene-phase-authoring',
    );
    expect(screen.getByRole('link', { name: '控制模块' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=control-modules',
    );
    expect(screen.getByRole('link', { name: '控制台' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=package-wiring-validation',
    );
    expect(screen.getByRole('link', { name: '打开场景' })).toHaveAttribute(
      'href',
      '/play?storyPackage=sample-scene',
    );
    expect(screen.getByRole('link', { name: '返回标题' })).toHaveAttribute('href', '/');
  });

  it('shows the Chinese fallback copy when no loadable package exists', async () => {
    vi.mocked(listStoryPackageCatalog).mockResolvedValueOnce([]);
    const { default: EditPage } = await import('@/app/edit/page');

    const element = await EditPage({
      searchParams: {},
    });

    render(element);

    expect(screen.getByRole('heading', { name: '未找到可加载的故事包。' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回标题' })).toHaveAttribute('href', '/');
  });

  it('shows the Chinese load-failure copy when the package cannot be loaded', async () => {
    loadAuthoringState.mockRejectedValueOnce(new Error('load failed'));
    const { default: EditPage } = await import('@/app/edit/page');

    const element = await EditPage({
      searchParams: {
        storyPackage: 'sample-scene',
      },
    });

    render(element);

    expect(screen.getByRole('heading', { name: '故事包加载失败' })).toBeInTheDocument();
    expect(screen.getByText('加载失败：load failed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回标题' })).toHaveAttribute('href', '/');
  });
});
