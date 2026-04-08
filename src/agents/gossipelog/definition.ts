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
  displayName: 'Gossipe Log',
  surfaceType: 'sidecar',
  surfaceSemantics: 'built-in',
  responsibilitySummary: '整理已经成立的人际关系，把它们沉淀成稳定的关系背景，供后续生成持续沿用。',
  skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
  skillDisplayMetadata: [
    {
      skillId: 'relationship-update-skill',
      displayName: '关系更新',
      description: '在关系已经成立后，整理并更新当前的人际关系状态。',
    },
    {
      skillId: 'relationship-injection-skill',
      displayName: '关系注入',
      description: '把整理好的关系背景注入下一轮生成，保持后续内容沿用同一套关系依据。',
    },
  ],
  packageConfigPath: 'agents/gossipelog/config.yaml',
  packageStatePath: 'agents/gossipelog/character-relationships.yaml',
  referenceManifestsByOperation: {},
  summarizeState: summarizeTrackedRelationshipState,
} as const satisfies AgentDefinition;
