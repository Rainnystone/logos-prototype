import { describe, expect, it } from 'vitest';

import { loadSampleSceneStoryPackage } from '@/engine/__tests__/e2e/helpers/load-sample-scene';
import { createE2EMockAdapter } from '@/engine/__tests__/e2e/helpers/e2e-mock-adapter';
import { createOrchestrator } from '@/engine/orchestrator';

describe('E2E audit behavior', () => {
  it('accepts the beat on the first attempt when audit passes', async () => {
    const storyPackage = await loadSampleSceneStoryPackage();
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'pass',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
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
    const storyPackage = await loadSampleSceneStoryPackage();
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'fail-once',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
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
    const storyPackage = await loadSampleSceneStoryPackage();
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'fail-always',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
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
});
