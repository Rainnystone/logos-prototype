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

export function createGossipelogV2InjectionLayeringScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'gossipelog-v2-injection-layering',
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
        // The edge has 2+ history entries to exercise the injection layering path
        const sourceRoleId = targetId;
        const v2File = createEmptyV2RelationshipFile(fixture.packageName);

        const historyEntry1: import('@/types').RelationshipMemoryEntry = {
          phaseId: 'phase-00',
          beatIndex: 0,
          roundId: 'round-prior-001',
          functionalRole: '观察对象',
          mindsetTags: ['中立'],
          summary: 'first encounter observation',
          triggerEvent: 'encounter',
          reasoning: 'first impression',
          causalAction: 'observe',
        };

        const historyEntry2: import('@/types').RelationshipMemoryEntry = {
          phaseId: 'phase-00',
          beatIndex: 2,
          roundId: 'round-prior-002',
          functionalRole: '对手',
          mindsetTags: ['警惕'],
          summary: 'escalated tension after confrontation',
          triggerEvent: 'conflict',
          reasoning: 'perceived threat',
          causalAction: 'challenge',
        };

        const existingEdge: import('@/types').RelationshipMemoryEdge = {
          sourceRoleId,
          targetRoleId: heroId,
          currentRelation: historyEntry2,
          history: [historyEntry1, historyEntry2],
        };

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
          kind: 'v2-injection-layering.setup',
          details: {
            packageName: fixture.packageName,
            heroId,
            sourceRoleId,
            historyEntryCount: existingEdge.history.length,
          },
        });

        // Scripted adapter: 1 memoryUpdate (applied), injection with both texts
        const phaseId = 'phase-01';
        const beatIndex = 0;
        const roundId = 'round-inj-0001';
        const memoryUpdate = createMemoryUpdate({
          sourceRoleId,
          targetRoleId: heroId,
          phaseId,
          beatIndex,
          roundId,
          overrides: {
            summary: 'injection layering test update',
          },
        });
        const updateResult = createAppliedUpdateResult([memoryUpdate]);

        const adapter = createScriptedAdapter({
          gossipelogUpdate: [updateResult],
          gossipelogInjection: [
            {
              highlightedDeltasText: 'injection-layering-highlighted-deltas',
              stableBackgroundText: 'injection-layering-stable-background',
            },
          ],
        });

        const agentResult = await observeGossipelogCycle({
          adapter,
          storyPackageName: fixture.packageName,
          storyPackage,
          acceptedBeatText: 'beat text for injection layering test',
          roundId,
          phaseId,
          beatIndex,
        });

        recorder.recordAction({
          kind: 'agent.observe',
        });
        recorder.recordAgentTrace(agentResult.agentTrace);

        const details = agentResult.agentTrace.details as Record<string, unknown>;

        // Assertion: outcome is 'applied'
        recorder.recordAssertion({
          name: 'injection-layering-outcome-applied',
          pass: agentResult.agentTrace.outcome === 'applied',
          details: `Expected outcome 'applied', got '${agentResult.agentTrace.outcome}'`,
        });

        // Assertion: highlightedDeltasText is non-empty
        const highlightedText = details?.highlightedDeltasText as string;
        recorder.recordAssertion({
          name: 'injection-layering-highlighted-deltas-non-empty',
          pass: typeof highlightedText === 'string' && highlightedText.length > 0,
          details: `Expected non-empty highlightedDeltasText, got '${String(highlightedText)}'`,
        });

        // Assertion: stableBackgroundText is non-empty
        const stableText = details?.stableBackgroundText as string;
        recorder.recordAssertion({
          name: 'injection-layering-stable-background-non-empty',
          pass: typeof stableText === 'string' && stableText.length > 0,
          details: `Expected non-empty stableBackgroundText, got '${String(stableText)}'`,
        });

        // Assertion: injection request subgraph is v2-shaped
        const injectionSubgraph = agentResult.result.injectionRequest.relationshipSubgraph;
        const isV2 = injectionSubgraph.meta.schemaVersion === 2;
        const allEdges = Object.values(injectionSubgraph.relationshipsBySource).flatMap(
          (bucket) => Object.values(bucket.targets),
        );
        const hasHistoryShape = allEdges.length > 0 && 'history' in allEdges[0] && !('baseline' in allEdges[0]);

        recorder.recordAssertion({
          name: 'injection-layering-subgraph-v2-shaped',
          pass: isV2 && hasHistoryShape,
          details: `Expected v2-shaped subgraph (schemaVersion=2, history edges). schemaVersion=${injectionSubgraph.meta.schemaVersion}, edgeCount=${allEdges.length}, hasHistory=${allEdges.length > 0 && 'history' in allEdges[0]}`,
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            outcome: agentResult.agentTrace.outcome,
            highlightedDeltasText: highlightedText,
            stableBackgroundText: stableText,
            injectionRequestSubgraph: injectionSubgraph,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}
