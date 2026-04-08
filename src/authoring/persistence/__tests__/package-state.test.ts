import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';

import { loadAuthoringState, resolveAuthoringStatePath, writeAuthoringState } from '@/authoring/persistence/package-state';
import { saveSectionDraft } from '@/authoring/persistence/bridge';
import { loadStoryPackage } from '@/engine/story-loader';
import { resolveActiveStorylineContext } from '@/storylines/substrate';
import type { RuntimeSessionsFile, StateSnapshot, StorylineRepositoryFile } from '@/types';

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
const variantAltWorldBasePath = path.resolve(testPackagePath, 'variants/variant_alt/world-base.yaml');
const baselineWorldBasePath = path.resolve(testPackagePath, 'world-base.yaml');
const authoredContractFiles = [
  'world-base.yaml',
  'scene.yaml',
  'phase-plans.yaml',
  'router-lexicon.yaml',
  'audit-questions.yaml',
  'control-modules.yaml',
] as const;

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

function writeStorylineRepositoryFile(file: StorylineRepositoryFile): void {
  writeFileSync(storylineRepositoryPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

function setupVariantWorkspace(variantId: string, worldBaseSetting: string): void {
  const variantRoot = path.resolve(variantsRootPath, variantId);
  mkdirSync(variantRoot, { recursive: true });

  for (const fileName of authoredContractFiles) {
    cpSync(path.resolve(testPackagePath, fileName), path.resolve(variantRoot, fileName));
  }

  const worldBase = YAML.parse(readFileSync(path.resolve(variantRoot, 'world-base.yaml'), 'utf8')) as {
    worldBaseSetting: string;
  };
  worldBase.worldBaseSetting = worldBaseSetting;
  writeFileSync(path.resolve(variantRoot, 'world-base.yaml'), YAML.stringify(worldBase), 'utf8');
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

  it('uses an injected active storyline context to keep authored projection and continuity on the same storyline', async () => {
    prepareTestPackage();
    setupVariantWorkspace('variant_main', 'main-world-setting');
    setupVariantWorkspace('variant_alt', 'alt-world-setting');
    writeRuntimeSessionsFile({
      version: 1,
      activeSessionId: 'sess_main',
      sessionsById: {
        sess_main: {
          sessionId: 'sess_main',
          lifecycle: 'in_progress',
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
          headCheckpointId: 'chk_main',
          activeCheckpointId: 'chk_main',
          orderedCheckpointIds: ['chk_main'],
          checkpointsById: {
            chk_main: {
              checkpointId: 'chk_main',
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_opening',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_main',
              acceptedTranscript: {
                playerInput: 'follow main',
                beatText: 'Main checkpoint',
              },
              stateSnapshot: makeStateSnapshot('Main checkpoint'),
              lastStableRelationshipLayer: {
                highlightedDeltasText: 'main delta',
                stableBackgroundText: 'main background',
              },
              createdAt: '2026-04-06T00:00:00.000Z',
            },
          },
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'main delta',
            stableBackgroundText: 'main background',
          },
        },
        sess_alt: {
          sessionId: 'sess_alt',
          lifecycle: 'in_progress',
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
          headCheckpointId: 'chk_alt',
          activeCheckpointId: 'chk_alt',
          orderedCheckpointIds: ['chk_alt'],
          checkpointsById: {
            chk_alt: {
              checkpointId: 'chk_alt',
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_opening',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_alt',
              acceptedTranscript: {
                playerInput: 'follow alt',
                beatText: 'Alt checkpoint',
              },
              stateSnapshot: makeStateSnapshot('Alt checkpoint'),
              lastStableRelationshipLayer: {
                highlightedDeltasText: 'alt delta',
                stableBackgroundText: 'alt background',
              },
              createdAt: '2026-04-06T00:00:00.000Z',
            },
          },
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'alt delta',
            stableBackgroundText: 'alt background',
          },
        },
      },
    });
    writeStorylineRepositoryFile({
      version: 1,
      activeStorylineId: 'storyline_main',
      storylinesById: {
        storyline_main: {
          storylineId: 'storyline_main',
          name: 'Main Line',
          status: 'active',
          sourceCheckpointId: null,
          headCheckpointId: 'chk_main',
          variantId: 'variant_main',
          activeSessionId: 'sess_main',
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
        },
        storyline_alt: {
          storylineId: 'storyline_alt',
          name: 'Alt Line',
          status: 'active',
          sourceCheckpointId: null,
          headCheckpointId: 'chk_alt',
          variantId: 'variant_alt',
          activeSessionId: 'sess_alt',
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
        variant_alt: {
          variantId: 'variant_alt',
          workspaceRoot: 'variants/variant_alt',
          createdFromStorylineId: null,
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
        },
      },
    });

    const pinnedContext = await resolveActiveStorylineContext(testPackageName, {
      forWrite: false,
    });
    writeStorylineRepositoryFile({
      version: 1,
      activeStorylineId: 'storyline_alt',
      storylinesById: {
        storyline_main: {
          storylineId: 'storyline_main',
          name: 'Main Line',
          status: 'active',
          sourceCheckpointId: null,
          headCheckpointId: 'chk_main',
          variantId: 'variant_main',
          activeSessionId: 'sess_main',
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
        },
        storyline_alt: {
          storylineId: 'storyline_alt',
          name: 'Alt Line',
          status: 'active',
          sourceCheckpointId: null,
          headCheckpointId: 'chk_alt',
          variantId: 'variant_alt',
          activeSessionId: 'sess_alt',
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
        variant_alt: {
          variantId: 'variant_alt',
          workspaceRoot: 'variants/variant_alt',
          createdFromStorylineId: null,
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
        },
      },
    });

    const result = await loadAuthoringState(testPackageName, {
      includeRuntimeContinuity: true,
      storylineContext: pinnedContext,
    });

    expect(existsSync(variantWorldBasePath)).toBe(true);
    expect(existsSync(variantAltWorldBasePath)).toBe(true);
    expect(result.state.worldBase.worldBaseSetting).toBe('main-world-setting');
    expect(result.runtimeContinuityView?.activeSession?.sessionId).toBe('sess_main');
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
      responsibilitySummary: '负责追踪已接受剧情后的角色关系状态，并为后续生成提供连续性摘要。',
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

  it('keeps built-in sidecar cards visible when gossipelog config is missing', async () => {
    prepareTestPackage();
    rmSync(gossipelogConfigPath, { force: true });

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });
    const gossipelogSurface = (result.agentSurfaceItems ?? []).find(
      (item) => item.agentId === 'gossipelog',
    );

    expect(gossipelogSurface?.operationalHint).toBe('warning');
    expect(gossipelogSurface?.latestStateLine).toEqual(expect.any(String));
  });

  it('treats enabled false on gossipelog config as a warning instead of hiding the card', async () => {
    prepareTestPackage();
    writeFileSync(gossipelogConfigPath, 'agentId: gossipelog\nenabled: false\n', 'utf8');

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });
    const gossipelogSurface = (result.agentSurfaceItems ?? []).find(
      (item) => item.agentId === 'gossipelog',
    );

    expect(gossipelogSurface?.operationalHint).toBe('warning');
    expect(gossipelogSurface?.latestStateLine).toEqual(expect.any(String));
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
      statusLine: expect.stringMatching(/relationship state|bootstrap|fallback/i),
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

  it('surfaces pending bootstrap for gossipelog when a weaver import summary exists but relationship state is missing', async () => {
    prepareTestPackage();
    mkdirSync(path.resolve(testPackagePath, 'agents/weaver'), { recursive: true });
    writeFileSync(
      path.resolve(testPackagePath, 'agents/weaver/config.yaml'),
      'agentId: weaver\nenabled: true\n',
      'utf8',
    );
    writeFileSync(
      path.resolve(testPackagePath, 'agents/weaver/import-summary.yaml'),
      YAML.stringify({
        schemaVersion: 1,
        sourceKind: 'text_import',
        lastRunAt: '2026-04-08T00:00:00.000Z',
        suggestedPackageName: 'imported-package',
        sourceSummary: 'import source summary',
        importSummary: 'import summary ready for bootstrap',
        warnings: [],
        unresolvedGaps: [],
        warningCount: 0,
        unresolvedGapCount: 0,
        bootstrapStatus: 'succeeded',
      }),
      'utf8',
    );
    rmSync(gossipelogStatePath, { force: true });

    const result = await loadAuthoringState(testPackageName, {
      includeAgentSurfaceItems: true,
    });
    const gossipelogSurface = (result.agentSurfaceItems ?? []).find(
      (item) => item.agentId === 'gossipelog',
    );

    expect(gossipelogSurface?.operationalHint).toBe('pending_bootstrap');
    expect(gossipelogSurface?.latestStateLine).toEqual(expect.any(String));
  });
});
