import YAML from 'yaml';

import type { AgentDefinition } from '@/agents/registry';
import { parseWithSchema } from '@/lib/validation';
import {
  CharacterRelationshipsFileSchema,
  type RelationshipEdge,
  type RelationshipMemoryEdge,
} from '@/types';

function summarizeTrackedRelationshipState(statePathRawContents: string): string {
  const parsedState = parseWithSchema(
    CharacterRelationshipsFileSchema,
    YAML.parse(statePathRawContents) as unknown,
    'characterRelationships',
  );

  let trackedSourceCount = 0;
  let trackedEdgeCount = 0;
  let historyEntryCount = 0;
  let highlightedEdgeCount = 0;

  if (parsedState.meta.schemaVersion === 2) {
    for (const bucket of Object.values(parsedState.relationshipsBySource)) {
      trackedSourceCount += 1;

      for (const edge of Object.values(bucket.targets) as RelationshipMemoryEdge[]) {
        trackedEdgeCount += 1;
        historyEntryCount += edge.history.length;
      }
    }
  } else {
    for (const bucket of Object.values(parsedState.relationshipsBySource)) {
      trackedSourceCount += 1;

      for (const edge of Object.values(bucket.targets) as RelationshipEdge[]) {
        trackedEdgeCount += 1;
        if (edge.highlightNextPrompt) {
          highlightedEdgeCount += 1;
        }
      }
    }
  }

  if (parsedState.meta.schemaVersion === 2) {
    if (trackedEdgeCount === 0) {
      return 'No directed relationship memories are currently tracked in the current sidecar state.';
    }

    return `${trackedEdgeCount} directed relationship memory edge${trackedEdgeCount === 1 ? '' : 's'} tracked across ${trackedSourceCount} source role${trackedSourceCount === 1 ? '' : 's'}. Current relation snapshots are explicit. ${historyEntryCount} history entr${historyEntryCount === 1 ? 'y' : 'ies'} retained.`;
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
  displayName: 'Gossipelog',
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
  referenceManifestsByOperation: {
    gossipelogUpdate: [
      {
        referenceId: 'relationship-reference',
        resolverKey: 'repo-text',
        relativePath: 'src/agents/gossipelog/references/relationship-reference.md',
        loadPolicy: 'operation-scoped',
        required: true,
        injectionLabel: 'Relationship reference',
        priority: 100,
      },
    ],
  },
  summarizeState: summarizeTrackedRelationshipState,
} as const satisfies AgentDefinition;
