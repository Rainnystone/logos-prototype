import { z } from 'zod';

import { HistoryEntrySchema } from '@/types/common';

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-packet-schema.yaml */
export const AuditContextSchema = z
  .object({
    precedingBeats: z.array(HistoryEntrySchema),
  })
  .strict();
export type AuditContext = z.infer<typeof AuditContextSchema>;

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
    context: AuditContextSchema,
    generatedContent: GeneratedContentSchema,
    auditQuestions: z.array(z.string()).min(1),
  })
  .strict();
export type AuditPacket = z.infer<typeof AuditPacketSchema>;
