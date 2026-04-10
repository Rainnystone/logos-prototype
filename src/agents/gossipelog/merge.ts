import type {
  CharacterRelationshipsFile,
  CharacterRelationshipsFileV1,
  CharacterRelationshipsFileV2,
  GossipelogMemoryUpdate,
  GossipelogUpdateResult,
  RelationshipEdge,
  RelationshipMemoryEdge,
  RelationshipMemoryEntry,
} from '@/types';

export interface RelationshipMergeOptions {
  readonly heroRoleId: string;
}

function cloneMemoryEntry(entry: RelationshipMemoryEntry): RelationshipMemoryEntry {
  return {
    ...entry,
    mindsetTags: [...entry.mindsetTags],
  };
}

function isSameMemoryEntry(
  left: RelationshipMemoryEntry,
  right: RelationshipMemoryEntry,
): boolean {
  if (
    left.phaseId !== right.phaseId ||
    left.beatIndex !== right.beatIndex ||
    left.roundId !== right.roundId ||
    left.functionalRole !== right.functionalRole ||
    left.summary !== right.summary ||
    left.triggerEvent !== right.triggerEvent ||
    left.reasoning !== right.reasoning ||
    left.causalAction !== right.causalAction ||
    left.mindsetTags.length !== right.mindsetTags.length
  ) {
    return false;
  }

  return left.mindsetTags.every((tag, index) => tag === right.mindsetTags[index]);
}

function migrateLegacyEdgeToMemoryEdge(edge: RelationshipEdge): RelationshipMemoryEdge {
  const history: RelationshipMemoryEntry[] = [
    {
      phaseId: null,
      beatIndex: null,
      roundId: edge.baseline.lastAbsorbedRound,
      functionalRole: null,
      mindsetTags: [],
      summary: edge.baseline.state,
      triggerEvent: '',
      reasoning: '',
      causalAction: '',
    },
  ];

  if (edge.recentDelta) {
    history.push({
      phaseId: null,
      beatIndex: null,
      roundId: edge.recentDelta.sourceRound,
      functionalRole: null,
      mindsetTags: [],
      summary: edge.recentDelta.state,
      triggerEvent: '',
      reasoning: '',
      causalAction: '',
    });
  }

  return {
    sourceRoleId: edge.sourceRoleId,
    targetRoleId: edge.targetRoleId,
    currentRelation: history[history.length - 1]!,
    history,
  };
}

function migrateV1FileToV2(file: CharacterRelationshipsFileV1): CharacterRelationshipsFileV2 {
  return {
    meta: {
      fileType: 'character-relationships',
      schemaVersion: 2,
      storyPackage: file.meta.storyPackage,
    },
    relationshipsBySource: Object.fromEntries(
      Object.entries(file.relationshipsBySource).map(([sourceRoleId, sourceBucket]) => [
        sourceRoleId,
        {
          targets: Object.fromEntries(
            Object.entries(sourceBucket.targets).map(([targetRoleId, edge]) => [
              targetRoleId,
              migrateLegacyEdgeToMemoryEdge(edge),
            ]),
          ),
        },
      ]),
    ),
  };
}

function isCharacterRelationshipsFileV2(
  file: CharacterRelationshipsFile,
): file is CharacterRelationshipsFileV2 {
  return file.meta.schemaVersion === 2;
}

function normalizeFileToV2(file: CharacterRelationshipsFile): CharacterRelationshipsFileV2 {
  if (isCharacterRelationshipsFileV2(file)) {
    return file;
  }

  return migrateV1FileToV2(file);
}

function cloneRelationshipsFile(file: CharacterRelationshipsFileV2): CharacterRelationshipsFileV2 {
  return {
    ...file,
    meta: { ...file.meta },
    relationshipsBySource: Object.fromEntries(
      Object.entries(file.relationshipsBySource).map(([sourceRoleId, bucket]) => [
        sourceRoleId,
        {
          ...bucket,
          targets: Object.fromEntries(
            Object.entries(bucket.targets).map(([targetRoleId, edge]) => [
              targetRoleId,
              {
                ...edge,
                currentRelation: cloneMemoryEntry(edge.currentRelation),
                history: edge.history.map(cloneMemoryEntry),
              },
            ]),
          ),
        },
      ]),
    ),
  };
}

function upsertEdge(
  file: CharacterRelationshipsFileV2,
  sourceRoleId: string,
  targetRoleId: string,
  edge: RelationshipMemoryEdge,
): void {
  const currentBucket = file.relationshipsBySource[sourceRoleId];
  file.relationshipsBySource = {
    ...file.relationshipsBySource,
    [sourceRoleId]: {
      targets: {
        ...(currentBucket?.targets ?? {}),
        [targetRoleId]: edge,
      },
    },
  };
}

function getExistingEdge(
  file: CharacterRelationshipsFileV2,
  sourceRoleId: string,
  targetRoleId: string,
): RelationshipMemoryEdge | null {
  return file.relationshipsBySource[sourceRoleId]?.targets[targetRoleId] ?? null;
}

function applyMemoryUpdate(
  file: CharacterRelationshipsFileV2,
  memoryUpdate: GossipelogMemoryUpdate,
  options: RelationshipMergeOptions,
): CharacterRelationshipsFileV2 {
  if (memoryUpdate.sourceRoleId === options.heroRoleId) {
    throw new Error('hero-outgoing relationship memories are not persisted.');
  }

  const nextFile = cloneRelationshipsFile(file);
  const existingEdge = getExistingEdge(
    nextFile,
    memoryUpdate.sourceRoleId,
    memoryUpdate.targetRoleId,
  );

  if (memoryUpdate.shouldCreateEdge) {
    if (existingEdge) {
      throw new Error(
        `Cannot create relationship memory for existing relationship ${memoryUpdate.sourceRoleId} -> ${memoryUpdate.targetRoleId}.`,
      );
    }

    const nextCurrentRelation = cloneMemoryEntry(memoryUpdate.nextCurrentRelation);
    const historyEntry = cloneMemoryEntry(memoryUpdate.nextCurrentRelation);

    upsertEdge(nextFile, memoryUpdate.sourceRoleId, memoryUpdate.targetRoleId, {
      sourceRoleId: memoryUpdate.sourceRoleId,
      targetRoleId: memoryUpdate.targetRoleId,
      currentRelation: nextCurrentRelation,
      history: [historyEntry],
    });

    return nextFile;
  }

  if (!existingEdge) {
    throw new Error(
      `Cannot apply memory update to missing relationship ${memoryUpdate.sourceRoleId} -> ${memoryUpdate.targetRoleId}.`,
    );
  }

  if (isSameMemoryEntry(existingEdge.currentRelation, memoryUpdate.nextCurrentRelation)) {
    return file;
  }

  const nextCurrentRelation = cloneMemoryEntry(memoryUpdate.nextCurrentRelation);
  const historyEntry = cloneMemoryEntry(memoryUpdate.nextCurrentRelation);

  upsertEdge(nextFile, memoryUpdate.sourceRoleId, memoryUpdate.targetRoleId, {
    ...existingEdge,
    currentRelation: nextCurrentRelation,
    history: [...existingEdge.history.map(cloneMemoryEntry), historyEntry],
  });

  return nextFile;
}

export function absorbConsumedDeltas(
  file: CharacterRelationshipsFile,
  _currentRoundId: string,
): CharacterRelationshipsFile {
  return file;
}

export function mergeRelationshipUpdates(
  file: CharacterRelationshipsFile,
  update: GossipelogUpdateResult,
  options: RelationshipMergeOptions,
): CharacterRelationshipsFile {
  if (update.invocationNoOp) {
    return file;
  }

  const baseFile = normalizeFileToV2(file);

  return update.memoryUpdates.reduce(
    (currentFile, memoryUpdate) => applyMemoryUpdate(currentFile, memoryUpdate, options),
    baseFile,
  );
}
