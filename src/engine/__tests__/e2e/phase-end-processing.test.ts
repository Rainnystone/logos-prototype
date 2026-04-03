import { afterEach, describe, expect, it } from 'vitest';

import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import {
  cleanupTempSampleSceneFixtures,
  createE2EMockAdapter,
  createTempSampleSceneFixture,
} from '@/engine/__tests__/e2e/helpers/e2e-mock-adapter';
import {
  createOrchestrator,
  type OrchestratorRestoreInput,
} from '@/engine/orchestrator';
import { buildVolumeSequence } from '@/engine/modules/phase-gradient';

describe('E2E phase-end processing', () => {
  afterEach(() => {
    cleanupTempSampleSceneFixtures();
  });

  it('runs settlement before collapse and wires the result into the next phase state', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const settlementResponse = {
      phaseConsequences: ['settled-fact-1', 'settled-fact-2', 'settled-fact-3'],
      settlementTrace: 'settlement-trace',
    };
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'pass',
      settlementResponse,
      collapseResponses: [
        {
          alpha: 'initial-alpha',
          beta: 'initial-beta',
          inferenceTrace: 'initial-trace',
        },
        {
          alpha: 'collapsed-alpha',
          beta: 'collapsed-beta',
          inferenceTrace: 'collapsed-trace',
        },
      ],
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage,
      gossipelogCycleRunner: runGossipelogCycle,
    });

    await orchestrator.initScene();
    await orchestrator.runBeat('P1');
    await orchestrator.runBeat('P2');
    await orchestrator.runBeat('P3');
    const result = await orchestrator.runBeat('P4');

    const settlementCall = harness.settlementCalls[0];
    const phaseEndCollapseCall = harness.collapseCalls[1];
    const phaseTwo = storyPackage.phasePlans[1]!;
    const phaseTwoVolumes = buildVolumeSequence(phaseTwo.gradientType);

    expect(settlementCall?.context.mainAxis).toBe(storyPackage.sceneSpec.mainAxis);
    expect(settlementCall?.context.endLine).toBe(storyPackage.sceneSpec.endLine);
    expect(settlementCall?.context.phaseGoal).toBe(storyPackage.phasePlans[0]!.phaseGoal);
    expect(
      settlementCall?.phaseTranscript.every((entry) => ['user', 'assistant'].includes(entry.role)),
    ).toBe(true);
    expect(settlementCall?.phaseTranscript).toHaveLength(8);

    expect(harness.callLog.indexOf('settlement')).toBeLessThan(
      harness.callLog.lastIndexOf('collapse'),
    );
    expect(phaseEndCollapseCall).toMatchObject({
      phaseConsequences: settlementResponse.phaseConsequences,
      context: {
        currentAlpha: 'initial-alpha',
        currentBeta: 'initial-beta',
      },
    });

    expect(result.state.sceneState.phaseConsequences).toEqual(settlementResponse.phaseConsequences);
    expect(result.state.sceneState.alpha).toBe('collapsed-alpha');
    expect(result.state.sceneState.beta).toBe('collapsed-beta');
    expect(result.state.sceneState.currentPhaseIndex).toBe(2);
    expect(result.state.roundState.currentVolume).toBe(phaseTwoVolumes[0]);
  });

  it('restores the in-phase transcript before continuing into a phase-end settlement', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const generateResponses = [
      {
        beatText: 'Recovered beat 1.',
        options: ['1A', '1B', '1C', '1D'],
      },
      {
        beatText: 'Recovered beat 2.',
        options: ['2A', '2B', '2C', '2D'],
      },
      {
        beatText: 'Recovered beat 3.',
        options: ['3A', '3B', '3C', '3D'],
      },
      {
        beatText: 'Recovered beat 4.',
        options: ['4A', '4B', '4C', '4D'],
      },
    ] as const;
    const sourceHarness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'pass',
      generateResponses,
      collapseResponses: [
        {
          alpha: 'initial-alpha',
          beta: 'initial-beta',
          inferenceTrace: 'initial-trace',
        },
        {
          alpha: 'collapsed-alpha',
          beta: 'collapsed-beta',
          inferenceTrace: 'collapsed-trace',
        },
      ],
    });
    const source = createOrchestrator({
      adapter: sourceHarness.adapter,
      storyPackageName: packageName,
      storyPackage,
      gossipelogCycleRunner: runGossipelogCycle,
    });

    await source.initScene();
    await source.runBeat('P1');
    await source.runBeat('P2');
    const thirdBeat = await source.runBeat('P3');

    const restoredAcceptedHistory = [
      { role: 'user' as const, content: 'P1' },
      { role: 'assistant' as const, content: 'Recovered beat 1.' },
      { role: 'user' as const, content: 'P2' },
      { role: 'assistant' as const, content: 'Recovered beat 2.' },
      { role: 'user' as const, content: 'P3' },
      { role: 'assistant' as const, content: 'Recovered beat 3.' },
    ];
    const restoreInput: OrchestratorRestoreInput = {
      currentState: thirdBeat.state,
      acceptedHistory: restoredAcceptedHistory,
      lastStableRelationshipLayer: {
        highlightedDeltasText: '',
        stableBackgroundText: '',
      },
      sceneComplete: false,
    };
    const continuationHarness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'pass',
      generateResponses: generateResponses.slice(3),
      collapseResponses: [
        {
          alpha: 'initial-alpha',
          beta: 'initial-beta',
          inferenceTrace: 'initial-trace',
        },
        {
          alpha: 'collapsed-alpha',
          beta: 'collapsed-beta',
          inferenceTrace: 'collapsed-trace',
        },
      ],
    });
    const restored = createOrchestrator({
      adapter: continuationHarness.adapter,
      storyPackageName: packageName,
      storyPackage,
      gossipelogCycleRunner: runGossipelogCycle,
    });

    await restored.hydrateScene(restoreInput);
    await restored.runBeat('P4');

    expect(continuationHarness.settlementCalls).toHaveLength(1);
    expect(continuationHarness.settlementCalls[0]?.phaseTranscript).toEqual([
      ...restoredAcceptedHistory,
      { role: 'user', content: 'P4' },
      { role: 'assistant', content: 'Recovered beat 4.' },
    ]);
  });
});
