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
  stripStorylineSubstrate,
} from '@simulation/gossipelog-v2-helpers';

export function createGossipelogV2EdgeCreationScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'gossipelog-v2-edge-creation',
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

        // Write an EMPTY v2 relationship file (no edges)
        const v2File = createEmptyV2RelationshipFile(fixture.packageName);
        const relDir = path.join(fixture.packagePath, 'agents', 'gossipelog');
        await mkdir(relDir, { recursive: true });
        const relFilePath = path.join(relDir, 'character-relationships.yaml');
        await writeFile(relFilePath, YAML.stringify(v2File), 'utf8');

        recorder.recordAction({
          kind: 'v2-edge-creation.setup',
          details: {
            packageName: fixture.packageName,
            heroId,
            sourceRoleId: targetId,
            targetRoleId: heroId,
          },
        });

        // Scripted adapter: shouldCreateEdge=true for targetId -> heroId
        // (edge does not exist yet, and sourceRoleId is NOT the hero so it passes the hero-outgoing guard)
        const roundId = 'round-edge-creation-0001';
        const phaseId = 'phase-01';
        const beatIndex = 0;

        const edgeCreationUpdate = createMemoryUpdate({
          sourceRoleId: targetId,
          targetRoleId: heroId,
          shouldCreateEdge: true,
          phaseId,
          beatIndex,
          roundId,
          overrides: {
            summary: 'first impression after encounter',
          },
        });
        const updateResult = createAppliedUpdateResult([edgeCreationUpdate]);

        const adapter = createScriptedAdapter({
          gossipelogUpdate: [updateResult],
          gossipelogInjection: [
            {
              highlightedDeltasText: 'v2-edge-creation-highlighted-deltas',
              stableBackgroundText: 'v2-edge-creation-stable-background',
            },
          ],
        });

        const agentResult = await observeGossipelogCycle({
          adapter,
          storyPackageName: fixture.packageName,
          storyPackage,
          acceptedBeatText: 'beat text for v2 edge creation test',
          roundId,
          phaseId,
          beatIndex,
        });

        recorder.recordAction({
          kind: 'agent.observe',
        });
        recorder.recordAgentTrace(agentResult.agentTrace);

        // Assertion: outcome is 'applied' (not 'no-op' or 'fallback')
        recorder.recordAssertion({
          name: 'v2-edge-creation-outcome-applied',
          pass: agentResult.agentTrace.outcome === 'applied',
          details: `Expected outcome 'applied', got '${agentResult.agentTrace.outcome}'`,
        });

        // Assertion: side effect summary contains memory-count:1
        const sideEffects = agentResult.agentTrace.sideEffectSummary ?? [];
        const hasMemoryCount1 = sideEffects.some((s) => s.includes('memory-count:1'));
        recorder.recordAssertion({
          name: 'v2-edge-creation-trace-has-memory-count-1',
          pass: hasMemoryCount1,
          details: `Expected sideEffectSummary to contain memory-count:1, got ${JSON.stringify(sideEffects)}`,
        });

        // Assertion: stable background from injection layer
        recorder.recordAssertion({
          name: 'v2-edge-creation-stable-background-present',
          pass:
            (agentResult.agentTrace.details as Record<string, unknown>)?.stableBackgroundText ===
            'v2-edge-creation-stable-background',
          details: 'Injection layer stable background should pass through to agent trace',
        });

        // Assertion: highlighted deltas present
        recorder.recordAssertion({
          name: 'v2-edge-creation-highlighted-deltas-present',
          pass:
            (agentResult.agentTrace.details as Record<string, unknown>)?.highlightedDeltasText ===
            'v2-edge-creation-highlighted-deltas',
          details: 'Injection layer highlighted deltas should pass through to agent trace',
        });

        // Read the relationship file from disk after the cycle (before cleanup)
        const persistedRaw = await readFile(relFilePath, 'utf8');
        const persistedFile = YAML.parse(persistedRaw) as import('@/types').CharacterRelationshipsFileV2;
        const persistedEdge = persistedFile.relationshipsBySource[targetId]?.targets[heroId] ?? null;

        return {
          finalState: {
            packageName: fixture.packageName,
            outcome: agentResult.agentTrace.outcome,
            sideEffectSummary: agentResult.agentTrace.sideEffectSummary,
            stableBackgroundText: (agentResult.agentTrace.details as Record<string, unknown>)?.stableBackgroundText,
            highlightedDeltasText: (agentResult.agentTrace.details as Record<string, unknown>)?.highlightedDeltasText,
            newEdgeSourceRoleId: targetId,
            newEdgeTargetRoleId: heroId,
            persistedEdge,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}
