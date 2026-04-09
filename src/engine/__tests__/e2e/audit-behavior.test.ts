import { afterEach, describe, expect, it } from 'vitest';

import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import {
  cleanupTempSampleSceneFixtures,
  createE2EMockAdapter,
  createTempSampleSceneFixture,
} from '@/engine/__tests__/e2e/helpers/e2e-mock-adapter';
import { createOrchestrator } from '@/engine/orchestrator';

describe('E2E audit behavior', () => {
  function withSelectedAuditQuestions(
    storyPackage: Awaited<ReturnType<typeof createTempSampleSceneFixture>>['storyPackage'],
    phaseId: string,
    append: readonly string[],
  ) {
    return {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
          phaseOverrides: {
            ...(storyPackage.auditQuestionSet.selectionPolicy.phaseOverrides ?? {}),
            [phaseId]: {
              append: [...append],
            },
          },
        },
      },
    };
  }

  afterEach(() => {
    cleanupTempSampleSceneFixtures();
  });

  it('accepts the beat on the first attempt when audit passes', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const storyPackageWithAudit = withSelectedAuditQuestions(
      storyPackage,
      'phase-01-prologue',
      ['AQ-P1-001'],
    );
    const harness = createE2EMockAdapter({
      questionSet: storyPackageWithAudit.auditQuestionSet,
      auditBehavior: 'pass',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithAudit,
      gossipelogCycleRunner: runGossipelogCycle,
    });

    await orchestrator.initScene();
    const result = await orchestrator.runBeat('Player action pass');

    expect(result.beatResult.retryCount).toBe(0);
    expect(result.beatResult.forceAccepted).toBe(false);
    expect(harness.generateCalls).toHaveLength(1);
    expect(harness.generateCalls[0]?.generationControl).toBeUndefined();
  });

  it('retries once with generationControl when the beat-local audit fails', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const storyPackageWithBeatLocalAudit = withSelectedAuditQuestions(
      storyPackage,
      'phase-01-prologue',
      ['AQ-P1-002'],
    );
    expect(storyPackageWithBeatLocalAudit.auditQuestionSet.selectionPolicy.default).toEqual([]);
    expect(
      storyPackageWithBeatLocalAudit.auditQuestionSet.selectionPolicy.phaseOverrides?.[
        'phase-01-prologue'
      ]?.append,
    ).toEqual(['AQ-P1-002']);
    const harness = createE2EMockAdapter({
      questionSet: storyPackageWithBeatLocalAudit.auditQuestionSet,
      auditBehavior: 'fail-once',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithBeatLocalAudit,
      gossipelogCycleRunner: runGossipelogCycle,
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
      '本轮正文或选项是否已经直接把灰谷烈完整揭示为异常元凶？',
    );
    expect(harness.generateCalls[1]?.generationControl?.rewriteFeedback).toContain(
      'Correct answer: NO',
    );
  });

  it('force-accepts after three failed retries and still writes the beat into history', async () => {
    const { packageName, storyPackage } = await createTempSampleSceneFixture();
    const storyPackageWithAudit = withSelectedAuditQuestions(
      storyPackage,
      'phase-01-prologue',
      ['AQ-P1-001'],
    );
    const harness = createE2EMockAdapter({
      questionSet: storyPackageWithAudit.auditQuestionSet,
      auditBehavior: 'fail-always',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage: storyPackageWithAudit,
      gossipelogCycleRunner: runGossipelogCycle,
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
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'fail-always',
    });
    const orchestrator = createOrchestrator({
      adapter: harness.adapter,
      storyPackageName: packageName,
      storyPackage,
      gossipelogCycleRunner: runGossipelogCycle,
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
