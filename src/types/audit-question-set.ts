import { z } from 'zod';

/** LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml */
export const AuditQuestionSchema = z
  .object({
    id: z.string(),
    question: z.string(),
    expected: z.boolean(),
    blocking: z.boolean(),
    rationale: z.string().optional(),
  })
  .strict();
export type AuditQuestion = z.infer<typeof AuditQuestionSchema>;

/** LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml */
export const PhaseOverrideSchema = z
  .object({
    append: z.array(z.string()).min(1),
  })
  .strict();
export type PhaseOverride = z.infer<typeof PhaseOverrideSchema>;

/** LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml */
export const SelectionPolicySchema = z
  .object({
    default: z.array(z.string()).min(1),
    phaseOverrides: z.record(PhaseOverrideSchema).optional(),
  })
  .strict();
export type SelectionPolicy = z.infer<typeof SelectionPolicySchema>;

/** LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml */
export const AuditQuestionSetSchema = z
  .object({
    sceneId: z.string(),
    source: z.string().optional(),
    globalQuestions: z.array(AuditQuestionSchema).min(1),
    controlQuestions: z.array(AuditQuestionSchema),
    phaseSpecificQuestions: z.record(z.array(AuditQuestionSchema).min(1)).optional(),
    selectionPolicy: SelectionPolicySchema,
  })
  .strict();
export type AuditQuestionSet = z.infer<typeof AuditQuestionSetSchema>;
