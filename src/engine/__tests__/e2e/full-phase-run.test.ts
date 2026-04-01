import { afterEach, describe, expect, it } from 'vitest';

import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import {
  cleanupTempSampleSceneFixtures,
  createE2EMockAdapter,
  createTempSampleSceneFixture,
} from '@/engine/__tests__/e2e/helpers/e2e-mock-adapter';
import { createOrchestrator } from '@/engine/orchestrator';
import { buildVolumeSequence } from '@/engine/modules/phase-gradient';

describe('E2E full phase run', () => {
  afterEach(() => {
    cleanupTempSampleSceneFixtures();
  });

  it('runs sample-scene phase 1 through all four beats and enters phase 2', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'pass',
      collapseResponses: [
        {
          alpha: 'initial-alpha',
          beta: 'initial-beta',
          inferenceTrace: 'initial-trace',
        },
        {
          alpha: 'phase-2-alpha',
          beta: 'phase-2-beta',
          inferenceTrace: 'phase-end-trace',
        },
      ],
      settlementResponse: {
        phaseConsequences: ['fact-1', 'fact-2'],
        settlementTrace: 'phase-1-settlement',
      },
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage,
      gossipelogCycleRunner: runGossipelogCycle,
    });
    const phaseOne = storyPackage.phasePlans[0]!;
    const phaseTwo = storyPackage.phasePlans[1]!;
    const phaseOneVolumes = buildVolumeSequence(phaseOne.gradientType);
    const phaseTwoVolumes = buildVolumeSequence(phaseTwo.gradientType);

    const initialState = await orchestrator.initScene();
    const beatOne = await orchestrator.runBeat('Player action 1');
    const beatTwo = await orchestrator.runBeat('Player action 2');
    const beatThree = await orchestrator.runBeat('Player action 3');
    const beatFour = await orchestrator.runBeat('Player action 4');

    expect(initialState.sceneState.sceneId).toBe('sample-yanshang-live-room');
    expect(initialState.sceneState.alpha).toBe('initial-alpha');
    expect(initialState.sceneState.beta).toBe('initial-beta');
    expect(initialState.sceneState.currentPhaseIndex).toBe(1);
    expect(initialState.sceneState.currentBeatIndexInPhase).toBe(1);

    expect(beatOne.beatResult.options).toHaveLength(4);
    expect(beatOne.state.sceneState.currentBeatIndexInPhase).toBe(2);
    expect(beatOne.state.roundState.currentVolume).toBe(phaseOneVolumes[1]);
    expect(beatOne.state.roundState.historyWindow).toHaveLength(2);

    expect(beatTwo.state.sceneState.currentBeatIndexInPhase).toBe(3);
    expect(beatTwo.state.roundState.currentVolume).toBe(phaseOneVolumes[2]);
    expect(beatTwo.state.roundState.historyWindow).toHaveLength(4);
    expect(beatTwo.state.generationState.promptObject).toMatchObject({
      relationshipLayer: {
        highlightedDeltasText: expect.any(String),
        stableBackgroundText: expect.any(String),
      },
    });

    expect(beatThree.state.sceneState.currentBeatIndexInPhase).toBe(4);
    expect(beatThree.state.roundState.currentVolume).toBe(phaseOneVolumes[3]);
    expect(beatThree.state.roundState.historyWindow).toHaveLength(6);

    expect(beatFour.state.sceneState.currentPhaseIndex).toBe(2);
    expect(beatFour.state.sceneState.currentBeatIndexInPhase).toBe(1);
    expect(beatFour.state.roundState.currentVolume).toBe(phaseTwoVolumes[0]);
    expect(beatFour.state.sceneState.phaseConsequences).toEqual(['fact-1', 'fact-2']);
    expect(beatFour.state.sceneState.alpha).toBe('phase-2-alpha');
    expect(beatFour.state.sceneState.beta).toBe('phase-2-beta');

    expect(harness.getCallCounts()).toEqual({
      route: 9,
      generate: 4,
      audit: 4,
      settlement: 1,
      collapse: 2,
    });
  });
});
