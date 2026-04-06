import { listStoryPackageCatalog } from '@/app/story-package-catalog';
import { resolveActiveStorylineContext } from '@/storylines/substrate';
import type {
  RuntimeCheckpoint,
  RuntimeSession,
  StorylineRecord,
  StorylineRepositoryFile,
  StoryPackageManagementCheckpointNode,
  StoryPackageManagementStorylineRowView,
  StoryPackageManagementWorkspaceView,
} from '@/types';

function compactText(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

function summarizeCheckpointTranscript(checkpoint: RuntimeCheckpoint): string | null {
  const playerInput = compactText(checkpoint.acceptedTranscript.playerInput, 48);
  const beatText = compactText(checkpoint.acceptedTranscript.beatText, 72);
  const summaryParts = [playerInput, beatText].filter((part) => part.length > 0);

  if (summaryParts.length === 0) {
    return null;
  }

  return summaryParts.join(' · ');
}

function resolveBoundSessionOrThrow(
  runtimeFile: NonNullable<Awaited<ReturnType<typeof resolveActiveStorylineContext>>['runtimeFile']>,
  storyline: StorylineRecord,
): RuntimeSession {
  const session = runtimeFile.sessionsById[storyline.activeSessionId];
  if (!session) {
    throw new Error(
      `Storyline structural mismatch: storyline "${storyline.storylineId}" activeSessionId "${storyline.activeSessionId}" does not resolve in runtime-sessions.json.`,
    );
  }

  return session;
}

function buildCheckpointRail(
  session: RuntimeSession,
  storyline: StorylineRecord,
): StoryPackageManagementCheckpointNode[] {
  return session.orderedCheckpointIds.map((checkpointId) => {
    const checkpoint = session.checkpointsById[checkpointId];
    if (!checkpoint) {
      throw new Error(
        `Storyline structural mismatch: checkpoint "${checkpointId}" does not resolve in session "${session.sessionId}" for storyline "${storyline.storylineId}".`,
      );
    }

    return {
      checkpointId: checkpoint.checkpointId,
      acceptedBeatOrdinal: checkpoint.acceptedBeatOrdinal,
      phaseIndex: checkpoint.phaseIndex,
      beatIndex: checkpoint.beatIndex,
      isHead: storyline.headCheckpointId === checkpoint.checkpointId,
      isBranchSource: storyline.sourceCheckpointId === checkpoint.checkpointId,
    };
  });
}

function buildStorylineRow(
  storyline: StorylineRecord,
  activeStorylineId: string,
  session: RuntimeSession | null,
): StoryPackageManagementStorylineRowView {
  const isActive = storyline.storylineId === activeStorylineId;
  const headCheckpointId = storyline.headCheckpointId;
  const headCheckpoint =
    session && headCheckpointId ? session.checkpointsById[headCheckpointId] ?? null : null;

  if (headCheckpointId && !headCheckpoint) {
    throw new Error(
      `Storyline structural mismatch: storyline "${storyline.storylineId}" headCheckpointId "${headCheckpointId}" does not resolve in runtime-sessions.json.`,
    );
  }

  const checkpointRail = session ? buildCheckpointRail(session, storyline) : [];

  return {
    storylineId: storyline.storylineId,
    displayName: storyline.name,
    status: storyline.status,
    isActive,
    sourceCheckpointId: storyline.sourceCheckpointId,
    headCheckpointId,
    headSummary: headCheckpoint ? summarizeCheckpointTranscript(headCheckpoint) : null,
    canCreateFromSource: headCheckpointId !== null,
    canContinue: session !== null,
    checkpointRail,
  };
}

function buildRepositoryWorkspaceView(
  packages: Awaited<ReturnType<typeof listStoryPackageCatalog>>,
  packageName: string,
  repository: StorylineRepositoryFile,
  runtimeFile: NonNullable<Awaited<ReturnType<typeof resolveActiveStorylineContext>>['runtimeFile']>,
): StoryPackageManagementWorkspaceView {
  const activeStorylineId = repository.activeStorylineId;
  const storylines = Object.values(repository.storylinesById)
    .map((storyline) => {
      const session = resolveBoundSessionOrThrow(runtimeFile, storyline);
      return buildStorylineRow(storyline, activeStorylineId, session);
    })
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }

      const nameComparison = left.displayName.localeCompare(right.displayName);
      if (nameComparison !== 0) {
        return nameComparison;
      }

      return left.storylineId.localeCompare(right.storylineId);
    });

  return {
    packages: [...packages],
    packageName,
    activeStorylineId,
    storylines,
  };
}

function buildLegacyWorkspaceView(
  packages: Awaited<ReturnType<typeof listStoryPackageCatalog>>,
  packageName: string,
  context: Awaited<ReturnType<typeof resolveActiveStorylineContext>>,
): StoryPackageManagementWorkspaceView {
  const activeStorylineId = context.storyline.storylineId;
  const storyline = {
    storylineId: context.storyline.storylineId,
    name: 'Main Line',
    status: 'active',
    sourceCheckpointId: null,
    headCheckpointId: context.storyline.headCheckpointId,
    variantId: context.storyline.variantId,
    activeSessionId: context.storyline.activeSessionId ?? '',
    createdAt: '',
    updatedAt: '',
  } satisfies StorylineRecord;

  return {
    packages: [...packages],
    packageName,
    activeStorylineId,
    storylines: [
      buildStorylineRow(storyline, activeStorylineId, context.session),
    ],
  };
}

export async function loadStoryPackageManagementWorkspaceView(
  packageName: string,
): Promise<StoryPackageManagementWorkspaceView> {
  const packages = await listStoryPackageCatalog();
  const context = await resolveActiveStorylineContext(packageName, {
    forWrite: false,
  });

  if (context.repository) {
    if (!context.runtimeFile) {
      throw new Error(
        `Storyline structural mismatch: repository for "${packageName}" resolved without runtime-sessions.json.`,
      );
    }

    return buildRepositoryWorkspaceView(
      packages,
      packageName,
      context.repository,
      context.runtimeFile,
    );
  }

  return buildLegacyWorkspaceView(packages, packageName, context);
}
