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
