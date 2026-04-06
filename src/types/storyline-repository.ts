import { z } from 'zod';

export const StorylineVariantSchema = z
  .object({
    variantId: z.string(),
    workspaceRoot: z.string(),
    createdFromStorylineId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.workspaceRoot !== `variants/${value.variantId}`) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'workspaceRoot must match variants/<variantId>.',
        path: ['workspaceRoot'],
      });
    }
  });
export type StorylineVariant = z.infer<typeof StorylineVariantSchema>;

export const StorylineRecordSchema = z
  .object({
    storylineId: z.string(),
    name: z.string(),
    status: z.string(),
    sourceCheckpointId: z.string().nullable(),
    headCheckpointId: z.string().nullable(),
    variantId: z.string(),
    activeSessionId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
export type StorylineRecord = z.infer<typeof StorylineRecordSchema>;

export const StorylineRepositoryFileSchema = z
  .object({
    version: z.literal(1),
    activeStorylineId: z.string(),
    storylinesById: z.record(z.string(), StorylineRecordSchema),
    variantsById: z.record(z.string(), StorylineVariantSchema),
  })
  .strict();
export type StorylineRepositoryFile = z.infer<typeof StorylineRepositoryFileSchema>;

export function assertStorylineRepositoryFileConsistency(
  file: StorylineRepositoryFile,
): StorylineRepositoryFile {
  if (!file.storylinesById[file.activeStorylineId]) {
    throw new Error(
      `Storyline repository consistency violation: activeStorylineId "${file.activeStorylineId}" does not resolve.`,
    );
  }

  for (const [storylineKey, storyline] of Object.entries(file.storylinesById)) {
    if (storyline.storylineId !== storylineKey) {
      throw new Error(
        `Storyline repository consistency violation: storyline key "${storylineKey}" does not match storylineId "${storyline.storylineId}".`,
      );
    }

    if (!file.variantsById[storyline.variantId]) {
      throw new Error(
        `Storyline repository consistency violation: storyline "${storyline.storylineId}" references unknown variantId "${storyline.variantId}".`,
      );
    }
  }

  for (const [variantKey, variant] of Object.entries(file.variantsById)) {
    if (variant.variantId !== variantKey) {
      throw new Error(
        `Storyline repository consistency violation: variant key "${variantKey}" does not match variantId "${variant.variantId}".`,
      );
    }
  }

  return file;
}
