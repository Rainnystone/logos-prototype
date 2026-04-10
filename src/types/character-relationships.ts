import { z } from 'zod';

export const RelationshipBaselineSchema = z
  .object({
    state: z.string(),
    lastAbsorbedRound: z.string(),
  })
  .strict();
export type RelationshipBaseline = z.infer<typeof RelationshipBaselineSchema>;

export const RelationshipDeltaSchema = z
  .object({
    state: z.string(),
    sourceRound: z.string(),
  })
  .strict();
export type RelationshipDelta = z.infer<typeof RelationshipDeltaSchema>;

export const RelationshipEdgeSchema = z
  .object({
    sourceRoleId: z.string(),
    targetRoleId: z.string(),
    baseline: RelationshipBaselineSchema,
    recentDelta: RelationshipDeltaSchema.nullable(),
    highlightNextPrompt: z.boolean(),
  })
  .strict();
export type RelationshipEdge = z.infer<typeof RelationshipEdgeSchema>;

export const RelationshipTargetBucketSchema = z
  .object({
    targets: z.record(z.string(), RelationshipEdgeSchema),
  })
  .strict();
export type RelationshipTargetBucket = z.infer<typeof RelationshipTargetBucketSchema>;

export const RelationshipMemoryEntrySchema = z
  .object({
    phaseId: z.string().nullable(),
    beatIndex: z.number().int().nonnegative().nullable(),
    roundId: z.string(),
    functionalRole: z.string().nullable(),
    mindsetTags: z.array(z.string()),
    summary: z.string(),
    triggerEvent: z.string(),
    reasoning: z.string(),
    causalAction: z.string(),
  })
  .strict();
export type RelationshipMemoryEntry = z.infer<typeof RelationshipMemoryEntrySchema>;

export const RelationshipMemoryEdgeSchema = z
  .object({
    sourceRoleId: z.string(),
    targetRoleId: z.string(),
    currentRelation: RelationshipMemoryEntrySchema,
    history: z.array(RelationshipMemoryEntrySchema).min(1),
  })
  .strict();
export type RelationshipMemoryEdge = z.infer<typeof RelationshipMemoryEdgeSchema>;

export const RelationshipMemoryTargetBucketSchema = z
  .object({
    targets: z.record(z.string(), RelationshipMemoryEdgeSchema),
  })
  .strict();
export type RelationshipMemoryTargetBucket = z.infer<typeof RelationshipMemoryTargetBucketSchema>;

export const CharacterRelationshipsMetaV1Schema = z
  .object({
    fileType: z.literal('character-relationships'),
    schemaVersion: z.literal(1),
    storyPackage: z.string(),
  })
  .strict();
export type CharacterRelationshipsMetaV1 = z.infer<typeof CharacterRelationshipsMetaV1Schema>;

export const CharacterRelationshipsMetaV2Schema = z
  .object({
    fileType: z.literal('character-relationships'),
    schemaVersion: z.literal(2),
    storyPackage: z.string(),
  })
  .strict();
export type CharacterRelationshipsMetaV2 = z.infer<typeof CharacterRelationshipsMetaV2Schema>;

export const CharacterRelationshipsMetaSchema = z.union([
  CharacterRelationshipsMetaV1Schema,
  CharacterRelationshipsMetaV2Schema,
]);
export type CharacterRelationshipsMeta = z.infer<typeof CharacterRelationshipsMetaSchema>;

type RelationshipBucketLike = {
  readonly targets: Record<string, { readonly sourceRoleId: string; readonly targetRoleId: string }>;
};

function validateRelationshipBucketKeys(
  relationshipsBySource: Record<string, RelationshipBucketLike>,
  ctx: z.RefinementCtx,
): void {
  for (const [sourceRoleId, bucket] of Object.entries(relationshipsBySource)) {
    for (const [targetRoleId, edge] of Object.entries(bucket.targets)) {
      if (edge.sourceRoleId !== sourceRoleId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relationshipsBySource', sourceRoleId, 'targets', targetRoleId, 'sourceRoleId'],
          message: `sourceRoleId must match the enclosing source bucket key "${sourceRoleId}".`,
        });
      }

      if (edge.targetRoleId !== targetRoleId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relationshipsBySource', sourceRoleId, 'targets', targetRoleId, 'targetRoleId'],
          message: `targetRoleId must match the enclosing target bucket key "${targetRoleId}".`,
        });
      }
    }
  }
}

export const CharacterRelationshipsFileV1Schema = z
  .object({
    meta: CharacterRelationshipsMetaV1Schema,
    relationshipsBySource: z.record(z.string(), RelationshipTargetBucketSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    validateRelationshipBucketKeys(value.relationshipsBySource, ctx);
  });
export type CharacterRelationshipsFileV1 = z.infer<typeof CharacterRelationshipsFileV1Schema>;

export const CharacterRelationshipsFileV2Schema = z
  .object({
    meta: CharacterRelationshipsMetaV2Schema,
    relationshipsBySource: z.record(z.string(), RelationshipMemoryTargetBucketSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    validateRelationshipBucketKeys(value.relationshipsBySource, ctx);
  });
export type CharacterRelationshipsFileV2 = z.infer<typeof CharacterRelationshipsFileV2Schema>;

/**
 * Union entrypoint keeps read compatibility for v1 while allowing v2 writes.
 */
export const CharacterRelationshipsFileSchema = z.union([
  CharacterRelationshipsFileV1Schema,
  CharacterRelationshipsFileV2Schema,
]);
export type CharacterRelationshipsFile = z.infer<typeof CharacterRelationshipsFileSchema>;
