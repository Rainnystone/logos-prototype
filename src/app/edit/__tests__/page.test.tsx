import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
        optionConstraintsAdditions: 'option additions',
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
    expect(screen.getByRole('link', { name: 'Control Modules' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=control-modules',
    );
    expect(screen.getByRole('link', { name: 'Open Scene' })).toHaveAttribute(
      'href',
      '/play?storyPackage=sample-scene',
    );
  });
});
