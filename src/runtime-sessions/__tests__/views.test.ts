import { cpSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadAuthoringState } from '@/authoring/persistence/package-state';
import { loadEditRuntimeContinuityView, loadPlayRuntimeSessionView } from '@/runtime-sessions/views';
import type { RuntimeSessionsFile, StateSnapshot, StorylineRepositoryFile } from '@/types';

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

async function writeStorylineRepositoryFile(file: StorylineRepositoryFile): Promise<void> {
  const storylineRepositoryPath = path.resolve(testPackagePath, 'storyline-repository.json');
  await writeFile(storylineRepositoryPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
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

async function writeActiveSessionWithoutUsableRelationshipLayer(): Promise<void> {
  await writeRuntimeSessionsFile({
    version: 1,
    activeSessionId: 'sess_active_empty_relationship',
    sessionsById: {
      sess_active_empty_relationship: {
        sessionId: 'sess_active_empty_relationship',
        lifecycle: 'in_progress',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:05.000Z',
        headCheckpointId: 'chk_01',
        activeCheckpointId: 'chk_01',
        orderedCheckpointIds: ['chk_01'],
        checkpointsById: {
          chk_01: {
            checkpointId: 'chk_01',
            acceptedBeatOrdinal: 1,
            sceneId: 'scene_opening',
            phaseIndex: 1,
            beatIndex: 1,
            roundId: 'round_01',
            acceptedTranscript: {
              playerInput: 'inspect the hallway',
              beatText: 'The hallway remains silent.',
            },
            stateSnapshot: makeStateSnapshot('The hallway remains silent.'),
            lastStableRelationshipLayer: {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
            createdAt: '2026-04-03T00:00:01.000Z',
          },
        },
        lastStableRelationshipLayer: {
          highlightedDeltasText: '',
          stableBackgroundText: '',
        },
      },
    },
  });
}

async function writeActiveSessionWithCheckpointRelationshipLayer(): Promise<void> {
  await writeRuntimeSessionsFile({
    version: 1,
    activeSessionId: 'sess_checkpoint_relationship',
    sessionsById: {
      sess_checkpoint_relationship: {
        sessionId: 'sess_checkpoint_relationship',
        lifecycle: 'in_progress',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:05.000Z',
        headCheckpointId: 'chk_01',
        activeCheckpointId: 'chk_01',
        orderedCheckpointIds: ['chk_01'],
        checkpointsById: {
          chk_01: {
            checkpointId: 'chk_01',
            acceptedBeatOrdinal: 1,
            sceneId: 'scene_opening',
            phaseIndex: 1,
            beatIndex: 1,
            roundId: 'round_01',
            acceptedTranscript: {
              playerInput: 'inspect the hallway',
              beatText: 'The hallway remains silent.',
            },
            stateSnapshot: makeStateSnapshot('The hallway remains silent.'),
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'checkpoint delta',
              stableBackgroundText: 'checkpoint background',
            },
            createdAt: '2026-04-03T00:00:01.000Z',
          },
        },
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
    expect(view.reason).toBe(
      'Runtime continuity is unavailable. Inspect the saved runtime data before continuing.',
    );
    expect(view.reason).not.toContain('Reset the workbench to continue');
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

  it('treats an active session without a usable relationship layer as empty edit continuity', async () => {
    prepareTestPackage();
    await writeActiveSessionWithoutUsableRelationshipLayer();

    const playView = await loadPlayRuntimeSessionView(testPackageName);
    const editView = await loadEditRuntimeContinuityView(testPackageName);

    expect(playView.kind).toBe('restorable');
    expect(playView.activeSessionId).toBe('sess_active_empty_relationship');
    expect(playView.relationshipSummary.source).toBe('empty');
    expect(editView).toEqual({
      kind: 'empty',
      activeSession: null,
    });
  });

  it('keeps edit continuity active when a non-empty checkpoint relationship layer is still available', async () => {
    prepareTestPackage();
    await writeActiveSessionWithCheckpointRelationshipLayer();

    const playView = await loadPlayRuntimeSessionView(testPackageName);
    const editView = await loadEditRuntimeContinuityView(testPackageName);

    expect(playView.kind).toBe('restorable');
    expect(playView.relationshipSummary).toEqual({
      highlightedDeltasText: 'checkpoint delta',
      stableBackgroundText: 'checkpoint background',
      source: 'checkpoint',
    });
    expect(editView).toEqual({
      kind: 'active',
      activeSession: {
        sessionId: 'sess_checkpoint_relationship',
        lifecycle: 'in_progress',
        activeCheckpointId: 'chk_01',
        acceptedBeatCount: 1,
        relationshipStatus: {
          highlightedDeltasText: 'checkpoint delta',
          stableBackgroundText: 'checkpoint background',
          source: 'checkpoint',
        },
      },
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

  it('resolves runtime continuity through the active storyline binding instead of unbound sessions', async () => {
    prepareTestPackage();
    await writeRuntimeSessionsFile({
      version: 1,
      activeSessionId: 'sess_orphan',
      sessionsById: {
        sess_storyline_main: {
          sessionId: 'sess_storyline_main',
          lifecycle: 'in_progress',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:05.000Z',
          headCheckpointId: 'chk_storyline',
          activeCheckpointId: 'chk_storyline',
          orderedCheckpointIds: ['chk_storyline'],
          checkpointsById: {
            chk_storyline: {
              checkpointId: 'chk_storyline',
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_opening',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_storyline',
              acceptedTranscript: {
                playerInput: 'follow storyline',
                beatText: 'Storyline-bound checkpoint',
              },
              stateSnapshot: makeStateSnapshot('Storyline-bound checkpoint'),
              lastStableRelationshipLayer: {
                highlightedDeltasText: 'storyline delta',
                stableBackgroundText: 'storyline background',
              },
              createdAt: '2026-04-03T00:00:01.000Z',
            },
          },
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'storyline delta',
            stableBackgroundText: 'storyline background',
          },
        },
        sess_orphan: {
          sessionId: 'sess_orphan',
          lifecycle: 'in_progress',
          createdAt: '2026-04-03T00:10:00.000Z',
          updatedAt: '2026-04-03T00:10:00.000Z',
          headCheckpointId: 'chk_orphan',
          activeCheckpointId: 'chk_orphan',
          orderedCheckpointIds: ['chk_orphan'],
          checkpointsById: {
            chk_orphan: {
              checkpointId: 'chk_orphan',
              acceptedBeatOrdinal: 99,
              sceneId: 'scene_orphan',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_orphan',
              acceptedTranscript: {
                playerInput: 'follow orphan',
                beatText: 'Orphan checkpoint',
              },
              stateSnapshot: makeStateSnapshot('Orphan checkpoint'),
              lastStableRelationshipLayer: {
                highlightedDeltasText: 'orphan delta',
                stableBackgroundText: 'orphan background',
              },
              createdAt: '2026-04-03T00:10:01.000Z',
            },
          },
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'orphan delta',
            stableBackgroundText: 'orphan background',
          },
        },
      },
    });
    await writeStorylineRepositoryFile({
      version: 1,
      activeStorylineId: 'storyline_main',
      storylinesById: {
        storyline_main: {
          storylineId: 'storyline_main',
          name: 'Main Line',
          status: 'active',
          sourceCheckpointId: null,
          headCheckpointId: 'chk_storyline',
          variantId: 'variant_main',
          activeSessionId: 'sess_storyline_main',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
        },
      },
      variantsById: {
        variant_main: {
          variantId: 'variant_main',
          workspaceRoot: 'variants/variant_main',
          createdFromStorylineId: null,
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
        },
      },
    });

    const playView = await loadPlayRuntimeSessionView(testPackageName);
    const editView = await loadEditRuntimeContinuityView(testPackageName);

    expect(playView.activeSessionId).toBe('sess_storyline_main');
    expect(playView.activeCheckpointId).toBe('chk_storyline');
    expect(playView.beatHistory[0]?.beatText).toBe('Storyline-bound checkpoint');
    expect(editView.kind).toBe('active');
    expect(editView.activeSession?.sessionId).toBe('sess_storyline_main');
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
