import { describe, expect, it } from 'vitest';

import { createE2EMockAdapter } from '@/engine/__tests__/e2e/helpers/e2e-mock-adapter';
import { loadSampleSceneStoryPackage } from '@/engine/__tests__/e2e/helpers/load-sample-scene';

describe('E2E mock adapter', () => {
  it('supports all five modes with deterministic call tracking', async () => {
    const storyPackage = await loadSampleSceneStoryPackage();
    const harness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
    });

    const routeResult = await harness.adapter.route?.({
      context: {
        phaseGoal: storyPackage.phasePlans[0]!.phaseGoal,
        currentVolume: 'Low',
        alpha: 'alpha',
        beta: 'beta',
        routerHint: storyPackage.phasePlans[0]!.routerHint ?? '日常/闲暇',
      },
      historyWindow: [],
      availableRouters: storyPackage.routerProfiles,
    });
    const generateResult = await harness.adapter.generate?.({
      worldBase: storyPackage.worldBase,
      history: [],
      narrative: {
        mainAxis: storyPackage.sceneSpec.mainAxis,
        endLine: storyPackage.sceneSpec.endLine,
        phaseGoal: storyPackage.phasePlans[0]!.phaseGoal,
        alpha: 'alpha',
        beta: 'beta',
      },
      directorNote: {
        volume: 'Low',
        router: 'test-router',
        verbLexicon: ['a', 'b', 'c', 'd'],
        beatConstraints: 'beat-constraints',
        optionConstraints: 'option-constraints',
      },
    });
    const auditResult = await harness.adapter.audit?.({
      context: {
        precedingBeats: [],
      },
      generatedContent: {
        beatText: generateResult?.beatText ?? 'beat',
        options: generateResult ? [...generateResult.options] : ['1', '2', '3', '4'],
      },
      auditQuestions: storyPackage.auditQuestionSet.selectionPolicy.default
        .slice(0, 2)
        .map((id) => {
          const questions = [
            ...storyPackage.auditQuestionSet.globalQuestions,
            ...storyPackage.auditQuestionSet.controlQuestions,
          ];

          return questions.find((question) => question.id === id)?.question ?? '';
        }),
    });
    const settlementResult = await harness.adapter.settlement?.({
      context: {
        mainAxis: storyPackage.sceneSpec.mainAxis,
        endLine: storyPackage.sceneSpec.endLine,
        phaseGoal: storyPackage.phasePlans[0]!.phaseGoal,
      },
      phaseTranscript: [
        { role: 'user', content: 'player-input' },
        { role: 'assistant', content: 'accepted-beat' },
      ],
    });
    const collapseResult = await harness.adapter.collapse({
      context: {
        mainAxis: storyPackage.sceneSpec.mainAxis,
        endLine: storyPackage.sceneSpec.endLine,
      },
      phaseConsequences: ['fact-1'],
    });

    expect(routeResult?.routerName.length).toBeGreaterThan(0);
    expect(generateResult?.beatText.length).toBeGreaterThan(0);
    expect(generateResult?.options).toHaveLength(4);
    expect(auditResult?.answers).toHaveLength(2);
    expect(settlementResult?.phaseConsequences.length).toBeGreaterThan(0);
    expect(collapseResult.alpha.length).toBeGreaterThan(0);
    expect(harness.callLog).toEqual(['route', 'generate', 'audit', 'settlement', 'collapse']);
    expect(harness.getCallCounts()).toEqual({
      route: 1,
      generate: 1,
      audit: 1,
      settlement: 1,
      collapse: 1,
    });
  });

  it('supports pass, fail-once, and fail-always audit behaviors using the question expectations', async () => {
    const storyPackage = await loadSampleSceneStoryPackage();
    const auditQuestions = storyPackage.auditQuestionSet.selectionPolicy.default
      .slice(0, 3)
      .map((id) => {
        const questions = [
          ...storyPackage.auditQuestionSet.globalQuestions,
          ...storyPackage.auditQuestionSet.controlQuestions,
        ];

        return questions.find((question) => question.id === id)?.question ?? '';
      });

    const passHarness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'pass',
    });
    const failOnceHarness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'fail-once',
    });
    const failAlwaysHarness = createE2EMockAdapter({
      questionSet: storyPackage.auditQuestionSet,
      auditBehavior: 'fail-always',
    });

    const passAnswers = await passHarness.adapter.audit?.({
      context: { precedingBeats: [] },
      generatedContent: { beatText: 'beat', options: ['1', '2', '3', '4'] },
      auditQuestions,
    });
    const failOnceFirst = await failOnceHarness.adapter.audit?.({
      context: { precedingBeats: [] },
      generatedContent: { beatText: 'beat', options: ['1', '2', '3', '4'] },
      auditQuestions,
    });
    const failOnceSecond = await failOnceHarness.adapter.audit?.({
      context: { precedingBeats: [] },
      generatedContent: { beatText: 'beat', options: ['1', '2', '3', '4'] },
      auditQuestions,
    });
    const failAlwaysAnswers = await failAlwaysHarness.adapter.audit?.({
      context: { precedingBeats: [] },
      generatedContent: { beatText: 'beat', options: ['1', '2', '3', '4'] },
      auditQuestions,
    });

    expect(passAnswers?.answers).not.toEqual(failOnceFirst?.answers);
    expect(failOnceSecond?.answers).toEqual(passAnswers?.answers);
    expect(failAlwaysAnswers?.answers).not.toEqual(passAnswers?.answers);
  });
});
