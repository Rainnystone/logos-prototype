import { z } from 'zod';

import { RelationshipMemoryEntrySchema } from '@/types/character-relationships';

export const GossipelogMemoryUpdateSchema = z
  .object({
    sourceRoleId: z.string(),
    targetRoleId: z.string(),
    shouldCreateEdge: z.boolean(),
    nextCurrentRelation: RelationshipMemoryEntrySchema,
  })
  .strict();
export type GossipelogMemoryUpdate = z.infer<typeof GossipelogMemoryUpdateSchema>;

const GossipelogNoOpUpdateResultSchema = z
  .object({
    involvedRoleIds: z.array(z.string()),
    invocationNoOp: z.literal(true),
    memoryUpdates: z.array(GossipelogMemoryUpdateSchema).length(0),
  })
  .strict();

const GossipelogAppliedUpdateResultSchema = z
  .object({
    involvedRoleIds: z.array(z.string()),
    invocationNoOp: z.literal(false),
    memoryUpdates: z.array(GossipelogMemoryUpdateSchema).min(1),
  })
  .strict();

export const GossipelogUpdateResultSchema = z.union([
  GossipelogNoOpUpdateResultSchema,
  GossipelogAppliedUpdateResultSchema,
]);
export type GossipelogUpdateResult = z.infer<typeof GossipelogUpdateResultSchema>;

export const GossipelogInjectionResultSchema = z
  .object({
    highlightedDeltasText: z.string(),
    stableBackgroundText: z.string(),
  })
  .strict();
export type GossipelogInjectionResult = z.infer<typeof GossipelogInjectionResultSchema>;

export const RelationshipLayerSchema = GossipelogInjectionResultSchema;
export type RelationshipLayer = GossipelogInjectionResult;
