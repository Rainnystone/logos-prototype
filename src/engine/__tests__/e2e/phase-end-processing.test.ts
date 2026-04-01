import { afterEach, describe, expect, it } from 'vitest';

import {
  cleanupTempSampleSceneFixtures,
  createE2EMockAdapter,
  createTempSampleSceneFixture,
} from '@/engine/__tests__/e2e/helpers/e2e-mock-adapter';
import { createOrchestrator } from '@/engine/orchestrator';
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
});
