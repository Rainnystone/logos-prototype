import { z } from 'zod';

export const AgentOperationalHintSchema = z.enum(['ready', 'warning', 'pending_bootstrap']);
export type AgentOperationalHint = z.infer<typeof AgentOperationalHintSchema>;

export const WeaverBootstrapStatusSchema = z.enum([
  'pending',
  'succeeded',
  'failed',
  'fallback_pending',
]);
export type WeaverBootstrapStatus = z.infer<typeof WeaverBootstrapStatusSchema>;

const WeaverPassthroughObjectSchema = z.object({}).passthrough();

// Author-supplied displayName always wins. Only when it is absent may a validated weaver
// suggestion be used, and invalid or conflicting suggestions must fail instead of being
// rewritten silently.
export const WeaverImportPayloadSchema = z
  .object({
    suggestedPackageName: z.string().optional(),
    sourceSummary: z.string(),
    importSummary: z.string(),
    openingHook: z.string(),
    worldBase: WeaverPassthroughObjectSchema,
    hero: WeaverPassthroughObjectSchema.optional(),
    coreCast: z.array(WeaverPassthroughObjectSchema),
    antagonists: z.array(WeaverPassthroughObjectSchema),
    npcCharacters: z.array(WeaverPassthroughObjectSchema),
    locations: z.array(WeaverPassthroughObjectSchema),
    warnings: z.array(z.string()),
    unresolvedGaps: z.array(z.string()),
  })
  .strict();
export type WeaverImportPayload = z.infer<typeof WeaverImportPayloadSchema>;

export const WeaverImportSummarySchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceKind: z.literal('text_import'),
    lastRunAt: z.string().datetime(),
    suggestedPackageName: z.string().optional(),
    sourceSummary: z.string(),
    importSummary: z.string(),
    warnings: z.array(z.string()),
    unresolvedGaps: z.array(z.string()),
    warningCount: z.number().int().nonnegative(),
    unresolvedGapCount: z.number().int().nonnegative(),
    bootstrapStatus: WeaverBootstrapStatusSchema,
  })
  .strict();
export type WeaverImportSummary = z.infer<typeof WeaverImportSummarySchema>;
