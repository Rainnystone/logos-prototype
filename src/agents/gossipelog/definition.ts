export const gossipelogAgentDefinition = {
  agentId: 'gossipelog',
  displayName: 'gossipelog agent',
  skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
  packageConfigPath: 'agents/gossipelog/config.yaml',
  packageStatePath: 'agents/gossipelog/character-relationships.yaml',
} as const;
