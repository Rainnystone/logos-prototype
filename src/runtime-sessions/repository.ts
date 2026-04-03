import { access, readFile as readTextFile, writeFile as writeTextFile } from 'node:fs/promises';
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
import { RuntimeSessionsFileSchema } from '@/types';

const runtimeSessionsFileName = 'runtime-sessions.json';

const writeQueueByPackage = new Map<string, Promise<void>>();

const emptyRelationshipLayer: RelationshipLayer = {
  highlightedDeltasText: '',
  stableBackgroundText: '',
};

let sessionCounter = 0;

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

export interface FinalizeRelationshipLayerResult {
  readonly applied: boolean;
  readonly mirroredToSession: boolean;
  readonly file: RuntimeSessionsFile;
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

function assertRuntimeSessionConsistency(file: RuntimeSessionsFile): RuntimeSessionsFile {
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

function validateRuntimeSessionsFile(data: unknown): RuntimeSessionsFile {
  const parsed = parseWithSchema(RuntimeSessionsFileSchema, data, 'runtimeSessionsFile');
  return assertRuntimeSessionConsistency(parsed);
}

async function ensureStoryPackageExists(packageName: string): Promise<void> {
  const packageRoot = resolveStoryPackageRoot(packageName);

  try {
    await access(packageRoot);
  } catch {
    throw new Error(`Story package "${packageName}" was not found at ${packageRoot}.`);
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

async function writeValidatedRuntimeSessionsFile(
  packageName: string,
  file: RuntimeSessionsFile,
): Promise<void> {
  const filePath = resolveRuntimeSessionsPath(packageName);
  const validatedFile = validateRuntimeSessionsFile(file);
  const serialized = `${JSON.stringify(validatedFile, null, 2)}\n`;
  await writeTextFile(filePath, serialized, 'utf8');
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

export async function readFileFromDisk(packageName: string): Promise<RuntimeSessionsFile> {
  await ensureStoryPackageExists(packageName);
  const filePath = resolveRuntimeSessionsPath(packageName);

  try {
    return await readPersistedRuntimeSessionsFile(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to read runtime sessions for "${packageName}" from ${filePath}: ${message}`,
    );
  }
}

export async function readFile(packageName: string): Promise<RuntimeSessionsFile> {
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

export async function recordAcceptedBeat(
  input: RecordAcceptedBeatInput,
): Promise<RecordAcceptedBeatResult> {
  return runWithPackageWriteQueue(input.packageName, async () => {
    const file = await loadRuntimeSessionsFileForWrite(input.packageName);
    const timestamp = new Date().toISOString();
    const existingSession = file.sessionsById[input.sessionId];
    const baseSession =
      existingSession ?? createBootstrapSession(input.sessionId, timestamp);

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
      activeSessionId: input.sessionId,
      sessionsById: {
        ...file.sessionsById,
        [input.sessionId]: updatedSession,
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
): Promise<FinalizeRelationshipLayerResult> {
  return runWithPackageWriteQueue(input.packageName, async () => {
    const file = await loadRuntimeSessionsFileForWrite(input.packageName);
    const session = file.sessionsById[input.sessionId];

    if (!session) {
      return {
        applied: false,
        mirroredToSession: false,
        file,
      };
    }

    const checkpoint = session.checkpointsById[input.checkpointId];
    if (!checkpoint) {
      return {
        applied: false,
        mirroredToSession: false,
        file,
      };
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

    return {
      applied: true,
      mirroredToSession: mirrorsToSession,
      file: nextFile,
    };
  });
}

export async function resetWorkbench(packageName: string): Promise<RuntimeSession> {
  return runWithPackageWriteQueue(packageName, async () => {
    const file = await loadRuntimeSessionsFileForWrite(packageName);
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
