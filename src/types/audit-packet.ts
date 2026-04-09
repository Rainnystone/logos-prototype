import { z } from 'zod';

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-packet-schema.yaml */
export const GeneratedContentSchema = z
  .object({
    beatText: z.string(),
    options: z.array(z.string()).length(4),
  })
  .strict();
export type GeneratedContent = z.infer<typeof GeneratedContentSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-packet-schema.yaml */
export const AuditPacketSchema = z
  .object({
    generatedContent: GeneratedContentSchema,
    auditQuestions: z.array(z.string()),
  })
  .strict();
export type AuditPacket = z.infer<typeof AuditPacketSchema>;
