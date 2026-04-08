import YAML from 'yaml';

import type { AgentDefinition } from '@/agents/registry';
import { parseWithSchema } from '@/lib/validation';
import { CharacterRelationshipsFileSchema } from '@/types';

function summarizeTrackedRelationshipState(statePathRawContents: string): string {
  const parsedState = parseWithSchema(
    CharacterRelationshipsFileSchema,
    YAML.parse(statePathRawContents) as unknown,
    'characterRelationships',
  );

  let trackedSourceCount = 0;
  let trackedEdgeCount = 0;
  let highlightedEdgeCount = 0;

  for (const bucket of Object.values(parsedState.relationshipsBySource)) {
    trackedSourceCount += 1;

    for (const edge of Object.values(bucket.targets)) {
      trackedEdgeCount += 1;
      if (edge.highlightNextPrompt) {
        highlightedEdgeCount += 1;
      }
    }
  }

  if (trackedEdgeCount === 0) {
    return 'No relationship links tracked in the current sidecar state.';
  }

  const baseSummary = `${trackedEdgeCount} relationship link${trackedEdgeCount === 1 ? '' : 's'} tracked across ${trackedSourceCount} source role${trackedSourceCount === 1 ? '' : 's'}.`;
  if (highlightedEdgeCount === 0) {
    return baseSummary;
  }

  return `${baseSummary} ${highlightedEdgeCount} marked for the next prompt focus.`;
}

export const gossipelogAgentDefinition = {
  agentId: 'gossipelog',
  displayName: 'gossipelog agent',
  surfaceType: 'sidecar',
  surfaceSemantics: 'built-in',
  responsibilitySummary: 'Tracks persisted relationship state after accepted beats.',
  skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
  skillDisplayMetadata: [
    {
      skillId: 'relationship-update-skill',
      displayName: 'Relationship Update',
      description: 'Updates persisted relationship deltas after an accepted beat.',
    },
    {
      skillId: 'relationship-injection-skill',
      displayName: 'Relationship Injection',
      description: 'Builds bounded relationship context for the next prompt turn.',
    },
  ],
  packageConfigPath: 'agents/gossipelog/config.yaml',
  packageStatePath: 'agents/gossipelog/character-relationships.yaml',
  referenceManifestsByOperation: {},
  summarizeState: summarizeTrackedRelationshipState,
} as const satisfies AgentDefinition;
