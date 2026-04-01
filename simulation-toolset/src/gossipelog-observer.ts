import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import type {
  RunGossipelogCycleInput,
  RunGossipelogCycleResult,
} from '@/agents/gossipelog/contracts';

import type { SimulationAgentTrace } from '@simulation/contracts';
import { createGossipelogAgentTrace } from '@simulation/sidecar-trace';

export type GossipelogObservation = {
  readonly result: RunGossipelogCycleResult;
  readonly agentTrace: SimulationAgentTrace;
};

export async function observeGossipelogCycle(
  input: RunGossipelogCycleInput,
): Promise<GossipelogObservation> {
  const result = await runGossipelogCycle(input);

  return {
    result,
    agentTrace: createGossipelogAgentTrace(result),
  };
}
