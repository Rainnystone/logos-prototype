import { z } from 'zod';

export const MAX_TEXT_IMPORT_SOURCE_LENGTH = 12_000;

export const StoryPackageManagementPackageReadyItemSchema = z
  .object({
    packageName: z.string(),
    sceneId: z.string(),
    sceneName: z.string(),
    mainAxis: z.string(),
    endLine: z.string(),
    source: z.string().optional(),
    samplePurpose: z.string().optional(),
    phaseCount: z.number().int().nonnegative(),
    totalBeatCount: z.number().int().nonnegative(),
  })
  .strict();
export type StoryPackageManagementPackageReadyItem = z.infer<
  typeof StoryPackageManagementPackageReadyItemSchema
>;

export const StoryPackageManagementPackageErrorItemSchema = z
  .object({
    packageName: z.string(),
    error: z.string(),
  })
  .strict();
export type StoryPackageManagementPackageErrorItem = z.infer<
  typeof StoryPackageManagementPackageErrorItemSchema
>;

export const StoryPackageManagementPackageItemSchema = z.union([
  StoryPackageManagementPackageReadyItemSchema,
  StoryPackageManagementPackageErrorItemSchema,
]);
export type StoryPackageManagementPackageItem = z.infer<
  typeof StoryPackageManagementPackageItemSchema
>;

export const StoryPackageManagementCheckpointNodeSchema = z
  .object({
    checkpointId: z.string(),
    acceptedBeatOrdinal: z.number().int().positive(),
    phaseIndex: z.number().int().positive(),
    beatIndex: z.number().int().positive(),
    isHead: z.boolean(),
    isBranchSource: z.boolean(),
  })
  .strict();
export type StoryPackageManagementCheckpointNode = z.infer<
  typeof StoryPackageManagementCheckpointNodeSchema
>;

export const StoryPackageManagementStorylineRowViewSchema = z
  .object({
    storylineId: z.string(),
    displayName: z.string(),
    status: z.string(),
    isActive: z.boolean(),
    sourceCheckpointId: z.string().nullable(),
    headCheckpointId: z.string().nullable(),
    headSummary: z.string().nullable(),
    canCreateFromSource: z.boolean(),
    canContinue: z.boolean(),
    canDelete: z.boolean(),
    deleteDisabledReason: z.string().nullable(),
    checkpointRail: z.array(StoryPackageManagementCheckpointNodeSchema),
  })
  .strict();
export type StoryPackageManagementStorylineRowView = z.infer<
  typeof StoryPackageManagementStorylineRowViewSchema
>;

export const StoryPackageManagementWorkspaceViewSchema = z
  .object({
    packages: z.array(StoryPackageManagementPackageItemSchema),
    packageName: z.string(),
    activeStorylineId: z.string(),
    storylines: z.array(StoryPackageManagementStorylineRowViewSchema),
  })
  .strict();
export type StoryPackageManagementWorkspaceView = z.infer<
  typeof StoryPackageManagementWorkspaceViewSchema
>;

export const StorylineRenameDisplayNameActionSchema = z
  .object({
    kind: z.literal('rename_display_name'),
    storylineId: z.string(),
    nextDisplayName: z.string(),
  })
  .strict();

export const StorylineCreateFromSourceActionSchema = z
  .object({
    kind: z.literal('create_from_source'),
    sourceStorylineId: z.string(),
  })
  .strict();

export const StorylineBranchFromCheckpointActionSchema = z
  .object({
    kind: z.literal('branch_from_checkpoint'),
    sourceStorylineId: z.string(),
    checkpointId: z.string(),
  })
  .strict();

export const StorylineSwitchActiveStorylineActionSchema = z
  .object({
    kind: z.literal('switch_active_storyline'),
    storylineId: z.string(),
  })
  .strict();

export const StorylineDeleteActionSchema = z
  .object({
    kind: z.literal('delete_storyline'),
    storylineId: z.string(),
  })
  .strict();

const StoryPackageCreationBlankRequestSchema = z
  .object({
    mode: z.literal('blank'),
    displayName: z.string(),
  })
  .strict();

// For text_import, explicit author displayName still has priority. If it is absent,
// later orchestration may use a validated weaver suggestion. The schema must not
// silently rewrite invalid or conflicting suggestions.
const StoryPackageCreationTextImportRequestSchema = z
  .object({
    mode: z.literal('text_import'),
    displayName: z.string().optional(),
    sourceText: z.string().trim().min(1).max(MAX_TEXT_IMPORT_SOURCE_LENGTH),
  })
  .strict();

export const StoryPackageCreationRequestSchema = z.discriminatedUnion('mode', [
  StoryPackageCreationBlankRequestSchema,
  StoryPackageCreationTextImportRequestSchema,
]);
export type StoryPackageCreationRequest = z.infer<typeof StoryPackageCreationRequestSchema>;

export const StoryPackageCreationResponseSchema = z
  .object({
    packageName: z.string(),
    activeStorylineId: z.string(),
    createdAt: z.string(),
    warnings: z.array(z.string()),
  })
  .strict();
export type StoryPackageCreationResponse = z.infer<typeof StoryPackageCreationResponseSchema>;

export const StorylineActionSchema = z.discriminatedUnion('kind', [
  StorylineRenameDisplayNameActionSchema,
  StorylineCreateFromSourceActionSchema,
  StorylineBranchFromCheckpointActionSchema,
  StorylineSwitchActiveStorylineActionSchema,
  StorylineDeleteActionSchema,
]);
export type StorylineAction = z.infer<typeof StorylineActionSchema>;
