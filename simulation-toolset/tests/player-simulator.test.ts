import { describe, expect, it } from 'vitest';

import type { RuntimeSessionStore } from '@/engine/orchestrator';
import { loadStoryPackage } from '@/engine/story-loader';
import type { StoryPackage } from '@/types';

import { createPlayerSimulator } from '@simulation/player-simulator';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
import { createTempStoryPackage } from '@simulation/temp-package';

describe('player simulator', () => {
  it('initializes a scene and runs one beat with a scripted adapter', async () => {
    const fixture = await createTempStoryPackage('sample-scene');
    const storyPackage = await loadStoryPackage(fixture.packageName);
    const storyPackageWithoutAudit: StoryPackage = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const adapter = createScriptedAdapter({
      collapse: [{ alpha: 'alpha-init', beta: 'beta-init', inferenceTrace: 'collapse-trace' }],
      route: [{ routerName: 'investigation', inferenceTrace: 'route-trace' }],
      generate: [{ beatText: 'beat-1', options: ['a', 'b', 'c', 'd'] }],
    });
    const simulator = await createPlayerSimulator({
      packageName: fixture.packageName,
      adapter,
      storyPackageOverride: storyPackageWithoutAudit,
    });

    const initialState = await simulator.initScene();
    const result = await simulator.runBeat('opening action');
    const operations = adapter.getTrace().operations.map((item) => item.operation);

    expect(initialState.sceneState.alpha).toBe('alpha-init');
    expect(result.beatResult.beatText).toBe('beat-1');
    expect(result.trace.accepted).toBe(true);
    expect(operations).toContain('collapse');
    expect(operations).toContain('route');
    expect(operations).toContain('generate');
    expect(operations).not.toContain('audit');

    await fixture.cleanup();
  });

  it('auto-initializes the scene when runBeat is called without initScene', async () => {
    const fixture = await createTempStoryPackage('sample-scene');
    const storyPackage = await loadStoryPackage(fixture.packageName);
    const storyPackageWithoutAudit: StoryPackage = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const adapter = createScriptedAdapter({
      collapse: [
        { alpha: 'alpha-auto', beta: 'beta-auto', inferenceTrace: 'collapse-trace' },
        { alpha: 'alpha-auto', beta: 'beta-auto', inferenceTrace: 'collapse-trace' },
      ],
      route: [
        { routerName: 'investigation', inferenceTrace: 'route-trace' },
        { routerName: 'investigation', inferenceTrace: 'route-trace' },
      ],
      generate: [{ beatText: 'auto-init-beat', options: ['a', 'b', 'c', 'd'] }],
    });
    const simulator = await createPlayerSimulator({
      packageName: fixture.packageName,
      adapter,
      storyPackageOverride: storyPackageWithoutAudit,
    });

    const result = await simulator.runBeat('some input');

    expect(result.beatResult.beatText).toBe('auto-init-beat');
    expect(result.trace.accepted).toBe(true);

    await fixture.cleanup();
  });

  it('loads story package from filesystem when no storyPackageOverride is provided', async () => {
    const fixture = await createTempStoryPackage('sample-scene');
    // The sample-scene default selectionPolicy selects 9 global questions
    // plus 3 phase-specific questions for phase-01-prologue (the initial phase),
    // totalling 12 audit questions. Provide matching boolean answers.
    const auditAnswers = [
      false, false, false, false, false, false, false, true, true,
      false, false, false,
    ];
    const adapter = createScriptedAdapter({
      collapse: [
        { alpha: 'alpha-fs', beta: 'beta-fs', inferenceTrace: 'collapse-trace' },
      ],
      route: [
        { routerName: 'investigation', inferenceTrace: 'route-trace' },
      ],
      generate: [{ beatText: 'fs-beat', options: ['a', 'b', 'c', 'd'] }],
      audit: [{ answers: auditAnswers }],
    });
    const simulator = await createPlayerSimulator({
      packageName: fixture.packageName,
      adapter,
    });

    const initialState = await simulator.initScene();
    const result = await simulator.runBeat('explore');

    expect(initialState.sceneState.alpha).toBe('alpha-fs');
    expect(result.beatResult.beatText).toBe('fs-beat');
    expect(result.trace.accepted).toBe(true);

    await fixture.cleanup();
  });

  it('accepts a runtimeSessionStore option and uses it during initialization', async () => {
    const fixture = await createTempStoryPackage('sample-scene');
    const storyPackage = await loadStoryPackage(fixture.packageName);
    const storyPackageWithoutAudit: StoryPackage = {
      ...storyPackage,
      auditQuestionSet: {
        ...storyPackage.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };
    const adapter = createScriptedAdapter({
      collapse: [{ alpha: 'alpha-store', beta: 'beta-store', inferenceTrace: 'collapse-trace' }],
      route: [{ routerName: 'investigation', inferenceTrace: 'route-trace' }],
      generate: [{ beatText: 'store-beat', options: ['a', 'b', 'c', 'd'] }],
    });
    const mockSessionStore: RuntimeSessionStore = {
      ensureActiveSession: () =>
        Promise.resolve({ activeSessionId: 'test-id', checkpoint: null }),
      recordAcceptedBeat: () => Promise.resolve(),
      finalizeRelationshipLayer: () => Promise.resolve(),
    };
    const simulator = await createPlayerSimulator({
      packageName: fixture.packageName,
      adapter,
      storyPackageOverride: storyPackageWithoutAudit,
      runtimeSessionStore: mockSessionStore,
    });

    const initialState = await simulator.initScene();

    expect(initialState.sceneState.alpha).toBe('alpha-store');

    await fixture.cleanup();
  });
});
