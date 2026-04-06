import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react';
import YAML from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as storylineSubstrate from '@/storylines/substrate';
import type { RuntimeSessionsFile, StateSnapshot, StorylineRepositoryFile } from '@/types';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const sourcePackageName = 'sample-scene';
const testPackageName = '__edit-page-storyline-test__';
const testPackagePath = path.resolve(storyPackagesRoot, testPackageName);
const storylineRepositoryPath = path.resolve(testPackagePath, 'storyline-repository.json');
const variantsPath = path.resolve(testPackagePath, 'variants');

const loadEditWorkbenchProps = vi.fn();

vi.mock('@/app/edit/EditWorkbench', () => ({
  EditWorkbench: (props: unknown) => {
    loadEditWorkbenchProps(props);
    return <div data-testid="edit-workbench">Edit Workbench</div>;
  },
}));

const authoredContractFiles = [
  'world-base.yaml',
  'scene.yaml',
  'phase-plans.yaml',
  'router-lexicon.yaml',
  'audit-questions.yaml',
  'control-modules.yaml',
] as const;

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

function writeRuntimeSessionsFile(file: RuntimeSessionsFile): void {
  const runtimeSessionsPath = path.resolve(testPackagePath, 'runtime-sessions.json');
  writeFileSync(runtimeSessionsPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

function writeStorylineRepositoryFile(file: StorylineRepositoryFile): void {
  writeFileSync(storylineRepositoryPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

function setupVariantWorkspace(variantId: string, worldBaseSetting: string): void {
  const variantRoot = path.resolve(testPackagePath, 'variants', variantId);
  mkdirSync(variantRoot, { recursive: true });

  for (const fileName of authoredContractFiles) {
    cpSync(path.resolve(testPackagePath, fileName), path.resolve(variantRoot, fileName));
  }

  const worldBase = YAML.parse(readFileSync(path.resolve(variantRoot, 'world-base.yaml'), 'utf8')) as {
    worldBaseSetting: string;
  };
  worldBase.worldBaseSetting = worldBaseSetting;
  writeFileSync(path.resolve(variantRoot, 'world-base.yaml'), YAML.stringify(worldBase), 'utf8');
}

function buildStorylineRepository(activeStorylineId: 'storyline_main' | 'storyline_alt'): StorylineRepositoryFile {
  return {
    version: 1,
    activeStorylineId,
    storylinesById: {
      storyline_main: {
        storylineId: 'storyline_main',
        name: 'Main Line',
        status: 'active',
        sourceCheckpointId: null,
        headCheckpointId: 'chk_main',
        variantId: 'variant_main',
        activeSessionId: 'sess_main',
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      storyline_alt: {
        storylineId: 'storyline_alt',
        name: 'Alt Line',
        status: 'active',
        sourceCheckpointId: null,
        headCheckpointId: 'chk_alt',
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
        createdFromStorylineId: null,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
    },
  };
}

afterEach(() => {
  resetTestPackage();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('EditPage', () => {
  it('loads authored projection and bounded continuity from the same resolved storyline context', async () => {
    prepareTestPackage();
    setupVariantWorkspace('variant_main', 'main-world-setting');
    setupVariantWorkspace('variant_alt', 'alt-world-setting');
    writeRuntimeSessionsFile({
      version: 1,
      activeSessionId: 'sess_main',
      sessionsById: {
        sess_main: {
          sessionId: 'sess_main',
          lifecycle: 'in_progress',
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
          headCheckpointId: 'chk_main',
          activeCheckpointId: 'chk_main',
          orderedCheckpointIds: ['chk_main'],
          checkpointsById: {
            chk_main: {
              checkpointId: 'chk_main',
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_opening',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_main',
              acceptedTranscript: {
                playerInput: 'follow main',
                beatText: 'Main checkpoint',
              },
              stateSnapshot: makeStateSnapshot('Main checkpoint'),
              lastStableRelationshipLayer: {
                highlightedDeltasText: 'main delta',
                stableBackgroundText: 'main background',
              },
              createdAt: '2026-04-06T00:00:00.000Z',
            },
          },
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'main delta',
            stableBackgroundText: 'main background',
          },
        },
        sess_alt: {
          sessionId: 'sess_alt',
          lifecycle: 'in_progress',
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
          headCheckpointId: 'chk_alt',
          activeCheckpointId: 'chk_alt',
          orderedCheckpointIds: ['chk_alt'],
          checkpointsById: {
            chk_alt: {
              checkpointId: 'chk_alt',
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_opening',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_alt',
              acceptedTranscript: {
                playerInput: 'follow alt',
                beatText: 'Alt checkpoint',
              },
              stateSnapshot: makeStateSnapshot('Alt checkpoint'),
              lastStableRelationshipLayer: {
                highlightedDeltasText: 'alt delta',
                stableBackgroundText: 'alt background',
              },
              createdAt: '2026-04-06T00:00:00.000Z',
            },
          },
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'alt delta',
            stableBackgroundText: 'alt background',
          },
        },
      },
    });
    writeStorylineRepositoryFile(buildStorylineRepository('storyline_main'));

    const originalResolve = storylineSubstrate.resolveActiveStorylineContext;
    let resolveCallCount = 0;
    vi.spyOn(storylineSubstrate, 'resolveActiveStorylineContext').mockImplementation(
      async (packageName, options) => {
        const resolved = await originalResolve(packageName, options);
        resolveCallCount += 1;

        if (resolveCallCount === 1) {
          writeStorylineRepositoryFile(buildStorylineRepository('storyline_alt'));
        }

        return resolved;
      },
    );

    const { default: EditPage } = await import('@/app/edit/page');
    render(
      await EditPage({
        searchParams: {
          storyPackage: testPackageName,
          section: 'worldbase-cast',
        },
      }),
    );

    const workbenchProps = loadEditWorkbenchProps.mock.calls[0]?.[0] as {
      initialState: {
        state: {
          worldBase: {
            worldBaseSetting: string;
          };
        };
        runtimeContinuityView?: {
          kind: string;
          activeSession: {
            sessionId: string;
          } | null;
        };
      };
    };

    expect(resolveCallCount).toBe(1);
    expect(workbenchProps.initialState.state.worldBase.worldBaseSetting).toBe('main-world-setting');
    expect(workbenchProps.initialState.runtimeContinuityView?.kind).toBe('active');
    expect(workbenchProps.initialState.runtimeContinuityView?.activeSession?.sessionId).toBe(
      'sess_main',
    );
    expect(screen.getByTestId('edit-workbench')).toBeInTheDocument();
  });

  it('keeps legacy pure-read /edit non-materializing', async () => {
    prepareTestPackage();
    rmSync(storylineRepositoryPath, { force: true });
    rmSync(variantsPath, { recursive: true, force: true });

    const { default: EditPage } = await import('@/app/edit/page');
    render(
      await EditPage({
        searchParams: {
          storyPackage: testPackageName,
          section: 'worldbase-cast',
        },
      }),
    );

    expect(existsSync(storylineRepositoryPath)).toBe(false);
    expect(existsSync(variantsPath)).toBe(false);
    expect(screen.getByTestId('edit-workbench')).toBeInTheDocument();
  });
});
