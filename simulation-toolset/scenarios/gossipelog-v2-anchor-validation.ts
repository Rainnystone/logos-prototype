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

export function createGossipelogV2AnchorValidationScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'gossipelog-v2-anchor-validation',
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
          kind: 'v2-anchor-validation.setup',
          details: {
            packageName: fixture.packageName,
            heroId,
            sourceRoleId,
          },
        });

        // Scripted adapter: 1 memoryUpdate (applied) with MISMATCHED phaseId anchor.
        // The cycle is called with phaseId: 'phase-01', but the adapter returns
        // nextCurrentRelation with phaseId: 'phase-mismatch', triggering
        // assertUpdateAnchorsMatchRequest to throw, which causes fallback.
        const requestPhaseId = 'phase-01';
        const mismatchPhaseId = 'phase-mismatch';
        const beatIndex = 0;
        const roundId = 'round-anchor-mismatch-0001';

        // The memory update intentionally uses a different phaseId than the request.
        // This simulates an adapter returning anchors that don't match the request.
        const memoryUpdate = createMemoryUpdate({
          sourceRoleId,
          targetRoleId: heroId,
          phaseId: mismatchPhaseId,
          beatIndex,
          roundId,
          overrides: {
            summary: 'mismatched anchor observation',
          },
        });
        const updateResult = createAppliedUpdateResult([memoryUpdate]);

        const adapter = createScriptedAdapter({
          gossipelogUpdate: [updateResult],
          gossipelogInjection: [
            {
              highlightedDeltasText: 'v2-anchor-validation-highlighted-deltas',
              stableBackgroundText: 'v2-anchor-validation-stable-background',
            },
          ],
        });

        const agentResult = await observeGossipelogCycle({
          adapter,
          storyPackageName: fixture.packageName,
          storyPackage,
          acceptedBeatText: 'beat text for anchor validation test',
          roundId,
          phaseId: requestPhaseId,
          beatIndex,
        });

        recorder.recordAction({
          kind: 'agent.observe',
        });
        recorder.recordAgentTrace(agentResult.agentTrace);

        // Assertion: outcome is 'fallback' (anchor mismatch triggers fallback)
        recorder.recordAssertion({
          name: 'v2-anchor-validation-outcome-fallback',
          pass: agentResult.agentTrace.outcome === 'fallback',
          details: `Expected outcome 'fallback', got '${agentResult.agentTrace.outcome}'`,
        });

        // Assertion: usedFallbackSource is 'persisted-relationship-state'
        recorder.recordAssertion({
          name: 'v2-anchor-validation-used-fallback-source',
          pass:
            (agentResult.agentTrace.details as Record<string, unknown>)?.usedFallbackSource ===
            'persisted-relationship-state',
          details: 'Anchor mismatch should cause fallback to persisted-relationship-state',
        });

        // Assertion: injection layer still runs and provides stable background
        recorder.recordAssertion({
          name: 'v2-anchor-validation-stable-background-present',
          pass:
            (agentResult.agentTrace.details as Record<string, unknown>)?.stableBackgroundText ===
            'v2-anchor-validation-stable-background',
          details: 'Injection layer stable background should still pass through during fallback',
        });

        // Assertion: highlighted deltas present
        recorder.recordAssertion({
          name: 'v2-anchor-validation-highlighted-deltas-present',
          pass:
            (agentResult.agentTrace.details as Record<string, unknown>)?.highlightedDeltasText ===
            'v2-anchor-validation-highlighted-deltas',
          details: 'Injection layer highlighted deltas should pass through to agent trace',
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            outcome: agentResult.agentTrace.outcome,
            sideEffectSummary: agentResult.agentTrace.sideEffectSummary,
            usedFallbackSource: (agentResult.agentTrace.details as Record<string, unknown>)?.usedFallbackSource,
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
