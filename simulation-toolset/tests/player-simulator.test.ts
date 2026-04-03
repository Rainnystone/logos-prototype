import { describe, expect, it } from 'vitest';

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
});
