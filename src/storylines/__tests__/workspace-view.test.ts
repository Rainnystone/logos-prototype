import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  StoryPackageManagementWorkspaceView,
} from '@/types';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');

async function resetPackageRoot(packageName: string): Promise<string> {
  const packageRoot = path.resolve(storyPackagesRoot, packageName);
  await rm(packageRoot, { recursive: true, force: true });
  await mkdir(packageRoot, { recursive: true });
  return packageRoot;
}

async function writeRuntimeSessionsFile(
  packageName: string,
  runtimeFile: Record<string, unknown>,
): Promise<void> {
  await writeFile(
    path.resolve(storyPackagesRoot, packageName, 'runtime-sessions.json'),
    `${JSON.stringify(runtimeFile, null, 2)}\n`,
    'utf8',
  );
}

async function writeStorylineRepositoryFile(
  packageName: string,
  repositoryFile: Record<string, unknown>,
): Promise<void> {
  await writeFile(
    path.resolve(storyPackagesRoot, packageName, 'storyline-repository.json'),
    `${JSON.stringify(repositoryFile, null, 2)}\n`,
    'utf8',
  );
}

function makeStateSnapshot(currentBeatText: string, currentBeatIndex: number): Record<string, unknown> {
  return {
    sceneState: {
      sceneId: 'scene_opening',
      currentPhaseIndex: 1,
      currentBeatIndexInPhase: currentBeatIndex,
      mainAxis: 'axis',
      endLine: 'end',
      alpha: 'alpha',
      beta: 'beta',
      sceneProgress: currentBeatText,
      phaseConsequences: [],
    },
    roundState: {
      phaseGoal: 'goal',
      currentVolume: 'Med',
      currentRouter: 'router',
      verbLexicon: ['observe'],
      historyWindow: [],
      directorConstraints: '',
    },
    generationState: {
      directorNoteSummary: currentBeatText,
      promptObject: {},
      currentBeatText,
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

function makeCheckpoint(
  checkpointId: string,
  acceptedBeatOrdinal: number,
  options: {
    readonly isHead: boolean;
    readonly isBranchSource: boolean;
    readonly playerInput: string;
    readonly beatText: string;
  },
): Record<string, unknown> {
  const currentBeatText = options.beatText;

  return {
    checkpointId,
    acceptedBeatOrdinal,
    sceneId: 'scene_opening',
    phaseIndex: 1,
    beatIndex: acceptedBeatOrdinal,
    roundId: `round_${acceptedBeatOrdinal.toString().padStart(2, '0')}`,
    acceptedTranscript: {
      playerInput: options.playerInput,
      beatText: options.beatText,
    },
    stateSnapshot: makeStateSnapshot(currentBeatText, acceptedBeatOrdinal),
    lastStableRelationshipLayer: {
      highlightedDeltasText: '',
      stableBackgroundText: '',
    },
    createdAt: '2026-04-06T00:00:00.000Z',
  };
}

describe('story package management workspace view', () => {
  it('builds checkpoint rails only from checkpoints reachable by each storyline-bound session', async () => {
    const packageName = '__storyline-workspace-test__';
    await resetPackageRoot(packageName);

    try {
      await writeRuntimeSessionsFile(packageName, {
        version: 1,
        activeSessionId: 'sess_main',
        sessionsById: {
          sess_main: {
            sessionId: 'sess_main',
            lifecycle: 'in_progress',
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
            headCheckpointId: 'chk_02',
            activeCheckpointId: 'chk_02',
            orderedCheckpointIds: ['chk_01', 'chk_02'],
            checkpointsById: {
              chk_01: makeCheckpoint('chk_01', 1, {
                isHead: false,
                isBranchSource: true,
                playerInput: 'input-1',
                beatText: 'beat-1',
              }),
              chk_02: makeCheckpoint('chk_02', 2, {
                isHead: true,
                isBranchSource: false,
                playerInput: 'input-2',
                beatText: 'beat-2',
              }),
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
          },
          sess_alt: {
            sessionId: 'sess_alt',
            lifecycle: 'in_progress',
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
            headCheckpointId: 'chk_alt_01',
            activeCheckpointId: 'chk_alt_01',
            orderedCheckpointIds: ['chk_alt_01'],
            checkpointsById: {
              chk_alt_01: makeCheckpoint('chk_alt_01', 1, {
                isHead: true,
                isBranchSource: false,
                playerInput: 'alt-input-1',
                beatText: 'alt-beat-1',
              }),
            },
            lastStableRelationshipLayer: {
              highlightedDeltasText: '',
              stableBackgroundText: '',
            },
          },
        },
      });
      await writeStorylineRepositoryFile(packageName, {
        version: 1,
        activeStorylineId: 'storyline_main',
        storylinesById: {
          storyline_main: {
            storylineId: 'storyline_main',
            name: 'Main Line',
            status: 'active',
            sourceCheckpointId: 'chk_01',
            headCheckpointId: 'chk_02',
            variantId: 'variant_main',
            activeSessionId: 'sess_main',
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
          },
          storyline_alt: {
            storylineId: 'storyline_alt',
            name: 'Alt Line',
            status: 'active',
            sourceCheckpointId: 'chk_01',
            headCheckpointId: 'chk_alt_01',
            variantId: 'variant_alt',
            activeSessionId: 'sess_alt',
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
          },
        },
        variantsById: {
          variant_main: {
            variantId: 'variant_main',
            workspaceRoot: 'variants/variant_main',
            createdFromStorylineId: null,
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
          },
          variant_alt: {
            variantId: 'variant_alt',
            workspaceRoot: 'variants/variant_alt',
            createdFromStorylineId: 'storyline_main',
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
          },
        },
      });

      const { loadStoryPackageManagementWorkspaceView } = await import('@/storylines/workspace-view');
      const view = await loadStoryPackageManagementWorkspaceView(packageName);

      expect(
        view.storylines.find((row) => row.storylineId === 'storyline_main')?.checkpointRail,
      ).toEqual([
        expect.objectContaining({
          checkpointId: 'chk_01',
          acceptedBeatOrdinal: 1,
          isHead: false,
          isBranchSource: true,
        }),
        expect.objectContaining({
          checkpointId: 'chk_02',
          acceptedBeatOrdinal: 2,
          isHead: true,
          isBranchSource: false,
        }),
      ]);
      expect(
        view.storylines.find((row) => row.storylineId === 'storyline_alt')?.checkpointRail,
      ).toEqual([
        expect.objectContaining({
          checkpointId: 'chk_alt_01',
          acceptedBeatOrdinal: 1,
          isHead: true,
          isBranchSource: false,
        }),
      ]);
      expect(view.storylines.find((row) => row.storylineId === 'storyline_main')?.headSummary).toBe(
        'input-2 · beat-2',
      );
    } finally {
      await rm(path.resolve(storyPackagesRoot, packageName), { recursive: true, force: true });
    }
  });

  it('fails loudly when a storyline row cannot resolve its bound session instead of guessing around drift', async () => {
    const packageName = '__storyline-workspace-broken__';
    await resetPackageRoot(packageName);

    try {
      await writeRuntimeSessionsFile(packageName, {
        version: 1,
        activeSessionId: 'sess_other',
        sessionsById: {
          sess_other: {
            sessionId: 'sess_other',
            lifecycle: 'in_progress',
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
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
      await writeStorylineRepositoryFile(packageName, {
        version: 1,
        activeStorylineId: 'storyline_main',
        storylinesById: {
          storyline_main: {
            storylineId: 'storyline_main',
            name: 'Main Line',
            status: 'active',
            sourceCheckpointId: null,
            headCheckpointId: null,
            variantId: 'variant_main',
            activeSessionId: 'sess_missing',
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
          },
        },
        variantsById: {
          variant_main: {
            variantId: 'variant_main',
            workspaceRoot: 'variants/variant_main',
            createdFromStorylineId: null,
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
          },
        },
      });

      const { loadStoryPackageManagementWorkspaceView } = await import('@/storylines/workspace-view');

      await expect(loadStoryPackageManagementWorkspaceView(packageName)).rejects.toThrow(
        /activeSessionId/i,
      );
    } finally {
      await rm(path.resolve(storyPackagesRoot, packageName), { recursive: true, force: true });
    }
  });

  it('returns a single implicit storyline row for legacy packages without materializing storyline files', async () => {
    const packageName = '__storyline-workspace-legacy__';
    await resetPackageRoot(packageName);

    try {
      await writeRuntimeSessionsFile(packageName, {
        version: 1,
        activeSessionId: 'sess_legacy',
        sessionsById: {
          sess_legacy: {
            sessionId: 'sess_legacy',
            lifecycle: 'awaiting_start',
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
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

      const { loadStoryPackageManagementWorkspaceView } = await import('@/storylines/workspace-view');
      const view: StoryPackageManagementWorkspaceView =
        await loadStoryPackageManagementWorkspaceView(packageName);

      expect(view.storylines).toHaveLength(1);
      expect(view.storylines[0]).toEqual(
        expect.objectContaining({
          storylineId: 'storyline_main',
          isActive: true,
        }),
      );
      expect(
        existsSync(path.resolve(storyPackagesRoot, packageName, 'storyline-repository.json')),
      ).toBe(false);
    } finally {
      await rm(path.resolve(storyPackagesRoot, packageName), { recursive: true, force: true });
    }
  });
});
