import { gossipelogAgentDefinition } from '@/agents/gossipelog';
import { parseWithSchema } from '@/lib/validation';
import { WeaverImportSummarySchema } from '@/types';
import type { AgentOperationalHint } from '@/types';
import type { WeaverBootstrapStatus } from '@/types';
import YAML from 'yaml';

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

function summarizeWeaverImportState(statePathRawContents: string): AgentReadableStateSummary {
  const parsedSummary = parseWithSchema(
    WeaverImportSummarySchema,
    YAML.parse(statePathRawContents) as unknown,
    'weaverImportSummary',
  );
  const statusCopy =
    parsedSummary.bootstrapStatus === 'succeeded'
      ? 'Bootstrap seed is ready.'
      : `Bootstrap status is ${parsedSummary.bootstrapStatus.replaceAll('_', ' ')}.`;
  const issueCount = parsedSummary.warningCount + parsedSummary.unresolvedGapCount;

  return {
    latestStateLine:
      issueCount > 0
        ? `${parsedSummary.importSummary} ${statusCopy} ${issueCount} bounded issue${issueCount === 1 ? '' : 's'} remain.`
        : `${parsedSummary.importSummary} ${statusCopy}`,
    recommendedOperationalHint:
      parsedSummary.bootstrapStatus === 'succeeded' && issueCount === 0 ? 'ready' : 'warning',
    bootstrapStatus: parsedSummary.bootstrapStatus,
  };
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

export const weaverAgentDefinition = {
  agentId: 'weaver',
  displayName: 'weaver agent',
  surfaceType: 'sidecar',
  surfaceSemantics: 'built-in',
  responsibilitySummary: 'Carries bounded text-import summary state for authoring bootstrap.',
  skillIds: ['weaver-import-skill'],
  skillDisplayMetadata: [
    {
      skillId: 'weaver-import-skill',
      displayName: 'Weaver Import',
      description: 'Produces bounded text-import summaries and package bootstrap seed data.',
    },
  ],
  packageConfigPath: 'agents/weaver/config.yaml',
  packageStatePath: 'agents/weaver/import-summary.yaml',
  referenceManifestsByOperation: {},
  summarizeState: (statePathRawContents: string) =>
    summarizeWeaverImportState(statePathRawContents).latestStateLine,
  deriveReadableStateSummary: summarizeWeaverImportState,
} as const satisfies AgentDefinition;

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
