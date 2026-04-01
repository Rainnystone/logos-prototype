import { describe, expect, it } from 'vitest';

import { loadStoryPackage } from '@/engine/story-loader';

import { observeGossipelogCycle } from '@simulation/gossipelog-observer';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
import { createTempStoryPackage } from '@simulation/temp-package';

describe('gossipelog observer', () => {
  it('records update and injection summaries plus relationship layer output', async () => {
    const fixture = await createTempStoryPackage('sample-scene');
    const storyPackage = await loadStoryPackage(fixture.packageName);
    const adapter = createScriptedAdapter({
      gossipelogUpdate: [
        {
          involvedRoleIds: [storyPackage.worldBase.hero.characterId],
          invocationNoOp: true,
          edgeUpdates: [],
        },
      ],
      gossipelogInjection: [
        {
          highlightedDeltasText: '',
          stableBackgroundText: 'stable background',
        },
      ],
    });

    const result = await observeGossipelogCycle({
      adapter,
      storyPackageName: fixture.packageName,
      storyPackage,
      acceptedBeatText: 'accepted beat text',
      roundId: 'round-0001',
    });

    expect(result.agentTrace.updateRequest.sceneCastRoleIds.length).toBeGreaterThan(0);
    expect(result.agentTrace.updateResult.invocationNoOp).toBe(true);
    expect(result.agentTrace.relationshipLayer.stableBackgroundText).toBe('stable background');

    await fixture.cleanup();
  });
});
