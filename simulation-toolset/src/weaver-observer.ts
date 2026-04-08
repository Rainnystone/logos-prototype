import { runWeaverImport } from '@/agents/weaver/agent';
import type {
  RunWeaverImportInput,
  RunWeaverImportResult,
} from '@/agents/weaver/contracts';

import type { SimulationAgentTrace } from '@simulation/contracts';
import { createWeaverAgentTrace } from '@simulation/weaver-sidecar-trace';

export type WeaverObservation = {
  readonly result: RunWeaverImportResult;
  readonly agentTrace: SimulationAgentTrace;
};

export async function observeWeaverImport(
  input: RunWeaverImportInput,
): Promise<WeaverObservation> {
  const result = await runWeaverImport(input);

  return {
    result,
    agentTrace: createWeaverAgentTrace(result),
  };
}
