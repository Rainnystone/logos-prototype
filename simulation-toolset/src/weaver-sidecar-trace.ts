import type { RunWeaverImportResult } from '@/agents/weaver/contracts';

import type { SimulationAgentTrace } from '@simulation/contracts';

function resolveWeaverOutcome(result: RunWeaverImportResult): 'payload-clean' | 'payload-has-warnings' {
  if (result.payload.warnings.length > 0) return 'payload-has-warnings';
  return 'payload-clean';
}

function summarizeWeaverSideEffects(result: RunWeaverImportResult): string[] {
  const summary: string[] = [];
  if (result.payload.suggestedPackageName) {
    summary.push(`import:suggested-name:${result.payload.suggestedPackageName}`);
  }
  summary.push(`import:warning-count:${result.payload.warnings.length}`);
  summary.push(`import:gap-count:${result.payload.unresolvedGaps.length}`);
  return summary;
}

export function createWeaverAgentTrace(result: RunWeaverImportResult): SimulationAgentTrace {
  return {
    agentId: 'weaver',
    stage: 'import',
    outcome: resolveWeaverOutcome(result),
    sideEffectSummary: summarizeWeaverSideEffects(result),
    details: {
      sourceSummary: result.payload.sourceSummary,
      warningCount: result.payload.warnings.length,
      unresolvedGapCount: result.payload.unresolvedGaps.length,
      bootstrapStatus: result.summary.bootstrapStatus,
      ...(result.payload.suggestedPackageName ? { suggestedPackageName: result.payload.suggestedPackageName } : {}),
    },
  };
}
