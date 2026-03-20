import { z } from 'zod';

/** LOGOS-SPEC/05_CONTRACTS/phase-plan-schema.yaml */
export const GradientTypeSchema = z.enum([
  'Rising',
  'Falling',
  'Static High',
  'U-Shape',
  'Arch',
  'Pulse',
  'Steady',
]);
export type GradientType = z.infer<typeof GradientTypeSchema>;

/** LOGOS-SPEC/05_CONTRACTS/phase-plan-schema.yaml */
export const PhasePlanSchema = z
  .object({
    phaseId: z.string(),
    phaseIndex: z.number().int().min(1),
    phaseGoal: z.string(),
    gradientType: GradientTypeSchema,
    beatCount: z.literal(4),
    routerHint: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict();
export type PhasePlan = z.infer<typeof PhasePlanSchema>;
