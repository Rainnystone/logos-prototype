import { gossipelogAgentDefinition } from '@/agents/gossipelog';
import { weaverAgentDefinition } from '@/agents/weaver/definition';
import type { AgentOperationalHint } from '@/types';
import type { WeaverBootstrapStatus } from '@/types';

export interface SidecarReferenceManifest {
  readonly referenceId: string;
  readonly resolverKey: 'repo-text';
  readonly relativePath: string;
  readonly loadPolicy: 'always' | 'operation-scoped';
  readonly required: boolean;
  readonly injectionLabel: string;
  readonly priority: number;
}

export interface AgentSkillDisplayMetadata {
  readonly skillId: string;
  readonly displayName: string;
  readonly description: string;
}

export interface AgentReadableStateSummary {
  readonly latestStateLine: string;
  readonly recommendedOperationalHint?: Exclude<AgentOperationalHint, 'pending_bootstrap'>;
  readonly bootstrapStatus?: WeaverBootstrapStatus;
}
export interface AgentDefinition {
  readonly agentId: string;
  readonly displayName: string;
  readonly surfaceType: 'sidecar';
  readonly surfaceSemantics: 'built-in';
  readonly responsibilitySummary: string;
  readonly skillIds: readonly string[];
  readonly skillDisplayMetadata: readonly AgentSkillDisplayMetadata[];
  readonly packageConfigPath: string;
  readonly packageStatePath: string;
  readonly referenceManifestsByOperation?: Readonly<Record<string, readonly SidecarReferenceManifest[]>>;
  readonly summarizeState?: (statePathRawContents: string) => string;
  readonly deriveReadableStateSummary?: (
    statePathRawContents: string,
  ) => AgentReadableStateSummary;
}

export const agentRegistry = {
  weaver: weaverAgentDefinition,
  gossipelog: gossipelogAgentDefinition,
} as const satisfies Readonly<Record<string, AgentDefinition>>;

type RegisteredAgentDefinition = (typeof agentRegistry)[keyof typeof agentRegistry];
type SidecarAgentDefinition = Extract<
  RegisteredAgentDefinition,
  { readonly surfaceType: 'sidecar' }
>;

export function listSidecarAgentDefinitions(): readonly SidecarAgentDefinition[] {
  return Object.values(agentRegistry).filter(
    (definition): definition is SidecarAgentDefinition => definition.surfaceType === 'sidecar',
  );
}
