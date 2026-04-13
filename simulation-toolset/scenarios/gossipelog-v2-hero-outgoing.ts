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
  stripStorylineSubstrate,
} from '@simulation/gossipelog-v2-helpers';

export function createGossipelogV2HeroOutgoingScenario(): ExecutableSimulationScenario {
  return {
    scenarioId: 'gossipelog-v2-hero-outgoing',
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

        // Write a minimal v2 relationship file
        const v2File = createEmptyV2RelationshipFile(fixture.packageName);
        const relDir = path.join(fixture.packagePath, 'agents', 'gossipelog');
        await mkdir(relDir, { recursive: true });
        const relFilePath = path.join(relDir, 'character-relationships.yaml');
        await writeFile(relFilePath, YAML.stringify(v2File), 'utf8');

        recorder.recordAction({
          kind: 'v2-hero-outgoing.setup',
          details: {
            packageName: fixture.packageName,
            heroId,
            targetId,
          },
        });

        // Scripted adapter returns an applied result where sourceRoleId === heroRoleId.
        // In merge.ts applyMemoryUpdate line 174: when sourceRoleId === heroRoleId,
        // it throws "hero-outgoing relationship memories are not persisted."
        // The agent catch block (non-CandidateSetViolation) sets usedFallbackSource
        // and the cycle continues with fallback.
        const roundId = 'round-hero-outgoing-0001';
        const phaseId = 'phase-01';
        const beatIndex = 0;

        const heroOutgoingUpdate = createMemoryUpdate({
          sourceRoleId: heroId,
          targetRoleId: targetId,
          phaseId,
          beatIndex,
          roundId,
          overrides: {
            summary: 'hero attempts outgoing observation',
          },
        });
        const updateResult = createAppliedUpdateResult([heroOutgoingUpdate]);

        const adapter = createScriptedAdapter({
          gossipelogUpdate: [updateResult],
          gossipelogInjection: [
            {
              highlightedDeltasText: 'v2-hero-outgoing-highlighted-deltas',
              stableBackgroundText: 'v2-hero-outgoing-stable-background',
            },
          ],
        });

        const agentResult = await observeGossipelogCycle({
          adapter,
          storyPackageName: fixture.packageName,
          storyPackage,
          acceptedBeatText: 'beat text for hero-outgoing rejection test',
          roundId,
          phaseId,
          beatIndex,
        });

        recorder.recordAction({
          kind: 'agent.observe',
        });
        recorder.recordAgentTrace(agentResult.agentTrace);

        // Assertion: outcome is 'fallback' (hero-outgoing rejection triggers fallback)
        recorder.recordAssertion({
          name: 'v2-hero-outgoing-outcome-fallback',
          pass: agentResult.agentTrace.outcome === 'fallback',
          details: `Expected outcome 'fallback', got '${agentResult.agentTrace.outcome}'`,
        });

        // Assertion: usedFallbackSource is 'persisted-relationship-state'
        recorder.recordAssertion({
          name: 'v2-hero-outgoing-used-fallback-source',
          pass:
            (agentResult.agentTrace.details as Record<string, unknown>)?.usedFallbackSource ===
            'persisted-relationship-state',
          details: 'Hero-outgoing rejection should cause fallback to persisted-relationship-state',
        });

        // Assertion: injection layer still provides output during fallback
        recorder.recordAssertion({
          name: 'v2-hero-outgoing-stable-background-present',
          pass:
            (agentResult.agentTrace.details as Record<string, unknown>)?.stableBackgroundText ===
            'v2-hero-outgoing-stable-background',
          details: 'Injection layer should still pass through during fallback',
        });

        // Assertion: highlighted deltas present
        recorder.recordAssertion({
          name: 'v2-hero-outgoing-highlighted-deltas-present',
          pass:
            (agentResult.agentTrace.details as Record<string, unknown>)?.highlightedDeltasText ===
            'v2-hero-outgoing-highlighted-deltas',
          details: 'Injection layer highlighted deltas should pass through',
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
