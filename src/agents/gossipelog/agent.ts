import {
  validateGossipelogInjectionResult,
  validateGossipelogUpdateResult,
} from '@/engine/schema-validator';
import type { GossipelogInjectionRequest, GossipelogUpdateRequest } from '@/engine/types/adapter-interface';
import {
  absorbConsumedDeltas,
  mergeRelationshipUpdates,
} from '@/agents/gossipelog/merge';
import * as gossipelogRepository from '@/agents/gossipelog/repository';
import type {
  RunGossipelogCycleInput,
  RunGossipelogCycleResult,
} from '@/agents/gossipelog/contracts';
import type {
  CharacterProfile,
  CharacterRelationshipsFile,
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
    edgeUpdates: [],
  };
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
  const relationshipsBySource: CharacterRelationshipsFile['relationshipsBySource'] = {};

  for (const [sourceRoleId, bucket] of Object.entries(file.relationshipsBySource)) {
    if (!candidateRoleIds.has(sourceRoleId)) {
      continue;
    }

    const targets = Object.fromEntries(
      Object.entries(bucket.targets).filter(([targetRoleId]) => candidateRoleIds.has(targetRoleId)),
    );

    if (Object.keys(targets).length === 0) {
      continue;
    }

    relationshipsBySource[sourceRoleId] = { targets };
  }

  return {
    ...file,
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

  for (const edgeUpdate of updateResult.edgeUpdates) {
    if (
      !candidateRoleIds.has(edgeUpdate.sourceRoleId) ||
      !candidateRoleIds.has(edgeUpdate.targetRoleId)
    ) {
      throw new GossipelogCandidateSetViolationError();
    }
  }
}

function buildUpdateRequest(
  input: Pick<RunGossipelogCycleInput, 'acceptedBeatText' | 'roundId' | 'storyPackage'>,
  candidateRoles: readonly CharacterProfile[],
  relationshipSubgraph: CharacterRelationshipsFile,
): GossipelogUpdateRequest {
  const sceneCastRoleIds = candidateRoles.map((role) => role.characterId);

  return {
    acceptedBeatText: input.acceptedBeatText,
    roundId: input.roundId,
    sceneCastRoleIds,
    sceneCastFraming: {
      sceneId: input.storyPackage.sceneSpec.sceneId,
      castRoleIds: sceneCastRoleIds,
    },
    candidateRoles,
    roleDefinitions: candidateRoles,
    relationshipSubgraph,
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
  const candidateRoles = resolveSceneCandidateRoles(input.storyPackage);
  const candidateRoleIds = new Set(candidateRoles.map((role) => role.characterId));
  const settledFile = absorbConsumedDeltas(persistedFile, input.roundId);
  const updateRequest = buildUpdateRequest(
    input,
    candidateRoles,
    selectRelationshipSubgraph(settledFile, candidateRoleIds),
  );

  let updateResult = createInvocationNoOpResult();
  let resolvedFile = persistedFile;
  let usedFallbackSource: RunGossipelogCycleResult['usedFallbackSource'];

  try {
    const rawUpdateResult = await input.adapter.gossipelogUpdate(updateRequest);
    const validatedUpdateResult = validateGossipelogUpdateResult(rawUpdateResult);

    assertUpdateWithinCandidateSet(validatedUpdateResult, candidateRoleIds);

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
