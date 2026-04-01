import { z } from 'zod';

import { HistoryEntrySchema, VolumeSchema } from '@/types/common';
import { RelationshipLayerSchema } from '@/types/gossipelog-skill-packets';

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml */
export const CharacterProfileSchema = z
  .object({
    characterId: z.string(),
    name: z.string(),
    identityRole: z.string(),
    lightNovelTrait: z.string(),
    gender: z.string(),
    personality: z.string(),
    age: z.string(),
    occupation: z.string(),
    characterSummary: z.string(),
    capabilityBoundary: z.string(),
    behaviorBoundary: z.string(),
    oocRedLine: z.string(),
    clothing: z.string(),
    propsWeapon: z.string(),
    fatalWeakness: z.string().optional(),
  })
  .strict();
export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml */
export const WorldBaseSchema = z
  .object({
    worldBaseSetting: z.string().default(''),
    worldRules: z.string().default(''),
    toneBaseline: z.string().default(''),
    hero: CharacterProfileSchema,
    coreCast: z.array(CharacterProfileSchema).default([]),
    antagonists: z.array(CharacterProfileSchema).default([]),
    npcCharacters: z.string().default(''),
    locationPatch: z.string(),
  })
  .strict();
export type WorldBase = z.infer<typeof WorldBaseSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml */
export const PromptWorldBaseSchema = z
  .object({
    mainCharacters: z.string(),
    npcCharacters: z.string().default(''),
    locationPatch: z.string(),
  })
  .strict();
export type PromptWorldBase = z.infer<typeof PromptWorldBaseSchema>;

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
    worldBase: PromptWorldBaseSchema,
    relationshipLayer: RelationshipLayerSchema.optional(),
    history: z.array(HistoryEntrySchema),
    narrative: NarrativeSchema,
    directorNote: PromptDirectorNoteSchema,
    generationControl: GenerationControlSchema.optional(),
  })
  .strict();
export type PromptObject = z.infer<typeof PromptObjectSchema>;
