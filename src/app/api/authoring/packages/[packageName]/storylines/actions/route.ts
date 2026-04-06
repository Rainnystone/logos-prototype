import { NextResponse } from 'next/server';

import {
  branchStorylineFromCheckpoint,
  createStorylineFromSource,
  resolveActiveStorylineContext,
  switchActiveStoryline,
  updateStorylineDisplayName,
} from '@/storylines/substrate';
import { StorylineActionSchema } from '@/types/storyline-management';
import type { RuntimeCheckpoint, StorylineRepositoryFile } from '@/types';

function getStorylineCount(repository: StorylineRepositoryFile): number {
  return Object.keys(repository.storylinesById).length;
}

function resolveSourceCheckpoint(
  repository: StorylineRepositoryFile,
  runtimeFile: NonNullable<Awaited<ReturnType<typeof resolveActiveStorylineContext>>['runtimeFile']>,
  sourceStorylineId: string,
  checkpointId: string,
): RuntimeCheckpoint {
  const sourceStoryline = repository.storylinesById[sourceStorylineId];
  if (!sourceStoryline) {
    throw new Error(`Storyline "${sourceStorylineId}" does not exist.`);
  }

  const session = runtimeFile.sessionsById[sourceStoryline.activeSessionId];
  if (!session) {
    throw new Error(
      `Storyline structural mismatch: storyline "${sourceStoryline.storylineId}" activeSessionId "${sourceStoryline.activeSessionId}" does not resolve in runtime-sessions.json.`,
    );
  }

  const checkpoint = session.checkpointsById[checkpointId];
  if (!checkpoint) {
    throw new Error(
      `Cannot branch storyline from checkpoint "${checkpointId}" because it is not reachable from source storyline "${sourceStoryline.storylineId}".`,
    );
  }

  return checkpoint;
}

function buildCreateFromSourceDisplayName(repository: StorylineRepositoryFile): string {
  return `故事线 ${getStorylineCount(repository) + 1}`;
}

function buildBranchFromCheckpointDisplayName(
  repository: StorylineRepositoryFile,
  runtimeFile: NonNullable<Awaited<ReturnType<typeof resolveActiveStorylineContext>>['runtimeFile']>,
  sourceStorylineId: string,
  checkpointId: string,
): string {
  const checkpoint = resolveSourceCheckpoint(repository, runtimeFile, sourceStorylineId, checkpointId);
  return `故事线 ${getStorylineCount(repository) + 1} · 从 Beat ${checkpoint.acceptedBeatOrdinal} 分出`;
}

function mapActionError(error: unknown): { status: number; message: string } {
  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (
      normalizedMessage.includes('does not exist') ||
      normalizedMessage.includes('does not resolve') ||
      normalizedMessage.includes('cannot be empty') ||
      normalizedMessage.includes('cannot branch storyline from checkpoint') ||
      normalizedMessage.includes('not reachable from source storyline')
    ) {
      return {
        status: 400,
        message: error.message,
      };
    }
  }

  return {
    status: 500,
    message: 'Failed to process storyline action.',
  };
}

export async function POST(
  request: Request,
  context: {
    params: { packageName: string } | Promise<{ packageName: string }>;
  },
) {
  const params = await context.params;
  const body = (await request.json().catch(() => ({}))) as unknown;
  const parsed = StorylineActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid storyline action payload.',
      },
      { status: 400 },
    );
  }

  const action = parsed.data;

  try {
    switch (action.kind) {
      case 'rename_display_name': {
        const result = await updateStorylineDisplayName({
          packageName: params.packageName,
          storylineId: action.storylineId,
          nextDisplayName: action.nextDisplayName.trim(),
        });

        return NextResponse.json(
          {
            kind: action.kind,
            storylineId: result.storyline.storylineId,
            displayName: result.storyline.name,
            updatedAt: result.storyline.updatedAt,
          },
          { status: 200 },
        );
      }

      case 'create_from_source': {
        const contextResult = await resolveActiveStorylineContext(params.packageName, {
          forWrite: true,
        });
        if (!contextResult.repository || !contextResult.runtimeFile) {
          throw new Error('Storyline actions require explicit repository and runtime context.');
        }

        const sourceStoryline = contextResult.repository.storylinesById[action.sourceStorylineId];
        if (!sourceStoryline) {
          throw new Error(`Storyline "${action.sourceStorylineId}" does not exist.`);
        }

        const created = await createStorylineFromSource({
          packageName: params.packageName,
          sourceStorylineId: action.sourceStorylineId,
          name: buildCreateFromSourceDisplayName(contextResult.repository),
        });
        const switched = await switchActiveStoryline(params.packageName, created.storyline.storylineId);

        return NextResponse.json(
          {
            kind: action.kind,
            activeStorylineId: switched.storyline.storylineId,
          },
          { status: 200 },
        );
      }

      case 'branch_from_checkpoint': {
        const contextResult = await resolveActiveStorylineContext(params.packageName, {
          forWrite: true,
        });
        if (!contextResult.repository || !contextResult.runtimeFile) {
          throw new Error('Storyline actions require explicit repository and runtime context.');
        }

        const branched = await branchStorylineFromCheckpoint({
          packageName: params.packageName,
          sourceStorylineId: action.sourceStorylineId,
          checkpointId: action.checkpointId,
          name: buildBranchFromCheckpointDisplayName(
            contextResult.repository,
            contextResult.runtimeFile,
            action.sourceStorylineId,
            action.checkpointId,
          ),
        });
        const switched = await switchActiveStoryline(params.packageName, branched.storyline.storylineId);

        return NextResponse.json(
          {
            kind: action.kind,
            activeStorylineId: switched.storyline.storylineId,
          },
          { status: 200 },
        );
      }

      case 'switch_active_storyline': {
        const switched = await switchActiveStoryline(params.packageName, action.storylineId);

        return NextResponse.json(
          {
            kind: action.kind,
            activeStorylineId: switched.storyline.storylineId,
          },
          { status: 200 },
        );
      }
    }
  } catch (error) {
    const mapped = mapActionError(error);

    return NextResponse.json(
      {
        error: mapped.message,
      },
      { status: mapped.status },
    );
  }
}
