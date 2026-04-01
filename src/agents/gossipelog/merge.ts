import type {
  CharacterRelationshipsFile,
  GossipelogEdgeUpdate,
  GossipelogUpdateResult,
  RelationshipEdge,
} from '@/types';

export interface RelationshipMergeOptions {
  readonly heroRoleId: string;
}

function cloneRelationshipsFile(file: CharacterRelationshipsFile): CharacterRelationshipsFile {
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
                baseline: { ...edge.baseline },
                recentDelta: edge.recentDelta ? { ...edge.recentDelta } : null,
              },
            ]),
          ),
        },
      ]),
    ),
  };
}

function upsertEdge(
  file: CharacterRelationshipsFile,
  sourceRoleId: string,
  targetRoleId: string,
  edge: RelationshipEdge,
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
  file: CharacterRelationshipsFile,
  sourceRoleId: string,
  targetRoleId: string,
): RelationshipEdge | null {
  return file.relationshipsBySource[sourceRoleId]?.targets[targetRoleId] ?? null;
}

function applyEdgeUpdate(
  file: CharacterRelationshipsFile,
  edgeUpdate: GossipelogEdgeUpdate,
  options: RelationshipMergeOptions,
): CharacterRelationshipsFile {
  if (edgeUpdate.mode === 'noop') {
    return file;
  }

  if (edgeUpdate.sourceRoleId === options.heroRoleId) {
    throw new Error(`hero-outgoing relationship edges are not persisted in Phase 1.`);
  }

  const nextFile = cloneRelationshipsFile(file);
  const existingEdge = getExistingEdge(nextFile, edgeUpdate.sourceRoleId, edgeUpdate.targetRoleId);

  if (edgeUpdate.mode === 'new_edge') {
    if (existingEdge) {
      throw new Error(
        `Cannot create a new_edge for existing relationship ${edgeUpdate.sourceRoleId} -> ${edgeUpdate.targetRoleId}.`,
      );
    }

    upsertEdge(nextFile, edgeUpdate.sourceRoleId, edgeUpdate.targetRoleId, {
      sourceRoleId: edgeUpdate.sourceRoleId,
      targetRoleId: edgeUpdate.targetRoleId,
      baseline: { ...edgeUpdate.baseline },
      recentDelta: { ...edgeUpdate.recentDelta },
      highlightNextPrompt: true,
    });

    return nextFile;
  }

  if (!existingEdge) {
    throw new Error(
      `Cannot apply delta to missing relationship ${edgeUpdate.sourceRoleId} -> ${edgeUpdate.targetRoleId}.`,
    );
  }

  const baseline = edgeUpdate.replaceBaseline
    ? { ...edgeUpdate.baseline }
    : { ...existingEdge.baseline };

  upsertEdge(nextFile, edgeUpdate.sourceRoleId, edgeUpdate.targetRoleId, {
    ...existingEdge,
    baseline,
    recentDelta: { ...edgeUpdate.recentDelta },
    highlightNextPrompt: true,
  });

  return nextFile;
}

export function absorbConsumedDeltas(
  file: CharacterRelationshipsFile,
  currentRoundId: string,
): CharacterRelationshipsFile {
  let changed = false;
  const nextFile = cloneRelationshipsFile(file);

  for (const bucket of Object.values(nextFile.relationshipsBySource)) {
    for (const edge of Object.values(bucket.targets)) {
      if (!edge.highlightNextPrompt || !edge.recentDelta) {
        continue;
      }

      if (edge.recentDelta.sourceRound === currentRoundId) {
        continue;
      }

      edge.baseline = {
        state: edge.recentDelta.state,
        lastAbsorbedRound: currentRoundId,
      };
      edge.recentDelta = null;
      edge.highlightNextPrompt = false;
      changed = true;
    }
  }

  return changed ? nextFile : file;
}

export function mergeRelationshipUpdates(
  file: CharacterRelationshipsFile,
  update: GossipelogUpdateResult,
  options: RelationshipMergeOptions,
): CharacterRelationshipsFile {
  if (update.invocationNoOp) {
    return file;
  }

  return update.edgeUpdates.reduce(
    (currentFile, edgeUpdate) => applyEdgeUpdate(currentFile, edgeUpdate, options),
    file,
  );
}
