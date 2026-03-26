import { describe, expect, it } from 'vitest';

import {
  createSaveAppliedWithWarningsResult,
  createSaveBlockedResult,
} from '@/authoring/persistence/save-results';
import type { StoryPackage } from '@/types';

const storyPackageFixture = {
  sceneSpec: {
    sceneId: 'scene-placeholder',
    sceneName: 'placeholder',
    mainAxis: 'placeholder',
    endLine: 'placeholder',
  },
  phasePlans: [],
  routerProfiles: [],
  auditQuestionSet: {
    sceneId: 'scene-placeholder',
    globalQuestions: [],
    controlQuestions: [],
    phaseSpecificQuestions: {},
    selectionPolicy: {
      default: [],
      phaseOverrides: {},
    },
  },
  controlModules: {
    sceneId: 'scene-placeholder',
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
    mainCharacters: 'placeholder',
    npcCharacters: 'placeholder',
    locationPatch: 'placeholder',
  },
} as unknown as StoryPackage;

describe('save-results factories', () => {
  it('preserves base flags when building a warning-style applied result', () => {
    const result = createSaveAppliedWithWarningsResult(
      {
        requestId: 'request-factory',
        packageName: 'sample',
        sectionId: 'worldbase-cast',
        showLocally: false,
        showInGlobalDiagnostics: true,
      },
      storyPackageFixture,
      ['factory warning'],
      ['world-base.yaml'],
    );

    expect(result.showLocally).toBe(false);
    expect(result.showInGlobalDiagnostics).toBe(true);
    expect(result.runtimeImpactSummary.changedFiles).toEqual(['world-base.yaml']);
    expect(result.warnings).toEqual(['factory warning']);
  });

  it('preserves base flags when building a blocked result', () => {
    const result = createSaveBlockedResult(
      {
        requestId: 'request-blocked',
        packageName: 'sample',
        sectionId: 'worldbase-cast',
        showLocally: false,
        showInGlobalDiagnostics: true,
      },
      ['blocked'],
    );

    expect(result.showLocally).toBe(false);
    expect(result.showInGlobalDiagnostics).toBe(true);
    expect(result.blockingIssues).toEqual(['blocked']);
  });
});
