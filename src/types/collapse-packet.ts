import { z } from 'zod';

import { UsageInfoSchema } from '@/types/common';

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/collapse-packet-schema.yaml */
export const CollapseContextSchema = z
  .object({
    mainAxis: z.string(),
    endLine: z.string(),
    currentAlpha: z.string(),
    currentBeta: z.string(),
    sceneProgress: z.string().optional(),
    completedPhaseGoal: z.string().optional(),
  })
  .strict();
export type CollapseContext = z.infer<typeof CollapseContextSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/collapse-packet-schema.yaml */
export const CollapseRequestSchema = z
  .object({
    context: CollapseContextSchema,
    phaseConsequences: z.array(z.string()).min(1),
  })
  .strict();
export type CollapseRequest = z.infer<typeof CollapseRequestSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/collapse-packet-schema.yaml */
export const CollapseResponseSchema = z
  .object({
    alpha: z.string(),
    beta: z.string(),
    inferenceTrace: z.string(),
    usage: UsageInfoSchema.optional(),
  })
  .strict();
export type CollapseResponse = z.infer<typeof CollapseResponseSchema>;
