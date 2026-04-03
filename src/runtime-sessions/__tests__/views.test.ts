import { cpSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadAuthoringState } from '@/authoring/persistence/package-state';
import { loadEditRuntimeContinuityView, loadPlayRuntimeSessionView } from '@/runtime-sessions/views';
import type { RuntimeSessionsFile, StateSnapshot } from '@/types';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const sourcePackageName = 'sample-scene';
const testPackageName = '__runtime-session-views-test__';
const testPackagePath = path.resolve(storyPackagesRoot, testPackageName);

function resetTestPackage(): void {
  rmSync(testPackagePath, { recursive: true, force: true });
}

function prepareTestPackage(): void {
  resetTestPackage();
  cpSync(path.resolve(storyPackagesRoot, sourcePackageName), testPackagePath, {
    recursive: true,
  });
}

function makeStateSnapshot(beatText: string): StateSnapshot {
  return {
    sceneState: {
      sceneId: 'scene_opening',
      currentPhaseIndex: 1,
      currentBeatIndexInPhase: 1,
      mainAxis: 'main-axis',
      endLine: 'end-line',
      alpha: 'alpha',
      beta: 'beta',
      sceneProgress: beatText,
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
      currentBeatText: beatText,
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

async function writeRuntimeSessionsFile(file: RuntimeSessionsFile): Promise<void> {
  const runtimeSessionsPath = path.resolve(testPackagePath, 'runtime-sessions.json');
  await writeFile(runtimeSessionsPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

async function writeValidRuntimeSessionsFile(): Promise<void> {
  await writeRuntimeSessionsFile({
    version: 1,
    activeSessionId: 'sess_01',
    sessionsById: {
      sess_01: {
        sessionId: 'sess_01',
        lifecycle: 'in_progress',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:05.000Z',
        headCheckpointId: 'chk_02',
        activeCheckpointId: 'chk_02',
        orderedCheckpointIds: ['chk_01', 'chk_02'],
        checkpointsById: {
          chk_01: {
            checkpointId: 'chk_01',
            acceptedBeatOrdinal: 1,
            sceneId: 'scene_opening',
            phaseIndex: 1,
            beatIndex: 1,
            roundId: 'round_01',
            acceptedTranscript: {
              playerInput: 'open the door',
              beatText: 'The door swings open.',
            },
            stateSnapshot: makeStateSnapshot('The door swings open.'),
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'checkpoint delta',
              stableBackgroundText: 'checkpoint background',
            },
            createdAt: '2026-04-03T00:00:01.000Z',
          },
          chk_02: {
            checkpointId: 'chk_02',
            acceptedBeatOrdinal: 2,
            sceneId: 'scene_opening',
            phaseIndex: 1,
            beatIndex: 2,
            roundId: 'round_02',
            acceptedTranscript: {
              playerInput: 'step through',
              beatText: 'You step through into the ending state.',
            },
            stateSnapshot: makeStateSnapshot('You step through into the ending state.'),
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'active checkpoint delta',
              stableBackgroundText: 'active checkpoint background',
            },
            createdAt: '2026-04-03T00:00:02.000Z',
          },
        },
        lastStableRelationshipLayer: {
          highlightedDeltasText: 'session delta',
          stableBackgroundText: 'session background',
        },
      },
    },
  });
}

async function writeInvalidRuntimeSessionsFile(): Promise<void> {
  await writeRuntimeSessionsFile({
    version: 1,
    activeSessionId: 'sess_missing',
    sessionsById: {},
  });
}

async function writeAwaitingStartRuntimeSessionsFile(): Promise<void> {
  await writeRuntimeSessionsFile({
    version: 1,
    activeSessionId: 'sess_bootstrap',
    sessionsById: {
      sess_bootstrap: {
        sessionId: 'sess_bootstrap',
        lifecycle: 'awaiting_start',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
        headCheckpointId: null,
        activeCheckpointId: null,
        orderedCheckpointIds: [],
        checkpointsById: {},
        lastStableRelationshipLayer: {
          highlightedDeltasText: '',
          stableBackgroundText: '',
        },
      },
    },
  });
}

afterEach(() => {
  resetTestPackage();
});

describe('runtime session views', () => {
  it('builds a play continuity view from the active session head checkpoint', async () => {
    prepareTestPackage();
    await writeValidRuntimeSessionsFile();

    const view = await loadPlayRuntimeSessionView(testPackageName);

    expect(view.kind).toBe('restorable');
    expect(view.activeSessionId).toBe('sess_01');
    expect(view.activeCheckpointId).toBe('chk_02');
    expect(view.beatHistory).toHaveLength(2);
  });

  it('returns an unavailable continuity view instead of silently bootstrapping when the runtime file is invalid', async () => {
    prepareTestPackage();
    await writeInvalidRuntimeSessionsFile();

    const view = await loadPlayRuntimeSessionView(testPackageName);

    expect(view.kind).toBe('unavailable');
    expect(view.reason).toBe('Runtime continuity is unavailable. Reset the workbench to continue.');
    expect(view.reason).not.toContain('sess_missing');
    expect(view.reason).not.toContain('does not resolve');
  });

  it('sanitizes edit continuity failures before they reach the editor surface', async () => {
    prepareTestPackage();
    await writeInvalidRuntimeSessionsFile();

    const view = await loadEditRuntimeContinuityView(testPackageName);

    expect(view.kind).toBe('unavailable');
    expect(view.reason).toBe('Runtime continuity is temporarily unavailable for this story package.');
    expect(view.reason).not.toContain('sess_missing');
    expect(view.reason).not.toContain('does not resolve');
  });

  it('treats an awaiting-start bootstrap session with no relationship summary as empty edit continuity', async () => {
    prepareTestPackage();
    await writeAwaitingStartRuntimeSessionsFile();

    const playView = await loadPlayRuntimeSessionView(testPackageName);
    const editView = await loadEditRuntimeContinuityView(testPackageName);

    expect(playView.kind).toBe('awaiting_start');
    expect(playView.activeSessionId).toBe('sess_bootstrap');
    expect(playView.relationshipSummary.source).toBe('empty');
    expect(editView).toEqual({
      kind: 'empty',
      activeSession: null,
    });
  });

  it('keeps play and edit loaders aligned to the same active session', async () => {
    prepareTestPackage();
    await writeValidRuntimeSessionsFile();

    const playView = await loadPlayRuntimeSessionView(testPackageName);
    const editState = await loadAuthoringState(testPackageName, {
      includeRuntimeContinuity: true,
    });
    const playViewAgain = await loadPlayRuntimeSessionView(testPackageName);

    expect(editState.runtimeContinuityView?.activeSession?.sessionId).toBe(playView.activeSessionId);
    expect(playViewAgain.activeSessionId).toBe(playView.activeSessionId);
  });

  it('adds a bounded runtime continuity view to loadAuthoringState without exposing raw checkpoints', async () => {
    prepareTestPackage();
    await writeValidRuntimeSessionsFile();

    const result = await loadAuthoringState(testPackageName, {
      includeRuntimeContinuity: true,
    });

    expect(result.runtimeContinuityView?.activeSession?.relationshipStatus).toBeDefined();
    expect(JSON.stringify(result.runtimeContinuityView)).not.toContain('checkpointsById');
  });
});
