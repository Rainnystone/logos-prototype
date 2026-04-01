import type {
  SimulationAction,
  SimulationAdapterTrace,
  SimulationAgentTrace,
  SimulationAuthoringTrace,
  SimulationAssertion,
  SimulationReport,
  SimulationRuntimeTrace,
} from '@simulation/contracts';
import { SIMULATION_SCHEMA_VERSION } from '@simulation/contracts';

type RecorderMeta = {
  readonly scenarioId: string;
  readonly packageName: string;
};

type BuildReportInput = {
  readonly finalState: SimulationReport['finalState'];
};

export type SimulationRecorder = {
  recordAction(action: SimulationAction): void;
  recordAssertion(assertion: SimulationAssertion): void;
  recordAuthoringTrace(trace: SimulationAuthoringTrace): void;
  recordRuntimeTrace(trace: SimulationRuntimeTrace): void;
  recordAdapterTrace(trace: SimulationAdapterTrace): void;
  recordAgentTrace(trace: SimulationAgentTrace): void;
  buildReport(input: BuildReportInput): SimulationReport;
};

export function createSimulationRecorder(meta: RecorderMeta): SimulationRecorder {
  const actions: SimulationAction[] = [];
  const assertions: SimulationAssertion[] = [];
  const authoringTrace: SimulationAuthoringTrace[] = [];
  const runtimeTrace: SimulationRuntimeTrace[] = [];
  const adapterTrace: SimulationAdapterTrace[] = [];
  const agentTrace: SimulationAgentTrace[] = [];

  return {
    recordAction(action) {
      actions.push(action);
    },
    recordAssertion(assertion) {
      assertions.push(assertion);
    },
    recordAuthoringTrace(trace) {
      authoringTrace.push(trace);
    },
    recordRuntimeTrace(trace) {
      runtimeTrace.push(trace);
    },
    recordAdapterTrace(trace) {
      adapterTrace.push(trace);
    },
    recordAgentTrace(trace) {
      agentTrace.push(trace);
    },
    buildReport(input) {
      return {
        schemaVersion: SIMULATION_SCHEMA_VERSION,
        scenarioMeta: {
          scenarioId: meta.scenarioId,
          packageName: meta.packageName,
        },
        actions: [...actions],
        assertions: [...assertions],
        finalState: input.finalState,
        ...(authoringTrace.length > 0 ? { authoringTrace: [...authoringTrace] } : {}),
        ...(runtimeTrace.length > 0 ? { runtimeTrace: [...runtimeTrace] } : {}),
        ...(adapterTrace.length > 0 ? { adapterTrace: [...adapterTrace] } : {}),
        ...(agentTrace.length > 0 ? { agentTrace: [...agentTrace] } : {}),
      };
    },
  };
}
