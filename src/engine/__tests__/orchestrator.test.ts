import { cpSync, rmSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import * as gossipelogRepository from '@/agents/gossipelog/repository';
import { validateStateSnapshot } from '@/engine/schema-validator';
import {
  createOrchestrator,
  type EnsureActiveSessionResult,
  type OrchestratorRestoreInput,
  type RuntimeSessionStore,
} from '@/engine/orchestrator';
import * as phaseGradientModule from '@/engine/modules/phase-gradient';
import * as directorNoteModule from '@/engine/modules/director-note-layer';
import * as promptAssemblerModule from '@/engine/modules/prompt-assembler';
import { loadStoryPackage } from '@/engine/story-loader';
import {
  createRecordingAdapter,
  storyPackageFixture,
} from '@/engine/__tests__/fixtures/audit-loop-fixtures';
import type {
  FinalizeRelationshipLayerInput,
  RecordAcceptedBeatInput,
} from '@/runtime-sessions/repository';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import type {
  GossipelogInjectionResult,
  GossipelogUpdateResult,
  HistoryEntry,
  StoryPackage,
} from '@/types';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const samplePackagePath = path.resolve(storyPackagesRoot, 'sample-scene');
const tempPackagePaths: string[] = [];

function createNodeOrchestrator(
  config: Parameters<typeof createOrchestrator>[0],
): ReturnType<typeof createOrchestrator> {
  return createOrchestrator({
    ...config,
    gossipelogCycleRunner: runGossipelogCycle,
  });
}

function createRelationshipLayer(label: string): GossipelogInjectionResult {
  return {
    highlightedDeltasText: `${label} delta`,
    stableBackgroundText: `${label} background`,
  };
}

type RuntimeSessionStoreSpy = RuntimeSessionStore & {
  ensureActiveSession: Mock<() => Promise<EnsureActiveSessionResult>>;
  recordAcceptedBeat: Mock<(input: RecordAcceptedBeatInput) => Promise<void>>;
  finalizeRelationshipLayer: Mock<(input: FinalizeRelationshipLayerInput) => Promise<void>>;
};

function createRuntimeSessionStoreSpy(
  overrides: Partial<RuntimeSessionStoreSpy> = {},
): RuntimeSessionStoreSpy {
  const ensureActiveSession: Mock<() => Promise<EnsureActiveSessionResult>> = vi.fn(async () => ({
    activeSessionId: 'sess_active',
  }));
  const recordAcceptedBeat: Mock<(input: RecordAcceptedBeatInput) => Promise<void>> = vi.fn(
    async (_input) => undefined,
  );
  const finalizeRelationshipLayer: Mock<
    (input: FinalizeRelationshipLayerInput) => Promise<void>
  > = vi.fn(async (_input) => undefined);

  return {
    ensureActiveSession,
    recordAcceptedBeat,
    finalizeRelationshipLayer,
    ...overrides,
  };
}

async function runSceneToCompletion(orchestrator: ReturnType<typeof createOrchestrator>) {
  for (let index = 1; index <= 8; index += 1) {
    await orchestrator.runBeat(`player-choice-${index}`);
  }
}

function buildAcceptedHistoryFromInputs(playerInputs: readonly string[]): HistoryEntry[] {
  return playerInputs.flatMap((playerInput, index) => [
    { role: 'user' as const, content: playerInput },
    { role: 'assistant' as const, content: `beat-${index + 1}` },
  ]);
}

const structuredStoryPackageFixture: StoryPackage = {
  ...storyPackageFixture,
  worldBase: {
    worldBaseSetting: 'world-setting',
    worldRules: 'world-rules',
    toneBaseline: 'tone-baseline',
    hero: {
      characterId: 'chr_hero01',
      name: 'Hero One',
      identityRole: 'Lead breaker',
      lightNovelTrait: 'Calm pressure.',
      gender: 'Female',
      personality: 'Reserved',
      age: '16',
      occupation: 'Student',
      characterSummary: 'Primary viewpoint character.',
      capabilityBoundary: 'Uses only physical action.',
      behaviorBoundary: 'Never panics under pressure.',
      oocRedLine: 'Never becomes hesitant.',
      clothing: 'School uniform',
      propsWeapon: 'Flashlight',
    },
    coreCast: [
      {
        characterId: 'chr_core01',
        name: 'Core One',
        identityRole: 'Support anchor',
        lightNovelTrait: 'Steady contrast.',
        gender: 'Male',
        personality: 'Steady',
        age: '17',
        occupation: 'Student',
        characterSummary: 'Core support.',
        capabilityBoundary: 'Stays in mundane space.',
        behaviorBoundary: 'Avoids direct danger.',
        oocRedLine: 'Never identifies the anomaly.',
        clothing: 'School uniform',
        propsWeapon: 'Notebook',
      },
    ],
    antagonists: [],
    npcCharacters: 'Support One - steady witness',
    locations: [],
    locationPatch: 'location-patch',
  },
};

describe('Orchestrator', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();

    while (tempPackagePaths.length > 0) {
      const packagePath = tempPackagePaths.pop();

      if (packagePath) {
        rmSync(packagePath, { recursive: true, force: true });
      }
    }
  });

  async function createTempStoryPackageFixture(): Promise<{
    readonly packageName: string;
    readonly storyPackage: StoryPackage;
  }> {
    const packageName = `tmp-gossipelog-orchestrator-${Math.random().toString(16).slice(2)}`;
    const packagePath = path.resolve(storyPackagesRoot, packageName);

    tempPackagePaths.push(packagePath);
    cpSync(samplePackagePath, packagePath, { recursive: true });

    return {
      packageName,
      storyPackage: await loadStoryPackage(packageName),
    };
  }

  it('initializes the scene and infers initial boundaries', async () => {
    const { adapter, collapseCalls } = createRecordingAdapter({
      collapseResponses: [
        {
          alpha: 'alpha-init',
          beta: 'beta-init',
          inferenceTrace: 'collapse-trace',
        },
      ],
    });
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
    });

    const state = await orchestrator.initScene();

    expect(collapseCalls).toHaveLength(1);
    expect(state.sceneState.alpha).toBe('alpha-init');
    expect(state.sceneState.beta).toBe('beta-init');
    expect(state.roundState.directorConstraints).toContain('phase-one-note');
    expect(state.roundState.directorConstraints).toContain('correct answer must be YES');
    expect(validateStateSnapshot(state)).toEqual(state);
  });

  it('runs a beat generation cycle in the expected module order and accepts on audit pass', async () => {
    const { adapter, generateCalls, auditCalls, routeCalls } = createRecordingAdapter();
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
    });
    const callOrder: string[] = [];
    const originalBuildVolumeSequence = phaseGradientModule.buildVolumeSequence;
    const originalBuildDirectorNote = directorNoteModule.buildDirectorNote;
    const originalAssemblePromptObject = promptAssemblerModule.assemblePromptObject;

    await orchestrator.initScene();

    vi.spyOn(phaseGradientModule, 'buildVolumeSequence').mockImplementation((...args) => {
      callOrder.push('gradient');
      return originalBuildVolumeSequence(...args);
    });
    vi.spyOn(directorNoteModule, 'buildDirectorNote').mockImplementation((...args) => {
      callOrder.push('director');
      return originalBuildDirectorNote(...args);
    });
    vi.spyOn(promptAssemblerModule, 'assemblePromptObject').mockImplementation((...args) => {
      callOrder.push('assemble');
      return originalAssemblePromptObject(...args);
    });

    const { beatResult, state } = await orchestrator.runBeat('player-choice-1');

    expect(routeCalls).toHaveLength(3);
    expect(callOrder.slice(0, 3)).toEqual(['gradient', 'director', 'assemble']);
    expect(generateCalls).toHaveLength(1);
    expect(auditCalls).toHaveLength(1);
    expect(beatResult.auditPassed).toBe(true);
    expect(beatResult.forceAccepted).toBe(false);
    expect(state.sceneState.currentBeatIndexInPhase).toBe(2);
    expect(state.generationState.currentBeatText).toBe('beat-1');
    expect(state.generationState.directorNoteSummary).toBe('Volume=Low | BeatRules=Active | OptionRules=Active');
    expect(generateCalls[0]?.directorNote.router).toBe(state.roundState.currentRouter);
    expect(generateCalls[0]?.directorNote.verbLexicon).toEqual(state.roundState.verbLexicon);
    expect(generateCalls[0]?.worldBase.mainCharacters).toContain('Name: Hero One');
    expect(generateCalls[0]?.worldBase.npcCharacters).toBe('Support One：steady witness');
  });

  it('retries with generationControl when audit fails before eventually passing', async () => {
    const { adapter, generateCalls } = createRecordingAdapter({
      generateResults: [
        {
          beatText: 'failed-beat',
          options: ['a', 'b', 'c', 'd'],
        },
        {
          beatText: 'rewritten-beat',
          options: ['e', 'f', 'g', 'h'],
        },
      ],
      auditResults: [
        {
          answers: [false, true],
        },
        {
          answers: [true, true],
        },
      ],
    });
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
    });
    const rewriteSpy = vi.spyOn(promptAssemblerModule, 'assembleRewritePromptObject');

    await orchestrator.initScene();

    const { beatResult, state } = await orchestrator.runBeat('player-choice-1');

    expect(generateCalls).toHaveLength(2);
    expect(rewriteSpy).toHaveBeenCalledTimes(1);
    expect(generateCalls[1]?.generationControl?.rewriteFeedback).toContain(
      'Does the generated beat remain inside the required boundary?',
    );
    expect(generateCalls[1]?.generationControl?.rewriteFeedback).toContain('Correct answer: YES');
    expect(generateCalls[1]?.generationControl?.rewriteFeedback).toContain(
      'Your last draft implied: NO',
    );
    expect(beatResult.retryCount).toBe(1);
    expect(beatResult.auditPassed).toBe(true);
    expect(state.generationState.currentBeatText).toBe('rewritten-beat');
    expect(state.evaluationState.retryCount).toBe(1);
  });

  it('force-accepts after three failed rewrites', async () => {
    const { adapter, generateCalls } = createRecordingAdapter({
      generateResults: [
        { beatText: 'draft-1', options: ['a', 'b', 'c', 'd'] },
        { beatText: 'draft-2', options: ['a', 'b', 'c', 'd'] },
        { beatText: 'draft-3', options: ['a', 'b', 'c', 'd'] },
        { beatText: 'draft-4', options: ['a', 'b', 'c', 'd'] },
      ],
      auditResults: [
        { answers: [false, true] },
        { answers: [false, true] },
        { answers: [false, true] },
        { answers: [false, true] },
      ],
    });
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
    });

    await orchestrator.initScene();

    const { beatResult, state } = await orchestrator.runBeat('player-choice-1');

    expect(generateCalls).toHaveLength(4);
    expect(beatResult.forceAccepted).toBe(true);
    expect(beatResult.retryCount).toBe(3);
    expect(state.evaluationState.retryCount).toBe(3);
  });

  it('triggers phase-end settlement and boundary collapse after the fourth accepted beat', async () => {
    const { adapter, settlementCalls, collapseCalls } = createRecordingAdapter({
      collapseResponses: [
        {
          alpha: 'alpha-init',
          beta: 'beta-init',
          inferenceTrace: 'init-trace',
        },
        {
          alpha: 'alpha-phase-2',
          beta: 'beta-phase-2',
          inferenceTrace: 'phase-end-trace',
        },
      ],
    });
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
    });

    await orchestrator.initScene();
    await orchestrator.runBeat('player-choice-1');
    await orchestrator.runBeat('player-choice-2');
    await orchestrator.runBeat('player-choice-3');
    const result = await orchestrator.runBeat('player-choice-4');

    expect(settlementCalls).toHaveLength(1);
    expect(collapseCalls).toHaveLength(2);
    expect(result.state.sceneState.currentPhaseIndex).toBe(2);
    expect(result.state.sceneState.currentBeatIndexInPhase).toBe(1);
    expect(result.state.sceneState.alpha).toBe('alpha-phase-2');
    expect(result.state.sceneState.beta).toBe('beta-phase-2');
  });

  it('marks the scene complete after the final phase and rejects further beat generation', async () => {
    const { adapter } = createRecordingAdapter({
      collapseResponses: [
        {
          alpha: 'alpha-init',
          beta: 'beta-init',
          inferenceTrace: 'init-trace',
        },
        {
          alpha: 'alpha-phase-2',
          beta: 'beta-phase-2',
          inferenceTrace: 'phase-end-trace',
        },
      ],
    });
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
    });

    await orchestrator.initScene();

    for (let index = 1; index <= 8; index += 1) {
      await orchestrator.runBeat(`player-choice-${index}`);
    }

    expect(orchestrator.isSceneComplete()).toBe(true);
    await expect(orchestrator.runBeat('player-choice-final')).rejects.toThrow(
      /scene is already complete/i,
    );
  });

  it('returns new immutable state objects without mutating earlier snapshots', async () => {
    const { adapter } = createRecordingAdapter();
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
    });

    const initialState = await orchestrator.initScene();
    const { state: nextState } = await orchestrator.runBeat('player-choice-1');

    expect(nextState).not.toBe(initialState);
    expect(Object.isFrozen(initialState)).toBe(true);
    expect(Object.isFrozen(nextState)).toBe(true);
    expect(initialState.generationState.currentBeatText).toBeNull();
    expect(nextState.generationState.currentBeatText).toBe('beat-1');
  });

  it('skips audit entirely when the active phase has no selected audit questions', async () => {
    const { adapter, generateCalls, auditCalls } = createRecordingAdapter();
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: {
        ...structuredStoryPackageFixture,
        auditQuestionSet: {
          ...structuredStoryPackageFixture.auditQuestionSet,
          selectionPolicy: {
            default: [],
          },
        },
      },
    });

    await orchestrator.initScene();
    const { beatResult, state } = await orchestrator.runBeat('player-choice-no-audit');

    expect(generateCalls).toHaveLength(1);
    expect(auditCalls).toHaveLength(0);
    expect(beatResult.retryCount).toBe(0);
    expect(beatResult.auditPassed).toBe(true);
    expect(beatResult.forceAccepted).toBe(false);
    expect(state.evaluationState.auditAnswers).toEqual([]);
    expect(state.evaluationState.blockingFailures).toEqual([]);
    expect(state.evaluationState.rewriteFeedback).toBeNull();
  });

  it('pushes each accepted beat through gossipelog and uses the refreshed relationship layer on the following beat', async () => {
    const { packageName, storyPackage } = await createTempStoryPackageFixture();
    const storyPackageWithoutAudit = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const { adapter: baseAdapter, generateCalls } = createRecordingAdapter();
    const sourceRoleId = storyPackage.worldBase.coreCast[0]!.characterId;
    const targetRoleId = storyPackage.worldBase.hero.characterId;
    const firstRelationshipLayer: GossipelogInjectionResult = {
      highlightedDeltasText: 'delta layer 1',
      stableBackgroundText: 'background layer 1',
    };
    let updateCallCount = 0;
    let releaseFirstRefresh: (() => void) | null = null;
    let releaseSecondRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<GossipelogInjectionResult>((resolve) => {
      releaseFirstRefresh = () => resolve(firstRelationshipLayer);
    });
    const secondRefresh = new Promise<GossipelogInjectionResult>((_resolve, reject) => {
      releaseSecondRefresh = () => reject(new Error('refresh failed'));
    });
    secondRefresh.catch(() => undefined);
    const adapter: LLMAdapter = {
      ...baseAdapter,
      async gossipelogUpdate(request) {
        updateCallCount += 1;

        if (updateCallCount === 1) {
          return {
            involvedRoleIds: [sourceRoleId, targetRoleId],
            invocationNoOp: false,
            edgeUpdates: [
              {
                sourceRoleId,
                targetRoleId,
                mode: 'new_edge',
                replaceBaseline: false,
                baseline: {
                  state: 'baseline relationship before refresh',
                  lastAbsorbedRound: request.roundId,
                },
                recentDelta: {
                  state: `relationship update for ${request.roundId}`,
                  sourceRound: request.roundId,
                },
              },
            ],
          };
        }

        return {
          involvedRoleIds: [sourceRoleId],
          invocationNoOp: true,
          edgeUpdates: [],
        };
      },
      async gossipelogInjection() {
        if (updateCallCount === 1) {
          return firstRefresh;
        }

        if (updateCallCount === 2) {
          return secondRefresh;
        }

        return firstRelationshipLayer;
      },
    };
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutAudit,
    });

    await gossipelogRepository.saveCharacterRelationships(
      packageName,
      gossipelogRepository.createEmptyCharacterRelationshipsFile(packageName),
    );

    await orchestrator.initScene();
    const firstBeatPromise = orchestrator.runBeat('opening action');
    await expect(firstBeatPromise).resolves.toMatchObject({
      beatResult: {
        beatText: expect.any(String),
      },
    });
    await vi.waitFor(async () => {
      expect(await gossipelogRepository.loadCharacterRelationships(packageName)).toMatchObject({
        relationshipsBySource: {
          [sourceRoleId]: {
            targets: {
              [targetRoleId]: {
                baseline: {
                  state: 'baseline relationship before refresh',
                },
                recentDelta: {
                  state: expect.stringContaining('relationship update for'),
                },
              },
            },
          },
        },
      });
    });

    const secondBeatPromise = orchestrator.runBeat('follow-up action');
    await Promise.resolve();
    expect(generateCalls).toHaveLength(1);

    expect(releaseFirstRefresh).not.toBeNull();
    releaseFirstRefresh!();
    await expect(secondBeatPromise).resolves.toMatchObject({
      beatResult: {
        beatText: expect.any(String),
      },
    });
    expect(generateCalls).toHaveLength(2);
    expect(generateCalls[1]?.relationshipLayer).toEqual(firstRelationshipLayer);

    const thirdBeatPromise = orchestrator.runBeat('third action');
    await Promise.resolve();
    expect(generateCalls).toHaveLength(2);

    expect(releaseSecondRefresh).not.toBeNull();
    releaseSecondRefresh!();
    await expect(thirdBeatPromise).resolves.toMatchObject({
      beatResult: {
        beatText: expect.any(String),
      },
    });
    expect(generateCalls).toHaveLength(3);
    expect(generateCalls[2]?.relationshipLayer).toEqual(firstRelationshipLayer);
  });

  it('returns the accepted beat before the background gossipelog refresh finishes', async () => {
    const { packageName, storyPackage } = await createTempStoryPackageFixture();
    const storyPackageWithoutAudit = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const { adapter: baseAdapter } = createRecordingAdapter();
    let releaseGossipelogRefresh: (() => void) | null = null;
    let refreshResolved = false;
    const refreshGate = new Promise<GossipelogInjectionResult>((resolve) => {
      releaseGossipelogRefresh = () => {
        refreshResolved = true;
        resolve({
          highlightedDeltasText: 'deferred delta layer',
          stableBackgroundText: 'deferred background layer',
        });
      };
    });
    const adapter: LLMAdapter = {
      ...baseAdapter,
      async gossipelogUpdate(request) {
        const targetRoleId = request.sceneCastRoleIds[0]!;
        const sourceRoleId =
          request.sceneCastRoleIds.find((roleId) => roleId !== targetRoleId) ?? targetRoleId;

        return {
          involvedRoleIds: [sourceRoleId!],
          invocationNoOp: true,
          edgeUpdates: [],
        };
      },
      async gossipelogInjection() {
        return refreshGate;
      },
    };
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutAudit,
    });

    await orchestrator.initScene();
    const firstBeatPromise = orchestrator.runBeat('opening action');

    await expect(firstBeatPromise).resolves.toMatchObject({
      beatResult: {
        beatText: expect.any(String),
      },
    });
    expect(refreshResolved).toBe(false);

    expect(releaseGossipelogRefresh).not.toBeNull();
    releaseGossipelogRefresh!();
    await refreshGate;
  });

  it('waits for a still-running gossipelog refresh when the player submits the next action too quickly', async () => {
    const { packageName, storyPackage } = await createTempStoryPackageFixture();
    const storyPackageWithoutAudit = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const { adapter: baseAdapter, generateCalls } = createRecordingAdapter();
    let releaseGossipelogRefresh: (() => void) | null = null;
    const refreshGate = new Promise<GossipelogInjectionResult>((resolve) => {
      releaseGossipelogRefresh = () =>
        resolve({
          highlightedDeltasText: 'released delta layer',
          stableBackgroundText: 'released background layer',
        });
    });
    const adapter: LLMAdapter = {
      ...baseAdapter,
      async gossipelogUpdate(request) {
        const targetRoleId = request.sceneCastRoleIds[0]!;
        const sourceRoleId =
          request.sceneCastRoleIds.find((roleId) => roleId !== targetRoleId) ?? targetRoleId;

        return {
          involvedRoleIds: [sourceRoleId!],
          invocationNoOp: true,
          edgeUpdates: [],
        };
      },
      async gossipelogInjection() {
        return refreshGate;
      },
    };
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutAudit,
    });

    await orchestrator.initScene();
    await orchestrator.runBeat('opening action');
    const secondBeatPromise = orchestrator.runBeat('follow-up action');
    let secondBeatResolved = false;
    void secondBeatPromise.then(() => {
      secondBeatResolved = true;
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(generateCalls).toHaveLength(1);
    expect(secondBeatResolved).toBe(false);

    expect(releaseGossipelogRefresh).not.toBeNull();
    releaseGossipelogRefresh!();
    await expect(secondBeatPromise).resolves.toMatchObject({
      beatResult: {
        beatText: expect.any(String),
      },
    });
    expect(generateCalls).toHaveLength(2);
  });

  it('uses the prior stable relationship layer when the background refresh fails before the next prompt', async () => {
    const { packageName, storyPackage } = await createTempStoryPackageFixture();
    const storyPackageWithoutAudit = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const { adapter: baseAdapter, generateCalls } = createRecordingAdapter();
    const lastStableRelationshipLayer: GossipelogInjectionResult = {
      highlightedDeltasText: 'stable delta layer',
      stableBackgroundText: 'stable background layer',
    };
    let injectionCallCount = 0;
    let releaseSecondRefresh: (() => void) | null = null;
    const secondRefreshGate = new Promise<void>((resolve) => {
      releaseSecondRefresh = resolve;
    });
    const adapter: LLMAdapter = {
      ...baseAdapter,
      async gossipelogUpdate(request) {
        const targetRoleId = request.sceneCastRoleIds[0]!;
        const sourceRoleId =
          request.sceneCastRoleIds.find((roleId) => roleId !== targetRoleId) ?? targetRoleId;

        return {
          involvedRoleIds: [sourceRoleId!],
          invocationNoOp: true,
          edgeUpdates: [],
        } satisfies GossipelogUpdateResult;
      },
      async gossipelogInjection() {
        injectionCallCount += 1;

        if (injectionCallCount === 1) {
          return lastStableRelationshipLayer;
        }

        if (injectionCallCount === 2) {
          await secondRefreshGate;
          throw new Error('refresh failed');
        }

        return {
          highlightedDeltasText: `unexpected delta ${injectionCallCount}`,
          stableBackgroundText: `unexpected background ${injectionCallCount}`,
        };
      },
    };
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutAudit,
    });

    await orchestrator.initScene();
    await orchestrator.runBeat('opening action');
    await orchestrator.runBeat('follow-up action');

    const thirdBeatPromise = orchestrator.runBeat('third action');
    await Promise.resolve();
    expect(generateCalls).toHaveLength(2);

    expect(releaseSecondRefresh).not.toBeNull();
    releaseSecondRefresh!();
    const thirdResult = await thirdBeatPromise;

    expect(generateCalls[2]?.relationshipLayer).toEqual(lastStableRelationshipLayer);
    expect(thirdResult.state.generationState.promptObject).toMatchObject({
      relationshipLayer: lastStableRelationshipLayer,
    });
  });

  it('keeps invocation-level no-op beats from producing noisy writes while still carrying forward a stable relationship layer', async () => {
    const { packageName, storyPackage } = await createTempStoryPackageFixture();
    const storyPackageWithoutAudit = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const { adapter: baseAdapter, generateCalls } = createRecordingAdapter();
    const stableRelationshipLayer: GossipelogInjectionResult = {
      highlightedDeltasText: 'stable delta layer',
      stableBackgroundText: 'stable background layer',
    };
    let releaseRefresh: (() => void) | null = null;
    const refreshGate = new Promise<GossipelogInjectionResult>((resolve) => {
      releaseRefresh = () => resolve(stableRelationshipLayer);
    });
    const adapter: LLMAdapter = {
      ...baseAdapter,
      async gossipelogUpdate() {
        return {
          involvedRoleIds: [storyPackage.worldBase.coreCast[0]!.characterId],
          invocationNoOp: true,
          edgeUpdates: [],
        };
      },
      async gossipelogInjection() {
        return refreshGate;
      },
    };
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutAudit,
    });
    const saveSpy = vi.spyOn(gossipelogRepository, 'saveCharacterRelationships');

    const emptyRelationshipsFile = gossipelogRepository.createEmptyCharacterRelationshipsFile(packageName);
    await gossipelogRepository.saveCharacterRelationships(
      packageName,
      emptyRelationshipsFile,
    );
    saveSpy.mockClear();

    await orchestrator.initScene();
    const firstBeatPromise = orchestrator.runBeat('opening action');
    await expect(firstBeatPromise).resolves.toMatchObject({
      beatResult: {
        beatText: expect.any(String),
      },
    });
    expect(saveSpy).not.toHaveBeenCalled();
    expect(await gossipelogRepository.loadCharacterRelationships(packageName)).toEqual(
      emptyRelationshipsFile,
    );

    expect(releaseRefresh).not.toBeNull();
    releaseRefresh!();

    const secondBeatPromise = orchestrator.runBeat('follow-up action');
    await expect(secondBeatPromise).resolves.toMatchObject({
      beatResult: {
        beatText: expect.any(String),
      },
    });

    expect(generateCalls[1]?.relationshipLayer).toEqual(stableRelationshipLayer);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(await gossipelogRepository.loadCharacterRelationships(packageName)).toEqual(
      emptyRelationshipsFile,
    );
  });

  it('keeps round ids unique across orchestrator sessions that share persisted gossipelog state', async () => {
    const { packageName, storyPackage } = await createTempStoryPackageFixture();
    const storyPackageWithoutAudit = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const { adapter: baseAdapter, generateCalls: firstSessionGenerateCalls } = createRecordingAdapter();
    const firstSessionAdapter: LLMAdapter = {
      ...baseAdapter,
      async gossipelogUpdate(request) {
        return {
          involvedRoleIds: [storyPackage.worldBase.coreCast[0]!.characterId],
          invocationNoOp: false,
          edgeUpdates: [
            {
              sourceRoleId: storyPackage.worldBase.coreCast[0]!.characterId,
              targetRoleId: storyPackage.worldBase.hero.characterId,
              mode: 'delta',
              replaceBaseline: false,
              recentDelta: {
                state: `session-one-${request.roundId}`,
                sourceRound: request.roundId,
              },
            },
          ],
        };
      },
      async gossipelogInjection(request) {
        const edge =
          request.relationshipSubgraph.relationshipsBySource[storyPackage.worldBase.coreCast[0]!.characterId]
            ?.targets[storyPackage.worldBase.hero.characterId];

        return {
          highlightedDeltasText:
            edge?.highlightNextPrompt && edge.recentDelta
              ? `${edge.recentDelta.state}|${edge.recentDelta.sourceRound}`
              : '',
          stableBackgroundText: edge?.baseline.state ?? '',
        };
      },
    };
    const firstSession = createNodeOrchestrator({
      adapter: firstSessionAdapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutAudit,
    });

    await firstSession.initScene();
    await firstSession.runBeat('session one opening action');
    await vi.waitFor(async () => {
      const persistedFile = await gossipelogRepository.loadCharacterRelationships(packageName);
      expect(
        persistedFile.relationshipsBySource[storyPackage.worldBase.coreCast[0]!.characterId]?.targets[
          storyPackage.worldBase.hero.characterId
        ]?.recentDelta?.state,
      ).toContain('session-one-');
    });

    const { adapter: secondBaseAdapter, generateCalls: secondSessionGenerateCalls } =
      createRecordingAdapter();
    const secondSessionAdapter: LLMAdapter = {
      ...secondBaseAdapter,
      async gossipelogUpdate() {
        return {
          involvedRoleIds: [storyPackage.worldBase.coreCast[0]!.characterId],
          invocationNoOp: true,
          edgeUpdates: [],
        };
      },
      async gossipelogInjection(request) {
        const edge =
          request.relationshipSubgraph.relationshipsBySource[storyPackage.worldBase.coreCast[0]!.characterId]
            ?.targets[storyPackage.worldBase.hero.characterId];

        return {
          highlightedDeltasText:
            edge?.highlightNextPrompt && edge.recentDelta
              ? `${edge.recentDelta.state}|${edge.recentDelta.sourceRound}`
              : '',
          stableBackgroundText: edge?.baseline.state ?? '',
        };
      },
    };
    const secondSession = createNodeOrchestrator({
      adapter: secondSessionAdapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutAudit,
    });

    await secondSession.initScene();
    await secondSession.runBeat('session two first action');
    await Promise.resolve();
    await Promise.resolve();
    await secondSession.runBeat('session two second action');

    expect(firstSessionGenerateCalls[0]?.relationshipLayer).toEqual({
      highlightedDeltasText: '',
      stableBackgroundText: '',
    });
    expect(secondSessionGenerateCalls[1]?.relationshipLayer).toEqual({
      highlightedDeltasText: '',
      stableBackgroundText: expect.stringContaining('session-one-'),
    });
  });

  it('records one full checkpoint for each accepted beat', async () => {
    const recorder = createRuntimeSessionStoreSpy();
    const { adapter } = createRecordingAdapter();
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
      runtimeSessionStore: recorder,
    });

    await orchestrator.initScene();
    const result = await orchestrator.runBeat('opening action');

    expect(recorder.recordAcceptedBeat).toHaveBeenCalledTimes(1);
    expect(recorder.recordAcceptedBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        packageName: 'sample-scene',
        sessionId: 'sess_active',
        checkpointId: expect.any(String),
        lifecycle: 'in_progress',
        acceptedBeatOrdinal: 1,
        phaseIndex: 1,
        beatIndex: 1,
        sceneId: structuredStoryPackageFixture.sceneSpec.sceneId,
        roundId: expect.any(String),
        acceptedTranscript: {
          playerInput: 'opening action',
          beatText: 'beat-1',
        },
        stateSnapshot: result.state,
        lastStableRelationshipLayer: {
          highlightedDeltasText: '',
          stableBackgroundText: '',
        },
      }),
    );
  });

  it('finalizes only the bound checkpoint when a delayed gossipelog refresh resolves', async () => {
    const { packageName, storyPackage } = await createTempStoryPackageFixture();
    const storyPackageWithoutAudit = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const recorder = createRuntimeSessionStoreSpy();
    const { adapter: baseAdapter } = createRecordingAdapter();
    const firstSettledLayer = createRelationshipLayer('first settled');
    let injectionCallCount = 0;
    let releaseFirstRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<GossipelogInjectionResult>((resolve) => {
      releaseFirstRefresh = () => resolve(firstSettledLayer);
    });
    const adapter: LLMAdapter = {
      ...baseAdapter,
      async gossipelogUpdate() {
        return {
          involvedRoleIds: [storyPackage.worldBase.coreCast[0]!.characterId],
          invocationNoOp: true,
          edgeUpdates: [],
        };
      },
      async gossipelogInjection() {
        injectionCallCount += 1;
        if (injectionCallCount === 1) {
          return firstRefresh;
        }

        return createRelationshipLayer(`settled-${injectionCallCount}`);
      },
    };
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutAudit,
      runtimeSessionStore: recorder,
    });

    await orchestrator.initScene();
    await orchestrator.runBeat('beat one');
    await orchestrator.runBeat('beat two');

    expect(recorder.recordAcceptedBeat).toHaveBeenCalledTimes(2);
    const firstCheckpointId = recorder.recordAcceptedBeat.mock.calls[0]?.[0].checkpointId;
    const secondCheckpointId = recorder.recordAcceptedBeat.mock.calls[1]?.[0].checkpointId;

    expect(firstCheckpointId).toEqual(expect.any(String));
    expect(secondCheckpointId).toEqual(expect.any(String));
    expect(firstCheckpointId).not.toBe(secondCheckpointId);
    expect(recorder.finalizeRelationshipLayer).not.toHaveBeenCalled();

    expect(releaseFirstRefresh).not.toBeNull();
    releaseFirstRefresh!();
    await vi.waitFor(() => {
      expect(recorder.finalizeRelationshipLayer).toHaveBeenCalledWith({
        packageName,
        sessionId: 'sess_active',
        checkpointId: firstCheckpointId!,
        lastStableRelationshipLayer: firstSettledLayer,
      });
    });
    expect(recorder.finalizeRelationshipLayer).not.toHaveBeenCalledWith(
      expect.objectContaining({
        checkpointId: secondCheckpointId,
        lastStableRelationshipLayer: firstSettledLayer,
      }),
    );
  }, 15000);

  it('hydrates current state, accepted history, and relationship context before continuation resumes', async () => {
    const source = createNodeOrchestrator({
      adapter: createRecordingAdapter().adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
    });

    await source.initScene();
    await source.runBeat('opening action');
    const secondBeat = await source.runBeat('follow-up action');
    const restoreInput: OrchestratorRestoreInput = {
      currentState: secondBeat.state,
      acceptedHistory: buildAcceptedHistoryFromInputs(['opening action', 'follow-up action']),
      lastStableRelationshipLayer: createRelationshipLayer('restored'),
      sceneComplete: false,
    };
    const { adapter, generateCalls } = createRecordingAdapter();
    const recorder = createRuntimeSessionStoreSpy();
    const restored = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
      runtimeSessionStore: recorder,
    });

    const hydratedState = await restored.hydrateScene(restoreInput);
    const continuation = await restored.runBeat('continued action');

    expect(hydratedState).toEqual(secondBeat.state);
    expect(restored.getState()).toEqual(continuation.state);
    expect(generateCalls[0]?.relationshipLayer).toEqual(restoreInput.lastStableRelationshipLayer);
    expect(generateCalls[0]?.history).toEqual([
      ...restoreInput.acceptedHistory,
      { role: 'user', content: 'continued action' },
    ]);
  });

  it('keeps the restored session binding instead of silently rebinding continuation writes', async () => {
    const source = createNodeOrchestrator({
      adapter: createRecordingAdapter().adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
    });

    await source.initScene();
    await source.runBeat('opening action');
    const secondBeat = await source.runBeat('follow-up action');
    const recorder = createRuntimeSessionStoreSpy({
      ensureActiveSession: vi.fn(async () => ({
        activeSessionId: 'sess_new_active',
      })),
      recordAcceptedBeat: vi.fn(async (input) => {
        if (input.sessionId === 'sess_restored') {
          throw new Error('inactive session "sess_restored"');
        }
      }),
    });
    const restored = createNodeOrchestrator({
      adapter: createRecordingAdapter().adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
      runtimeSessionStore: recorder,
    });

    await restored.hydrateScene({
      currentState: secondBeat.state,
      acceptedHistory: buildAcceptedHistoryFromInputs(['opening action', 'follow-up action']),
      lastStableRelationshipLayer: createRelationshipLayer('restored'),
      sceneComplete: false,
      sessionId: 'sess_restored',
      checkpointId: 'chk_restored',
    });

    await expect(restored.runBeat('continued action')).rejects.toThrow(/inactive session/i);
    expect(recorder.ensureActiveSession).not.toHaveBeenCalled();
    expect(recorder.recordAcceptedBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess_restored',
      }),
    );
  });

  it('writes in_progress lifecycle for non-final accepted beats', async () => {
    const recorder = createRuntimeSessionStoreSpy();
    const { adapter } = createRecordingAdapter();
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
      runtimeSessionStore: recorder,
    });

    await orchestrator.initScene();
    await orchestrator.runBeat('opening action');

    expect(recorder.recordAcceptedBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycle: 'in_progress',
      }),
    );
  });

  it('writes complete lifecycle when the accepted beat finishes the scene', async () => {
    const recorder = createRuntimeSessionStoreSpy();
    const { adapter } = createRecordingAdapter();
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: 'sample-scene',
      storyPackage: structuredStoryPackageFixture,
      runtimeSessionStore: recorder,
    });

    await orchestrator.initScene();
    await runSceneToCompletion(orchestrator);

    expect(recorder.recordAcceptedBeat).toHaveBeenLastCalledWith(
      expect.objectContaining({
        lifecycle: 'complete',
      }),
    );
  });

  it('keeps the accepted beat durable when delayed relationship-layer finalization persistence fails', async () => {
    const { packageName, storyPackage } = await createTempStoryPackageFixture();
    const storyPackageWithoutAudit = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const recorder = createRuntimeSessionStoreSpy({
      finalizeRelationshipLayer: vi.fn(async (_input: FinalizeRelationshipLayerInput) => {
        throw new Error('finalize write failed');
      }),
    });
    const { adapter: baseAdapter, generateCalls } = createRecordingAdapter();
    const firstStableLayer = createRelationshipLayer('first stable');
    let injectionCallCount = 0;
    let releaseFirstRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<GossipelogInjectionResult>((resolve) => {
      releaseFirstRefresh = () => resolve(firstStableLayer);
    });
    const adapter: LLMAdapter = {
      ...baseAdapter,
      async gossipelogUpdate() {
        return {
          involvedRoleIds: [storyPackage.worldBase.coreCast[0]!.characterId],
          invocationNoOp: true,
          edgeUpdates: [],
        };
      },
      async gossipelogInjection() {
        injectionCallCount += 1;
        if (injectionCallCount === 1) {
          return firstRefresh;
        }

        return createRelationshipLayer(`unexpected-${injectionCallCount}`);
      },
    };
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutAudit,
      runtimeSessionStore: recorder,
    });

    await orchestrator.initScene();
    await expect(orchestrator.runBeat('opening action')).resolves.toMatchObject({
      beatResult: {
        beatText: expect.any(String),
      },
    });
    expect(recorder.recordAcceptedBeat).toHaveBeenCalledTimes(1);

    expect(releaseFirstRefresh).not.toBeNull();
    releaseFirstRefresh!();
    await vi.waitFor(() => {
      expect(recorder.finalizeRelationshipLayer).toHaveBeenCalledTimes(1);
    });

    await expect(orchestrator.runBeat('follow-up action')).resolves.toMatchObject({
      beatResult: {
        beatText: expect.any(String),
      },
    });
    expect(generateCalls[1]?.relationshipLayer).toEqual({
      highlightedDeltasText: '',
      stableBackgroundText: '',
    });
    expect(recorder.recordAcceptedBeat).toHaveBeenCalledTimes(2);
  });

  it('falls back after a fixed wait when a pending gossipelog refresh never resolves', async () => {
    vi.useFakeTimers();

    const { packageName, storyPackage } = await createTempStoryPackageFixture();
    const storyPackageWithoutAudit = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const { adapter: baseAdapter, generateCalls } = createRecordingAdapter();
    const lastStableRelationshipLayer: GossipelogInjectionResult = {
      highlightedDeltasText: 'stable delta layer',
      stableBackgroundText: 'stable background layer',
    };
    let injectionCallCount = 0;
    const adapter: LLMAdapter = {
      ...baseAdapter,
      async gossipelogUpdate() {
        return {
          involvedRoleIds: [storyPackage.worldBase.coreCast[0]!.characterId],
          invocationNoOp: true,
          edgeUpdates: [],
        };
      },
      async gossipelogInjection() {
        injectionCallCount += 1;

        if (injectionCallCount === 1) {
          return lastStableRelationshipLayer;
        }

        return new Promise<GossipelogInjectionResult>(() => {
          // Intentionally never resolves to exercise timeout fallback.
        });
      },
    };
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutAudit,
    });

    await orchestrator.initScene();
    await orchestrator.runBeat('opening action');
    await Promise.resolve();
    await Promise.resolve();
    await orchestrator.runBeat('follow-up action');

    const thirdBeatPromise = orchestrator.runBeat('third action');
    await Promise.resolve();
    expect(generateCalls).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(2_000);
    const thirdResult = await thirdBeatPromise;

    expect(generateCalls).toHaveLength(3);
    expect(generateCalls[2]?.relationshipLayer).toEqual(lastStableRelationshipLayer);
    expect(thirdResult.state.generationState.promptObject).toMatchObject({
      relationshipLayer: lastStableRelationshipLayer,
    });
  });

  it('persists bound checkpoint finalization when a timed-out refresh later succeeds without changing live queued truth', async () => {
    vi.useFakeTimers();

    const { packageName, storyPackage } = await createTempStoryPackageFixture();
    const storyPackageWithoutAudit = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const recorder = createRuntimeSessionStoreSpy();
    const { adapter: baseAdapter, generateCalls } = createRecordingAdapter();
    const lateSettledLayer = createRelationshipLayer('late settled');
    let generateCallCount = 0;
    let injectionCallCount = 0;
    let releaseFirstRefresh: (() => void) | null = null;
    let releaseSecondGenerate: (() => void) | null = null;
    const firstRefresh = new Promise<GossipelogInjectionResult>((resolve) => {
      releaseFirstRefresh = () => resolve(lateSettledLayer);
    });
    const secondGenerateGate = new Promise<void>((resolve) => {
      releaseSecondGenerate = resolve;
    });
    const adapter: LLMAdapter = {
      ...baseAdapter,
      async generate(promptObject) {
        generateCallCount += 1;

        if (generateCallCount === 2) {
          await secondGenerateGate;
        }

        return baseAdapter.generate!(promptObject);
      },
      async gossipelogUpdate() {
        return {
          involvedRoleIds: [storyPackage.worldBase.coreCast[0]!.characterId],
          invocationNoOp: true,
          edgeUpdates: [],
        };
      },
      async gossipelogInjection() {
        injectionCallCount += 1;

        if (injectionCallCount === 1) {
          return firstRefresh;
        }

        return createRelationshipLayer(`settled-${injectionCallCount}`);
      },
    };
    const orchestrator = createNodeOrchestrator({
      adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutAudit,
      runtimeSessionStore: recorder,
    });

    await orchestrator.initScene();
    await orchestrator.runBeat('opening action');

    const secondBeatPromise = orchestrator.runBeat('follow-up action');
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2_000);
    await Promise.resolve();

    const firstCheckpointId = recorder.recordAcceptedBeat.mock.calls[0]?.[0].checkpointId;
    expect(firstCheckpointId).toEqual(expect.any(String));
    expect(recorder.finalizeRelationshipLayer).not.toHaveBeenCalled();

    expect(releaseFirstRefresh).not.toBeNull();
    releaseFirstRefresh!();
    await vi.waitFor(() => {
      expect(recorder.finalizeRelationshipLayer).toHaveBeenCalledWith({
        packageName,
        sessionId: 'sess_active',
        checkpointId: firstCheckpointId!,
        lastStableRelationshipLayer: lateSettledLayer,
      });
    });

    expect(releaseSecondGenerate).not.toBeNull();
    releaseSecondGenerate!();
    await expect(secondBeatPromise).resolves.toMatchObject({
      beatResult: {
        beatText: expect.any(String),
      },
    });
    expect(generateCalls[1]?.relationshipLayer).toEqual({
      highlightedDeltasText: '',
      stableBackgroundText: '',
    });
  });
});
