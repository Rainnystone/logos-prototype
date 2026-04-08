import YAML from 'yaml';

import type { AgentDefinition } from '@/agents/registry';
import { parseWithSchema } from '@/lib/validation';
import { WeaverImportSummarySchema } from '@/types';
import type { AgentOperationalHint, WeaverBootstrapStatus } from '@/types';

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

export const weaverAgentDefinition = {
  agentId: 'weaver',
  displayName: 'Weaver',
  surfaceType: 'sidecar',
  surfaceSemantics: 'built-in',
  responsibilitySummary: '负责把外部作者文本抽取为可导入的结构化启动摘要，并维护导入状态。',
  skillIds: ['weaver-import-skill'],
  skillDisplayMetadata: [
    {
      skillId: 'weaver-import-skill',
      displayName: 'Weaver Import',
      description: 'Extracts bounded import payloads and bootstrap-ready summary state.',
    },
  ],
  packageConfigPath: 'agents/weaver/config.yaml',
  packageStatePath: 'agents/weaver/import-summary.yaml',
  referenceManifestsByOperation: {
    weaverImport: [
      {
        referenceId: 'weaver-import-reference',
        resolverKey: 'repo-text',
        relativePath: 'src/agents/weaver/references/import-reference.md',
        loadPolicy: 'operation-scoped',
        required: true,
        injectionLabel: 'Import reference',
        priority: 100,
      },
    ],
  },
  summarizeState: (statePathRawContents: string) =>
    summarizeWeaverImportState(statePathRawContents).latestStateLine,
  deriveReadableStateSummary: summarizeWeaverImportState,
} as const satisfies AgentDefinition;
