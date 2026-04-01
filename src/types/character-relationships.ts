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

export const CharacterRelationshipsMetaSchema = z
  .object({
    fileType: z.literal('character-relationships'),
    schemaVersion: z.literal(1),
    storyPackage: z.string(),
  })
  .strict();
export type CharacterRelationshipsMeta = z.infer<typeof CharacterRelationshipsMetaSchema>;

export const CharacterRelationshipsFileSchema = z
  .object({
    meta: CharacterRelationshipsMetaSchema,
    relationshipsBySource: z.record(z.string(), RelationshipTargetBucketSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const [sourceRoleId, bucket] of Object.entries(value.relationshipsBySource)) {
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
  });
export type CharacterRelationshipsFile = z.infer<typeof CharacterRelationshipsFileSchema>;
