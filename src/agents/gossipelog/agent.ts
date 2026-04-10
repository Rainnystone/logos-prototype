import {
  validateGossipelogInjectionResult,
  validateGossipelogUpdateResult,
} from '@/engine/schema-validator';
import type { GossipelogInjectionRequest, GossipelogUpdateRequest } from '@/engine/types/adapter-interface';
import { resolveSidecarReferences } from '@/agents/reference-loader';
import {
  absorbConsumedDeltas,
  mergeRelationshipUpdates,
} from '@/agents/gossipelog/merge';
import { gossipelogAgentDefinition } from '@/agents/gossipelog/definition';
import * as gossipelogRepository from '@/agents/gossipelog/repository';
import type {
  RunGossipelogCycleInput,
  RunGossipelogCycleResult,
} from '@/agents/gossipelog/contracts';
import type {
  CharacterProfile,
  CharacterRelationshipsFile,
  CharacterRelationshipsFileV1,
  CharacterRelationshipsFileV2,
  GossipelogInjectionResult,
  GossipelogUpdateResult,
  StoryPackage,
} from '@/types';

const EMPTY_RELATIONSHIP_LAYER: GossipelogInjectionResult = {
  highlightedDeltasText: '',
  stableBackgroundText: '',
};

export class GossipelogCandidateSetViolationError extends Error {
  constructor(message = 'Gossipelog update returned role IDs outside the bounded candidate set.') {
    super(message);
    this.name = 'GossipelogCandidateSetViolationError';
  }
}

function areRelationshipFilesEqual(
  left: CharacterRelationshipsFile,
  right: CharacterRelationshipsFile,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createInvocationNoOpResult(): GossipelogUpdateResult {
  return {
    involvedRoleIds: [],
    invocationNoOp: true,
    memoryUpdates: [],
  };
}

function resolveGossipelogUpdateManifests() {
  return gossipelogAgentDefinition.referenceManifestsByOperation?.gossipelogUpdate ?? [];
}

function buildRoleIndex(storyPackage: StoryPackage): Map<string, CharacterProfile> {
  return new Map(
    [
      storyPackage.worldBase.hero,
      ...storyPackage.worldBase.coreCast,
      ...storyPackage.worldBase.antagonists,
    ].map((role) => [role.characterId, role]),
  );
}

function resolveSceneCandidateRoles(storyPackage: StoryPackage): CharacterProfile[] {
  const roleIndex = buildRoleIndex(storyPackage);
  const orderedRoleIds = [
    storyPackage.worldBase.hero.characterId,
    ...(storyPackage.sceneSpec.cast ?? []),
  ];
  const seen = new Set<string>();
  const candidateRoles: CharacterProfile[] = [];

  for (const roleId of orderedRoleIds) {
    if (seen.has(roleId)) {
      continue;
    }

    const role = roleIndex.get(roleId);

    if (!role) {
      throw new Error(`Gossipelog candidate role "${roleId}" is missing from the story package.`);
    }

    seen.add(roleId);
    candidateRoles.push(role);
  }

  return candidateRoles;
}

function selectRelationshipSubgraph(
  file: CharacterRelationshipsFile,
  candidateRoleIds: ReadonlySet<string>,
): CharacterRelationshipsFile {
  if (file.meta.schemaVersion === 2) {
    const relationshipsBySource: CharacterRelationshipsFileV2['relationshipsBySource'] = {};

    for (const [sourceRoleId, bucket] of Object.entries(file.relationshipsBySource)) {
      if (!candidateRoleIds.has(sourceRoleId)) {
        continue;
      }

      const targets = Object.fromEntries(
        Object.entries(bucket.targets).filter(([targetRoleId]) => candidateRoleIds.has(targetRoleId)),
      ) as CharacterRelationshipsFileV2['relationshipsBySource'][string]['targets'];

      if (Object.keys(targets).length === 0) {
        continue;
      }

      relationshipsBySource[sourceRoleId] = { targets };
    }

    return {
      meta: { ...file.meta },
      relationshipsBySource,
    };
  }

  const relationshipsBySource: CharacterRelationshipsFileV1['relationshipsBySource'] = {};

  for (const [sourceRoleId, bucket] of Object.entries(file.relationshipsBySource)) {
    if (!candidateRoleIds.has(sourceRoleId)) {
      continue;
    }

    const targets = Object.fromEntries(
      Object.entries(bucket.targets).filter(([targetRoleId]) => candidateRoleIds.has(targetRoleId)),
    ) as CharacterRelationshipsFileV1['relationshipsBySource'][string]['targets'];

    if (Object.keys(targets).length === 0) {
      continue;
    }

    relationshipsBySource[sourceRoleId] = { targets };
  }

  return {
    meta: { ...file.meta },
    relationshipsBySource,
  };
}

function buildCycleResult(
  input: Pick<
    RunGossipelogCycleResult,
    'updateRequest' | 'updateResult' | 'injectionRequest' | 'relationshipLayer'
  > & {
    readonly usedFallbackSource?: RunGossipelogCycleResult['usedFallbackSource'];
    readonly usedFallbackLayer?: RunGossipelogCycleResult['usedFallbackLayer'];
  },
): RunGossipelogCycleResult {
  return {
    updateRequest: input.updateRequest,
    updateResult: input.updateResult,
    injectionRequest: input.injectionRequest,
    relationshipLayer: input.relationshipLayer,
    ...(input.usedFallbackSource ? { usedFallbackSource: input.usedFallbackSource } : {}),
    ...(input.usedFallbackLayer ? { usedFallbackLayer: input.usedFallbackLayer } : {}),
  };
}

function assertUpdateWithinCandidateSet(
  updateResult: GossipelogUpdateResult,
  candidateRoleIds: ReadonlySet<string>,
): void {
  for (const roleId of updateResult.involvedRoleIds) {
    if (!candidateRoleIds.has(roleId)) {
      throw new GossipelogCandidateSetViolationError();
    }
  }

  for (const edgeUpdate of updateResult.memoryUpdates) {
    if (
      !candidateRoleIds.has(edgeUpdate.sourceRoleId) ||
      !candidateRoleIds.has(edgeUpdate.targetRoleId)
    ) {
      throw new GossipelogCandidateSetViolationError();
    }
  }
}

function assertUpdateAnchorsMatchRequest(
  updateResult: GossipelogUpdateResult,
  input: Pick<RunGossipelogCycleInput, 'roundId' | 'phaseId' | 'beatIndex'>,
): void {
  for (const memoryUpdate of updateResult.memoryUpdates) {
    const { nextCurrentRelation } = memoryUpdate;

    if (
      nextCurrentRelation.phaseId === null ||
      nextCurrentRelation.beatIndex === null ||
      nextCurrentRelation.roundId !== input.roundId ||
      nextCurrentRelation.phaseId !== input.phaseId ||
      nextCurrentRelation.beatIndex !== input.beatIndex
    ) {
      throw new Error('Gossipelog update returned a memory anchor that does not match the request.');
    }
  }
}

function buildUpdateRequest(
  input: Pick<
    RunGossipelogCycleInput,
    'acceptedBeatText' | 'roundId' | 'phaseId' | 'beatIndex' | 'storyPackage'
  >,
  candidateRoles: readonly CharacterProfile[],
  relationshipSubgraph: CharacterRelationshipsFile,
  resolvedReferences: Awaited<ReturnType<typeof resolveSidecarReferences>>,
): GossipelogUpdateRequest {
  const sceneCastRoleIds = candidateRoles.map((role) => role.characterId);

  return {
    acceptedBeatText: input.acceptedBeatText,
    roundId: input.roundId,
    phaseId: input.phaseId,
    beatIndex: input.beatIndex,
    sceneCastRoleIds,
    sceneCastFraming: {
      sceneId: input.storyPackage.sceneSpec.sceneId,
      castRoleIds: sceneCastRoleIds,
    },
    candidateRoles,
    roleDefinitions: candidateRoles,
    relationshipSubgraph,
    resolvedReferences,
  };
}

function buildInjectionRequest(
  storyPackage: StoryPackage,
  candidateRoles: readonly CharacterProfile[],
  relationshipSubgraph: CharacterRelationshipsFile,
): GossipelogInjectionRequest {
  const sceneCastRoleIds = candidateRoles.map((role) => role.characterId);

  return {
    sceneCastRoleIds,
    sceneCastFraming: {
      sceneId: storyPackage.sceneSpec.sceneId,
      castRoleIds: sceneCastRoleIds,
    },
    roleDefinitions: candidateRoles,
    relationshipSubgraph,
  };
}

export async function runGossipelogCycle(
  input: RunGossipelogCycleInput,
): Promise<RunGossipelogCycleResult> {
  if (!input.adapter.gossipelogUpdate) {
    throw new Error('Gossipelog update adapter is required.');
  }

  if (!input.adapter.gossipelogInjection) {
    throw new Error('Gossipelog injection adapter is required.');
  }

  const persistedStateReadability = await gossipelogRepository.inspectCharacterRelationshipsState(
    input.storyPackageName,
  );
  const persistedFile = await gossipelogRepository.loadOrCreateCharacterRelationships(
    input.storyPackageName,
  );
  const resolvedReferences = await resolveSidecarReferences({
    agentId: gossipelogAgentDefinition.agentId,
    operationKind: 'gossipelogUpdate',
    manifests: resolveGossipelogUpdateManifests(),
  });
  const candidateRoles = resolveSceneCandidateRoles(input.storyPackage);
  const candidateRoleIds = new Set(candidateRoles.map((role) => role.characterId));
  const settledFile = absorbConsumedDeltas(persistedFile, input.roundId);
  const updateRequest = buildUpdateRequest(
    input,
    candidateRoles,
    selectRelationshipSubgraph(settledFile, candidateRoleIds),
    resolvedReferences,
  );

  let updateResult = createInvocationNoOpResult();
  let resolvedFile = persistedFile;
  let usedFallbackSource: RunGossipelogCycleResult['usedFallbackSource'];

  try {
    const rawUpdateResult = await input.adapter.gossipelogUpdate(updateRequest);
    const validatedUpdateResult = validateGossipelogUpdateResult(rawUpdateResult);

    assertUpdateWithinCandidateSet(validatedUpdateResult, candidateRoleIds);
    assertUpdateAnchorsMatchRequest(validatedUpdateResult, input);

    const mergedFile = mergeRelationshipUpdates(settledFile, validatedUpdateResult, {
      heroRoleId: input.storyPackage.worldBase.hero.characterId,
    });

    if (
      persistedStateReadability !== 'readable' ||
      !areRelationshipFilesEqual(persistedFile, mergedFile)
    ) {
      await gossipelogRepository.saveCharacterRelationships(input.storyPackageName, mergedFile);
    }

    updateResult = validatedUpdateResult;
    resolvedFile = mergedFile;
  } catch (error) {
    if (error instanceof GossipelogCandidateSetViolationError) {
      throw error;
    }

    usedFallbackSource = 'persisted-relationship-state';
  }

  const injectionRequest = buildInjectionRequest(
    input.storyPackage,
    candidateRoles,
    selectRelationshipSubgraph(resolvedFile, candidateRoleIds),
  );

  try {
    const injectionResult = validateGossipelogInjectionResult(
      await input.adapter.gossipelogInjection(injectionRequest),
    );

    return buildCycleResult({
      updateRequest,
      updateResult,
      injectionRequest,
      relationshipLayer: injectionResult,
      usedFallbackSource,
    });
  } catch {
    const relationshipLayer = input.lastStableRelationshipLayer ?? EMPTY_RELATIONSHIP_LAYER;

    return buildCycleResult({
      updateRequest,
      updateResult,
      injectionRequest,
      relationshipLayer,
      usedFallbackSource,
      usedFallbackLayer: input.lastStableRelationshipLayer ? 'last-stable-layer' : 'empty-layer',
    });
  }
}
