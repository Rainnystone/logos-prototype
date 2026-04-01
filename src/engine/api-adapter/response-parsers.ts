import { z } from 'zod';

import { deepFreeze } from '@/lib/deep-freeze';
import { parseWithSchema } from '@/lib/validation';
import {
  validateCollapseResponse,
  validatePhaseConsequenceResponse,
} from '@/engine/schema-validator';
import type { AuditResult, GenerateResult, RouteResult } from '@/engine/types/adapter-interface';
import type {
  GossipelogInjectionResult,
  GossipelogUpdateResult,
  UsageInfo,
} from '@/types';
import { GossipelogInjectionResultSchema, UsageInfoSchema } from '@/types';

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

const RouteResultSchema = z
  .object({
    routerName: z.string(),
    inferenceTrace: z.string(),
    usage: UsageInfoSchema.optional(),
  })
  .strict();

const GossipelogEdgeNoOpResponseSchema = z
  .object({
    sourceRoleId: z.string(),
    targetRoleId: z.string(),
    mode: z.literal('noop'),
  })
  .strict();

const GossipelogEdgeDeltaResponseSchema = z
  .object({
    sourceRoleId: z.string(),
    targetRoleId: z.string(),
    mode: z.literal('delta'),
    replaceBaseline: z.boolean(),
    recentDelta: z
      .object({
        state: z.string(),
        sourceRound: z.string(),
      })
      .strict(),
  })
  .strict();

const GossipelogEdgeDeltaWithReplacementResponseSchema = z
  .object({
    sourceRoleId: z.string(),
    targetRoleId: z.string(),
    mode: z.literal('delta'),
    replaceBaseline: z.literal(true),
    baseline: z
      .object({
        state: z.string(),
        lastAbsorbedRound: z.string(),
      })
      .strict(),
    recentDelta: z
      .object({
        state: z.string(),
        sourceRound: z.string(),
      })
      .strict(),
  })
  .strict();

const GossipelogNewEdgeResponseSchema = z
  .object({
    sourceRoleId: z.string(),
    targetRoleId: z.string(),
    mode: z.literal('new_edge'),
    replaceBaseline: z.literal(false),
    baseline: z
      .object({
        state: z.string(),
        lastAbsorbedRound: z.string(),
      })
      .strict(),
    recentDelta: z
      .object({
        state: z.string(),
        sourceRound: z.string(),
      })
      .strict(),
  })
  .strict();

const GossipelogEdgeUpdateResponseSchema = z.union([
  GossipelogEdgeNoOpResponseSchema,
  GossipelogEdgeDeltaResponseSchema.extend({
    replaceBaseline: z.literal(false),
  }),
  GossipelogEdgeDeltaWithReplacementResponseSchema,
  GossipelogNewEdgeResponseSchema,
]);

const GossipelogUpdateResultNoOpResponseSchema = z
  .object({
    involvedRoleIds: z.array(z.string()),
    invocationNoOp: z.literal(true),
    edgeUpdates: z.array(GossipelogEdgeUpdateResponseSchema).length(0),
    usage: UsageInfoSchema.optional(),
  })
  .strict();

const GossipelogUpdateResultAppliedResponseSchema = z
  .object({
    involvedRoleIds: z.array(z.string()),
    invocationNoOp: z.literal(false),
    edgeUpdates: z.array(GossipelogEdgeUpdateResponseSchema).min(1),
    usage: UsageInfoSchema.optional(),
  })
  .strict();

const GossipelogInjectionResultResponseSchema = GossipelogInjectionResultSchema.extend({
  usage: UsageInfoSchema.optional(),
}).strict();

function stripCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseJsonCandidates(candidates: readonly string[]): readonly unknown[] {
  const parsed: unknown[] = [];

  for (const candidate of candidates) {
    const normalized = stripCodeFence(candidate);

    if (normalized.length === 0) {
      continue;
    }

    try {
      parsed.push(JSON.parse(normalized));
    } catch {
      continue;
    }
  }

  return parsed;
}

function collectBalancedSlices(
  content: string,
  openToken: '{' | '[',
  closeToken: '}' | ']',
): readonly string[] {
  const slices: string[] = [];
  let startIndex = -1;
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (character === '\\' && inString) {
      escaping = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === openToken) {
      if (depth === 0) {
        startIndex = index;
      }

      depth += 1;
      continue;
    }

    if (character === closeToken && depth > 0) {
      depth -= 1;

      if (depth === 0 && startIndex >= 0) {
        slices.push(content.slice(startIndex, index + 1));
        startIndex = -1;
      }
    }
  }

  return slices;
}

function parseStructuredContentCandidates(content: string): readonly unknown[] {
  const normalized = stripCodeFence(content);
  const directCandidates = parseJsonCandidates([normalized]);

  if (directCandidates.length > 0) {
    return directCandidates;
  }

  const fencedCandidates = parseJsonCandidates(
    Array.from(normalized.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map(
      (match) => match[1] ?? '',
    ),
  );
  const objectCandidates = parseJsonCandidates(collectBalancedSlices(normalized, '{', '}'));
  const arrayCandidates = parseJsonCandidates(collectBalancedSlices(normalized, '[', ']'));
  const allCandidates = [...fencedCandidates, ...objectCandidates, ...arrayCandidates];

  if (allCandidates.length > 0) {
    return allCandidates;
  }

  const excerpt = content.trim().slice(0, 180);
  throw new Error(`Provider response did not contain valid structured JSON: ${excerpt}`);
}

function parseBySchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  content: string,
  schemaName: string,
  usage: UsageInfo | undefined,
): z.infer<TSchema> {
  const candidates = parseStructuredContentCandidates(content);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      return parseWithSchema(
        schema,
        mergeUsage(candidate as Record<string, unknown>, usage),
        schemaName,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Provider response failed validation for ${schemaName}`);
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

function extractBooleanTokenAnswers(content: string): readonly boolean[] {
  const answersIndex = content.search(/["']?answers["']?\s*:/i);
  const focusWindow =
    answersIndex >= 0 ? content.slice(answersIndex, answersIndex + 600) : content.slice(0, 600);
  const matches = focusWindow.match(
    /\btrue\b|\bfalse\b|\byes\b|\bno\b|\bpass(?:ed)?\b|\bfail(?:ed)?\b|\b1\b|\b0\b/gi,
  );

  if (!matches) {
    return [];
  }

  return matches
    .map((token) => {
      const normalized = token.toLowerCase();

      if (
        normalized === 'true' ||
        normalized === 'yes' ||
        normalized === 'pass' ||
        normalized === 'passed' ||
        normalized === '1'
      ) {
        return true;
      }

      if (
        normalized === 'false' ||
        normalized === 'no' ||
        normalized === 'fail' ||
        normalized === 'failed' ||
        normalized === '0'
      ) {
        return false;
      }

      return undefined;
    })
    .filter((token): token is boolean => token !== undefined);
}

const BOOLEAN_WRAPPER_KEYS = [
  'answer',
  'pass',
  'passed',
  'value',
  'result',
  'valid',
  'isValid',
  'isPass',
  'ok',
] as const;

function coerceBooleanValue(value: unknown, depth = 0): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (
      normalized === 'true' ||
      normalized === 'yes' ||
      normalized === 'pass' ||
      normalized === 'passed' ||
      normalized === '1'
    ) {
      return true;
    }

    if (
      normalized === 'false' ||
      normalized === 'no' ||
      normalized === 'fail' ||
      normalized === 'failed' ||
      normalized === '0'
    ) {
      return false;
    }

    return undefined;
  }

  if (!value || typeof value !== 'object' || depth >= 3) {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const token = coerceBooleanValue(item, depth + 1);

      if (token !== undefined) {
        return token;
      }
    }

    return undefined;
  }

  for (const key of BOOLEAN_WRAPPER_KEYS) {
    if (key in value) {
      const token = coerceBooleanValue((value as Record<string, unknown>)[key], depth + 1);

      if (token !== undefined) {
        return token;
      }
    }
  }

  return undefined;
}

function coerceBooleanSequence(value: unknown): readonly boolean[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => coerceBooleanValue(item))
    .filter((item): item is boolean => item !== undefined);
}

function extractBooleanAnswersFromStructuredCandidates(content: string): readonly boolean[] {
  let candidates: readonly unknown[];

  try {
    candidates = parseStructuredContentCandidates(content);
  } catch {
    return [];
  }

  for (const candidate of candidates) {
    const direct = coerceBooleanSequence(candidate);

    if (direct.length > 0) {
      return direct;
    }

    if (candidate && typeof candidate === 'object' && 'answers' in candidate) {
      const answers = coerceBooleanSequence((candidate as Record<string, unknown>).answers);

      if (answers.length > 0) {
        return answers;
      }
    }
  }

  return [];
}

function normalizeAuditAnswers(
  extractedAnswers: readonly boolean[],
  expectedAnswers: number,
): readonly boolean[] {
  const normalizedAnswers = [...extractedAnswers].slice(0, expectedAnswers);

  while (normalizedAnswers.length < expectedAnswers) {
    normalizedAnswers.push(false);
  }

  return normalizedAnswers;
}

function decodeJsonStringLiteral(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function extractGenerateBeatText(content: string): string | null {
  const beatTextMatch = content.match(/"beatText"\s*:\s*"((?:\\.|[^"\\])*)/s);

  if (!beatTextMatch?.[1]) {
    return null;
  }

  return decodeJsonStringLiteral(beatTextMatch[1]).trim() || null;
}

function extractGenerateOptions(content: string): readonly string[] {
  const optionsArrayMatch = content.match(/"options"\s*:\s*\[([\s\S]{0,2400})/i);

  if (optionsArrayMatch?.[1]) {
    const arrayOptions = Array.from(optionsArrayMatch[1].matchAll(/"((?:\\.|[^"\\])*)"/g))
      .map((match) => decodeJsonStringLiteral(match[1] ?? '').trim())
      .filter((option) => option.length > 0);

    if (arrayOptions.length > 0) {
      return arrayOptions;
    }
  }

  const enumeratedOptions = Array.from(
    content.matchAll(/(?:^|\n)\s*(?:[A-D]|[1-4])[\.\):：-]\s*(.+)/g),
  )
    .map((match) => (match[1] ?? '').trim())
    .filter((option) => option.length > 0);

  return enumeratedOptions;
}

function extractRouteRouterName(content: string): string | null {
  const routerNameMatch = content.match(/"routerName"\s*:\s*"((?:\\.|[^"\\])*)"/s);

  if (!routerNameMatch?.[1]) {
    return null;
  }

  return decodeJsonStringLiteral(routerNameMatch[1]).trim() || null;
}

function extractRouteInferenceTrace(content: string): string | null {
  const inferenceTraceMatch = content.match(/"inferenceTrace"\s*:\s*"((?:\\.|[^"\\])*)/s);

  if (!inferenceTraceMatch?.[1]) {
    return null;
  }

  return decodeJsonStringLiteral(inferenceTraceMatch[1]).trim() || null;
}

function extractCollapseField(content: string, fieldName: 'alpha' | 'beta' | 'inferenceTrace') {
  const matcher = new RegExp(`"${fieldName}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`, 's');
  const match = content.match(matcher);

  if (!match?.[1]) {
    return null;
  }

  return decodeJsonStringLiteral(match[1]).trim() || null;
}

function extractSettlementPhaseConsequences(content: string): readonly string[] {
  const phaseConsequencesMatch = content.match(/"phaseConsequences"\s*:\s*\[([\s\S]*)/s);

  if (!phaseConsequencesMatch?.[1]) {
    return [];
  }

  const rawArrayContent = phaseConsequencesMatch[1];
  const arrayContent = rawArrayContent.includes(']')
    ? rawArrayContent.slice(0, rawArrayContent.indexOf(']'))
    : rawArrayContent;

  return Array.from(arrayContent.matchAll(/"((?:\\.|[^"\\])*)"/g))
    .map((match) => decodeJsonStringLiteral(match[1] ?? '').trim())
    .filter((item) => item.length > 0);
}

function extractSettlementTrace(content: string): string | null {
  const traceMatch = content.match(/"settlementTrace"\s*:\s*"((?:\\.|[^"\\])*)/s);

  if (!traceMatch?.[1]) {
    return null;
  }

  return decodeJsonStringLiteral(traceMatch[1]).trim() || null;
}

export function parseGenerateResult(content: string, usage?: UsageInfo): GenerateResult {
  try {
    const result = parseBySchema(GenerateResultSchema, content, 'generateResult', usage);

    return deepFreeze(result);
  } catch (parseError) {
    const beatText = extractGenerateBeatText(content);
    const extractedOptions = extractGenerateOptions(content);

    if (beatText && extractedOptions.length >= 4) {
      return deepFreeze(
        parseWithSchema(
          GenerateResultSchema,
          mergeUsage(
            {
              beatText,
              options: extractedOptions.slice(0, 4),
            },
            usage,
          ),
          'generateResult',
        ),
      );
    }

    if (beatText) {
      throw new Error(
        `Provider returned an incomplete generate payload: beatText was present but only ${
          extractedOptions.length
        } of 4 options could be recovered. This usually means the response was truncated before the option set completed.`,
      );
    }

    throw parseError;
  }
}

export function parseAuditResult(
  content: string,
  expectedAnswers: number,
  usage?: UsageInfo,
): AuditResult {
  let result: AuditResult;

  try {
    result = parseBySchema(AuditResultSchema, content, 'auditResult', usage);
  } catch (parseError) {
    if (expectedAnswers < 1) {
      throw parseError;
    }

    const extractedAnswers = extractBooleanAnswersFromStructuredCandidates(content);
    const fallbackAnswers =
      extractedAnswers.length > 0 ? extractedAnswers : extractBooleanTokenAnswers(content);
    const normalizedAnswers = normalizeAuditAnswers(fallbackAnswers, expectedAnswers);

    result = parseWithSchema(
      AuditResultSchema,
      mergeUsage(
        {
          answers: normalizedAnswers,
        },
        usage,
      ),
      'auditResult',
    );
  }

  if (result.answers.length !== expectedAnswers) {
    return deepFreeze({
      ...result,
      answers: normalizeAuditAnswers(result.answers, expectedAnswers),
    });
  }

  return deepFreeze(result);
}

export function parseRouteResult(content: string, usage?: UsageInfo): RouteResult {
  try {
    return deepFreeze(parseBySchema(RouteResultSchema, content, 'routeResult', usage));
  } catch (parseError) {
    const routerName = extractRouteRouterName(content);
    const inferenceTrace = extractRouteInferenceTrace(content);

    if (routerName) {
      return deepFreeze(
        parseWithSchema(
          RouteResultSchema,
          mergeUsage(
            {
              routerName,
              inferenceTrace:
                inferenceTrace ?? 'Recovered from a truncated provider route response.',
            },
            usage,
          ),
          'routeResult',
        ),
      );
    }

    throw parseError;
  }
}

export function parseSettlementResult(content: string, usage?: UsageInfo) {
  try {
    const candidates = parseStructuredContentCandidates(content);
    let lastError: Error | null = null;

    for (const candidate of candidates) {
      try {
        return deepFreeze(
          validatePhaseConsequenceResponse(mergeUsage(candidate as Record<string, unknown>, usage)),
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (lastError) {
      throw lastError;
    }
  } catch (parseError) {
    const phaseConsequences = extractSettlementPhaseConsequences(content);
    const settlementTrace = extractSettlementTrace(content);

    if (phaseConsequences.length > 0) {
      return deepFreeze(
        validatePhaseConsequenceResponse(
          mergeUsage(
            {
              phaseConsequences,
              settlementTrace:
                settlementTrace ?? 'Recovered from a truncated provider settlement response.',
            },
            usage,
          ),
        ),
      );
    }

    throw parseError;
  }

  throw new Error('Provider response failed validation for phaseConsequenceResponse');
}

export function parseCollapseResult(content: string, usage?: UsageInfo) {
  try {
    const candidates = parseStructuredContentCandidates(content);
    let lastError: Error | null = null;

    for (const candidate of candidates) {
      try {
        return deepFreeze(
          validateCollapseResponse(mergeUsage(candidate as Record<string, unknown>, usage)),
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (lastError) {
      throw lastError;
    }
  } catch (parseError) {
    const alpha = extractCollapseField(content, 'alpha');
    const beta = extractCollapseField(content, 'beta');
    const inferenceTrace = extractCollapseField(content, 'inferenceTrace');

    if (alpha && beta) {
      return deepFreeze(
        validateCollapseResponse(
          mergeUsage(
            {
              alpha,
              beta,
              inferenceTrace:
                inferenceTrace ?? 'Recovered from a truncated provider collapse response.',
            },
            usage,
          ),
        ),
      );
    }

    throw parseError;
  }

  throw new Error('Provider response failed validation for collapseResponse');
}

export function parseGossipelogUpdateResult(
  content: string,
  usage?: UsageInfo,
): GossipelogUpdateResult & { readonly usage?: UsageInfo | undefined } {
  return deepFreeze(
    parseBySchema(
      z.union([
        GossipelogUpdateResultNoOpResponseSchema,
        GossipelogUpdateResultAppliedResponseSchema,
      ]),
      content,
      'gossipelogUpdateResult',
      usage,
    ),
  );
}

export function parseGossipelogInjectionResult(
  content: string,
  usage?: UsageInfo,
): GossipelogInjectionResult & { readonly usage?: UsageInfo | undefined } {
  return deepFreeze(
    parseBySchema(GossipelogInjectionResultResponseSchema, content, 'gossipelogInjectionResult', usage),
  );
}
