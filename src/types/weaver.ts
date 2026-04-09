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

const WeaverWorldBaseSeedSchema = z
  .object({
    settingSummary: z.string().trim().min(1).optional(),
    worldRules: z.string().trim().min(1).optional(),
    toneBaseline: z.string().trim().min(1).optional(),
    locationPatch: z.string().trim().min(1).optional(),
    npcCharactersSummary: z.string().trim().min(1).optional(),
  })
  .strict();

const WeaverNamedSeedSchema = z
  .object({
    displayName: z.string().trim().min(1),
    roleSummary: z.string().trim().min(1).optional(),
  })
  .strict();

const WeaverNpcSeedSchema = z
  .object({
    displayName: z.string().trim().min(1),
    summary: z.string().trim().min(1).optional(),
    roleSummary: z.string().trim().min(1).optional(),
  })
  .strict();

const WeaverLocationSeedSchema = z
  .object({
    displayName: z.string().trim().min(1),
    summary: z.string().trim().min(1).optional(),
  })
  .strict();

// Author-supplied displayName always wins. Only when it is absent may a validated weaver
// suggestion be used, and invalid or conflicting suggestions must fail instead of being
// rewritten silently.
// WeaverImportPayloadSchema.openingHook is not the authoritative persisted package openingHook.
// Task 4 must preserve the original sourceText as the persisted source of truth.
export const WeaverImportPayloadSchema = z
  .object({
    suggestedPackageName: z.string().trim().min(1).optional(),
    sourceSummary: z.string().trim().min(1),
    importSummary: z.string().trim().min(1),
    openingHook: z.string().trim().min(1),
    worldBase: WeaverWorldBaseSeedSchema,
    hero: WeaverNamedSeedSchema.optional(),
    coreCast: z.array(WeaverNamedSeedSchema),
    antagonists: z.array(WeaverNamedSeedSchema),
    npcCharacters: z.array(WeaverNpcSeedSchema),
    locations: z.array(WeaverLocationSeedSchema),
    warnings: z.array(z.string().trim().min(1)),
    unresolvedGaps: z.array(z.string().trim().min(1)),
  })
  .strict();
export type WeaverImportPayload = z.infer<typeof WeaverImportPayloadSchema>;

export {
  WeaverWorldBaseSeedSchema,
  WeaverNamedSeedSchema,
  WeaverNpcSeedSchema,
  WeaverLocationSeedSchema,
};

export const WeaverImportSummarySchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceKind: z.literal('text_import'),
    lastRunAt: z.string().datetime(),
    suggestedPackageName: z.string().trim().min(1).optional(),
    sourceSummary: z.string().trim().min(1),
    importSummary: z.string().trim().min(1),
    warnings: z.array(z.string().trim().min(1)),
    unresolvedGaps: z.array(z.string().trim().min(1)),
    warningCount: z.number().int().nonnegative(),
    unresolvedGapCount: z.number().int().nonnegative(),
    bootstrapStatus: WeaverBootstrapStatusSchema,
  })
  .strict();
export type WeaverImportSummary = z.infer<typeof WeaverImportSummarySchema>;
