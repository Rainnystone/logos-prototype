import { loadEditRuntimeContinuityView } from '@/runtime-sessions/views';
import type { SimulationEditContinuityTrace } from './contracts';

export type EditContinuityObservation = SimulationEditContinuityTrace;

interface EditContinuityTraceAccumulator {
  editContinuity: SimulationEditContinuityTrace[];
}

const traceAccumulator: EditContinuityTraceAccumulator = {
  editContinuity: [],
};

function formatRelationshipSummary(
  highlightedDeltasText: string,
  stableBackgroundText: string,
): string {
  const parts: string[] = [];

  if (highlightedDeltasText.trim().length > 0) {
    parts.push(highlightedDeltasText.trim());
  }

  if (stableBackgroundText.trim().length > 0) {
    parts.push(stableBackgroundText.trim());
  }

  return parts.join(' / ');
}

function mapViewToTrace(
  view: Awaited<ReturnType<typeof loadEditRuntimeContinuityView>>,
): SimulationEditContinuityTrace {
  const hasActiveSession = view.activeSession !== null;

  let relationshipSummary: string | undefined;
  if (view.activeSession?.relationshipStatus) {
    relationshipSummary = formatRelationshipSummary(
      view.activeSession.relationshipStatus.highlightedDeltasText,
      view.activeSession.relationshipStatus.stableBackgroundText,
    );
  }

  // The EditRuntimeContinuityView is intentionally bounded - it does NOT expose:
  // - checkpointsById (raw checkpoint map)
  // - beatHistory (raw transcripts)
  // This is verified by checking that the view structure only contains:
  // - sessionId, lifecycle, activeCheckpointId, acceptedBeatCount, relationshipStatus
  const exposesRawCheckpoints = false;

  return {
    kind: view.kind,
    hasActiveSession,
    relationshipSummary:
      relationshipSummary !== undefined && relationshipSummary.length > 0
        ? relationshipSummary
        : undefined,
    exposesRawCheckpoints,
  };
}

export async function observe(packageName: string): Promise<EditContinuityObservation | null> {
  const view = await loadEditRuntimeContinuityView(packageName);
  const trace = mapViewToTrace(view);
  traceAccumulator.editContinuity.push(trace);
  return trace;
}

export function getTrace(): EditContinuityTraceAccumulator {
  return {
    editContinuity: [...traceAccumulator.editContinuity],
  };
}

export function clearTrace(): void {
  traceAccumulator.editContinuity = [];
}