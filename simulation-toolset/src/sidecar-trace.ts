import type { RunGossipelogCycleResult } from '@/agents/gossipelog/contracts';

import type { SimulationAgentTrace } from '@simulation/contracts';

function summarizeGossipelogSideEffects(result: RunGossipelogCycleResult): string[] {
  const summary: string[] = [];

  if (result.updateResult.invocationNoOp) {
    summary.push('update:no-op');
  } else {
    summary.push(`update:edge-count:${result.updateResult.edgeUpdates.length}`);
  }

  if (result.relationshipLayer.highlightedDeltasText.trim().length > 0) {
    summary.push('relationship-layer:deltas');
  }

  if (result.relationshipLayer.stableBackgroundText.trim().length > 0) {
    summary.push('relationship-layer:stable-background');
  }

  return summary;
}

function resolveGossipelogOutcome(result: RunGossipelogCycleResult): string {
  if (result.usedFallbackSource || result.usedFallbackLayer) {
    return 'fallback';
  }

  if (result.updateResult.invocationNoOp) {
    return 'no-op';
  }

  return 'applied';
}

export function createGossipelogAgentTrace(
  result: RunGossipelogCycleResult,
): SimulationAgentTrace {
  return {
    agentId: 'gossipelog',
    stage: 'cycle',
    outcome: resolveGossipelogOutcome(result),
    sideEffectSummary: summarizeGossipelogSideEffects(result),
    details: {
      highlightedDeltasText: result.relationshipLayer.highlightedDeltasText,
      stableBackgroundText: result.relationshipLayer.stableBackgroundText,
      ...(result.usedFallbackSource ? { usedFallbackSource: result.usedFallbackSource } : {}),
      ...(result.usedFallbackLayer ? { usedFallbackLayer: result.usedFallbackLayer } : {}),
    },
  };
}
