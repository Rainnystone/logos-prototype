import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';

import { loadAuthoringState, resolveAuthoringStatePath, writeAuthoringState } from '@/authoring/persistence/package-state';
import { saveSectionDraft } from '@/authoring/persistence/bridge';
import { loadStoryPackage } from '@/engine/story-loader';
import type { RuntimeSessionsFile, StateSnapshot } from '@/types';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const sourcePackageName = 'sample-scene';
const testPackageName = '__authoring-state-test__';
const testPackagePath = path.resolve(storyPackagesRoot, testPackageName);
const gossipelogConfigPath = path.resolve(testPackagePath, 'agents/gossipelog/config.yaml');
const gossipelogStatePath = path.resolve(
  testPackagePath,
  'agents/gossipelog/character-relationships.yaml',
);
const runtimeSessionsPath = path.resolve(testPackagePath, 'runtime-sessions.json');
const storylineRepositoryPath = path.resolve(testPackagePath, 'storyline-repository.json');
const variantsRootPath = path.resolve(testPackagePath, 'variants');
const variantWorldBasePath = path.resolve(testPackagePath, 'variants/variant_main/world-base.yaml');
const baselineWorldBasePath = path.resolve(testPackagePath, 'world-base.yaml');

function resetTestPackage(): void {
  rmSync(testPackagePath, { recursive: true, force: true });
}

function prepareTestPackage(): void {
  resetTestPackage();
  cpSync(path.resolve(storyPackagesRoot, sourcePackageName), testPackagePath, {
    recursive: true,
  });
}

function makeStateSnapshot(beatText: string): StateSnapshot {
  return {
    sceneState: {
      sceneId: 'scene_opening',
      currentPhaseIndex: 1,
      currentBeatIndexInPhase: 1,
      mainAxis: 'main-axis',
      endLine: 'end-line',
      alpha: 'alpha',
      beta: 'beta',
      sceneProgress: beatText,
      phaseConsequences: [],
    },
    roundState: {
      phaseGoal: 'phase-goal',
      currentVolume: 'Med',
      currentRouter: 'router',
      verbLexicon: ['observe'],
      historyWindow: [],
      directorConstraints: '',
    },
    generationState: {
      directorNoteSummary: 'director summary',
      promptObject: {},
      currentBeatText: beatText,
      currentOptions: [],
    },
    evaluationState: {
      auditAnswers: [],
      blockingFailures: [],
      retryCount: 0,
      rewriteFeedback: null,
    },
  };
}

function writeRuntimeSessionsFile(file: RuntimeSessionsFile): void {
  writeFileSync(runtimeSessionsPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

afterEach(() => {
  resetTestPackage();
});

describe('loadAuthoringState', () => {
  it('does not eagerly load sidecar-agent items unless diagnostics explicitly requests them', async () => {
    prepareTestPackage();

    const result = await loadAuthoringState(testPackageName);

    expect(result.agentSurfaceItems).toBeUndefined();
  });

  it('prefers the latest saved package state when the authoring marker records a successful save', async () => {
    prepareTestPackage();
    const sourcePackage = await loadStoryPackage(sourcePackageName);

    await writeAuthoringState(testPackageName, {
      hasSuccessfulSave: true,
      lastSavedAt: '2026-03-25T14:30:00.000Z',
      lastEditedSection: 'worldbase-cast',
    });

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });

    expect(result.source).toBe('latest-saved');
    expect(result.state.sceneSpec.sceneId).toBe(sourcePackage.sceneSpec.sceneId);
    expect(path.resolve(resolveAuthoringStatePath(testPackageName))).toBe(
      path.resolve(testPackagePath, 'authoring-state.json'),
    );
  });

  it('falls back to the initial sample when no successful save has been recorded', async () => {
    prepareTestPackage();
    rmSync(path.resolve(testPackagePath, 'authoring-state.json'), { force: true });
    const sourcePackage = await loadStoryPackage(sourcePackageName);

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });

    expect(result.source).toBe('initial-sample');
    expect(result.state.sceneSpec.sceneName).toBe(sourcePackage.sceneSpec.sceneName);
  });

  it('reopens from the latest saved state after one successful section submit', async () => {
    prepareTestPackage();

    const saveResult = await saveSectionDraft({
      requestId: 'request-reopen-after-save',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          worldBaseSetting: 'reopened-world-base-setting',
        },
      },
    });

    expect(saveResult.kind).toBe('save_applied');

    const reopened = await loadAuthoringState(testPackageName);

    expect(reopened.source).toBe('latest-saved');
    expect(reopened.state.worldBase.worldBaseSetting).toBe('reopened-world-base-setting');
  });

  it('keeps legacy read-only load on package-root baseline without materializing storyline files', async () => {
    prepareTestPackage();
    const baselineWorldBase = YAML.parse(readFileSync(baselineWorldBasePath, 'utf8')) as {
      worldBaseSetting: string;
    };

    const loaded = await loadAuthoringState(testPackageName);

    expect(loaded.state.worldBase.worldBaseSetting).toBe(baselineWorldBase.worldBaseSetting);
    expect(existsSync(storylineRepositoryPath)).toBe(false);
    expect(existsSync(variantsRootPath)).toBe(false);
  });

  it('loads from active storyline variant workspace after first save bootstraps storyline substrate', async () => {
    prepareTestPackage();
    const baselineWorldBaseBeforeSave = YAML.parse(readFileSync(baselineWorldBasePath, 'utf8')) as {
      worldBaseSetting: string;
    };

    const saveResult = await saveSectionDraft({
      requestId: 'request-bootstrap-variant-load',
      source: 'page',
      packageName: testPackageName,
      sectionId: 'worldbase-cast',
      payload: {
        uiFields: {
          worldBaseSetting: 'variant-world-setting',
        },
      },
    });

    expect(saveResult.kind).toBe('save_applied');
    expect(existsSync(storylineRepositoryPath)).toBe(true);
    expect(existsSync(variantWorldBasePath)).toBe(true);

    const reopened = await loadAuthoringState(testPackageName);
    const baselineWorldBaseAfterSave = YAML.parse(readFileSync(baselineWorldBasePath, 'utf8')) as {
      worldBaseSetting: string;
    };

    expect(reopened.state.worldBase.worldBaseSetting).toBe('variant-world-setting');
    expect(baselineWorldBaseAfterSave.worldBaseSetting).toBe(
      baselineWorldBaseBeforeSave.worldBaseSetting,
    );
  });

  it('keeps the authoring marker tiny and readable when it is written directly', async () => {
    prepareTestPackage();

    await writeAuthoringState(testPackageName, {
      hasSuccessfulSave: true,
      lastSavedAt: '2026-03-25T14:30:00.000Z',
      lastEditedSection: 'worldbase-cast',
    });

    const rawContents = await import('node:fs/promises').then(({ readFile }) =>
      readFile(path.resolve(testPackagePath, 'authoring-state.json'), 'utf8'),
    );

    expect(rawContents).toContain('"hasSuccessfulSave": true');
    expect(rawContents).not.toContain('lastSavedRequestId');
  });

  it('round-trips pending section review flags through the authoring marker', async () => {
    prepareTestPackage();

    await writeAuthoringState(
      testPackageName,
      {
        hasSuccessfulSave: true,
        lastSavedAt: '2026-03-25T14:30:00.000Z',
        lastEditedSection: 'worldbase-cast',
        pendingSectionReviews: {
          'scene-phase-authoring': ['worldbase-cast'],
          'control-modules': ['worldbase-cast', 'scene-phase-authoring'],
        },
      } as never,
    );

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });

    expect(result.authoringState?.pendingSectionReviews).toEqual({
      'scene-phase-authoring': ['worldbase-cast'],
      'control-modules': ['worldbase-cast', 'scene-phase-authoring'],
    });
  });

  it('returns a bounded runtime continuity projection only when explicitly requested', async () => {
    prepareTestPackage();
    writeRuntimeSessionsFile({
      version: 1,
      activeSessionId: 'sess_01',
      sessionsById: {
        sess_01: {
          sessionId: 'sess_01',
          lifecycle: 'in_progress',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:05.000Z',
          headCheckpointId: 'chk_01',
          activeCheckpointId: 'chk_01',
          orderedCheckpointIds: ['chk_01'],
          checkpointsById: {
            chk_01: {
              checkpointId: 'chk_01',
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_opening',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_01',
              acceptedTranscript: {
                playerInput: 'open the door',
                beatText: 'The door swings open.',
              },
              stateSnapshot: makeStateSnapshot('The door swings open.'),
              lastStableRelationshipLayer: {
                highlightedDeltasText: 'checkpoint delta',
                stableBackgroundText: 'checkpoint background',
              },
              createdAt: '2026-04-03T00:00:01.000Z',
            },
          },
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'session delta',
            stableBackgroundText: 'session background',
          },
        },
      },
    });

    const withoutRuntimeContinuity = await loadAuthoringState(testPackageName);
    const withRuntimeContinuity = await loadAuthoringState(testPackageName, {
      includeRuntimeContinuity: true,
    });

    expect(withoutRuntimeContinuity.runtimeContinuityView).toBeUndefined();
    expect(withRuntimeContinuity.runtimeContinuityView?.activeSession?.relationshipStatus).toBeDefined();
    expect(JSON.stringify(withRuntimeContinuity.runtimeContinuityView)).not.toContain('checkpointsById');
    expect(JSON.stringify(withRuntimeContinuity.runtimeContinuityView)).not.toContain(
      'acceptedTranscript',
    );
  });

  it('loads bounded sidecar-agent surface items together with the package payload', async () => {
    prepareTestPackage();

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });
    const gossipelogSurface = (result.agentSurfaceItems ?? []).find(
      (item) => item.agentId === 'gossipelog',
    );

    expect(gossipelogSurface).toMatchObject({
      agentId: 'gossipelog',
      displayName: 'gossipelog agent',
      responsibilitySummary: expect.stringMatching(/relationship/i),
      packageConfigPath: 'agents/gossipelog/config.yaml',
      packageStatePath: 'agents/gossipelog/character-relationships.yaml',
      latestStateSummary: expect.objectContaining({
        statePresence: 'present',
        statusLine: expect.stringMatching(/relationship/i),
      }),
    });
    expect(gossipelogSurface?.latestStateSummary.lastUpdatedAt).toEqual(expect.any(String));
    expect(gossipelogSurface?.latestStateSummary.statusLine).not.toContain('relationshipsBySource');
  });

  it('hides sidecar-agent cards when the package has no matching sidecar config', async () => {
    prepareTestPackage();
    rmSync(gossipelogConfigPath, { force: true });

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });

    expect(result.agentSurfaceItems ?? []).toHaveLength(0);
  });

  it('hides sidecar-agent cards when the sidecar config is explicitly disabled', async () => {
    prepareTestPackage();
    writeFileSync(gossipelogConfigPath, 'agentId: gossipelog\nenabled: false\n', 'utf8');

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });

    expect(result.agentSurfaceItems ?? []).toHaveLength(0);
  });

  it('reports missing sidecar state when sidecar config is enabled but state file is absent', async () => {
    prepareTestPackage();
    writeFileSync(gossipelogConfigPath, 'agentId: gossipelog\nenabled: true\n', 'utf8');
    rmSync(gossipelogStatePath, { force: true });

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });
    const gossipelogSurface = (result.agentSurfaceItems ?? []).find(
      (item) => item.agentId === 'gossipelog',
    );

    expect(gossipelogSurface?.latestStateSummary).toMatchObject({
      statePresence: 'missing',
      statusLine: expect.stringMatching(/missing/i),
    });
    expect(gossipelogSurface?.latestStateSummary.lastUpdatedAt).toBeUndefined();
  });

  it('reports unreadable sidecar state when the state path cannot be read as a file', async () => {
    prepareTestPackage();
    writeFileSync(gossipelogConfigPath, 'agentId: gossipelog\nenabled: true\n', 'utf8');
    rmSync(gossipelogStatePath, { force: true });
    mkdirSync(gossipelogStatePath, { recursive: true });

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });
    const gossipelogSurface = (result.agentSurfaceItems ?? []).find(
      (item) => item.agentId === 'gossipelog',
    );

    expect(gossipelogSurface?.latestStateSummary).toMatchObject({
      statePresence: 'unreadable',
      statusLine: expect.stringMatching(/bounded summary/i),
    });
    expect(gossipelogSurface?.latestStateSummary.lastUpdatedAt).toEqual(expect.any(String));
  });

  it('shows sidecar-agent card as unreadable when config exists but cannot be parsed safely', async () => {
    prepareTestPackage();
    writeFileSync(gossipelogConfigPath, 'enabled: [this is not valid yaml', 'utf8');

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });
    const gossipelogSurface = (result.agentSurfaceItems ?? []).find(
      (item) => item.agentId === 'gossipelog',
    );

    expect(gossipelogSurface?.latestStateSummary).toMatchObject({
      statePresence: 'unreadable',
      statusLine: expect.stringMatching(/config/i),
    });
  });
});
