import { z } from 'zod';

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
