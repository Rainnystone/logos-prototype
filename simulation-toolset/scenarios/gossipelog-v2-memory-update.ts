import { mkdir, writeFile } from 'node:fs/promises';
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

export function createGossipelogV2MemoryUpdateScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'gossipelog-v2-memory-update',
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

        // Build a v2 relationship file with an existing edge (target -> hero)
        // Note: hero-outgoing edges are rejected by merge, so we use target -> hero
        const sourceRoleId = targetId;
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
          kind: 'v2-memory-update.setup',
          details: {
            packageName: fixture.packageName,
            heroId,
            sourceRoleId,
          },
        });

        // Scripted adapter: 1 memoryUpdate (applied), injection with stable background
        const phaseId = 'phase-01';
        const beatIndex = 0;
        const roundId = 'round-v2mu-0001';
        const memoryUpdate = createMemoryUpdate({
          sourceRoleId,
          targetRoleId: heroId,
          phaseId,
          beatIndex,
          roundId,
          overrides: {
            summary: 'updated observation after v2 memory update',
          },
        });
        const updateResult = createAppliedUpdateResult([memoryUpdate]);

        const adapter = createScriptedAdapter({
          gossipelogUpdate: [updateResult],
          gossipelogInjection: [
            {
              highlightedDeltasText: 'v2-memory-update-highlighted-deltas',
              stableBackgroundText: 'v2-memory-update-stable-background',
            },
          ],
        });

        const agentResult = await observeGossipelogCycle({
          adapter,
          storyPackageName: fixture.packageName,
          storyPackage,
          acceptedBeatText: 'beat text for v2 memory update test',
          roundId,
          phaseId,
          beatIndex,
        });

        recorder.recordAction({
          kind: 'agent.observe',
        });
        recorder.recordAgentTrace(agentResult.agentTrace);

        // Assertion: outcome is 'applied' (not 'no-op')
        recorder.recordAssertion({
          name: 'v2-memory-update-outcome-applied',
          pass: agentResult.agentTrace.outcome === 'applied',
          details: `Expected outcome 'applied', got '${agentResult.agentTrace.outcome}'`,
        });

        // Assertion: side effect summary contains memory-count:1
        const sideEffects = agentResult.agentTrace.sideEffectSummary ?? [];
        const hasMemoryCount1 = sideEffects.some((s) => s.includes('memory-count:1'));
        recorder.recordAssertion({
          name: 'v2-memory-update-trace-has-memory-count-1',
          pass: hasMemoryCount1,
          details: `Expected sideEffectSummary to contain memory-count:1, got ${JSON.stringify(sideEffects)}`,
        });

        // Assertion: anchor pass-through — stable background from injection layer
        recorder.recordAssertion({
          name: 'v2-memory-update-stable-background-present',
          pass:
            (agentResult.agentTrace.details as Record<string, unknown>)?.stableBackgroundText ===
            'v2-memory-update-stable-background',
          details: 'Injection layer stable background should pass through to agent trace',
        });

        // Assertion: highlighted deltas present
        recorder.recordAssertion({
          name: 'v2-memory-update-highlighted-deltas-present',
          pass:
            (agentResult.agentTrace.details as Record<string, unknown>)?.highlightedDeltasText ===
            'v2-memory-update-highlighted-deltas',
          details: 'Injection layer highlighted deltas should pass through to agent trace',
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            outcome: agentResult.agentTrace.outcome,
            sideEffectSummary: agentResult.agentTrace.sideEffectSummary,
            stableBackgroundText: (agentResult.agentTrace.details as Record<string, unknown>)?.stableBackgroundText,
            highlightedDeltasText: (agentResult.agentTrace.details as Record<string, unknown>)?.highlightedDeltasText,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}
