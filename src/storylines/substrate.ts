import { rm } from 'node:fs/promises';
import path from 'node:path';

import * as runtimeSessionsRepository from '@/runtime-sessions/repository';
import type {
  RuntimeSession,
  RuntimeSessionsFile,
  StorylineRecord,
  StorylineRepositoryFile,
  StorylineVariant,
} from '@/types';
import type {
  RuntimeSessionCommand,
  RuntimeSessionCommandResult,
} from '@/runtime-sessions/repository';
import {
  readStorylineRepository,
  readStorylineRepositoryForWrite,
  writeStorylineRepository,
} from '@/storylines/repository';
import {
  promoteStagedVariantWorkspace,
  resolveVariantWorkspaceRoot,
  resolveVariantWorkspaceStageRoot,
  stageVariantWorkspaceFromBaseline,
  stageVariantWorkspaceFromVariant,
} from '@/storylines/workspaces';

const DEFAULT_STORYLINE_ID = 'storyline_main';
const DEFAULT_VARIANT_ID = 'variant_main';
const DEFAULT_STORYLINE_NAME = 'Main Line';

const substrateWriteQueueByPackage = new Map<string, Promise<void>>();
let storylineEntityCounter = 0;

export interface ResolveActiveStorylineContextOptions {
  readonly forWrite: boolean;
}

export interface ActiveStorylineContext {
  readonly packageName: string;
  readonly repository: StorylineRepositoryFile | null;
  readonly storyline: {
    readonly storylineId: string;
    readonly headCheckpointId: string | null;
    readonly variantId: string;
    readonly activeSessionId: string | null;
  };
  readonly variant: {
    readonly variantId: string;
    readonly workspaceRoot: string;
  };
  readonly session: RuntimeSession | null;
  readonly runtimeFile: RuntimeSessionsFile | null;
  readonly authoredRoot: string;
  readonly isLegacyImplicit: boolean;
}

export interface StorylineMutationResult {
  readonly repository: StorylineRepositoryFile;
  readonly storyline: StorylineRecord;
  readonly variant: StorylineVariant;
  readonly session: RuntimeSession;
  readonly authoredRoot: string;
}

export interface CreateStorylineFromSourceInput {
  readonly packageName: string;
  readonly sourceStorylineId: string;
  readonly name: string;
}

export interface BranchStorylineFromCheckpointInput {
  readonly packageName: string;
  readonly sourceStorylineId: string;
  readonly checkpointId: string;
  readonly name: string;
}

function runWithSubstrateWriteQueue<T>(
  packageName: string,
  operation: () => Promise<T>,
): Promise<T> {
  const currentTail = substrateWriteQueueByPackage.get(packageName) ?? Promise.resolve();
  const run = currentTail.then(operation, operation);

  substrateWriteQueueByPackage.set(
    packageName,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );

  return run;
}

function resolveSessionHeadCheckpointId(session: RuntimeSession): string | null {
  return session.activeCheckpointId ?? session.headCheckpointId;
}

function cloneStoryline(
  storyline: StorylineRecord,
  overrides: Partial<StorylineRecord>,
): StorylineRecord {
  return {
    ...storyline,
    ...overrides,
  };
}

function createGeneratedScopedId(prefix: 'storyline' | 'variant'): string {
  storylineEntityCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${storylineEntityCounter.toString(36)}`;
}

function createStageId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function cleanupStageWorkspace(packageName: string, stageId: string): Promise<void> {
  await rm(resolveVariantWorkspaceStageRoot(packageName, stageId), {
    recursive: true,
    force: true,
  }).catch(() => undefined);
}

function resolveLegacyAuthoredRoot(packageName: string): string {
  return path.resolve(process.cwd(), 'src/story-packages', packageName);
}

function resolveVariantAuthoredRoot(packageName: string, variantId: string): string {
  return resolveVariantWorkspaceRoot(packageName, variantId);
}

function resolveBoundSessionOrThrow(
  runtimeFile: RuntimeSessionsFile | null,
  sessionId: string,
  storylineId: string,
): RuntimeSession {
  if (!runtimeFile) {
    throw new Error(
      `Storyline structural mismatch: storyline "${storylineId}" references runtime session "${sessionId}" but runtime-sessions.json is missing.`,
    );
  }

  const session = runtimeFile.sessionsById[sessionId];
  if (!session) {
    throw new Error(
      `Storyline structural mismatch: storyline "${storylineId}" activeSessionId "${sessionId}" does not resolve in runtime-sessions.json.`,
    );
  }

  return session;
}

function resolveVariantOrThrow(
  repository: StorylineRepositoryFile,
  variantId: string,
  storylineId: string,
): StorylineVariant {
  const variant = repository.variantsById[variantId];
  if (!variant) {
    throw new Error(
      `Storyline structural mismatch: storyline "${storylineId}" references unknown variantId "${variantId}".`,
    );
  }

  return variant;
}

function resolveActiveStorylineRecordOrThrow(repository: StorylineRepositoryFile): StorylineRecord {
  const activeStoryline = repository.storylinesById[repository.activeStorylineId];
  if (!activeStoryline) {
    throw new Error(
      `Storyline structural mismatch: activeStorylineId "${repository.activeStorylineId}" does not resolve.`,
    );
  }

  return activeStoryline;
}

function assertCheckpointBelongsToStorylineSession(
  runtimeFile: RuntimeSessionsFile,
  storyline: StorylineRecord,
  checkpointId: string,
): void {
  const boundSession = resolveBoundSessionOrThrow(
    runtimeFile,
    storyline.activeSessionId,
    storyline.storylineId,
  );

  if (!boundSession.checkpointsById[checkpointId]) {
    throw new Error(
      `Cannot branch storyline from checkpoint "${checkpointId}" because it is not reachable from source storyline "${storyline.storylineId}".`,
    );
  }
}

async function bootstrapDefaultStorylineSubstrate(packageName: string): Promise<void> {
  const existingRepository = await readStorylineRepository(packageName);
  if (existingRepository) {
    return;
  }

  const stageId = createStageId('bootstrap');
  let promoted = false;

  try {
    await stageVariantWorkspaceFromBaseline({
      packageName,
      stageId,
    });

    const runtimeBeforeBootstrap = await runtimeSessionsRepository.readFile(packageName);
    const boundSession =
      runtimeBeforeBootstrap && runtimeBeforeBootstrap.activeSessionId
        ? runtimeBeforeBootstrap.sessionsById[runtimeBeforeBootstrap.activeSessionId]
        : null;
    const session =
      boundSession ?? (await runtimeSessionsRepository.ensureActiveSession(packageName));
    const sessionHeadCheckpointId = resolveSessionHeadCheckpointId(session);
    const timestamp = new Date().toISOString();
    const repository: StorylineRepositoryFile = {
      version: 1,
      activeStorylineId: DEFAULT_STORYLINE_ID,
      storylinesById: {
        [DEFAULT_STORYLINE_ID]: {
          storylineId: DEFAULT_STORYLINE_ID,
          name: DEFAULT_STORYLINE_NAME,
          status: 'active',
          sourceCheckpointId: null,
          headCheckpointId: sessionHeadCheckpointId,
          variantId: DEFAULT_VARIANT_ID,
          activeSessionId: session.sessionId,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      variantsById: {
        [DEFAULT_VARIANT_ID]: {
          variantId: DEFAULT_VARIANT_ID,
          workspaceRoot: `variants/${DEFAULT_VARIANT_ID}`,
          createdFromStorylineId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    };

    await promoteStagedVariantWorkspace({
      packageName,
      stageId,
      targetVariantId: DEFAULT_VARIANT_ID,
    });
    promoted = true;

    await writeStorylineRepository(packageName, repository);
  } catch (error) {
    if (!promoted) {
      await cleanupStageWorkspace(packageName, stageId);
    }
    throw error;
  }
}

async function resolveExplicitStorylineContext(
  packageName: string,
): Promise<ActiveStorylineContext> {
  const repository = await readStorylineRepositoryForWrite(packageName);
  const activeStoryline = resolveActiveStorylineRecordOrThrow(repository);
  const variant = resolveVariantOrThrow(
    repository,
    activeStoryline.variantId,
    activeStoryline.storylineId,
  );

  let runtimeFile = await runtimeSessionsRepository.readFile(packageName);
  const runtimeMirrorNeedsRepair = runtimeFile?.activeSessionId !== activeStoryline.activeSessionId;
  if (runtimeMirrorNeedsRepair) {
    await runtimeSessionsRepository.setMirroredActiveSession(packageName, activeStoryline.activeSessionId);
    runtimeFile = await runtimeSessionsRepository.readFile(packageName);
  }

  const boundSession = resolveBoundSessionOrThrow(
    runtimeFile,
    activeStoryline.activeSessionId,
    activeStoryline.storylineId,
  );
  const expectedStorylineHead = resolveSessionHeadCheckpointId(boundSession);
  const storylineHeadNeedsRepair = activeStoryline.headCheckpointId !== expectedStorylineHead;

  let resolvedRepository = repository;
  let resolvedStoryline = activeStoryline;

  if (storylineHeadNeedsRepair) {
    const timestamp = new Date().toISOString();
    resolvedStoryline = cloneStoryline(activeStoryline, {
      headCheckpointId: expectedStorylineHead,
      updatedAt: timestamp,
    });
    resolvedRepository = {
      ...repository,
      storylinesById: {
        ...repository.storylinesById,
        [resolvedStoryline.storylineId]: resolvedStoryline,
      },
    };
    await writeStorylineRepository(packageName, resolvedRepository);
  }

  return {
    packageName,
    repository: resolvedRepository,
    storyline: {
      storylineId: resolvedStoryline.storylineId,
      headCheckpointId: resolvedStoryline.headCheckpointId,
      variantId: resolvedStoryline.variantId,
      activeSessionId: resolvedStoryline.activeSessionId,
    },
    variant: {
      variantId: variant.variantId,
      workspaceRoot: variant.workspaceRoot,
    },
    session: boundSession,
    runtimeFile,
    authoredRoot: resolveVariantAuthoredRoot(packageName, variant.variantId),
    isLegacyImplicit: false,
  };
}

async function resolveActiveStorylineContextInternal(
  packageName: string,
  options: ResolveActiveStorylineContextOptions,
): Promise<ActiveStorylineContext> {
  const repository = await readStorylineRepository(packageName);
  if (repository) {
    return resolveExplicitStorylineContext(packageName);
  }

  if (options.forWrite) {
    await bootstrapDefaultStorylineSubstrate(packageName);
    return resolveExplicitStorylineContext(packageName);
  }

  const runtimeFile = await runtimeSessionsRepository.readFile(packageName);
  const activeSession = runtimeFile?.activeSessionId
    ? runtimeFile.sessionsById[runtimeFile.activeSessionId] ?? null
    : null;
  const sessionHeadCheckpointId = activeSession ? resolveSessionHeadCheckpointId(activeSession) : null;

  return {
    packageName,
    repository: null,
    storyline: {
      storylineId: DEFAULT_STORYLINE_ID,
      headCheckpointId: sessionHeadCheckpointId,
      variantId: DEFAULT_VARIANT_ID,
      activeSessionId: activeSession?.sessionId ?? null,
    },
    variant: {
      variantId: DEFAULT_VARIANT_ID,
      workspaceRoot: '.',
    },
    session: activeSession,
    runtimeFile,
    authoredRoot: resolveLegacyAuthoredRoot(packageName),
    isLegacyImplicit: true,
  };
}

export async function resolveActiveStorylineContext(
  packageName: string,
  options: ResolveActiveStorylineContextOptions,
): Promise<ActiveStorylineContext> {
  return runWithSubstrateWriteQueue(packageName, () =>
    resolveActiveStorylineContextInternal(packageName, options),
  );
}

function assertExplicitContext(
  context: ActiveStorylineContext,
): asserts context is ActiveStorylineContext & {
  repository: StorylineRepositoryFile;
  session: RuntimeSession;
} {
  if (!context.repository || context.isLegacyImplicit || !context.session) {
    throw new Error('Storyline substrate write attempted before explicit repository resolution.');
  }
}

function resolveStorylineForMutationOrThrow(
  repository: StorylineRepositoryFile,
  storylineId: string,
): StorylineRecord {
  const storyline = repository.storylinesById[storylineId];
  if (!storyline) {
    throw new Error(`Storyline "${storylineId}" does not exist.`);
  }
  return storyline;
}

function resolveVariantForMutationOrThrow(
  repository: StorylineRepositoryFile,
  variantId: string,
): StorylineVariant {
  const variant = repository.variantsById[variantId];
  if (!variant) {
    throw new Error(`Variant "${variantId}" does not exist.`);
  }
  return variant;
}

export async function ensureStorylineAwareActiveSession(
  packageName: string,
): Promise<StorylineMutationResult> {
  return runWithSubstrateWriteQueue(packageName, async () => {
    const context = await resolveActiveStorylineContextInternal(packageName, {
      forWrite: true,
    });
    assertExplicitContext(context);

    const storyline = resolveStorylineForMutationOrThrow(
      context.repository,
      context.repository.activeStorylineId,
    );
    const variant = resolveVariantForMutationOrThrow(context.repository, storyline.variantId);

    return {
      repository: context.repository,
      storyline,
      variant,
      session: context.session,
      authoredRoot: resolveVariantAuthoredRoot(packageName, variant.variantId),
    };
  });
}

export async function switchActiveStoryline(
  packageName: string,
  storylineId: string,
): Promise<StorylineMutationResult> {
  return runWithSubstrateWriteQueue(packageName, async () => {
    const context = await resolveActiveStorylineContextInternal(packageName, {
      forWrite: true,
    });
    assertExplicitContext(context);
    const repository = context.repository;
    const targetStoryline = resolveStorylineForMutationOrThrow(repository, storylineId);

    const runtimeFile = await runtimeSessionsRepository.readFile(packageName);
    const boundSession = resolveBoundSessionOrThrow(
      runtimeFile,
      targetStoryline.activeSessionId,
      targetStoryline.storylineId,
    );

    await runtimeSessionsRepository.setMirroredActiveSession(packageName, targetStoryline.activeSessionId);

    const targetHeadCheckpointId = resolveSessionHeadCheckpointId(boundSession);
    const timestamp = new Date().toISOString();
    const updatedTargetStoryline = cloneStoryline(targetStoryline, {
      headCheckpointId: targetHeadCheckpointId,
      updatedAt: timestamp,
    });
    const nextRepository: StorylineRepositoryFile = {
      ...repository,
      activeStorylineId: updatedTargetStoryline.storylineId,
      storylinesById: {
        ...repository.storylinesById,
        [updatedTargetStoryline.storylineId]: updatedTargetStoryline,
      },
    };

    await writeStorylineRepository(packageName, nextRepository);
    const variant = resolveVariantForMutationOrThrow(nextRepository, updatedTargetStoryline.variantId);

    return {
      repository: nextRepository,
      storyline: updatedTargetStoryline,
      variant,
      session: boundSession,
      authoredRoot: resolveVariantAuthoredRoot(packageName, variant.variantId),
    };
  });
}

async function createStorylineFromCheckpointAnchor(
  input: {
    readonly packageName: string;
    readonly sourceStorylineId: string;
    readonly checkpointId: string;
    readonly name: string;
  },
): Promise<StorylineMutationResult> {
  return runWithSubstrateWriteQueue(input.packageName, async () => {
    const context = await resolveActiveStorylineContextInternal(input.packageName, {
      forWrite: true,
    });
    assertExplicitContext(context);
    const repository = context.repository;
    const runtimeFile = context.runtimeFile;
    if (!runtimeFile) {
      throw new Error('Runtime sessions are required when creating or branching storylines.');
    }

    const sourceStoryline = resolveStorylineForMutationOrThrow(repository, input.sourceStorylineId);
    const sourceVariant = resolveVariantForMutationOrThrow(repository, sourceStoryline.variantId);
    assertCheckpointBelongsToStorylineSession(runtimeFile, sourceStoryline, input.checkpointId);

    const storylineId = createGeneratedScopedId('storyline');
    const variantId = createGeneratedScopedId('variant');
    const stageId = createStageId('create_storyline');
    let promoted = false;

    try {
      await stageVariantWorkspaceFromVariant({
        packageName: input.packageName,
        sourceVariantId: sourceVariant.variantId,
        stageId,
      });

      const session = await runtimeSessionsRepository.createSessionFromCheckpoint({
        packageName: input.packageName,
        checkpointId: input.checkpointId,
      });

      await promoteStagedVariantWorkspace({
        packageName: input.packageName,
        stageId,
        targetVariantId: variantId,
      });
      promoted = true;

      const timestamp = new Date().toISOString();
      const storyline: StorylineRecord = {
        storylineId,
        name: input.name,
        status: 'active',
        sourceCheckpointId: input.checkpointId,
        headCheckpointId: input.checkpointId,
        variantId,
        activeSessionId: session.sessionId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const variant: StorylineVariant = {
        variantId,
        workspaceRoot: `variants/${variantId}`,
        createdFromStorylineId: sourceStoryline.storylineId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const nextRepository: StorylineRepositoryFile = {
        ...repository,
        storylinesById: {
          ...repository.storylinesById,
          [storyline.storylineId]: storyline,
        },
        variantsById: {
          ...repository.variantsById,
          [variant.variantId]: variant,
        },
      };

      await writeStorylineRepository(input.packageName, nextRepository);

      return {
        repository: nextRepository,
        storyline,
        variant,
        session,
        authoredRoot: resolveVariantAuthoredRoot(input.packageName, variant.variantId),
      };
    } catch (error) {
      if (!promoted) {
        await cleanupStageWorkspace(input.packageName, stageId);
      }
      throw error;
    }
  });
}

export async function createStorylineFromSource(
  input: CreateStorylineFromSourceInput,
): Promise<StorylineMutationResult> {
  const context = await resolveActiveStorylineContext(input.packageName, {
    forWrite: true,
  });
  assertExplicitContext(context);

  const sourceStoryline = resolveStorylineForMutationOrThrow(context.repository, input.sourceStorylineId);
  if (!sourceStoryline.headCheckpointId) {
    throw new Error(
      `Cannot create storyline from source "${input.sourceStorylineId}" because source headCheckpointId is null.`,
    );
  }

  return createStorylineFromCheckpointAnchor({
    packageName: input.packageName,
    sourceStorylineId: input.sourceStorylineId,
    checkpointId: sourceStoryline.headCheckpointId,
    name: input.name,
  });
}

export async function branchStorylineFromCheckpoint(
  input: BranchStorylineFromCheckpointInput,
): Promise<StorylineMutationResult> {
  return createStorylineFromCheckpointAnchor({
    packageName: input.packageName,
    sourceStorylineId: input.sourceStorylineId,
    checkpointId: input.checkpointId,
    name: input.name,
  });
}

export async function executeStorylineRuntimeSessionCommand(
  packageName: string,
  command: RuntimeSessionCommand,
): Promise<RuntimeSessionCommandResult> {
  return runWithSubstrateWriteQueue(packageName, async () => {
    switch (command.kind) {
      case 'ensure_active_session': {
        const context = await resolveActiveStorylineContextInternal(packageName, {
          forWrite: true,
        });
        assertExplicitContext(context);
        return {
          activeSessionId: context.session.sessionId,
        };
      }

      case 'record_accepted_beat': {
        const context = await resolveActiveStorylineContextInternal(packageName, {
          forWrite: true,
        });
        assertExplicitContext(context);

        const persisted = await runtimeSessionsRepository.recordAcceptedBeat({
          ...command.payload,
          packageName,
        });

        const activeStoryline = resolveStorylineForMutationOrThrow(
          context.repository,
          context.repository.activeStorylineId,
        );
        const timestamp = new Date().toISOString();
        const updatedStoryline = cloneStoryline(activeStoryline, {
          activeSessionId: persisted.session.sessionId,
          headCheckpointId: persisted.session.activeCheckpointId ?? persisted.session.headCheckpointId,
          updatedAt: timestamp,
        });
        const nextRepository: StorylineRepositoryFile = {
          ...context.repository,
          storylinesById: {
            ...context.repository.storylinesById,
            [updatedStoryline.storylineId]: updatedStoryline,
          },
        };
        await writeStorylineRepository(packageName, nextRepository);

        return {
          activeSessionId: persisted.session.sessionId,
          activeCheckpointId: persisted.checkpoint.checkpointId,
        };
      }

      case 'finalize_relationship_layer': {
        const context = await resolveActiveStorylineContextInternal(packageName, {
          forWrite: true,
        });
        assertExplicitContext(context);

        if (command.payload.sessionId !== context.session.sessionId) {
          throw new runtimeSessionsRepository.RuntimeSessionConflictError(
            'Cannot finalize relationship layer for a session outside the active storyline binding.',
          );
        }

        if (!context.session.checkpointsById[command.payload.checkpointId]) {
          throw new runtimeSessionsRepository.RuntimeSessionConflictError(
            `Cannot finalize relationship layer for checkpoint "${command.payload.checkpointId}" because it is not part of the active storyline session.`,
          );
        }

        await runtimeSessionsRepository.finalizeRelationshipLayer({
          ...command.payload,
          packageName,
        });
        return {
          activeSessionId: command.payload.sessionId,
          activeCheckpointId: command.payload.checkpointId,
        };
      }

      case 'reset_workbench': {
        const context = await resolveActiveStorylineContextInternal(packageName, {
          forWrite: true,
        });
        assertExplicitContext(context);
        const session = await runtimeSessionsRepository.resetWorkbench(packageName);
        const activeStoryline = resolveStorylineForMutationOrThrow(
          context.repository,
          context.repository.activeStorylineId,
        );
        const timestamp = new Date().toISOString();
        const updatedStoryline = cloneStoryline(activeStoryline, {
          activeSessionId: session.sessionId,
          headCheckpointId: null,
          updatedAt: timestamp,
        });
        const nextRepository: StorylineRepositoryFile = {
          ...context.repository,
          storylinesById: {
            ...context.repository.storylinesById,
            [updatedStoryline.storylineId]: updatedStoryline,
          },
        };
        await writeStorylineRepository(packageName, nextRepository);

        return {
          activeSessionId: session.sessionId,
        };
      }

      default: {
        throw new Error('Unsupported runtime session command.');
      }
    }
  });
}
