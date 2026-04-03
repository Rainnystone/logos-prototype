import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import * as repository from '@/runtime-sessions/repository';
import type { RuntimeSessionsFile, RelationshipLayer, StateSnapshot } from '@/types';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');

function makeRelationshipLayer(suffix = ''): RelationshipLayer {
  return {
    highlightedDeltasText: suffix ? `delta-${suffix}` : 'delta',
    stableBackgroundText: suffix ? `background-${suffix}` : 'background',
  };
}

function makeStateSnapshot(): StateSnapshot {
  return {
    sceneState: {
      sceneId: 'scene_opening',
      currentPhaseIndex: 1,
      currentBeatIndexInPhase: 1,
      mainAxis: 'main-axis',
      endLine: 'end-line',
      alpha: 'alpha',
      beta: 'beta',
      sceneProgress: 'scene-progress',
      phaseConsequences: [],
    },
    roundState: {
      phaseGoal: 'phase-goal',
      currentVolume: 'Med',
      currentRouter: 'router',
      verbLexicon: ['observe'],
      historyWindow: [],
      directorConstraints: '',
    },
    generationState: {
      directorNoteSummary: 'director summary',
      promptObject: {},
      currentBeatText: 'beat',
      currentOptions: [],
    },
    evaluationState: {
      auditAnswers: [],
      blockingFailures: [],
      retryCount: 0,
      rewriteFeedback: null,
    },
  };
}

async function writeRuntimeSessionsFile(
  packageName: string,
  file: RuntimeSessionsFile,
): Promise<void> {
  const filePath = path.resolve(storyPackagesRoot, packageName, 'runtime-sessions.json');
  await writeFile(filePath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

describe('runtime sessions repository', () => {
  it('returns null when runtime-sessions.json is missing', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-missing-'));
    const packageName = path.basename(packageRoot);

    try {
      await expect(repository.readFile(packageName)).resolves.toBeNull();
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('rejects runtime files whose session or checkpoint pointers do not resolve', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-invalid-'));
    const packageName = path.basename(packageRoot);

    try {
      await writeRuntimeSessionsFile(packageName, {
        version: 1,
        activeSessionId: 'sess_missing',
        sessionsById: {
          sess_01: {
            sessionId: 'sess_01',
            lifecycle: 'in_progress',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:01.000Z',
            headCheckpointId: 'chk_missing',
            activeCheckpointId: 'chk_missing',
            orderedCheckpointIds: [],
            checkpointsById: {},
            lastStableRelationshipLayer: makeRelationshipLayer(),
          },
        },
      });

      await expect(repository.readFile(packageName)).rejects.toThrow(
        /runtime session consistency/i,
      );
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('creates a bootstrap session when the runtime file is missing', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-bootstrap-'));
    const packageName = path.basename(packageRoot);

    try {
      const session = await repository.ensureActiveSession(packageName);

      expect(session).toMatchObject({
        lifecycle: 'awaiting_start',
        headCheckpointId: null,
        activeCheckpointId: null,
        orderedCheckpointIds: [],
      });
      expect(session.createdAt).toEqual(expect.any(String));
      expect(session.updatedAt).toEqual(expect.any(String));
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('advances session head pointers when appending an accepted beat checkpoint', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-append-'));
    const packageName = path.basename(packageRoot);

    try {
      const activeSession = await repository.ensureActiveSession(packageName);
      const { session } = await repository.recordAcceptedBeat({
        packageName,
        sessionId: activeSession.sessionId,
        checkpointId: 'chk_01',
        lifecycle: 'in_progress',
        acceptedBeatOrdinal: 1,
        phaseIndex: 1,
        beatIndex: 1,
        sceneId: 'scene_opening',
        roundId: 'round_01',
        acceptedTranscript: {
          playerInput: 'open the door',
          beatText: 'The door swings open.',
        },
        stateSnapshot: makeStateSnapshot(),
        lastStableRelationshipLayer: makeRelationshipLayer(),
      });

      expect(session.headCheckpointId).toBe('chk_01');
      expect(session.activeCheckpointId).toBe('chk_01');
      expect(session.orderedCheckpointIds).toEqual(['chk_01']);
      expect(session.updatedAt).toEqual(expect.any(String));
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('persists lifecycle transitions provided by accepted-beat writes', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-lifecycle-'));
    const packageName = path.basename(packageRoot);

    try {
      const activeSession = await repository.ensureActiveSession(packageName);
      const first = await repository.recordAcceptedBeat({
        packageName,
        sessionId: activeSession.sessionId,
        checkpointId: 'chk_01',
        lifecycle: 'in_progress',
        acceptedBeatOrdinal: 1,
        phaseIndex: 1,
        beatIndex: 1,
        sceneId: 'scene_opening',
        roundId: 'round_01',
        acceptedTranscript: {
          playerInput: 'open the door',
          beatText: 'The door swings open.',
        },
        stateSnapshot: makeStateSnapshot(),
        lastStableRelationshipLayer: makeRelationshipLayer(),
      });

      const final = await repository.recordAcceptedBeat({
        packageName,
        sessionId: activeSession.sessionId,
        checkpointId: 'chk_02',
        lifecycle: 'complete',
        acceptedBeatOrdinal: 2,
        phaseIndex: 1,
        beatIndex: 2,
        sceneId: 'scene_opening',
        roundId: 'round_02',
        acceptedTranscript: {
          playerInput: 'step through',
          beatText: 'You step through into the ending state.',
        },
        stateSnapshot: makeStateSnapshot(),
        lastStableRelationshipLayer: makeRelationshipLayer(),
      });

      expect(first.session.lifecycle).toBe('in_progress');
      expect(final.session.lifecycle).toBe('complete');
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('rejects duplicate checkpoint ids without overwriting the existing accepted checkpoint', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-duplicate-'));
    const packageName = path.basename(packageRoot);

    try {
      const activeSession = await repository.ensureActiveSession(packageName);
      const initialWrite = await repository.recordAcceptedBeat({
        packageName,
        sessionId: activeSession.sessionId,
        checkpointId: 'chk_duplicate',
        lifecycle: 'in_progress',
        acceptedBeatOrdinal: 1,
        phaseIndex: 1,
        beatIndex: 1,
        sceneId: 'scene_opening',
        roundId: 'round_01',
        acceptedTranscript: {
          playerInput: 'open the door',
          beatText: 'The door swings open.',
        },
        stateSnapshot: makeStateSnapshot(),
        lastStableRelationshipLayer: makeRelationshipLayer(),
      });

      await expect(
        repository.recordAcceptedBeat({
          packageName,
          sessionId: activeSession.sessionId,
          checkpointId: 'chk_duplicate',
          lifecycle: 'complete',
          acceptedBeatOrdinal: 99,
          phaseIndex: 4,
          beatIndex: 4,
          sceneId: 'scene_override_attempt',
          roundId: 'round_override',
          acceptedTranscript: {
            playerInput: 'override the checkpoint',
            beatText: 'This should never replace the original checkpoint.',
          },
          stateSnapshot: makeStateSnapshot(),
          lastStableRelationshipLayer: makeRelationshipLayer('override'),
        }),
      ).rejects.toThrow(/checkpoint/i);

      const file = await repository.readFile(packageName);
      expect(file).not.toBeNull();
      if (!file) {
        throw new Error('Expected runtime sessions file to exist.');
      }

      const persistedSession = file.sessionsById[activeSession.sessionId];
      if (!persistedSession) {
        throw new Error('Expected active session to remain persisted.');
      }
      expect(persistedSession.checkpointsById.chk_duplicate).toEqual(initialWrite.checkpoint);
      expect(persistedSession.orderedCheckpointIds).toEqual(['chk_duplicate']);
      expect(persistedSession.headCheckpointId).toBe('chk_duplicate');
      expect(persistedSession.lifecycle).toBe('in_progress');
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('serializes conflicting writes so stale finalization cannot overwrite a newer active session', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-serial-'));
    const packageName = path.basename(packageRoot);

    try {
      const firstActiveSession = await repository.ensureActiveSession(packageName);
      await repository.recordAcceptedBeat({
        packageName,
        sessionId: firstActiveSession.sessionId,
        checkpointId: 'chk_01',
        lifecycle: 'in_progress',
        acceptedBeatOrdinal: 1,
        phaseIndex: 1,
        beatIndex: 1,
        sceneId: 'scene_opening',
        roundId: 'round_01',
        acceptedTranscript: {
          playerInput: 'open the door',
          beatText: 'The door swings open.',
        },
        stateSnapshot: makeStateSnapshot(),
        lastStableRelationshipLayer: makeRelationshipLayer(),
      });

      const staleFinalize = repository.finalizeRelationshipLayer({
        packageName,
        sessionId: firstActiveSession.sessionId,
        checkpointId: 'chk_01',
        lastStableRelationshipLayer: makeRelationshipLayer('stale'),
      });
      const reset = repository.resetWorkbench(packageName);

      await Promise.allSettled([staleFinalize, reset]);

      const file = await repository.readFile(packageName);
      expect(file).not.toBeNull();
      if (!file) {
        throw new Error('Expected runtime sessions file to exist.');
      }
      const nextActiveSession = file.activeSessionId ? file.sessionsById[file.activeSessionId] : null;

      expect(nextActiveSession?.sessionId).not.toBe(firstActiveSession.sessionId);
      expect(nextActiveSession?.lastStableRelationshipLayer).not.toEqual(
        makeRelationshipLayer('stale'),
      );
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('does not return diagnostics payload from relationship-layer finalization', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-finalize-'));
    const packageName = path.basename(packageRoot);

    try {
      const activeSession = await repository.ensureActiveSession(packageName);
      await repository.recordAcceptedBeat({
        packageName,
        sessionId: activeSession.sessionId,
        checkpointId: 'chk_01',
        lifecycle: 'in_progress',
        acceptedBeatOrdinal: 1,
        phaseIndex: 1,
        beatIndex: 1,
        sceneId: 'scene_opening',
        roundId: 'round_01',
        acceptedTranscript: {
          playerInput: 'open the door',
          beatText: 'The door swings open.',
        },
        stateSnapshot: makeStateSnapshot(),
        lastStableRelationshipLayer: makeRelationshipLayer(),
      });

      const result = await repository.finalizeRelationshipLayer({
        packageName,
        sessionId: activeSession.sessionId,
        checkpointId: 'chk_01',
        lastStableRelationshipLayer: makeRelationshipLayer('settled'),
      });

      expect(result).toBeUndefined();
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('rejects accepted-beat writes that do not target the current active session', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-stale-'));
    const packageName = path.basename(packageRoot);

    try {
      const previousActiveSession = await repository.ensureActiveSession(packageName);
      await repository.resetWorkbench(packageName);

      await expect(
        repository.recordAcceptedBeat({
          packageName,
          sessionId: previousActiveSession.sessionId,
          checkpointId: 'chk_stale',
          lifecycle: 'in_progress',
          acceptedBeatOrdinal: 1,
          phaseIndex: 1,
          beatIndex: 1,
          sceneId: 'scene_opening',
          roundId: 'round_stale',
          acceptedTranscript: {
            playerInput: 'stale input',
            beatText: 'stale beat',
          },
          stateSnapshot: makeStateSnapshot(),
          lastStableRelationshipLayer: makeRelationshipLayer('stale'),
        }),
      ).rejects.toThrow(/active session/i);

      const file = await repository.readFile(packageName);
      expect(file).not.toBeNull();
      if (!file) {
        throw new Error('Expected runtime sessions file to exist.');
      }
      expect(file.activeSessionId).not.toBe(previousActiveSession.sessionId);
      expect(file.sessionsById[previousActiveSession.sessionId]?.checkpointsById.chk_stale).toBeUndefined();
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('writes runtime sessions with stable JSON formatting', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-format-'));
    const packageName = path.basename(packageRoot);

    try {
      await repository.ensureActiveSession(packageName);

      const contents = await readFile(
        path.resolve(packageRoot, 'runtime-sessions.json'),
        'utf8',
      );

      expect(contents.endsWith('\n')).toBe(true);
      expect(contents).toContain('\n  "version": 1,');
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('cleans up temporary runtime-session write files after successful persistence', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-atomic-'));
    const packageName = path.basename(packageRoot);

    try {
      await repository.ensureActiveSession(packageName);
      const activeSession = await repository.ensureActiveSession(packageName);
      await repository.recordAcceptedBeat({
        packageName,
        sessionId: activeSession.sessionId,
        checkpointId: 'chk_atomic',
        lifecycle: 'in_progress',
        acceptedBeatOrdinal: 1,
        phaseIndex: 1,
        beatIndex: 1,
        sceneId: 'scene_opening',
        roundId: 'round_atomic',
        acceptedTranscript: {
          playerInput: 'atomic input',
          beatText: 'atomic beat',
        },
        stateSnapshot: makeStateSnapshot(),
        lastStableRelationshipLayer: makeRelationshipLayer('atomic'),
      });

      const entries = await readdir(packageRoot);
      const tempArtifacts = entries.filter((entry) =>
        entry.startsWith('runtime-sessions.json.tmp-'),
      );
      expect(tempArtifacts).toEqual([]);
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('rebuilds a fresh bootstrap session when reset_workbench encounters a corrupt runtime file', async () => {
    const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'tmp-runtime-reset-corrupt-'));
    const packageName = path.basename(packageRoot);
    const runtimeSessionsPath = path.resolve(packageRoot, 'runtime-sessions.json');

    try {
      await writeFile(runtimeSessionsPath, '{"version":1,"activeSessionId":"oops"', 'utf8');

      const session = await repository.resetWorkbench(packageName);
      const file = await repository.readFile(packageName);

      expect(session.lifecycle).toBe('awaiting_start');
      expect(session.headCheckpointId).toBeNull();
      expect(file).not.toBeNull();
      if (!file) {
        throw new Error('Expected runtime sessions file to exist.');
      }
      expect(file.activeSessionId).toBe(session.sessionId);
      expect(file.sessionsById[session.sessionId]).toMatchObject({
        sessionId: session.sessionId,
        lifecycle: 'awaiting_start',
        orderedCheckpointIds: [],
      });
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });

  it('fails reset_workbench and preserves the file when runtime data is parseable but inconsistent', async () => {
    const packageRoot = await mkdtemp(
      path.resolve(storyPackagesRoot, 'tmp-runtime-reset-inconsistent-'),
    );
    const packageName = path.basename(packageRoot);
    const runtimeSessionsPath = path.resolve(packageRoot, 'runtime-sessions.json');

    try {
      const invalidFile: RuntimeSessionsFile = {
        version: 1,
        activeSessionId: 'sess_missing',
        sessionsById: {
          sess_01: {
            sessionId: 'sess_01',
            lifecycle: 'in_progress',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:01.000Z',
            headCheckpointId: null,
            activeCheckpointId: null,
            orderedCheckpointIds: [],
            checkpointsById: {},
            lastStableRelationshipLayer: makeRelationshipLayer(),
          },
        },
      };
      const originalContents = `${JSON.stringify(invalidFile, null, 2)}\n`;
      await writeFile(runtimeSessionsPath, originalContents, 'utf8');

      await expect(repository.resetWorkbench(packageName)).rejects.toThrow(
        /runtime session consistency violation/i,
      );

      await expect(readFile(runtimeSessionsPath, 'utf8')).resolves.toBe(originalContents);
    } finally {
      await rm(packageRoot, { recursive: true, force: true });
    }
  });
});
