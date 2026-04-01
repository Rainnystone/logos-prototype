import { afterEach, describe, expect, it } from 'vitest';

import {
  cleanupTempSampleSceneFixtures,
  createE2EMockAdapter,
  createTempSampleSceneFixture,
} from '@/engine/__tests__/e2e/helpers/e2e-mock-adapter';
import { createOrchestrator } from '@/engine/orchestrator';

describe('E2E audit behavior', () => {
  afterEach(() => {
    cleanupTempSampleSceneFixtures();
  });

  it('accepts the beat on the first attempt when audit passes', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'pass',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage,
    });

    await orchestrator.initScene();
    const result = await orchestrator.runBeat('Player action pass');

    expect(result.beatResult.retryCount).toBe(0);
    expect(result.beatResult.forceAccepted).toBe(false);
    expect(harness.generateCalls).toHaveLength(1);
    expect(harness.generateCalls[0]?.generationControl).toBeUndefined();
  });

  it('retries once with generationControl when the first audit fails', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'fail-once',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage,
    });

    await orchestrator.initScene();
    const result = await orchestrator.runBeat('Player action rewrite');

    expect(result.beatResult.retryCount).toBe(1);
    expect(result.beatResult.forceAccepted).toBe(false);
    expect(harness.generateCalls).toHaveLength(2);
    expect(harness.generateCalls[1]?.generationControl).toMatchObject({
      isRewrite: true,
      retryCount: 1,
    });
    expect(harness.generateCalls[1]?.generationControl?.rewriteFeedback).toContain(
      '宫下藤花是否察觉到了超自然现象的存在，或者表现出对生命安全的恐慌？',
    );
    expect(harness.generateCalls[1]?.generationControl?.rewriteFeedback).toContain(
      'Correct answer: NO',
    );
  });

  it('force-accepts after three failed retries and still writes the beat into history', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'fail-always',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage,
    });

    await orchestrator.initScene();
    const result = await orchestrator.runBeat('Player action force accept');

    expect(result.beatResult.forceAccepted).toBe(true);
    expect(result.beatResult.retryCount).toBe(3);
    expect(harness.generateCalls).toHaveLength(4);
    expect(result.state.roundState.historyWindow.length).toBeGreaterThan(0);
    expect(result.state.generationState.currentBeatText).toBe(result.beatResult.beatText);
  });

  it('bypasses audit and accepts immediately when no questions are selected for the phase', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const storyPackageWithoutSelectedAuditQuestions = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const harness = createE2EMockAdapter({
      questionSet: storyPackageWithoutSelectedAuditQuestions.auditQuestionSet,
      auditBehavior: 'fail-always',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithoutSelectedAuditQuestions,
    });

    await orchestrator.initScene();
    const result = await orchestrator.runBeat('Player action skip audit');

    expect(result.beatResult.retryCount).toBe(0);
    expect(result.beatResult.forceAccepted).toBe(false);
    expect(result.beatResult.auditPassed).toBe(true);
    expect(harness.generateCalls).toHaveLength(1);
    expect(harness.auditCalls).toHaveLength(0);
  });
});
