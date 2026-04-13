import { rm } from 'node:fs/promises';
import path from 'node:path';
import type {
  GossipelogUpdateResult,
  GossipelogMemoryUpdate,
  RelationshipMemoryEntry,
  RelationshipMemoryEdge,
  CharacterRelationshipsFile,
} from '@/types';

const DEFAULT_ENTRY_OVERRIDES: Pick<RelationshipMemoryEntry, 'functionalRole' | 'mindsetTags' | 'summary' | 'triggerEvent' | 'reasoning' | 'causalAction'> = {
  functionalRole: '观察对象',
  mindsetTags: ['中立'],
  summary: 'initial observation',
  triggerEvent: 'encounter',
  reasoning: 'first impression',
  causalAction: 'observe',
};

export function createNoOpUpdateResult(
  overrides: Partial<GossipelogUpdateResult> = {},
): GossipelogUpdateResult {
  return {
    involvedRoleIds: [],
    invocationNoOp: true,
    memoryUpdates: [],
    ...overrides,
  } as GossipelogUpdateResult;
}

export function createAppliedUpdateResult(
  memoryUpdates: GossipelogMemoryUpdate[],
  overrides: Partial<GossipelogUpdateResult> = {},
): GossipelogUpdateResult {
  return {
    involvedRoleIds: memoryUpdates.flatMap((mu) => [mu.sourceRoleId, mu.targetRoleId]),
    invocationNoOp: false,
    memoryUpdates,
    ...overrides,
  } as GossipelogUpdateResult;
}

export function createMemoryUpdate(params: {
  sourceRoleId: string;
  targetRoleId: string;
  shouldCreateEdge?: boolean;
  phaseId: string;
  beatIndex: number;
  roundId: string;
  overrides?: Partial<RelationshipMemoryEntry>;
}): GossipelogMemoryUpdate {
  const defaultEntry: RelationshipMemoryEntry = {
    phaseId: params.phaseId,
    beatIndex: params.beatIndex,
    roundId: params.roundId,
    ...DEFAULT_ENTRY_OVERRIDES,
    ...params.overrides,
  };

  return {
    sourceRoleId: params.sourceRoleId,
    targetRoleId: params.targetRoleId,
    shouldCreateEdge: params.shouldCreateEdge ?? false,
    nextCurrentRelation: defaultEntry,
  };
}

export function createEmptyV2RelationshipFile(
  storyPackage = 'test-package',
): CharacterRelationshipsFile {
  return {
    meta: { fileType: 'character-relationships', schemaVersion: 2, storyPackage },
    relationshipsBySource: {},
  };
}

export function createV2Edge(
  sourceRoleId: string,
  targetRoleId: string,
  entry: { phaseId: string; beatIndex: number; roundId: string } & Partial<RelationshipMemoryEntry>,
): RelationshipMemoryEdge {
  const { phaseId, beatIndex, roundId, ...entryOverrides } = entry;
  const fullEntry: RelationshipMemoryEntry = {
    ...DEFAULT_ENTRY_OVERRIDES,
    ...entryOverrides,
    phaseId,
    beatIndex,
    roundId,
  };

  return {
    sourceRoleId,
    targetRoleId,
    currentRelation: fullEntry,
    history: [fullEntry],
  };
}

export async function stripStorylineSubstrate(packagePath: string): Promise<void> {
  const targets = [
    path.join(packagePath, 'storyline-repository.json'),
    path.join(packagePath, 'variants'),
  ];
  for (const target of targets) {
    await rm(target, { recursive: true, force: true });
  }
}
