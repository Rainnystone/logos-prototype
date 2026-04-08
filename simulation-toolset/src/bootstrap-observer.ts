import { bootstrapGossipelogFromWeaverSummary } from '@/agents/gossipelog/bootstrap';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import type { WeaverBootstrapStatus, WeaverImportSummary } from '@/types';

import type { SimulationAgentTrace } from '@simulation/contracts';

export type BootstrapObservation = {
  readonly ok: boolean;
  readonly bootstrapStatus: WeaverBootstrapStatus;
  readonly errorMessage?: string | undefined;
  readonly agentTrace: SimulationAgentTrace;
};

interface BootstrapObservationInput {
  readonly storyPackageName: string;
  readonly weaverSummary: WeaverImportSummary;
  readonly adapter: Pick<LLMAdapter, 'gossipelogUpdate' | 'gossipelogInjection'>;
}

function resolveBootstrapOutcome(
  status: WeaverBootstrapStatus,
): 'succeeded' | 'fallback-pending' | 'failed' {
  if (status === 'succeeded') return 'succeeded';
  if (status === 'fallback_pending') return 'fallback-pending';
  return 'failed';
}

export async function observeGossipelogBootstrap(
  input: BootstrapObservationInput,
): Promise<BootstrapObservation> {
  const result = await bootstrapGossipelogFromWeaverSummary({
    storyPackageName: input.storyPackageName,
    weaverSummary: input.weaverSummary,
    adapter: input.adapter,
  });

  return {
    ok: result.ok,
    bootstrapStatus: result.bootstrapStatus,
    errorMessage: result.errorMessage,
    agentTrace: {
      agentId: 'gossipelog',
      stage: 'bootstrap',
      outcome: resolveBootstrapOutcome(result.bootstrapStatus),
      sideEffectSummary: [
        `bootstrap:ok:${result.ok}`,
        `bootstrap:status:${result.bootstrapStatus}`,
      ],
      details: {
        bootstrapStatus: result.bootstrapStatus,
        ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
      },
    },
  };
}
