import { z } from 'zod';

import { RelationshipLayerSchema } from '@/types/gossipelog-skill-packets';
import { StateSnapshotSchema } from '@/types/state-snapshot';

export const RuntimeSessionLifecycleSchema = z.enum([
  'awaiting_start',
  'in_progress',
  'complete',
]);
export type RuntimeSessionLifecycle = z.infer<typeof RuntimeSessionLifecycleSchema>;

export const RuntimeAcceptedTranscriptSchema = z
  .object({
    playerInput: z.string(),
    beatText: z.string(),
  })
  .strict();
export type RuntimeAcceptedTranscript = z.infer<typeof RuntimeAcceptedTranscriptSchema>;

export const RuntimeCheckpointSchema = z
  .object({
    checkpointId: z.string(),
    acceptedBeatOrdinal: z.number().int().positive(),
    sceneId: z.string(),
    phaseIndex: z.number().int().min(1),
    beatIndex: z.number().int().min(1),
    roundId: z.string(),
    acceptedTranscript: RuntimeAcceptedTranscriptSchema,
    stateSnapshot: StateSnapshotSchema,
    lastStableRelationshipLayer: RelationshipLayerSchema,
    createdAt: z.string(),
  })
  .strict();
export type RuntimeCheckpoint = z.infer<typeof RuntimeCheckpointSchema>;

export const RuntimeSessionSchema = z
  .object({
    sessionId: z.string(),
    lifecycle: RuntimeSessionLifecycleSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    headCheckpointId: z.string().nullable(),
    activeCheckpointId: z.string().nullable(),
    orderedCheckpointIds: z.array(z.string()),
    checkpointsById: z.record(z.string(), RuntimeCheckpointSchema),
    lastStableRelationshipLayer: RelationshipLayerSchema,
  })
  .strict();
export type RuntimeSession = z.infer<typeof RuntimeSessionSchema>;

export const RuntimeSessionsFileSchema = z
  .object({
    version: z.literal(1),
    activeSessionId: z.string().nullable(),
    sessionsById: z.record(z.string(), RuntimeSessionSchema),
  })
  .strict();
export type RuntimeSessionsFile = z.infer<typeof RuntimeSessionsFileSchema>;

export function assertRuntimeSessionsFileConsistency(
  file: RuntimeSessionsFile,
): RuntimeSessionsFile {
  if (file.activeSessionId !== null && !file.sessionsById[file.activeSessionId]) {
    throw new Error(
      `Runtime session consistency violation: activeSessionId "${file.activeSessionId}" does not resolve.`,
    );
  }

  for (const [sessionKey, session] of Object.entries(file.sessionsById)) {
    if (session.sessionId !== sessionKey) {
      throw new Error(
        `Runtime session consistency violation: session key "${sessionKey}" does not match sessionId "${session.sessionId}".`,
      );
    }

    if (session.headCheckpointId !== null && !session.checkpointsById[session.headCheckpointId]) {
      throw new Error(
        `Runtime session consistency violation: headCheckpointId "${session.headCheckpointId}" does not resolve in session "${session.sessionId}".`,
      );
    }

    if (
      session.activeCheckpointId !== null &&
      !session.checkpointsById[session.activeCheckpointId]
    ) {
      throw new Error(
        `Runtime session consistency violation: activeCheckpointId "${session.activeCheckpointId}" does not resolve in session "${session.sessionId}".`,
      );
    }

    const orderedSet = new Set(session.orderedCheckpointIds);
    if (orderedSet.size !== session.orderedCheckpointIds.length) {
      throw new Error(
        `Runtime session consistency violation: orderedCheckpointIds contains duplicates in session "${session.sessionId}".`,
      );
    }

    for (const checkpointId of session.orderedCheckpointIds) {
      if (!session.checkpointsById[checkpointId]) {
        throw new Error(
          `Runtime session consistency violation: ordered checkpoint "${checkpointId}" is missing from checkpointsById in session "${session.sessionId}".`,
        );
      }
    }

    for (const [checkpointKey, checkpoint] of Object.entries(session.checkpointsById)) {
      if (!orderedSet.has(checkpointKey)) {
        throw new Error(
          `Runtime session consistency violation: checkpoint "${checkpointKey}" is missing from orderedCheckpointIds in session "${session.sessionId}".`,
        );
      }

      if (checkpoint.checkpointId !== checkpointKey) {
        throw new Error(
          `Runtime session consistency violation: checkpoint key "${checkpointKey}" does not match checkpointId "${checkpoint.checkpointId}" in session "${session.sessionId}".`,
        );
      }
    }
  }

  return file;
}
