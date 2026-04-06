import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import * as runtimeSessionsRepository from '@/runtime-sessions/repository';
import {
  branchStorylineFromCheckpoint,
  createStorylineFromSource,
  ensureStorylineAwareActiveSession,
  executeStorylineRuntimeSessionCommand,
  resolveActiveStorylineContext,
  switchActiveStoryline,
} from '@/storylines/substrate';
import { MANAGED_VARIANT_AUTHORING_FILES, resolveVariantWorkspacePath } from '@/storylines/workspaces';
import type {
  RuntimeCheckpoint,
  RuntimeSessionsFile,
  StateSnapshot,
  StorylineRepositoryFile,
} from '@/types';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const trackedPackageRoots = new Set<string>();

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

function makeCheckpoint(checkpointId: string, acceptedBeatOrdinal: number): RuntimeCheckpoint {
  return {
    checkpointId,
    acceptedBeatOrdinal,
    sceneId: 'scene_opening',
    phaseIndex: 1,
    beatIndex: acceptedBeatOrdinal,
    roundId: `round_${acceptedBeatOrdinal.toString().padStart(2, '0')}`,
    acceptedTranscript: {
      playerInput: `input-${acceptedBeatOrdinal}`,
      beatText: `beat-${acceptedBeatOrdinal}`,
    },
    stateSnapshot: makeStateSnapshot(`beat-${acceptedBeatOrdinal}`),
    lastStableRelationshipLayer: {
      highlightedDeltasText: `delta-${acceptedBeatOrdinal}`,
      stableBackgroundText: `background-${acceptedBeatOrdinal}`,
    },
    createdAt: '2026-04-06T00:00:00.000Z',
  };
}

async function createTempPackage(prefix: string): Promise<{ packageName: string; packageRoot: string }> {
  const packageRoot = await mkdtemp(path.resolve(storyPackagesRoot, prefix));
  trackedPackageRoots.add(packageRoot);
  return {
    packageName: path.basename(packageRoot),
    packageRoot,
  };
}

async function writeBaselineFiles(packageRoot: string): Promise<void> {
  await Promise.all(
    MANAGED_VARIANT_AUTHORING_FILES.map((fileName) =>
      writeFile(path.resolve(packageRoot, fileName), `# ${fileName}\n`, 'utf8'),
    ),
  );
}

async function materializeVariantWorkspace(packageRoot: string, variantId: string): Promise<void> {
  const variantRoot = path.resolve(packageRoot, 'variants', variantId);
  await mkdir(variantRoot, { recursive: true });
  await Promise.all(
    MANAGED_VARIANT_AUTHORING_FILES.map((fileName) =>
      writeFile(path.resolve(variantRoot, fileName), `${variantId}:${fileName}\n`, 'utf8'),
    ),
  );
}

async function writeRuntimeSessionsFile(
  packageName: string,
  runtimeFile: RuntimeSessionsFile,
): Promise<void> {
  await writeFile(
    path.resolve(storyPackagesRoot, packageName, 'runtime-sessions.json'),
    `${JSON.stringify(runtimeFile, null, 2)}\n`,
    'utf8',
  );
}

async function writeStorylineRepositoryFile(
  packageName: string,
  repositoryFile: StorylineRepositoryFile,
): Promise<void> {
  await writeFile(
    path.resolve(storyPackagesRoot, packageName, 'storyline-repository.json'),
    `${JSON.stringify(repositoryFile, null, 2)}\n`,
    'utf8',
  );
}

async function readStorylineRepositoryJson(packageName: string): Promise<StorylineRepositoryFile> {
  const raw = await readFile(
    path.resolve(storyPackagesRoot, packageName, 'storyline-repository.json'),
    'utf8',
  );
  return JSON.parse(raw) as StorylineRepositoryFile;
}

async function readRuntimeSessionsJson(packageName: string): Promise<RuntimeSessionsFile> {
  const raw = await readFile(
    path.resolve(storyPackagesRoot, packageName, 'runtime-sessions.json'),
    'utf8',
  );
  return JSON.parse(raw) as RuntimeSessionsFile;
}

async function listWorkspaceStageEntries(packageName: string): Promise<string[]> {
  const stageRoot = path.resolve(storyPackagesRoot, packageName, 'variants', '.stage');

  try {
    return await readdir(stageRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

interface SeedPackageOptions {
  readonly includeAlternateStoryline?: boolean;
  readonly runtimeActiveSessionId?: string;
  readonly storylineHeadCheckpointId?: string | null;
}

async function seedExplicitStorylinePackage(
  options: SeedPackageOptions = {},
): Promise<{ packageName: string; packageRoot: string }> {
  const tempPackage = await createTempPackage('tmp-storyline-substrate-');
  await writeBaselineFiles(tempPackage.packageRoot);
  await materializeVariantWorkspace(tempPackage.packageRoot, 'variant_main');
  await materializeVariantWorkspace(tempPackage.packageRoot, 'variant_alt');

  const checkpoint01 = makeCheckpoint('chk_01', 1);
  const checkpoint02 = makeCheckpoint('chk_02', 2);

  const runtimeFile: RuntimeSessionsFile = {
    version: 1,
    activeSessionId: options.runtimeActiveSessionId ?? 'sess_main',
    sessionsById: {
      sess_main: {
        sessionId: 'sess_main',
        lifecycle: 'in_progress',
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:02.000Z',
        headCheckpointId: 'chk_02',
        activeCheckpointId: 'chk_02',
        orderedCheckpointIds: ['chk_01', 'chk_02'],
        checkpointsById: {
          chk_01: checkpoint01,
          chk_02: checkpoint02,
        },
        lastStableRelationshipLayer: {
          highlightedDeltasText: 'delta-main',
          stableBackgroundText: 'background-main',
        },
      },
      sess_alt: {
        sessionId: 'sess_alt',
        lifecycle: 'in_progress',
        createdAt: '2026-04-06T00:10:00.000Z',
        updatedAt: '2026-04-06T00:10:00.000Z',
        headCheckpointId: 'chk_01',
        activeCheckpointId: 'chk_01',
        orderedCheckpointIds: ['chk_01'],
        checkpointsById: {
          chk_01: checkpoint01,
        },
        lastStableRelationshipLayer: {
          highlightedDeltasText: 'delta-alt',
          stableBackgroundText: 'background-alt',
        },
      },
    },
  };

  const repositoryFile: StorylineRepositoryFile = {
    version: 1,
    activeStorylineId: 'storyline_main',
    storylinesById: {
      storyline_main: {
        storylineId: 'storyline_main',
        name: 'Main Line',
        status: 'active',
        sourceCheckpointId: null,
        headCheckpointId: options.storylineHeadCheckpointId ?? 'chk_02',
        variantId: 'variant_main',
        activeSessionId: 'sess_main',
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      ...(options.includeAlternateStoryline
        ? {
            storyline_alt: {
              storylineId: 'storyline_alt',
              name: 'Alt Line',
              status: 'active',
              sourceCheckpointId: 'chk_01',
              headCheckpointId: 'chk_01',
              variantId: 'variant_alt',
              activeSessionId: 'sess_alt',
              createdAt: '2026-04-06T00:00:00.000Z',
              updatedAt: '2026-04-06T00:00:00.000Z',
            },
          }
        : {}),
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
        createdAt: '2026-04-06T00:10:00.000Z',
        updatedAt: '2026-04-06T00:10:00.000Z',
      },
    },
  };

  await writeRuntimeSessionsFile(tempPackage.packageName, runtimeFile);
  await writeStorylineRepositoryFile(tempPackage.packageName, repositoryFile);

  return tempPackage;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    Array.from(trackedPackageRoots.values()).map((packageRoot) =>
      rm(packageRoot, { recursive: true, force: true }),
    ),
  );
  trackedPackageRoots.clear();
});

describe('storyline substrate', () => {
  it('bootstraps a default storyline and awaiting_start session when runtime continuity is empty', async () => {
    const { packageName, packageRoot } = await createTempPackage('tmp-storyline-bootstrap-');
    await writeBaselineFiles(packageRoot);

    const result = await ensureStorylineAwareActiveSession(packageName);

    expect(result.storyline.storylineId).toBe('storyline_main');
    expect(result.session.lifecycle).toBe('awaiting_start');
    expect(result.repository.activeStorylineId).toBe('storyline_main');
  });

  it('creates a new storyline from the source storyline head without switching activeStorylineId', async () => {
    const { packageName } = await seedExplicitStorylinePackage();

    const created = await createStorylineFromSource({
      packageName,
      sourceStorylineId: 'storyline_main',
      name: 'Branch A',
    });
    const runtimeFile = await readRuntimeSessionsJson(packageName);

    expect(created.storyline.sourceCheckpointId).toBe('chk_02');
    expect(created.storyline.headCheckpointId).toBe('chk_02');
    expect(created.repository.activeStorylineId).toBe('storyline_main');
    expect(runtimeFile.activeSessionId).toBe('sess_main');
  });

  it('updates runtime-sessions.json activeSessionId as a mirror when switching storylines', async () => {
    const { packageName } = await seedExplicitStorylinePackage({
      includeAlternateStoryline: true,
      runtimeActiveSessionId: 'sess_main',
    });

    await switchActiveStoryline(packageName, 'storyline_alt');
    const runtimeFile = await readRuntimeSessionsJson(packageName);

    expect(runtimeFile.activeSessionId).toBe('sess_alt');
  });

  it('branches a new storyline from an explicit historical checkpoint without switching the active storyline', async () => {
    const { packageName } = await seedExplicitStorylinePackage();

    const created = await branchStorylineFromCheckpoint({
      packageName,
      sourceStorylineId: 'storyline_main',
      checkpointId: 'chk_01',
      name: 'Checkpoint Branch',
    });
    const runtimeFile = await readRuntimeSessionsJson(packageName);

    expect(created.storyline.sourceCheckpointId).toBe('chk_01');
    expect(created.storyline.headCheckpointId).toBe('chk_01');
    expect(created.repository.activeStorylineId).toBe('storyline_main');
    expect(runtimeFile.activeSessionId).toBe('sess_main');
  });

  it('rejects branching from a checkpoint that is not reachable from the source storyline session', async () => {
    const { packageName } = await seedExplicitStorylinePackage({
      includeAlternateStoryline: true,
    });
    const runtimeFile = await readRuntimeSessionsJson(packageName);
    const alternateCheckpoint = makeCheckpoint('chk_alt_only', 3);

    await writeRuntimeSessionsFile(packageName, {
      ...runtimeFile,
      sessionsById: {
        ...runtimeFile.sessionsById,
        sess_alt: {
          ...runtimeFile.sessionsById.sess_alt,
          headCheckpointId: 'chk_alt_only',
          activeCheckpointId: 'chk_alt_only',
          orderedCheckpointIds: ['chk_01', 'chk_alt_only'],
          checkpointsById: {
            ...runtimeFile.sessionsById.sess_alt.checkpointsById,
            chk_alt_only: alternateCheckpoint,
          },
        },
      },
    });

    await expect(
      branchStorylineFromCheckpoint({
        packageName,
        sourceStorylineId: 'storyline_main',
        checkpointId: 'chk_alt_only',
        name: 'Invalid Branch',
      }),
    ).rejects.toThrow(/source storyline/i);
  });

  it('repairs mirror drift on the next storyline-aware preflight instead of trusting stale mirrors', async () => {
    const { packageName } = await seedExplicitStorylinePackage({
      includeAlternateStoryline: true,
      runtimeActiveSessionId: 'sess_alt',
      storylineHeadCheckpointId: 'chk_01',
    });

    const repaired = await resolveActiveStorylineContext(packageName, {
      forWrite: false,
    });
    const runtimeFile = await readRuntimeSessionsJson(packageName);

    expect(repaired.storyline.headCheckpointId).toBe('chk_02');
    expect(runtimeFile.activeSessionId).toBe('sess_main');
  });

  it('fails loudly on structural mismatch instead of inventing missing storyline bindings', async () => {
    const { packageName } = await seedExplicitStorylinePackage();
    const repositoryFile = await readStorylineRepositoryJson(packageName);
    const storylineMain = repositoryFile.storylinesById.storyline_main;

    if (!storylineMain) {
      throw new Error('Seeded storyline_main record was unexpectedly missing.');
    }

    await writeStorylineRepositoryFile(packageName, {
      ...repositoryFile,
      storylinesById: {
        ...repositoryFile.storylinesById,
        storyline_main: {
          ...storylineMain,
          activeSessionId: 'sess_missing',
        },
      },
    });

    await expect(
      resolveActiveStorylineContext(packageName, {
        forWrite: false,
      }),
    ).rejects.toThrow(/does not resolve/i);
  });

  it('deletes the staged workspace when create-from-source fails before workspace promotion', async () => {
    const { packageName } = await seedExplicitStorylinePackage();
    vi.spyOn(runtimeSessionsRepository, 'createSessionFromCheckpoint').mockRejectedValueOnce(
      new Error('runtime write failed'),
    );

    await expect(
      createStorylineFromSource({
        packageName,
        sourceStorylineId: 'storyline_main',
        name: 'Broken Branch',
      }),
    ).rejects.toThrow(/runtime/i);

    await expect(listWorkspaceStageEntries(packageName)).resolves.toEqual([]);
  });

  it('ignores a variant workspace directory that is not registered in variantsById during resolution', async () => {
    const { packageName, packageRoot } = await seedExplicitStorylinePackage();
    await materializeVariantWorkspace(packageRoot, 'variant_orphan');

    const context = await resolveActiveStorylineContext(packageName, {
      forWrite: false,
    });

    expect(context.variant.variantId).toBe('variant_main');
    expect(context.authoredRoot).not.toContain('variant_orphan');
  });

  it('ignores a runtime session that is not bound by storyline-repository.json during resolution', async () => {
    const { packageName } = await seedExplicitStorylinePackage({
      runtimeActiveSessionId: 'sess_alt',
      includeAlternateStoryline: false,
    });

    const context = await resolveActiveStorylineContext(packageName, {
      forWrite: false,
    });

    expect(context.storyline.activeSessionId).toBe('sess_main');
    if (!context.session) {
      throw new Error('Expected the active storyline context to resolve a runtime session.');
    }

    expect(context.session.sessionId).toBe('sess_main');
  });

  it('creates a copied variant workspace for a new storyline branch', async () => {
    const { packageName } = await seedExplicitStorylinePackage();

    const created = await createStorylineFromSource({
      packageName,
      sourceStorylineId: 'storyline_main',
      name: 'Branch A',
    });

    const worldBaseContent = await readFile(
      resolveVariantWorkspacePath(packageName, created.storyline.variantId, 'world-base.yaml'),
      'utf8',
    );
    expect(worldBaseContent).toContain('variant_main:world-base.yaml');
  });

  it('surfaces missing-package errors as RuntimeStoryPackageNotFoundError for route-level 404 mapping', async () => {
    const missingPackageName = `missing-substrate-package-${Date.now().toString(36)}`;

    await expect(ensureStorylineAwareActiveSession(missingPackageName)).rejects.toBeInstanceOf(
      runtimeSessionsRepository.RuntimeStoryPackageNotFoundError,
    );
  });

  it('rejects finalize_relationship_layer when payload session is not bound to active storyline', async () => {
    const { packageName } = await seedExplicitStorylinePackage({
      includeAlternateStoryline: true,
      runtimeActiveSessionId: 'sess_main',
    });

    await expect(
      executeStorylineRuntimeSessionCommand(packageName, {
        kind: 'finalize_relationship_layer',
        payload: {
          packageName,
          sessionId: 'sess_alt',
          checkpointId: 'chk_01',
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'bad finalize',
            stableBackgroundText: 'bad finalize',
          },
        },
      }),
    ).rejects.toThrow(/active storyline/i);
  });

  it('rejects finalize_relationship_layer when payload session is orphan and unbound', async () => {
    const { packageName } = await seedExplicitStorylinePackage({
      includeAlternateStoryline: false,
      runtimeActiveSessionId: 'sess_main',
    });
    const runtimeFile = await readRuntimeSessionsJson(packageName);
    await writeRuntimeSessionsFile(packageName, {
      ...runtimeFile,
      sessionsById: {
        ...runtimeFile.sessionsById,
        sess_orphan: {
          sessionId: 'sess_orphan',
          lifecycle: 'in_progress',
          createdAt: '2026-04-06T00:20:00.000Z',
          updatedAt: '2026-04-06T00:20:00.000Z',
          headCheckpointId: 'chk_01',
          activeCheckpointId: 'chk_01',
          orderedCheckpointIds: ['chk_01'],
          checkpointsById: {
            chk_01: makeCheckpoint('chk_01', 1),
          },
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'orphan',
            stableBackgroundText: 'orphan',
          },
        },
      },
    });

    await expect(
      executeStorylineRuntimeSessionCommand(packageName, {
        kind: 'finalize_relationship_layer',
        payload: {
          packageName,
          sessionId: 'sess_orphan',
          checkpointId: 'chk_01',
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'bad orphan finalize',
            stableBackgroundText: 'bad orphan finalize',
          },
        },
      }),
    ).rejects.toThrow(/active storyline/i);
  });
});
