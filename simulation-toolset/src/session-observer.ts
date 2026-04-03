import { readFile } from '@/runtime-sessions/repository';
import type {
  RuntimeSession,
  RuntimeCheckpoint,
  RuntimeSessionsFile,
} from '@/types';
import type {
  SimulationSessionTrace,
  SimulationCheckpointTrace,
} from './contracts';

export type SessionObservation = SimulationSessionTrace;
export type CheckpointObservation = SimulationCheckpointTrace;

interface SessionTraceAccumulator {
  sessions: SimulationSessionTrace[];
  checkpoints: SimulationCheckpointTrace[];
}

const traceAccumulator: SessionTraceAccumulator = {
  sessions: [],
  checkpoints: [],
};

function determineRelationshipSource(session: RuntimeSession): 'session' | 'checkpoint' | 'empty' {
  const layer = session.lastStableRelationshipLayer;
  const hasSessionLayer = layer.highlightedDeltasText !== '' || layer.stableBackgroundText !== '';

  if (hasSessionLayer) {
    return 'session';
  }

  // Check if active checkpoint has a relationship layer
  if (session.activeCheckpointId !== null) {
    const checkpoint = session.checkpointsById[session.activeCheckpointId];
    if (checkpoint) {
      const checkpointLayer = checkpoint.lastStableRelationshipLayer;
      const hasCheckpointLayer = checkpointLayer.highlightedDeltasText !== '' || checkpointLayer.stableBackgroundText !== '';
      if (hasCheckpointLayer) {
        return 'checkpoint';
      }
    }
  }

  return 'empty';
}

function mapSessionToTrace(session: RuntimeSession): SimulationSessionTrace {
  return {
    sessionId: session.sessionId,
    lifecycle: session.lifecycle,
    checkpointCount: session.orderedCheckpointIds.length,
    activeCheckpointId: session.activeCheckpointId,
    relationshipSource: determineRelationshipSource(session),
  };
}

function mapCheckpointToTrace(checkpoint: RuntimeCheckpoint): SimulationCheckpointTrace {
  return {
    checkpointId: checkpoint.checkpointId,
    acceptedBeatOrdinal: checkpoint.acceptedBeatOrdinal,
    phaseIndex: checkpoint.phaseIndex,
    beatIndex: checkpoint.beatIndex,
    hasTranscript: checkpoint.acceptedTranscript.playerInput !== '' || checkpoint.acceptedTranscript.beatText !== '',
    hasStateSnapshot: checkpoint.stateSnapshot !== null,
  };
}

function findActiveSession(file: RuntimeSessionsFile): RuntimeSession | null {
  if (file.activeSessionId === null) {
    return null;
  }

  return file.sessionsById[file.activeSessionId] ?? null;
}

function findCheckpointInSession(session: RuntimeSession, checkpointId: string): RuntimeCheckpoint | null {
  return session.checkpointsById[checkpointId] ?? null;
}

export async function readSession(packageName: string): Promise<SessionObservation | null> {
  const file = await readFile(packageName);

  if (file === null) {
    return null;
  }

  const session = findActiveSession(file);

  if (session === null) {
    return null;
  }

  const trace = mapSessionToTrace(session);
  traceAccumulator.sessions.push(trace);

  return trace;
}

export async function readCheckpoint(packageName: string, checkpointId: string): Promise<CheckpointObservation | null> {
  const file = await readFile(packageName);

  if (file === null) {
    return null;
  }

  const session = findActiveSession(file);

  if (session === null) {
    return null;
  }

  const checkpoint = findCheckpointInSession(session, checkpointId);

  if (checkpoint === null) {
    return null;
  }

  const trace = mapCheckpointToTrace(checkpoint);
  traceAccumulator.checkpoints.push(trace);

  return trace;
}

export function getTrace(): SessionTraceAccumulator {
  return {
    sessions: [...traceAccumulator.sessions],
    checkpoints: [...traceAccumulator.checkpoints],
  };
}

export function clearTrace(): void {
  traceAccumulator.sessions = [];
  traceAccumulator.checkpoints = [];
}