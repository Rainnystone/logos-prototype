import { afterEach, describe, expect, it } from 'vitest';

import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import {
  cleanupTempSampleSceneFixtures,
  createE2EMockAdapter,
  createTempSampleSceneFixture,
} from '@/engine/__tests__/e2e/helpers/e2e-mock-adapter';
import { createOrchestrator } from '@/engine/orchestrator';
import { validateStateSnapshot } from '@/engine/schema-validator';

describe('E2E state transitions', () => {
  afterEach(() => {
    cleanupTempSampleSceneFixtures();
  });

  it('returns new immutable state objects and keeps older snapshots unchanged', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'pass',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage,
      gossipelogCycleRunner: runGossipelogCycle,
    });

    const initialState = await orchestrator.initScene();
    const beatOne = await orchestrator.runBeat('Player action 1');
    const beatTwo = await orchestrator.runBeat('Player action 2');

    expect(validateStateSnapshot(initialState)).toEqual(initialState);
    expect(validateStateSnapshot(beatOne.state)).toEqual(beatOne.state);
    expect(validateStateSnapshot(beatTwo.state)).toEqual(beatTwo.state);

    expect(beatOne.state).not.toBe(initialState);
    expect(beatTwo.state).not.toBe(beatOne.state);
    expect(Object.isFrozen(initialState)).toBe(true);
    expect(Object.isFrozen(beatOne.state)).toBe(true);
    expect(initialState.sceneState.currentBeatIndexInPhase).toBe(1);
    expect(beatOne.state.sceneState.currentBeatIndexInPhase).toBe(2);
    expect(beatTwo.state.sceneState.currentBeatIndexInPhase).toBe(3);
  });

  it('keeps valid volume and role enums at every beat and cycles phase indices at the boundary', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'pass',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage,
      gossipelogCycleRunner: runGossipelogCycle,
    });
    const states = [await orchestrator.initScene()];

    for (let index = 1; index <= 4; index += 1) {
      const result = await orchestrator.runBeat(`Player action ${index}`);

      states.push(result.state);
    }

    for (const state of states) {
      expect(['Low', 'Med', 'High']).toContain(state.roundState.currentVolume);
      expect(state.roundState.historyWindow.every((entry) => entry.role !== 'system')).toBe(true);
      expect(validateStateSnapshot(state)).toEqual(state);
    }

    expect(states[0]?.sceneState.currentPhaseIndex).toBe(1);
    expect(states.at(-1)?.sceneState.currentPhaseIndex).toBe(2);
    expect(states.at(-1)?.sceneState.currentBeatIndexInPhase).toBe(1);
  });

  it('marks the scene complete after all six phases are consumed', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'pass',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage,
      gossipelogCycleRunner: runGossipelogCycle,
    });

    await orchestrator.initScene();

    for (let index = 1; index <= 24; index += 1) {
      await orchestrator.runBeat(`Player action ${index}`);
    }

    expect(orchestrator.isSceneComplete()).toBe(true);
    expect(harness.getCallCounts().settlement).toBe(6);
    await expect(orchestrator.runBeat('After completion')).rejects.toThrow(
      /scene is already complete/i,
    );
  });
});
