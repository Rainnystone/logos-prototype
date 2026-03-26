import { z } from 'zod';

import { HistoryEntrySchema, VolumeSchema } from '@/types/common';

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml */
export const WorldBaseSchema = z
  .object({
    mainCharacters: z.string(),
    npcCharacters: z.string().default(''),
    locationPatch: z.string(),
  })
  .strict();
export type WorldBase = z.infer<typeof WorldBaseSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml */
export const NarrativeSchema = z
  .object({
    mainAxis: z.string(),
    endLine: z.string(),
    phaseGoal: z.string(),
    alpha: z.string(),
    beta: z.string(),
  })
  .strict();
export type Narrative = z.infer<typeof NarrativeSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml */
export const DirectorNoteSchema = z
  .object({
    volume: VolumeSchema,
    beatConstraints: z.string(),
    optionConstraints: z.string(),
  })
  .strict();
export type DirectorNote = z.infer<typeof DirectorNoteSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml */
export const PromptDirectorNoteSchema = z
  .object({
    volume: VolumeSchema,
    router: z.string(),
    verbLexicon: z.array(z.string()).min(1),
    beatConstraints: z.string(),
    optionConstraints: z.string(),
  })
  .strict();
export type PromptDirectorNote = z.infer<typeof PromptDirectorNoteSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml */
export const PreviousDraftSchema = z
  .object({
    beatText: z.string(),
    options: z.array(z.string()).length(4),
  })
  .strict();
export type PreviousDraft = z.infer<typeof PreviousDraftSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml */
export const GenerationControlSchema = z
  .object({
    isRewrite: z.boolean(),
    retryCount: z.number().int().nonnegative(),
    rewriteFeedback: z.string().nullable(),
    previousDraft: PreviousDraftSchema.nullable(),
  })
  .strict();
export type GenerationControl = z.infer<typeof GenerationControlSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml */
export const PromptObjectSchema = z
  .object({
    worldBase: WorldBaseSchema,
    history: z.array(HistoryEntrySchema),
    narrative: NarrativeSchema,
    directorNote: PromptDirectorNoteSchema,
    generationControl: GenerationControlSchema.optional(),
  })
  .strict();
export type PromptObject = z.infer<typeof PromptObjectSchema>;
