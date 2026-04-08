import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadStoryPackage } from '@/engine/story-loader';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import { readStorylineRepository } from '@/storylines/repository';
import * as runtimeSessionsRepository from '@/runtime-sessions/repository';
import {
  StoryPackageScaffoldConflictError,
  StoryPackageScaffoldImportError,
  StoryPackageScaffoldInputError,
  StoryPackageScaffoldValidationError,
  StoryPackageScaffoldWriteError,
} from '@/story-packages/scaffold-errors';
import type { StorylineRecord, StorylineRepositoryFile } from '@/types';

const fileSystemFailureState = vi.hoisted(() => ({
  failRename: false,
  failMkdirStageRoot: false,
}));

const mockWeaverImport = vi.hoisted(() => vi.fn());

vi.mock('@/agents/weaver/agent', () => ({
  runWeaverImport: mockWeaverImport,
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();

  return {
    ...actual,
    mkdir: vi.fn(async (...args: Parameters<typeof actual.mkdir>) => {
      const [targetPath] = args;

      if (
        fileSystemFailureState.failMkdirStageRoot &&
        typeof targetPath === 'string' &&
        targetPath.includes('.stage-')
      ) {
        throw new Error('mkdir blocked');
      }

      return actual.mkdir(...args);
    }),
    rename: vi.fn(async (...args: Parameters<typeof actual.rename>) => {
      if (fileSystemFailureState.failRename) {
        throw new Error('rename blocked');
      }

      return actual.rename(...args);
    }),
  };
});

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const createdPackageRoots = new Set<string>();

async function removeIfExists(targetPath: string): Promise<void> {
  await rm(targetPath, { recursive: true, force: true });
}

async function findStagedPackageRoots(slug: string): Promise<string[]> {
  const entries = await readdir(storyPackagesRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(`.${slug}.stage-`))
    .map((entry) => path.resolve(storyPackagesRoot, entry.name));
}

afterEach(async () => {
  fileSystemFailureState.failRename = false;
  fileSystemFailureState.failMkdirStageRoot = false;
  mockWeaverImport.mockReset();
  vi.restoreAllMocks();
  for (const packageRoot of createdPackageRoots) {
    await removeIfExists(packageRoot);
  }
  createdPackageRoots.clear();
});

async function loadCreateStoryPackageScaffold() {
  const scaffoldModule = await import('@/story-packages/scaffold');
  return scaffoldModule.createStoryPackageScaffold;
}

function createTextImportAdapter(): Pick<LLMAdapter, 'weaverImport'> {
  return {
    weaverImport: vi.fn(),
  };
}

function createWeaverImportResult() {
  return {
    request: {
      sourceText: '作者原始文本',
      resolvedReferences: [],
    },
    payload: {
      suggestedPackageName: 'woven-import-package',
      sourceSummary: '外部文本来源摘要',
      importSummary: '已提取世界观与角色框架',
      openingHook: '模型改写后的 opening hook',
      worldBase: {
        settingSummary: '近未来沿海都市',
        worldRules: '通讯塔网络支撑城市秩序。',
        toneBaseline: '压抑而悬疑的都市气氛。',
        npcCharactersSummary: '路人与技术人员都受到网络事故影响。',
        locationPatch: '灯塔塔区与老城区需要长期拉扯。',
      },
      hero: {
        displayName: '林深',
        roleSummary: '被迫接管灯塔网络的主角',
      },
      coreCast: [
        {
          displayName: '周珂',
          roleSummary: '负责追查事故源头的记者',
        },
      ],
      antagonists: [],
      npcCharacters: [],
      locations: [
        {
          displayName: '灯塔塔区',
          summary: '维持城市网络秩序的核心区域',
        },
      ],
      warnings: ['角色关系只得到部分文本支持'],
      unresolvedGaps: ['缺少明确的地点时间线'],
    },
    summary: {
      schemaVersion: 1 as const,
      sourceKind: 'text_import' as const,
      lastRunAt: '2026-04-08T10:00:00.000Z',
      suggestedPackageName: 'woven-import-package',
      sourceSummary: '外部文本来源摘要',
      importSummary: '已提取世界观与角色框架',
      warnings: ['角色关系只得到部分文本支持'],
      unresolvedGaps: ['缺少明确的地点时间线'],
      warningCount: 1,
      unresolvedGapCount: 1,
      bootstrapStatus: 'pending' as const,
    },
  };
}

function requireMainStoryline(
  repository: StorylineRepositoryFile | null,
): StorylineRecord {
  if (!repository) {
    throw new Error('Expected storyline repository to exist.');
  }

  const storyline = repository.storylinesById.storyline_main;
  if (!storyline) {
    throw new Error('Expected storyline_main to exist.');
  }

  return storyline;
}

describe('story package scaffold', () => {
  it('rejects invalid display names as input errors', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();

    await expect(
      createStoryPackageScaffold({
        mode: 'blank',
        displayName: 'CON',
      }),
    ).rejects.toBeInstanceOf(StoryPackageScaffoldInputError);
  });

  it('creates an explicit Phase 3 package scaffold that validates through both loader and repositories', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    const result = await createStoryPackageScaffold({
      mode: 'blank',
      displayName: '新故事包',
    });

    const packageRoot = path.resolve(storyPackagesRoot, result.packageName);
    createdPackageRoots.add(packageRoot);

    expect(result.packageName).toMatch(/[a-z0-9-]+/);
    expect(result.activeStorylineId).toBe('storyline_main');
    expect(result.createdAt).toEqual(expect.any(String));
    expect(result.warnings).toEqual([]);
    await expect(access(path.resolve(packageRoot, 'variants/variant_main'))).resolves.toBeUndefined();
    await expect(access(path.resolve(packageRoot, 'agents/gossipelog/config.yaml'))).resolves.toBeUndefined();
    await expect(access(path.resolve(packageRoot, 'agents/weaver/config.yaml'))).resolves.toBeUndefined();
    await expect(access(path.resolve(packageRoot, 'agents/weaver/import-summary.yaml'))).rejects.toThrow();

    await expect(loadStoryPackage(result.packageName)).resolves.toMatchObject({
      sceneSpec: expect.objectContaining({
        sceneName: '新故事包',
      }),
    });

    const repository = await readStorylineRepository(result.packageName);
    const runtimeFile = await runtimeSessionsRepository.readFile(result.packageName);
    const mainStoryline = requireMainStoryline(repository);

    expect(repository).toMatchObject({
      activeStorylineId: 'storyline_main',
      storylinesById: {
        storyline_main: expect.objectContaining({
          storylineId: 'storyline_main',
          variantId: 'variant_main',
          activeSessionId: expect.any(String),
        }),
      },
      variantsById: {
        variant_main: expect.objectContaining({
          variantId: 'variant_main',
          workspaceRoot: 'variants/variant_main',
        }),
      },
    });
    expect(runtimeFile).toMatchObject({
      activeSessionId: mainStoryline.activeSessionId,
      sessionsById: {
        [mainStoryline.activeSessionId]: expect.objectContaining({
          lifecycle: 'awaiting_start',
          headCheckpointId: null,
          activeCheckpointId: null,
        }),
      },
    });
  });

  it('rejects duplicate package names case-insensitively', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    const existingRoot = await mkdtemp(path.resolve(storyPackagesRoot, 'Case-Folded-Story-'));
    createdPackageRoots.add(existingRoot);

    await expect(
      createStoryPackageScaffold({
        mode: 'blank',
        displayName: path.basename(existingRoot).toLowerCase(),
      }),
    ).rejects.toBeInstanceOf(StoryPackageScaffoldConflictError);
  });

  it('cleans up the staged directory if scaffold validation fails before promotion', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    const brokenSlug = 'broken-package';
    const originalStringify = YAML.stringify;
    let stringifyCallCount = 0;

    vi.spyOn(YAML, 'stringify').mockImplementation((value, options) => {
      stringifyCallCount += 1;
      if (stringifyCallCount === 2) {
        return 'sceneName: [\n';
      }

      return originalStringify.call(YAML, value, options);
    });

    await expect(
      createStoryPackageScaffold({
        mode: 'blank',
        displayName: 'broken package',
      }),
    ).rejects.toBeInstanceOf(StoryPackageScaffoldValidationError);

    expect(await findStagedPackageRoots(brokenSlug)).toEqual([]);
    await expect(access(path.resolve(storyPackagesRoot, brokenSlug))).rejects.toThrow();
  });

  it('cleans up the staged directory if promotion fails after validation succeeds', async () => {
    const blockedSlug = 'rename-failure-package';
    await removeIfExists(path.resolve(storyPackagesRoot, blockedSlug));
    fileSystemFailureState.failRename = true;
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();

    await expect(
      createStoryPackageScaffold({
        mode: 'blank',
        displayName: 'rename failure package',
      }),
    ).rejects.toBeInstanceOf(StoryPackageScaffoldWriteError);

    expect(await findStagedPackageRoots(blockedSlug)).toEqual([]);
    await expect(access(path.resolve(storyPackagesRoot, blockedSlug))).rejects.toThrow();
  });

  it('wraps stage-root mkdir failures as write errors', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    fileSystemFailureState.failMkdirStageRoot = true;

    await expect(
      createStoryPackageScaffold({
        mode: 'blank',
        displayName: 'mkdir failure package',
      }),
    ).rejects.toBeInstanceOf(StoryPackageScaffoldWriteError);
  });

  it('preserves an explicit awaiting_start runtime session bound to storyline_main', async () => {
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    const result = await createStoryPackageScaffold({
      mode: 'blank',
      displayName: 'Awaiting Start Package',
    });

    const packageRoot = path.resolve(storyPackagesRoot, result.packageName);
    createdPackageRoots.add(packageRoot);

    const repository = await readStorylineRepository(result.packageName);
    const runtimeFile = await runtimeSessionsRepository.readFile(result.packageName);
    const mainStoryline = requireMainStoryline(repository);
    const boundSessionId = mainStoryline.activeSessionId;
    const runtimeJson = JSON.parse(
      await readFile(path.resolve(packageRoot, 'runtime-sessions.json'), 'utf8'),
    ) as {
      activeSessionId: string | null;
      sessionsById: Record<string, { lifecycle: string }>;
    };

    expect(boundSessionId).toEqual(expect.any(String));
    expect(runtimeFile?.activeSessionId).toBe(boundSessionId);
    expect(runtimeJson.activeSessionId).toBe(boundSessionId);
    expect(boundSessionId ? runtimeJson.sessionsById[boundSessionId]?.lifecycle : null).toBe(
      'awaiting_start',
    );
  });

  it('applies validated weaver seeds into the staged authored files before promotion', async () => {
    mockWeaverImport.mockResolvedValueOnce(createWeaverImportResult());
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    const result = await createStoryPackageScaffold({
      mode: 'text_import',
      displayName: '',
      sourceText: 'opening hook text',
      adapter: createTextImportAdapter(),
    });

    const packageRoot = path.resolve(storyPackagesRoot, result.packageName);
    createdPackageRoots.add(packageRoot);

    await expect(readFile(path.resolve(packageRoot, 'scene.yaml'), 'utf8')).resolves.toContain(
      'openingHook: opening hook text',
    );
    await expect(readFile(path.resolve(packageRoot, 'world-base.yaml'), 'utf8')).resolves.toContain(
      'worldBaseSetting: 近未来沿海都市',
    );
    await expect(access(path.resolve(packageRoot, 'agents/gossipelog/config.yaml'))).resolves.toBeUndefined();
    await expect(access(path.resolve(packageRoot, 'agents/weaver/config.yaml'))).resolves.toBeUndefined();
    await expect(
      readFile(path.resolve(packageRoot, 'agents/weaver/import-summary.yaml'), 'utf8'),
    ).resolves.toContain('sourceKind: text_import');
    expect(result.warnings).toEqual(['角色关系只得到部分文本支持']);
  });

  it('projects imported cast and location ids into the resulting scene spec instead of keeping scaffold defaults', async () => {
    const importResult = createWeaverImportResult();
    mockWeaverImport.mockResolvedValueOnce({
      ...importResult,
      payload: {
        ...importResult.payload,
        antagonists: [
          {
            displayName: '祁夜',
            roleSummary: '操控网络事故的地下策划者',
          },
        ],
        locations: [
          ...importResult.payload.locations,
          {
            displayName: '老城区中继站',
            summary: '被废弃线路包围的旧中继设施',
          },
        ],
      },
    });
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    const result = await createStoryPackageScaffold({
      mode: 'text_import',
      displayName: '',
      sourceText: 'opening hook text',
      adapter: createTextImportAdapter(),
    });

    const packageRoot = path.resolve(storyPackagesRoot, result.packageName);
    createdPackageRoots.add(packageRoot);

    await expect(loadStoryPackage(result.packageName)).resolves.toMatchObject({
      sceneSpec: {
        cast: ['chr_core01', 'chr_ant01'],
        locationIds: ['loc_a1b2c3', 'loc_000002'],
      },
    });
    await expect(readFile(path.resolve(packageRoot, 'scene.yaml'), 'utf8')).resolves.not.toContain(
      "cast:\n  - chr_hero01\n  - chr_core01\nlocationIds:\n  - loc_a1b2c3",
    );
  });

  it('preserves the original sourceText as scene openingHook even when weaver returns a rewritten openingHook', async () => {
    const importResult = createWeaverImportResult();
    mockWeaverImport.mockResolvedValueOnce({
      ...importResult,
      payload: {
        ...importResult.payload,
        openingHook: '模型改写后的 opening hook',
      },
    });
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    const result = await createStoryPackageScaffold({
      mode: 'text_import',
      displayName: '',
      sourceText: '作者原始文本',
      adapter: createTextImportAdapter(),
    });

    const packageRoot = path.resolve(storyPackagesRoot, result.packageName);
    createdPackageRoots.add(packageRoot);

    await expect(readFile(path.resolve(packageRoot, 'scene.yaml'), 'utf8')).resolves.toContain(
      'openingHook: 作者原始文本',
    );
  });

  it('uses explicit author displayName before a weaver suggestion during text import', async () => {
    mockWeaverImport.mockResolvedValueOnce(createWeaverImportResult());
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();
    const result = await createStoryPackageScaffold({
      mode: 'text_import',
      displayName: '作者命名',
      sourceText: '作者原始文本',
      adapter: createTextImportAdapter(),
    });

    const packageRoot = path.resolve(storyPackagesRoot, result.packageName);
    createdPackageRoots.add(packageRoot);

    await expect(readFile(path.resolve(packageRoot, 'scene.yaml'), 'utf8')).resolves.toContain(
      'sceneName: 作者命名',
    );
    await expect(readFile(path.resolve(packageRoot, 'scene.yaml'), 'utf8')).resolves.not.toContain(
      'sceneName: woven-import-package',
    );
  });

  it('fails with a bounded import error when text import has neither author displayName nor a valid weaver suggestion', async () => {
    const importResult = createWeaverImportResult();
    mockWeaverImport.mockResolvedValueOnce({
      ...importResult,
      payload: {
        ...importResult.payload,
        suggestedPackageName: undefined,
      },
      summary: {
        ...importResult.summary,
        suggestedPackageName: undefined,
      },
    });
    const createStoryPackageScaffold = await loadCreateStoryPackageScaffold();

    await expect(
      createStoryPackageScaffold({
        mode: 'text_import',
        displayName: '',
        sourceText: '作者原始文本',
        adapter: createTextImportAdapter(),
      }),
    ).rejects.toBeInstanceOf(StoryPackageScaffoldImportError);
  });
});
