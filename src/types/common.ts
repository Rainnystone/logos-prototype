import { z } from 'zod';

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS prompt/state/audit shared primitives. */
export const VolumeSchema = z.enum(['Low', 'Med', 'High']);
export type Volume = z.infer<typeof VolumeSchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS prompt-object-schema.yaml history item. */
export const HistoryEntrySchema = z
  .object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })
  .strict();
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

/** archive/vendor/LOGOS-SPEC/05_CONTRACTS collapse/settlement usage object. */
export const UsageInfoSchema = z
  .object({
    promptTokens: z.number().int().nonnegative().optional(),
    completionTokens: z.number().int().nonnegative().optional(),
    totalTokens: z.number().int().nonnegative().optional(),
  })
  .strict();
export type UsageInfo = z.infer<typeof UsageInfoSchema>;
