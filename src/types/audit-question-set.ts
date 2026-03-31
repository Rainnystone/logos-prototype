import { z } from 'zod';

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml */
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

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml */
export const PhaseOverrideSchema = z
  .object({
    append: z.array(z.string()).min(1),
  })
  .strict();
export type PhaseOverride = z.infer<typeof PhaseOverrideSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml */
export const SelectionPolicySchema = z
  .object({
    default: z.array(z.string()),
    phaseOverrides: z.record(PhaseOverrideSchema).optional(),
  })
  .strict();
export type SelectionPolicy = z.infer<typeof SelectionPolicySchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml */
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
