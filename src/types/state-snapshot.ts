import { z } from 'zod';

import { HistoryEntrySchema, VolumeSchema } from '@/types/common';

/** LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml */
export const SceneStateSchema = z
  .object({
    sceneId: z.string(),
    currentPhaseIndex: z.number().int().min(1),
    currentBeatIndexInPhase: z.number().int().min(1),
    mainAxis: z.string(),
    endLine: z.string(),
    alpha: z.string(),
    beta: z.string(),
    sceneProgress: z.string().optional(),
    phaseConsequences: z.array(z.string()).optional(),
  })
  .strict();
export type SceneState = z.infer<typeof SceneStateSchema>;

/** LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml */
export const RoundStateSchema = z
  .object({
    phaseGoal: z.string(),
    currentVolume: VolumeSchema,
    currentRouter: z.string(),
    verbLexicon: z.array(z.string()).min(1),
    historyWindow: z.array(HistoryEntrySchema),
    directorConstraints: z.string().optional(),
  })
  .strict();
export type RoundState = z.infer<typeof RoundStateSchema>;

/** LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml */
export const GenerationStateSchema = z
  .object({
    directorNoteSummary: z.string(),
    promptObject: z.record(z.unknown()),
    currentBeatText: z.string().nullable(),
    currentOptions: z.array(z.string()).min(0).max(4),
  })
  .strict();
export type GenerationState = z.infer<typeof GenerationStateSchema>;

/** LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml */
export const EvaluationStateSchema = z
  .object({
    auditAnswers: z.array(z.boolean()),
    blockingFailures: z.array(z.string()),
    retryCount: z.number().int().nonnegative(),
    rewriteFeedback: z.string().nullable(),
  })
  .strict();
export type EvaluationState = z.infer<typeof EvaluationStateSchema>;

/** LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml */
export const StateSnapshotSchema = z
  .object({
    sceneState: SceneStateSchema,
    roundState: RoundStateSchema,
    generationState: GenerationStateSchema,
    evaluationState: EvaluationStateSchema,
  })
  .strict();
export type StateSnapshot = z.infer<typeof StateSnapshotSchema>;
