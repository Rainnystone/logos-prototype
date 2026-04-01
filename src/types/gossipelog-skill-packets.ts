import { z } from 'zod';

import {
  RelationshipBaselineSchema,
  RelationshipDeltaSchema,
} from '@/types/character-relationships';

export const GossipelogRelationshipModeSchema = z.enum(['delta', 'new_edge']);
export type GossipelogRelationshipMode = z.infer<typeof GossipelogRelationshipModeSchema>;

const GossipelogEdgeDeltaUpdateSchema = z
  .object({
    sourceRoleId: z.string(),
    targetRoleId: z.string(),
    mode: z.literal('delta'),
    replaceBaseline: z.literal(false),
    recentDelta: RelationshipDeltaSchema,
  })
  .strict();

const GossipelogEdgeDeltaWithReplacementSchema = z
  .object({
    sourceRoleId: z.string(),
    targetRoleId: z.string(),
    mode: z.literal('delta'),
    replaceBaseline: z.literal(true),
    baseline: RelationshipBaselineSchema,
    recentDelta: RelationshipDeltaSchema,
  })
  .strict();

const GossipelogNewEdgeUpdateSchema = z
  .object({
    sourceRoleId: z.string(),
    targetRoleId: z.string(),
    mode: z.literal('new_edge'),
    replaceBaseline: z.literal(false),
    baseline: RelationshipBaselineSchema,
    recentDelta: RelationshipDeltaSchema,
  })
  .strict();

export const GossipelogEdgeUpdateSchema = z.union([
  GossipelogEdgeDeltaUpdateSchema,
  GossipelogEdgeDeltaWithReplacementSchema,
  GossipelogNewEdgeUpdateSchema,
]);
export type GossipelogEdgeUpdate = z.infer<typeof GossipelogEdgeUpdateSchema>;

const GossipelogNoOpUpdateResultSchema = z
  .object({
    involvedRoleIds: z.array(z.string()),
    invocationNoOp: z.literal(true),
    edgeUpdates: z.array(GossipelogEdgeUpdateSchema).length(0),
  })
  .strict();

const GossipelogAppliedUpdateResultSchema = z
  .object({
    involvedRoleIds: z.array(z.string()),
    invocationNoOp: z.literal(false),
    edgeUpdates: z.array(GossipelogEdgeUpdateSchema).min(1),
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
