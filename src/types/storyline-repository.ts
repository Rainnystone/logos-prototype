import { z } from 'zod';

const safeScopedIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function isAbsolutePathLike(value: string): boolean {
  return value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(value);
}

export function isSafeStorylineScopedId(value: string): boolean {
  if (!safeScopedIdPattern.test(value)) {
    return false;
  }

  if (value.includes('..') || value.includes('/') || value.includes('\\')) {
    return false;
  }

  if (isAbsolutePathLike(value)) {
    return false;
  }

  return true;
}

export function assertSafeStorylineScopedId(value: string, label = 'id'): string {
  if (!isSafeStorylineScopedId(value)) {
    throw new Error(
      `${label} must be a safe scoped identifier (letters/numbers/_/-, no path separators, no "..", no absolute path).`,
    );
  }

  return value;
}

function createSafeScopedIdSchema(label: string) {
  return z.string().superRefine((value, ctx) => {
    if (!isSafeStorylineScopedId(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} must be a safe scoped identifier (letters/numbers/_/-, no path separators, no "..", no absolute path).`,
      });
    }
  });
}

export const StorylineScopedIdSchema = createSafeScopedIdSchema('id');
const StorylineIdSchema = createSafeScopedIdSchema('storylineId');
const VariantIdSchema = createSafeScopedIdSchema('variantId');

export const StorylineVariantSchema = z
  .object({
    variantId: VariantIdSchema,
    workspaceRoot: z.string(),
    createdFromStorylineId: StorylineIdSchema.nullable(),
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
    storylineId: StorylineIdSchema,
    name: z.string(),
    status: z.string(),
    sourceCheckpointId: z.string().nullable(),
    headCheckpointId: z.string().nullable(),
    variantId: VariantIdSchema,
    activeSessionId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
export type StorylineRecord = z.infer<typeof StorylineRecordSchema>;

export const StorylineRepositoryFileSchema = z
  .object({
    version: z.literal(1),
    activeStorylineId: StorylineIdSchema,
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
