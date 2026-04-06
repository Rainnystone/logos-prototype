import {
  access,
  readFile as readTextFile,
  rename,
  unlink,
  writeFile as writeTextFile,
} from 'node:fs/promises';
import path from 'node:path';

import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import { parseWithSchema } from '@/lib/validation';
import type {
  RelationshipLayer,
  RuntimeCheckpoint,
  RuntimeSession,
  RuntimeSessionLifecycle,
  RuntimeSessionsFile,
  StateSnapshot,
} from '@/types';
import { RuntimeSessionsFileSchema, assertRuntimeSessionsFileConsistency } from '@/types';

const runtimeSessionsFileName = 'runtime-sessions.json';

const writeQueueByPackage = new Map<string, Promise<void>>();

const emptyRelationshipLayer: RelationshipLayer = {
  highlightedDeltasText: '',
  stableBackgroundText: '',
};

let sessionCounter = 0;

export class RuntimeStoryPackageNotFoundError extends Error {
  readonly packageName: string;

  constructor(packageName: string) {
    super(`Story package "${packageName}" was not found.`);
    this.name = 'RuntimeStoryPackageNotFoundError';
    this.packageName = packageName;
  }
}

export class RuntimeSessionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeSessionConflictError';
  }
}

export interface RecordAcceptedBeatInput {
  readonly packageName: string;
  readonly sessionId: string;
  readonly checkpointId: string;
  readonly lifecycle: RuntimeSessionLifecycle;
  readonly acceptedBeatOrdinal: number;
  readonly phaseIndex: number;
  readonly beatIndex: number;
  readonly sceneId: string;
  readonly roundId: string;
  readonly acceptedTranscript: {
    readonly playerInput: string;
    readonly beatText: string;
  };
  readonly stateSnapshot: StateSnapshot;
  readonly lastStableRelationshipLayer: RelationshipLayer;
}

export interface RecordAcceptedBeatResult {
  readonly file: RuntimeSessionsFile;
  readonly session: RuntimeSession;
  readonly checkpoint: RuntimeCheckpoint;
}

export interface FinalizeRelationshipLayerInput {
  readonly packageName: string;
  readonly sessionId: string;
  readonly checkpointId: string;
  readonly lastStableRelationshipLayer: RelationshipLayer;
}

export interface CreateSessionFromCheckpointInput {
  readonly packageName: string;
  readonly checkpointId: string;
}

export type RuntimeSessionCommand =
  | { kind: 'ensure_active_session' }
  | { kind: 'record_accepted_beat'; payload: RecordAcceptedBeatInput }
  | { kind: 'finalize_relationship_layer'; payload: FinalizeRelationshipLayerInput }
  | { kind: 'reset_workbench' };

export interface RuntimeSessionCommandResult {
  readonly activeSessionId: string;
  readonly activeCheckpointId?: string;
}

function resolveStoryPackageRoot(packageName: string): string {
  return resolvePackageRoot(packageName);
}

export function resolveRuntimeSessionsPath(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), runtimeSessionsFileName);
}

function createEmptyRuntimeSessionsFile(): RuntimeSessionsFile {
  return {
    version: 1,
    activeSessionId: null,
    sessionsById: {},
  };
}

function cloneRelationshipLayer(layer: RelationshipLayer): RelationshipLayer {
  return {
    highlightedDeltasText: layer.highlightedDeltasText,
    stableBackgroundText: layer.stableBackgroundText,
  };
}

function cloneCheckpoint(checkpoint: RuntimeCheckpoint): RuntimeCheckpoint {
  return {
    ...checkpoint,
    acceptedTranscript: {
      playerInput: checkpoint.acceptedTranscript.playerInput,
      beatText: checkpoint.acceptedTranscript.beatText,
    },
    stateSnapshot: structuredClone(checkpoint.stateSnapshot),
    lastStableRelationshipLayer: cloneRelationshipLayer(checkpoint.lastStableRelationshipLayer),
  };
}

function createSessionId(): string {
  sessionCounter += 1;
  return `sess_${Date.now().toString(36)}_${sessionCounter.toString(36)}`;
}

function createBootstrapSession(sessionId: string, timestamp: string): RuntimeSession {
  return {
    sessionId,
    lifecycle: 'awaiting_start',
    createdAt: timestamp,
    updatedAt: timestamp,
    headCheckpointId: null,
    activeCheckpointId: null,
    orderedCheckpointIds: [],
    checkpointsById: {},
    lastStableRelationshipLayer: cloneRelationshipLayer(emptyRelationshipLayer),
  };
}

function validateRuntimeSessionsFile(data: unknown): RuntimeSessionsFile {
  const parsed = parseWithSchema(RuntimeSessionsFileSchema, data, 'runtimeSessionsFile');
  return assertRuntimeSessionsFileConsistency(parsed);
}

async function ensureStoryPackageExists(packageName: string): Promise<void> {
  const packageRoot = resolveStoryPackageRoot(packageName);

  try {
    await access(packageRoot);
  } catch {
    throw new RuntimeStoryPackageNotFoundError(packageName);
  }
}

async function readPersistedRuntimeSessionsFile(filePath: string): Promise<RuntimeSessionsFile> {
  const fileContents = await readTextFile(filePath, 'utf8');
  return validateRuntimeSessionsFile(JSON.parse(fileContents) as unknown);
}

async function loadRuntimeSessionsFileForWrite(packageName: string): Promise<RuntimeSessionsFile> {
  await ensureStoryPackageExists(packageName);
  const filePath = resolveRuntimeSessionsPath(packageName);

  try {
    return await readPersistedRuntimeSessionsFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return createEmptyRuntimeSessionsFile();
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load runtime sessions for "${packageName}" from ${filePath}: ${message}`,
    );
  }
}

async function loadRuntimeSessionsFileForReset(packageName: string): Promise<RuntimeSessionsFile> {
  await ensureStoryPackageExists(packageName);
  const filePath = resolveRuntimeSessionsPath(packageName);

  try {
    return await readPersistedRuntimeSessionsFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return createEmptyRuntimeSessionsFile();
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load runtime sessions for "${packageName}" from ${filePath}: ${message}`,
    );
  }
}

async function writeValidatedRuntimeSessionsFile(
  packageName: string,
  file: RuntimeSessionsFile,
): Promise<void> {
  const filePath = resolveRuntimeSessionsPath(packageName);
  const validatedFile = validateRuntimeSessionsFile(file);
  const serialized = `${JSON.stringify(validatedFile, null, 2)}\n`;
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
  await writeTextFile(tempPath, serialized, 'utf8');

  try {
    await rename(tempPath, filePath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

function runWithPackageWriteQueue<T>(
  packageName: string,
  operation: () => Promise<T>,
): Promise<T> {
  const currentTail = writeQueueByPackage.get(packageName) ?? Promise.resolve();
  const run = currentTail.then(operation, operation);

  writeQueueByPackage.set(
    packageName,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );

  return run;
}

async function readFileFromDisk(packageName: string): Promise<RuntimeSessionsFile | null> {
  await ensureStoryPackageExists(packageName);
  const filePath = resolveRuntimeSessionsPath(packageName);

  try {
    return await readPersistedRuntimeSessionsFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to read runtime sessions for "${packageName}" from ${filePath}: ${message}`,
    );
  }
}

export async function readFile(packageName: string): Promise<RuntimeSessionsFile | null> {
  return readFileFromDisk(packageName);
}

export async function ensureActiveSession(packageName: string): Promise<RuntimeSession> {
  return runWithPackageWriteQueue(packageName, async () => {
    const file = await loadRuntimeSessionsFileForWrite(packageName);

    if (file.activeSessionId !== null) {
      const activeSession = file.sessionsById[file.activeSessionId];
      if (!activeSession) {
        throw new Error(
          `Runtime session consistency violation: activeSessionId "${file.activeSessionId}" does not resolve.`,
        );
      }
      return activeSession;
    }

    const timestamp = new Date().toISOString();
    const session = createBootstrapSession(createSessionId(), timestamp);
    const nextFile: RuntimeSessionsFile = {
      ...file,
      activeSessionId: session.sessionId,
      sessionsById: {
        ...file.sessionsById,
        [session.sessionId]: session,
      },
    };

    await writeValidatedRuntimeSessionsFile(packageName, nextFile);
    return session;
  });
}

export async function setMirroredActiveSession(
  packageName: string,
  sessionId: string,
): Promise<void> {
  return runWithPackageWriteQueue(packageName, async () => {
    const file = await loadRuntimeSessionsFileForWrite(packageName);
    if (!file.sessionsById[sessionId]) {
      throw new Error(
        `Runtime session consistency violation: activeSessionId "${sessionId}" does not resolve.`,
      );
    }

    if (file.activeSessionId === sessionId) {
      return;
    }

    const nextFile: RuntimeSessionsFile = {
      ...file,
      activeSessionId: sessionId,
    };
    await writeValidatedRuntimeSessionsFile(packageName, nextFile);
  });
}

function resolveCheckpointFromGraph(
  file: RuntimeSessionsFile,
  checkpointId: string,
): RuntimeCheckpoint | null {
  for (const session of Object.values(file.sessionsById)) {
    const checkpoint = session.checkpointsById[checkpointId];
    if (checkpoint) {
      return checkpoint;
    }
  }

  return null;
}

export async function createSessionFromCheckpoint(
  input: CreateSessionFromCheckpointInput,
): Promise<RuntimeSession> {
  return runWithPackageWriteQueue(input.packageName, async () => {
    const file = await loadRuntimeSessionsFileForWrite(input.packageName);
    const sourceCheckpoint = resolveCheckpointFromGraph(file, input.checkpointId);

    if (!sourceCheckpoint) {
      throw new RuntimeSessionConflictError(
        `Cannot create runtime session from unknown checkpoint "${input.checkpointId}".`,
      );
    }

    const timestamp = new Date().toISOString();
    const sessionId = createSessionId();
    const checkpoint = cloneCheckpoint(sourceCheckpoint);
    const session: RuntimeSession = {
      sessionId,
      lifecycle: 'in_progress',
      createdAt: timestamp,
      updatedAt: timestamp,
      headCheckpointId: input.checkpointId,
      activeCheckpointId: input.checkpointId,
      orderedCheckpointIds: [input.checkpointId],
      checkpointsById: {
        [input.checkpointId]: checkpoint,
      },
      lastStableRelationshipLayer: cloneRelationshipLayer(checkpoint.lastStableRelationshipLayer),
    };

    const nextFile: RuntimeSessionsFile = {
      ...file,
      activeSessionId: session.sessionId,
      sessionsById: {
        ...file.sessionsById,
        [session.sessionId]: session,
      },
    };
    await writeValidatedRuntimeSessionsFile(input.packageName, nextFile);
    return session;
  });
}

export async function recordAcceptedBeat(
  input: RecordAcceptedBeatInput,
): Promise<RecordAcceptedBeatResult> {
  return runWithPackageWriteQueue(input.packageName, async () => {
    const file = await loadRuntimeSessionsFileForWrite(input.packageName);
    if (file.activeSessionId === null) {
      throw new RuntimeSessionConflictError(
        'Cannot record accepted beat without an active session.',
      );
    }

    if (file.activeSessionId !== input.sessionId) {
      throw new RuntimeSessionConflictError(
        `Cannot record accepted beat for inactive session "${input.sessionId}". Current active session is "${file.activeSessionId}".`,
      );
    }

    const baseSession = file.sessionsById[file.activeSessionId];
    if (!baseSession) {
      throw new Error(
        `Runtime session consistency violation: activeSessionId "${file.activeSessionId}" does not resolve.`,
      );
    }

    if (baseSession.checkpointsById[input.checkpointId]) {
      throw new RuntimeSessionConflictError(
        `Checkpoint "${input.checkpointId}" already exists for active session "${input.sessionId}".`,
      );
    }

    const timestamp = new Date().toISOString();

    const checkpoint: RuntimeCheckpoint = {
      checkpointId: input.checkpointId,
      acceptedBeatOrdinal: input.acceptedBeatOrdinal,
      sceneId: input.sceneId,
      phaseIndex: input.phaseIndex,
      beatIndex: input.beatIndex,
      roundId: input.roundId,
      acceptedTranscript: {
        playerInput: input.acceptedTranscript.playerInput,
        beatText: input.acceptedTranscript.beatText,
      },
      stateSnapshot: input.stateSnapshot,
      lastStableRelationshipLayer: cloneRelationshipLayer(input.lastStableRelationshipLayer),
      createdAt: timestamp,
    };

    const orderedCheckpointIds = baseSession.orderedCheckpointIds.includes(input.checkpointId)
      ? [...baseSession.orderedCheckpointIds]
      : [...baseSession.orderedCheckpointIds, input.checkpointId];

    const updatedSession: RuntimeSession = {
      ...baseSession,
      lifecycle: input.lifecycle,
      updatedAt: timestamp,
      headCheckpointId: input.checkpointId,
      activeCheckpointId: input.checkpointId,
      orderedCheckpointIds,
      checkpointsById: {
        ...baseSession.checkpointsById,
        [input.checkpointId]: checkpoint,
      },
      lastStableRelationshipLayer: cloneRelationshipLayer(input.lastStableRelationshipLayer),
    };

    const nextFile: RuntimeSessionsFile = {
      ...file,
      sessionsById: {
        ...file.sessionsById,
        [file.activeSessionId]: updatedSession,
      },
    };

    await writeValidatedRuntimeSessionsFile(input.packageName, nextFile);

    return {
      file: nextFile,
      session: updatedSession,
      checkpoint,
    };
  });
}

export async function finalizeRelationshipLayer(
  input: FinalizeRelationshipLayerInput,
): Promise<void> {
  return runWithPackageWriteQueue(input.packageName, async () => {
    const file = await loadRuntimeSessionsFileForWrite(input.packageName);
    const session = file.sessionsById[input.sessionId];

    if (!session) {
      return;
    }

    const checkpoint = session.checkpointsById[input.checkpointId];
    if (!checkpoint) {
      return;
    }

    const timestamp = new Date().toISOString();
    const updatedCheckpoint: RuntimeCheckpoint = {
      ...checkpoint,
      lastStableRelationshipLayer: cloneRelationshipLayer(input.lastStableRelationshipLayer),
    };

    const mirrorsToSession =
      file.activeSessionId === input.sessionId &&
      session.headCheckpointId === input.checkpointId &&
      session.activeCheckpointId === input.checkpointId;

    const updatedSession: RuntimeSession = {
      ...session,
      updatedAt: timestamp,
      checkpointsById: {
        ...session.checkpointsById,
        [input.checkpointId]: updatedCheckpoint,
      },
      ...(mirrorsToSession
        ? {
            lastStableRelationshipLayer: cloneRelationshipLayer(
              input.lastStableRelationshipLayer,
            ),
          }
        : {}),
    };

    const nextFile: RuntimeSessionsFile = {
      ...file,
      sessionsById: {
        ...file.sessionsById,
        [input.sessionId]: updatedSession,
      },
    };

    await writeValidatedRuntimeSessionsFile(input.packageName, nextFile);
  });
}

export async function resetWorkbench(packageName: string): Promise<RuntimeSession> {
  return runWithPackageWriteQueue(packageName, async () => {
    const file = await loadRuntimeSessionsFileForReset(packageName);
    const timestamp = new Date().toISOString();
    const session = createBootstrapSession(createSessionId(), timestamp);
    const nextFile: RuntimeSessionsFile = {
      ...file,
      activeSessionId: session.sessionId,
      sessionsById: {
        ...file.sessionsById,
        [session.sessionId]: session,
      },
    };

    await writeValidatedRuntimeSessionsFile(packageName, nextFile);
    return session;
  });
}
