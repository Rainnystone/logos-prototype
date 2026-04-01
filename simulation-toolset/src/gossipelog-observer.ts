import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import type {
  RunGossipelogCycleInput,
  RunGossipelogCycleResult,
} from '@/agents/gossipelog/contracts';

export type GossipelogObservation = {
  readonly result: RunGossipelogCycleResult;
  readonly agentTrace: RunGossipelogCycleResult;
};

export async function observeGossipelogCycle(
  input: RunGossipelogCycleInput,
): Promise<GossipelogObservation> {
  const result = await runGossipelogCycle(input);

  return {
    result,
    agentTrace: result,
  };
}
