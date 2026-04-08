import { cpSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  GossipelogCandidateSetViolationError,
  runGossipelogCycle,
} from '@/agents/gossipelog/agent';
import { bootstrapGossipelogFromWeaverSummary } from '@/agents/gossipelog/bootstrap';
import * as gossipelogRepository from '@/agents/gossipelog/repository';
import { loadWeaverImportSummary } from '@/agents/weaver/repository';
import { loadStoryPackage } from '@/engine/story-loader';
import type {
  GossipelogInjectionRequest,
  GossipelogUpdateRequest,
  LLMAdapter,
} from '@/engine/types/adapter-interface';
import type {
  GossipelogInjectionResult,
  GossipelogUpdateResult,
  StoryPackage,
  WeaverImportSummary,
} from '@/types';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const samplePackagePath = path.resolve(storyPackagesRoot, 'sample-scene');
const tempPackagePaths: string[] = [];

afterEach(() => {
  while (tempPackagePaths.length > 0) {
    const packagePath = tempPackagePaths.pop();

    if (packagePath) {
      rmSync(packagePath, { recursive: true, force: true });
    }
  }
});

async function createStoryPackageFixture(): Promise<{
  readonly packageName: string;
  readonly packagePath: string;
  readonly storyPackage: StoryPackage;
}> {
  const packageName = `tmp-gossipelog-agent-${Math.random().toString(16).slice(2)}`;
  const packagePath = path.resolve(storyPackagesRoot, packageName);
  tempPackagePaths.push(packagePath);
  cpSync(samplePackagePath, packagePath, { recursive: true });

  return {
    packageName,
    packagePath,
    storyPackage: await loadStoryPackage(packageName),
  };
}

async function createCastlessStoryPackageFixture(): Promise<{
  readonly packageName: string;
  readonly packagePath: string;
  readonly storyPackage: StoryPackage;
}> {
  const fixture = await createStoryPackageFixture();
  const scenePath = path.resolve(fixture.packagePath, 'scene.yaml');
  const scene = YAML.parse(readFileSync(scenePath, 'utf8')) as Record<string, unknown>;
  const { cast, ...sceneWithoutCast } = scene;
  void cast;
  writeFileSync(scenePath, YAML.stringify(sceneWithoutCast), 'utf8');

  return {
    ...fixture,
    storyPackage: await loadStoryPackage(fixture.packageName),
  };
}

function getCandidateRoleIds(storyPackage: StoryPackage): string[] {
  return [
    storyPackage.worldBase.hero.characterId,
    ...new Set(storyPackage.sceneSpec.cast ?? []),
  ];
}

function getOutOfBoundsRoleId(storyPackage: StoryPackage): string {
  const candidateRoleIds = new Set(getCandidateRoleIds(storyPackage));
  const outOfBoundsRole = [...storyPackage.worldBase.coreCast, ...storyPackage.worldBase.antagonists].find(
    (role) => !candidateRoleIds.has(role.characterId),
  );

  if (!outOfBoundsRole) {
    throw new Error('Expected sample-scene to contain at least one out-of-bounds role.');
  }

  return outOfBoundsRole.characterId;
}

function appendOutOfBoundsRelationship(
  packagePath: string,
  storyPackage: StoryPackage,
  outOfBoundsRoleId: string,
): void {
  const relationshipPath = path.resolve(packagePath, 'agents/gossipelog/character-relationships.yaml');
  const relationshipFile = YAML.parse(readFileSync(relationshipPath, 'utf8')) as {
    meta: Record<string, unknown>;
    relationshipsBySource: Record<string, { targets: Record<string, unknown> }>;
  };
  const heroRoleId = storyPackage.worldBase.hero.characterId;

  relationshipFile.relationshipsBySource = {
    ...relationshipFile.relationshipsBySource,
    [outOfBoundsRoleId]: {
      targets: {
        [heroRoleId]: {
          sourceRoleId: outOfBoundsRoleId,
          targetRoleId: heroRoleId,
          baseline: {
            state: 'out-of-bounds baseline',
            lastAbsorbedRound: 'round-0008',
          },
          recentDelta: {
            state: 'out-of-bounds delta',
            sourceRound: 'round-0009',
          },
          highlightNextPrompt: true,
        },
      },
    },
  };

  writeFileSync(relationshipPath, YAML.stringify(relationshipFile), 'utf8');
}

function requireInjectionRequest(
  request: GossipelogInjectionRequest | null,
): GossipelogInjectionRequest {
  if (!request) {
    throw new Error('Expected gossipelog injection request to be captured.');
  }

  return request;
}

function createWeaverSummary(overrides: Partial<WeaverImportSummary> = {}): WeaverImportSummary {
  return {
    schemaVersion: 1,
    sourceKind: 'text_import',
    lastRunAt: '2026-04-08T12:00:00.000Z',
    suggestedPackageName: 'woven-import-package',
    sourceSummary: '作者原文摘要',
    importSummary: '已整理出基础导入摘要',
    warnings: ['角色关系只得到部分文本支持'],
    unresolvedGaps: [],
    warningCount: 1,
    unresolvedGapCount: 0,
    bootstrapStatus: 'pending',
    ...overrides,
  };
}

describe('gossipelog agent shell', () => {
  it('builds a bounded update context from accepted beat, current role definitions, and current relationship subgraph', async () => {
    const { packageName, packagePath, storyPackage } = await createStoryPackageFixture();
    const outOfBoundsRoleId = getOutOfBoundsRoleId(storyPackage);
    appendOutOfBoundsRelationship(packagePath, storyPackage, outOfBoundsRoleId);

    let capturedUpdateRequest: GossipelogUpdateRequest | null = null;
    const adapter: Pick<LLMAdapter, 'gossipelogUpdate' | 'gossipelogInjection'> = {
      gossipelogUpdate: vi.fn(async (request) => {
        capturedUpdateRequest = request;
        return {
          involvedRoleIds: [storyPackage.worldBase.hero.characterId],
          invocationNoOp: true,
          edgeUpdates: [],
        };
      }),
      gossipelogInjection: vi.fn(async () => ({
        highlightedDeltasText: '',
        stableBackgroundText: 'stable background',
      })),
    };

    const result = await runGossipelogCycle({
      adapter,
      storyPackageName: packageName,
      storyPackage,
      acceptedBeatText: 'accepted beat text',
      roundId: 'round-0009',
    });
    const candidateRoleIds = getCandidateRoleIds(storyPackage);

    expect(capturedUpdateRequest).not.toBeNull();
    expect(result.updateRequest.candidateRoles.map((role) => role.characterId)).toEqual(
      candidateRoleIds,
    );
    expect(result.updateRequest.roleDefinitions.map((role) => role.characterId)).toEqual(
      candidateRoleIds,
    );
    expect(result.updateRequest.sceneCastRoleIds).toEqual(candidateRoleIds);
    expect(result.updateRequest.sceneCastFraming).toEqual({
      sceneId: storyPackage.sceneSpec.sceneId,
      castRoleIds: candidateRoleIds,
    });
    expect(Object.keys(result.updateRequest.relationshipSubgraph.relationshipsBySource)).not.toContain(
      outOfBoundsRoleId,
    );
  });

  it('rejects skill-returned role IDs that escape the Scene-bounded candidate set', async () => {
    const { packageName, storyPackage } = await createStoryPackageFixture();
    const outOfBoundsRoleId = getOutOfBoundsRoleId(storyPackage);

    await expect(
      runGossipelogCycle({
        adapter: {
          gossipelogUpdate: async () =>
            ({
              involvedRoleIds: [outOfBoundsRoleId],
              invocationNoOp: true,
              edgeUpdates: [],
            }) as GossipelogUpdateResult,
          gossipelogInjection: async () => ({
            highlightedDeltasText: '',
            stableBackgroundText: '',
          }),
        },
        storyPackageName: packageName,
        storyPackage,
        acceptedBeatText: 'accepted beat text',
        roundId: 'round-0009',
      }),
    ).rejects.toBeInstanceOf(GossipelogCandidateSetViolationError);
  });

  it('completes the update -> merge -> persist -> injection sub-loop and returns prompt-ready relationship text', async () => {
    const { packageName, storyPackage } = await createStoryPackageFixture();
    const heroRoleId = storyPackage.worldBase.hero.characterId;
    const sourceRoleId = storyPackage.worldBase.coreCast[0]!.characterId;
    let capturedInjectionRequest: GossipelogInjectionRequest | null = null;

    const result = await runGossipelogCycle({
      adapter: {
        gossipelogUpdate: async () =>
          ({
            involvedRoleIds: [sourceRoleId, heroRoleId],
            invocationNoOp: false,
            edgeUpdates: [
              {
                sourceRoleId,
                targetRoleId: heroRoleId,
                mode: 'delta',
                replaceBaseline: false,
                recentDelta: {
                  state: 'trust increased again after decisive help',
                  sourceRound: 'round-0011',
                },
              },
            ],
          }) as GossipelogUpdateResult,
        gossipelogInjection: async (request) => {
          capturedInjectionRequest = request;
          return {
            highlightedDeltasText: 'highlighted deltas text',
            stableBackgroundText: 'stable background text',
          };
        },
      },
      storyPackageName: packageName,
      storyPackage,
      acceptedBeatText: 'accepted beat text',
      roundId: 'round-0011',
    });
    const persisted = await gossipelogRepository.loadCharacterRelationships(packageName);
    const injectionRequest = requireInjectionRequest(capturedInjectionRequest);

    expect(capturedInjectionRequest).not.toBeNull();
    expect(
      injectionRequest.relationshipSubgraph.relationshipsBySource[sourceRoleId]?.targets[heroRoleId],
    ).toMatchObject({
      recentDelta: {
        state: 'trust increased again after decisive help',
        sourceRound: 'round-0011',
      },
      highlightNextPrompt: true,
    });
    expect(persisted.relationshipsBySource[sourceRoleId]?.targets[heroRoleId]).toMatchObject({
      recentDelta: {
        state: 'trust increased again after decisive help',
        sourceRound: 'round-0011',
      },
      highlightNextPrompt: true,
    });
    expect(result.relationshipLayer).toEqual({
      highlightedDeltasText: 'highlighted deltas text',
      stableBackgroundText: 'stable background text',
    });
  });

  it('treats invocation-level no-op as a full sidecar cycle rather than a short-circuit', async () => {
    const { packageName, storyPackage } = await createStoryPackageFixture();
    const gossipelogUpdate = vi.fn(async () => ({
      involvedRoleIds: [storyPackage.worldBase.hero.characterId],
      invocationNoOp: true,
      edgeUpdates: [],
    }));
    const gossipelogInjection = vi.fn(async () => ({
      highlightedDeltasText: '',
      stableBackgroundText: 'stable background text',
    }));

    const result = await runGossipelogCycle({
      adapter: {
        gossipelogUpdate,
        gossipelogInjection,
      },
      storyPackageName: packageName,
      storyPackage,
      acceptedBeatText: 'accepted beat text',
      roundId: 'round-0011',
    });

    expect(result.updateResult.invocationNoOp).toBe(true);
    expect(gossipelogUpdate).toHaveBeenCalledTimes(1);
    expect(gossipelogInjection).toHaveBeenCalledTimes(1);
    expect(result.relationshipLayer.stableBackgroundText).toBe('stable background text');
  });

  it('does not write relationship state on invocation-level no-op when persisted state is unchanged', async () => {
    const { packageName, storyPackage } = await createStoryPackageFixture();
    const relationshipPath = path.resolve(
      storyPackagesRoot,
      packageName,
      'agents/gossipelog/character-relationships.yaml',
    );
    const beforeMtimeMs = statSync(relationshipPath).mtimeMs;

    await new Promise((resolve) => setTimeout(resolve, 25));

    await runGossipelogCycle({
      adapter: {
        gossipelogUpdate: async () => ({
          involvedRoleIds: [storyPackage.worldBase.hero.characterId],
          invocationNoOp: true,
          edgeUpdates: [],
        }),
        gossipelogInjection: async () => ({
          highlightedDeltasText: '',
          stableBackgroundText: 'stable background text',
        }),
      },
      storyPackageName: packageName,
      storyPackage,
      acceptedBeatText: 'accepted beat text',
      roundId: 'round-0009',
    });

    expect(statSync(relationshipPath).mtimeMs).toBe(beforeMtimeMs);
  });

  it('keeps candidate role bounding to the implicit hero only when scene cast is absent', async () => {
    const { packageName, storyPackage } = await createCastlessStoryPackageFixture();

    const result = await runGossipelogCycle({
      adapter: {
        gossipelogUpdate: async () => ({
          involvedRoleIds: [storyPackage.worldBase.hero.characterId],
          invocationNoOp: true,
          edgeUpdates: [],
        }),
        gossipelogInjection: async () => ({
          highlightedDeltasText: '',
          stableBackgroundText: 'stable background text',
        }),
      },
      storyPackageName: packageName,
      storyPackage,
      acceptedBeatText: 'accepted beat text',
      roundId: 'round-0009',
    });

    expect(result.updateRequest.candidateRoles.map((role) => role.characterId)).toEqual([
      storyPackage.worldBase.hero.characterId,
    ]);
    expect(result.updateRequest.sceneCastRoleIds).toEqual([storyPackage.worldBase.hero.characterId]);
  });

  it('falls back to persisted stable state when update output is invalid', async () => {
    const { packageName, storyPackage } = await createStoryPackageFixture();
    const before = await gossipelogRepository.loadCharacterRelationships(packageName);
    let capturedInjectionRequest: GossipelogInjectionRequest | null = null;

    const result = await runGossipelogCycle({
      adapter: {
        gossipelogUpdate: async () =>
          ({
            involvedRoleIds: [storyPackage.worldBase.hero.characterId],
            invocationNoOp: false,
            edgeUpdates: [],
          }) as unknown as GossipelogUpdateResult,
        gossipelogInjection: async (request) => {
          capturedInjectionRequest = request;
          return {
            highlightedDeltasText: 'fallback delta text',
            stableBackgroundText: 'fallback background text',
          };
        },
      },
      storyPackageName: packageName,
      storyPackage,
      acceptedBeatText: 'accepted beat text',
      roundId: 'round-0011',
    });
    const after = await gossipelogRepository.loadCharacterRelationships(packageName);
    const injectionRequest = requireInjectionRequest(capturedInjectionRequest);

    expect(result.usedFallbackSource).toBe('persisted-relationship-state');
    expect(injectionRequest.relationshipSubgraph).toEqual(before);
    expect(after).toEqual(before);
  });

  it('falls back to persisted stable state when save/writeback fails', async () => {
    const { packageName, storyPackage } = await createStoryPackageFixture();
    const before = await gossipelogRepository.loadCharacterRelationships(packageName);
    const heroRoleId = storyPackage.worldBase.hero.characterId;
    const sourceRoleId = storyPackage.worldBase.coreCast[0]!.characterId;
    const saveSpy = vi
      .spyOn(gossipelogRepository, 'saveCharacterRelationships')
      .mockRejectedValueOnce(new Error('disk write failed'));
    let capturedInjectionRequest: GossipelogInjectionRequest | null = null;

    try {
      const result = await runGossipelogCycle({
        adapter: {
          gossipelogUpdate: async () =>
            ({
              involvedRoleIds: [sourceRoleId, heroRoleId],
              invocationNoOp: false,
              edgeUpdates: [
                {
                  sourceRoleId,
                  targetRoleId: heroRoleId,
                  mode: 'delta',
                  replaceBaseline: false,
                  recentDelta: {
                    state: 'trust changed but write failed',
                    sourceRound: 'round-0011',
                  },
                },
              ],
            }) as GossipelogUpdateResult,
          gossipelogInjection: async (request) => {
            capturedInjectionRequest = request;
            return {
              highlightedDeltasText: 'fallback delta text',
              stableBackgroundText: 'fallback background text',
            };
          },
        },
        storyPackageName: packageName,
        storyPackage,
        acceptedBeatText: 'accepted beat text',
        roundId: 'round-0011',
      });
      const injectionRequest = requireInjectionRequest(capturedInjectionRequest);

      expect(result.usedFallbackSource).toBe('persisted-relationship-state');
      expect(injectionRequest.relationshipSubgraph).toEqual(before);
      expect(await gossipelogRepository.loadCharacterRelationships(packageName)).toEqual(before);
    } finally {
      saveSpy.mockRestore();
    }
  });

  it('falls back to the last stable relationship layer when injection fails', async () => {
    const { packageName, storyPackage } = await createStoryPackageFixture();
    const heroRoleId = storyPackage.worldBase.hero.characterId;
    const sourceRoleId = storyPackage.worldBase.coreCast[0]!.characterId;
    const lastStableRelationshipLayer: GossipelogInjectionResult = {
      highlightedDeltasText: 'last stable delta',
      stableBackgroundText: 'last stable background',
    };

    const result = await runGossipelogCycle({
      adapter: {
        gossipelogUpdate: async () =>
          ({
            involvedRoleIds: [sourceRoleId, heroRoleId],
            invocationNoOp: false,
            edgeUpdates: [
              {
                sourceRoleId,
                targetRoleId: heroRoleId,
                mode: 'delta',
                replaceBaseline: false,
                recentDelta: {
                  state: 'trust changed before injection failure',
                  sourceRound: 'round-0011',
                },
              },
            ],
          }) as GossipelogUpdateResult,
        gossipelogInjection: async () => {
          throw new Error('injection failed');
        },
      },
      storyPackageName: packageName,
      storyPackage,
      acceptedBeatText: 'accepted beat text',
      roundId: 'round-0011',
      lastStableRelationshipLayer,
    });
    const persisted = await gossipelogRepository.loadCharacterRelationships(packageName);

    expect(result.usedFallbackLayer).toBe('last-stable-layer');
    expect(result.relationshipLayer).toEqual(lastStableRelationshipLayer);
    expect(persisted.relationshipsBySource[sourceRoleId]?.targets[heroRoleId]).toMatchObject({
      recentDelta: {
        state: 'trust changed before injection failure',
        sourceRound: 'round-0011',
      },
      highlightNextPrompt: true,
    });
  });

  it('bootstrap anchors acceptedBeatText on the persisted scene openingHook and appends bounded relationship-confidence notes', async () => {
    const { packageName, storyPackage } = await createStoryPackageFixture();
    const relationshipPath = path.resolve(
      storyPackagesRoot,
      packageName,
      'agents/gossipelog/character-relationships.yaml',
    );

    rmSync(relationshipPath, { force: true });

    const capturedAcceptedBeatTexts: string[] = [];

    const result = await bootstrapGossipelogFromWeaverSummary({
      storyPackageName: packageName,
      weaverSummary: createWeaverSummary(),
      adapter: {
        gossipelogUpdate: vi.fn(async (request: GossipelogUpdateRequest) => {
          capturedAcceptedBeatTexts.push(request.acceptedBeatText);
          return {
            involvedRoleIds: [],
            invocationNoOp: true,
            edgeUpdates: [],
          };
        }),
        gossipelogInjection: vi.fn(async () => ({
          highlightedDeltasText: '',
          stableBackgroundText: 'seeded background',
        })),
      },
    });

    expect(result.ok).toBe(true);
    expect(result.bootstrapStatus).toBe('succeeded');
    const acceptedBeatText = capturedAcceptedBeatTexts[0];
    if (!acceptedBeatText) {
      throw new Error('Expected bootstrap update request to be captured.');
    }
    expect(acceptedBeatText).toContain(storyPackage.sceneSpec.openingHook ?? '');
    expect(acceptedBeatText).toContain('Relationship-confidence note:');
    expect(acceptedBeatText).toContain('角色关系只得到部分文本支持');
    expect(acceptedBeatText).not.toContain(createWeaverSummary().importSummary);
    expect(acceptedBeatText).not.toContain(createWeaverSummary().sourceSummary);
    await expect(gossipelogRepository.inspectCharacterRelationshipsState(packageName)).resolves.toBe(
      'readable',
    );
    await expect(loadWeaverImportSummary(packageName)).resolves.toMatchObject({
      bootstrapStatus: 'succeeded',
    });
  });

  it('bootstrap keeps unreadable gossipelog state unreadable when a bootstrap attempt fails', async () => {
    const { packageName } = await createStoryPackageFixture();
    const relationshipPath = path.resolve(
      storyPackagesRoot,
      packageName,
      'agents/gossipelog/character-relationships.yaml',
    );

    writeFileSync(relationshipPath, 'meta: [', 'utf8');

    const result = await bootstrapGossipelogFromWeaverSummary({
      storyPackageName: packageName,
      weaverSummary: createWeaverSummary(),
      adapter: {
        gossipelogUpdate: vi.fn(async () => {
          throw new Error('model timeout');
        }),
        gossipelogInjection: vi.fn(async () => ({
          highlightedDeltasText: '',
          stableBackgroundText: '',
        })),
      },
      relationshipState: 'unreadable',
    });

    expect(result.ok).toBe(false);
    expect(result.bootstrapStatus).toBe('fallback_pending');
    expect(result.errorMessage).toContain('persisted-relationship-state');
    await expect(gossipelogRepository.inspectCharacterRelationshipsState(packageName)).resolves.toBe(
      'unreadable',
    );
    await expect(loadWeaverImportSummary(packageName)).resolves.toMatchObject({
      bootstrapStatus: 'fallback_pending',
    });
  });
});
