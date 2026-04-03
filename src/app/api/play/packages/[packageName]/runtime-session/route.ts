import { NextResponse } from 'next/server';
import { z } from 'zod';

import * as runtimeSessionsRepository from '@/runtime-sessions/repository';
import type { RuntimeSessionCommand, RuntimeSessionCommandResult } from '@/runtime-sessions/repository';
import { RelationshipLayerSchema, RuntimeSessionLifecycleSchema, StateSnapshotSchema } from '@/types';

const RecordAcceptedBeatPayloadSchema = z
  .object({
    packageName: z.string(),
    sessionId: z.string(),
    checkpointId: z.string(),
    lifecycle: RuntimeSessionLifecycleSchema,
    acceptedBeatOrdinal: z.number().int().positive(),
    phaseIndex: z.number().int().min(1),
    beatIndex: z.number().int().min(1),
    sceneId: z.string(),
    roundId: z.string(),
    acceptedTranscript: z
      .object({
        playerInput: z.string(),
        beatText: z.string(),
      })
      .strict(),
    stateSnapshot: StateSnapshotSchema,
    lastStableRelationshipLayer: RelationshipLayerSchema,
  })
  .strict();

const FinalizeRelationshipLayerPayloadSchema = z
  .object({
    packageName: z.string(),
    sessionId: z.string(),
    checkpointId: z.string(),
    lastStableRelationshipLayer: RelationshipLayerSchema,
  })
  .strict();

const RuntimeSessionCommandSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('ensure_active_session'),
    })
    .strict(),
  z
    .object({
      kind: z.literal('record_accepted_beat'),
      payload: RecordAcceptedBeatPayloadSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('finalize_relationship_layer'),
      payload: FinalizeRelationshipLayerPayloadSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('reset_workbench'),
    })
    .strict(),
]);

function parseRuntimeSessionCommand(value: unknown): RuntimeSessionCommand | null {
  const parsed = RuntimeSessionCommandSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return parsed.data as RuntimeSessionCommand;
}

export async function POST(
  request: Request,
  context: {
    params: { packageName: string } | Promise<{ packageName: string }>;
  },
) {
  const params = await context.params;
  const body = (await request.json().catch(() => null)) as unknown;
  const command = parseRuntimeSessionCommand(body);

  if (!command) {
    return NextResponse.json(
      {
        error: 'Invalid runtime session command payload.',
      },
      { status: 400 },
    );
  }

  try {
    let result: RuntimeSessionCommandResult;

    switch (command.kind) {
      case 'ensure_active_session': {
        const session = await runtimeSessionsRepository.ensureActiveSession(params.packageName);
        result = {
          activeSessionId: session.sessionId,
        };
        break;
      }

      case 'record_accepted_beat': {
        const persisted = await runtimeSessionsRepository.recordAcceptedBeat({
          ...command.payload,
          packageName: params.packageName,
        });
        result = {
          activeSessionId: persisted.session.sessionId,
          activeCheckpointId: persisted.checkpoint.checkpointId,
        };
        break;
      }

      case 'finalize_relationship_layer': {
        await runtimeSessionsRepository.finalizeRelationshipLayer({
          ...command.payload,
          packageName: params.packageName,
        });
        result = {
          activeSessionId: command.payload.sessionId,
          activeCheckpointId: command.payload.checkpointId,
        };
        break;
      }

      case 'reset_workbench': {
        const session = await runtimeSessionsRepository.resetWorkbench(params.packageName);
        result = {
          activeSessionId: session.sessionId,
        };
        break;
      }

      default: {
        return NextResponse.json(
          {
            error: 'Unsupported runtime session command.',
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
