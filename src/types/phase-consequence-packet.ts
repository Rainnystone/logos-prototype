import { z } from 'zod';

import { UsageInfoSchema } from '@/types/common';

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/phase-consequence-packet-schema.yaml */
export const PhaseConsequenceContextSchema = z
  .object({
    mainAxis: z.string(),
    endLine: z.string(),
    phaseGoal: z.string(),
    sceneProgress: z.string().optional(),
    currentPhaseIndex: z.number().int().min(1).optional(),
  })
  .strict();
export type PhaseConsequenceContext = z.infer<typeof PhaseConsequenceContextSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/phase-consequence-packet-schema.yaml */
export const TranscriptEntrySchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })
  .strict();
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/phase-consequence-packet-schema.yaml */
export const PhaseConsequenceRequestSchema = z
  .object({
    context: PhaseConsequenceContextSchema,
    phaseTranscript: z.array(TranscriptEntrySchema).min(1),
  })
  .strict();
export type PhaseConsequenceRequest = z.infer<typeof PhaseConsequenceRequestSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/phase-consequence-packet-schema.yaml */
export const PhaseConsequenceResponseSchema = z
  .object({
    phaseConsequences: z.array(z.string()).min(1).max(6),
    settlementTrace: z.string(),
    usage: UsageInfoSchema.optional(),
  })
  .strict();
export type PhaseConsequenceResponse = z.infer<typeof PhaseConsequenceResponseSchema>;
