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

export function createGossipelogV2ReferenceResolutionScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'gossipelog-v2-reference-resolution',
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
          summary: 'prior observation for reference resolution test',
        });
        v2File.relationshipsBySource[sourceRoleId] = {
          targets: {
            [heroId]: existingEdge,
          },
        };

        // Write the v2 file to the temp package before the observer runs
        const relDir = path.join(fixture.packagePath, 'agents', 'gossipelog');
        await mkdir(relDir, { recursive: true });
        const relFilePath = path.join(relDir, 'character-relationships.yaml');
        await writeFile(relFilePath, YAML.stringify(v2File), 'utf8');

        recorder.recordAction({
          kind: 'v2-reference-resolution.setup',
          details: {
            packageName: fixture.packageName,
            heroId,
            sourceRoleId,
          },
        });

        // Scripted adapter: 1 memoryUpdate (applied), injection with stable background
        const phaseId = 'phase-01';
        const beatIndex = 0;
        const roundId = 'round-ref-res-0001';
        const memoryUpdate = createMemoryUpdate({
          sourceRoleId,
          targetRoleId: heroId,
          phaseId,
          beatIndex,
          roundId,
          overrides: {
            summary: 'updated observation after reference resolution test',
          },
        });
        const updateResult = createAppliedUpdateResult([memoryUpdate]);

        const adapter = createScriptedAdapter({
          gossipelogUpdate: [updateResult],
          gossipelogInjection: [
            {
              highlightedDeltasText: 'v2-ref-res-highlighted-deltas',
              stableBackgroundText: 'v2-ref-res-stable-background',
            },
          ],
        });

        const agentResult = await observeGossipelogCycle({
          adapter,
          storyPackageName: fixture.packageName,
          storyPackage,
          acceptedBeatText: 'beat text for v2 reference resolution test',
          roundId,
          phaseId,
          beatIndex,
        });

        recorder.recordAction({
          kind: 'agent.observe',
        });

        // Record adapter trace entries
        const adapterTrace = adapter.getTrace();
        const updateOp = adapterTrace.operations.find(
          (op) => op.operation === 'gossipelogUpdate',
        );
        const injectionOp = adapterTrace.operations.find(
          (op) => op.operation === 'gossipelogInjection',
        );

        if (updateOp) {
          recorder.recordAdapterTrace({
            operation: updateOp.operation,
            outcome: updateOp.outcome,
          });
        }

        if (injectionOp) {
          recorder.recordAdapterTrace({
            operation: injectionOp.operation,
            outcome: injectionOp.outcome,
          });
        }

        recorder.recordAgentTrace(agentResult.agentTrace);

        // Assertion: update request contains resolved references
        const updateRequest = agentResult.result.updateRequest;
        const hasResolvedReferences =
          Array.isArray(updateRequest.resolvedReferences) &&
          updateRequest.resolvedReferences.length > 0;
        const firstRefId =
          updateRequest.resolvedReferences?.[0]?.referenceId ?? null;

        recorder.recordAssertion({
          name: 'v2-reference-resolution-update-has-resolved-references',
          pass: hasResolvedReferences,
          details: `Expected update request to contain resolved references. Got ${JSON.stringify(updateRequest.resolvedReferences?.map((r) => r.referenceId))}`,
        });

        // Assertion: resolved reference has expected referenceId
        recorder.recordAssertion({
          name: 'v2-reference-resolution-update-has-relationship-reference',
          pass: firstRefId === 'relationship-reference',
          details: `Expected first resolved reference to be 'relationship-reference', got '${firstRefId}'`,
        });

        // Assertion: resolved reference has non-empty contents
        const firstRefContents =
          updateRequest.resolvedReferences?.[0]?.contents ?? '';
        recorder.recordAssertion({
          name: 'v2-reference-resolution-ref-has-contents',
          pass: firstRefContents.length > 0,
          details: `Expected resolved reference to have non-empty contents, got length ${firstRefContents.length}`,
        });

        // Assertion: injection request does NOT contain resolved references
        const injectionRequest = agentResult.result.injectionRequest;
        const injectionHasReferences = 'resolvedReferences' in injectionRequest;

        recorder.recordAssertion({
          name: 'v2-reference-resolution-injection-no-references',
          pass: !injectionHasReferences,
          details: `Expected injection request NOT to have resolvedReferences, got ${injectionHasReferences ? 'present' : 'absent'}`,
        });

        // Assertion: outcome is 'applied'
        recorder.recordAssertion({
          name: 'v2-reference-resolution-outcome-applied',
          pass: agentResult.agentTrace.outcome === 'applied',
          details: `Expected outcome 'applied', got '${agentResult.agentTrace.outcome}'`,
        });

        return {
          finalState: {
            packageName: fixture.packageName,
            outcome: agentResult.agentTrace.outcome,
            resolvedReferenceCount: updateRequest.resolvedReferences?.length ?? 0,
            firstRefId,
            injectionHasReferences,
          },
        };
      } finally {
        await fixture.cleanup();
      }
    },
  };
}
