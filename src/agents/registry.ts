import { gossipelogAgentDefinition } from '@/agents/gossipelog';

export const agentRegistry = {
  gossipelog: gossipelogAgentDefinition,
} as const;
