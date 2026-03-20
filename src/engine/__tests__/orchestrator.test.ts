import { afterEach, describe, expect, it, vi } from 'vitest';

import { validateStateSnapshot } from '@/engine/schema-validator';
import { createOrchestrator } from '@/engine/orchestrator';
import * as phaseGradientModule from '@/engine/modules/phase-gradient';
import * as directorNoteModule from '@/engine/modules/director-note-layer';
import * as promptAssemblerModule from '@/engine/modules/prompt-assembler';
import {
  createRecordingAdapter,
  storyPackageFixture,
} from '@/engine/__tests__/fixtures/audit-loop-fixtures';

describe('Orchestrator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    const orchestrator = createOrchestrator({
      adapter,
      storyPackage: storyPackageFixture,
    });

    const state = await orchestrator.initScene();

    expect(collapseCalls).toHaveLength(1);
    expect(state.sceneState.alpha).toBe('alpha-init');
    expect(state.sceneState.beta).toBe('beta-init');
    expect(validateStateSnapshot(state)).toEqual(state);
  });

  it('runs a beat generation cycle in the expected module order and accepts on audit pass', async () => {
    const { adapter, generateCalls, auditCalls, routeCalls } = createRecordingAdapter();
    const orchestrator = createOrchestrator({
      adapter,
      storyPackage: storyPackageFixture,
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
    const orchestrator = createOrchestrator({
      adapter,
      storyPackage: storyPackageFixture,
    });
    const rewriteSpy = vi.spyOn(promptAssemblerModule, 'assembleRewritePromptObject');

    await orchestrator.initScene();

    const { beatResult, state } = await orchestrator.runBeat('player-choice-1');

    expect(generateCalls).toHaveLength(2);
    expect(rewriteSpy).toHaveBeenCalledTimes(1);
    expect(generateCalls[1]?.generationControl?.rewriteFeedback).toContain('Correct answer: YES');
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
    const orchestrator = createOrchestrator({
      adapter,
      storyPackage: storyPackageFixture,
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
    const orchestrator = createOrchestrator({
      adapter,
      storyPackage: storyPackageFixture,
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
    const orchestrator = createOrchestrator({
      adapter,
      storyPackage: storyPackageFixture,
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
    const orchestrator = createOrchestrator({
      adapter,
      storyPackage: storyPackageFixture,
    });

    const initialState = await orchestrator.initScene();
    const { state: nextState } = await orchestrator.runBeat('player-choice-1');

    expect(nextState).not.toBe(initialState);
    expect(Object.isFrozen(initialState)).toBe(true);
    expect(Object.isFrozen(nextState)).toBe(true);
    expect(initialState.generationState.currentBeatText).toBeNull();
    expect(nextState.generationState.currentBeatText).toBe('beat-1');
  });
});
