import { z } from 'zod';

import { deepFreeze } from '@/lib/deep-freeze';
import { parseWithSchema } from '@/lib/validation';
import {
  validateCollapseResponse,
  validatePhaseConsequenceResponse,
} from '@/engine/schema-validator';
import type { AuditResult, GenerateResult } from '@/engine/types/adapter-interface';
import type { UsageInfo } from '@/types';
import { UsageInfoSchema } from '@/types';

const GenerateResultSchema = z
  .object({
    beatText: z.string(),
    options: z.array(z.string()).length(4),
    usage: UsageInfoSchema.optional(),
  })
  .strict();

const AuditResultSchema = z
  .object({
    answers: z.array(z.boolean()).min(1),
    usage: UsageInfoSchema.optional(),
  })
  .strict();

function stripCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseStructuredContent(content: string): unknown {
  const normalized = stripCodeFence(content);

  try {
    return JSON.parse(normalized);
  } catch {
    const objectStart = normalized.indexOf('{');
    const objectEnd = normalized.lastIndexOf('}');

    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(normalized.slice(objectStart, objectEnd + 1));
    }

    const arrayStart = normalized.indexOf('[');
    const arrayEnd = normalized.lastIndexOf(']');

    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return JSON.parse(normalized.slice(arrayStart, arrayEnd + 1));
    }
  }

  throw new Error('Provider response did not contain valid structured JSON');
}

function mergeUsage<TResponse extends Record<string, unknown>>(
  payload: TResponse,
  usage: UsageInfo | undefined,
): TResponse & { usage?: UsageInfo } {
  if (!usage) {
    return payload;
  }

  return {
    ...payload,
    usage,
  };
}

export function parseGenerateResult(content: string, usage?: UsageInfo): GenerateResult {
  const result = parseWithSchema(
    GenerateResultSchema,
    mergeUsage(parseStructuredContent(content) as Record<string, unknown>, usage),
    'generateResult',
  );

  return deepFreeze(result);
}

export function parseAuditResult(
  content: string,
  expectedAnswers: number,
  usage?: UsageInfo,
): AuditResult {
  const result = parseWithSchema(
    AuditResultSchema,
    mergeUsage(parseStructuredContent(content) as Record<string, unknown>, usage),
    'auditResult',
  );

  if (result.answers.length !== expectedAnswers) {
    throw new Error('auditResult answers length must match auditQuestions length');
  }

  return deepFreeze(result);
}

export function parseSettlementResult(content: string, usage?: UsageInfo) {
  return deepFreeze(
    validatePhaseConsequenceResponse(
      mergeUsage(parseStructuredContent(content) as Record<string, unknown>, usage),
    ),
  );
}

export function parseCollapseResult(content: string, usage?: UsageInfo) {
  return deepFreeze(
    validateCollapseResponse(
      mergeUsage(parseStructuredContent(content) as Record<string, unknown>, usage),
    ),
  );
}
