import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { loadStoryPackage } from '@/engine/story-loader';

import { observeGossipelogCycle } from '@simulation/gossipelog-observer';
import type { ExecutableSimulationScenario } from '@simulation/scenario-runner';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
import { createTempStoryPackage } from '@simulation/temp-package';
import {
  createAppliedUpdateResult,
  createEmptyV2RelationshipFile,
  createMemoryUpdate,
  createV2Edge,
  stripStorylineSubstrate,
} from '@simulation/gossipelog-v2-helpers';

export function createGossipelogV2MergeIdempotencyScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'gossipelog-v2-merge-idempotency',
    packageName: 'sample-scene',
    async run({ recorder }) {
      const fixture = await createTempStoryPackage('sample-scene');
      await stripStorylineSubstrate(fixture.packagePath);

      try {
        const storyPackage = await loadStoryPackage(fixture.packageName);
        const heroId = storyPackage.worldBase.hero.characterId;
        const targetId = storyPackage.sceneSpec.cast?.[0];

        if (!targetId) {
          throw new Error('sample-scene must have at least one cast role in sceneSpec');
        }

        // Use target -> hero direction (hero-outgoing edges are rejected by merge)
        const sourceRoleId = targetId;

        // Build a v2 relationship file with 1 existing edge (1 history entry)
        const v2File = createEmptyV2RelationshipFile(fixture.packageName);
        const existingEdge = createV2Edge(sourceRoleId, heroId, {
          phaseId: 'phase-00',
          beatIndex: 0,
          roundId: 'round-prior',
          summary: 'prior observation',
        });
        v2File.relationshipsBySource[sourceRoleId] = {
          targets: {
            [heroId]: existingEdge,
          },
        };

        // Write the v2 file to the temp package before the observer runs
        const relDir = path.join(
          fixture.packagePath,
          'agents',
          'gossipelog',
        );
        await mkdir(relDir, { recursive: true });
        const relFilePath = path.join(relDir, 'character-relationships.yaml');
        await writeFile(relFilePath, YAML.stringify(v2File), 'utf8');

        recorder.recordAction({
          kind: 'v2-merge-idempotency.setup',
          details: {
            packageName: fixture.packageName,
            heroId,
            sourceRoleId,
          },
        });

        // Prepare the memory update that will be sent in BOTH cycles
        // This update is DIFFERENT from the pre-seeded entry, so first cycle will apply it
        const phaseId = 'phase-01';
        const beatIndex = 0;
        const roundId = 'round-idem-0001';
        const memoryUpdate = createMemoryUpdate({
          sourceRoleId,
          targetRoleId: heroId,
          phaseId,
          beatIndex,
          roundId,
          overrides: {
            summary: 'idempotency test observation',
          },
        });
        const updateResult = createAppliedUpdateResult([memoryUpdate]);

        // First cycle: adapter returns the update result
        const adapterFirst = createScriptedAdapter({
          gossipelogUpdate: [updateResult],
          gossipelogInjection: [
            {
              highlightedDeltasText: 'v2-idem-first-highlighted-deltas',
              stableBackgroundText: 'v2-idem-first-stable-background',
            },
          ],
        });

        const firstResult = await observeGossipelogCycle({
          adapter: adapterFirst,
          storyPackageName: fixture.packageName,
          storyPackage,
          acceptedBeatText: 'beat text for first cycle',
          roundId,
          phaseId,
          beatIndex,
        });

        recorder.recordAction({ kind: 'agent.observe-first-cycle' });
        recorder.recordAgentTrace(firstResult.agentTrace);

        // Assertion: first cycle outcome is 'applied'
        recorder.recordAssertion({
          name: 'v2-merge-idempotency-first-cycle-applied',
          pass: firstResult.agentTrace.outcome === 'applied',
          details: `Expected first cycle outcome 'applied', got '${firstResult.agentTrace.outcome}'`,
        });

        // Second cycle: same adapter result (identical memoryUpdate)
        // The merge should detect the duplicate via isSameMemoryEntry and skip
        const adapterSecond = createScriptedAdapter({
          gossipelogUpdate: [updateResult],
          gossipelogInjection: [
            {
              highlightedDeltasText: 'v2-idem-second-highlighted-deltas',
              stableBackgroundText: 'v2-idem-second-stable-background',
            },
          ],
        });

        const secondResult = await observeGossipelogCycle({
          adapter: adapterSecond,
          storyPackageName: fixture.packageName,
          storyPackage,
          acceptedBeatText: 'beat text for second cycle',
          roundId,
          phaseId,
          beatIndex,
        });

        recorder.recordAction({ kind: 'agent.observe-second-cycle' });
        recorder.recordAgentTrace(secondResult.agentTrace);

        // Assertion: second cycle outcome is still 'applied' (adapter returned non-no-op)
        recorder.recordAssertion({
          name: 'v2-merge-idempotency-second-cycle-applied',
          pass: secondResult.agentTrace.outcome === 'applied',
          details: `Expected second cycle outcome 'applied', got '${secondResult.agentTrace.outcome}'`,
        });

        // Read the relationship file from disk to verify history deduplication
        const diskContents = await readFile(relFilePath, 'utf8');
        const diskFile = YAML.parse(diskContents) as typeof v2File;
        const diskEdge = diskFile.relationshipsBySource[sourceRoleId]?.targets[heroId];
        const historyLength = diskEdge?.history?.length ?? -1;

        // Pre-seeded: 1 entry. First cycle adds 1. Second cycle should NOT add another.
        // So expected: 2 entries.
        recorder.recordAssertion({
          name: 'v2-merge-idempotency-history-not-duplicated',
          pass: historyLength === 2,
          details: `Expected edge history to have 2 entries after idempotent second cycle, got ${historyLength}`,
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            firstOutcome: firstResult.agentTrace.outcome,
            secondOutcome: secondResult.agentTrace.outcome,
            historyLength,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}
