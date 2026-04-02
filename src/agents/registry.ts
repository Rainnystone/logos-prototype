import { gossipelogAgentDefinition } from '@/agents/gossipelog';

export interface AgentDefinition {
  readonly agentId: string;
  readonly displayName: string;
  readonly surfaceType: 'sidecar';
  readonly responsibilitySummary: string;
  readonly skillIds: readonly string[];
  readonly packageConfigPath: string;
  readonly packageStatePath: string;
  readonly summarizeState?: (statePathRawContents: string) => string;
}

export const agentRegistry = {
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
