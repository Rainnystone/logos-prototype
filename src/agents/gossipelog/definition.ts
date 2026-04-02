import YAML from 'yaml';

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
  responsibilitySummary: 'Tracks persisted relationship state after accepted beats.',
  skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
  packageConfigPath: 'agents/gossipelog/config.yaml',
  packageStatePath: 'agents/gossipelog/character-relationships.yaml',
  summarizeState: summarizeTrackedRelationshipState,
} as const;
