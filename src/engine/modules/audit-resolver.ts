import { deepFreeze } from '@/lib/deep-freeze';
import type { ParsedAuditAnswer, ParsedAuditResult } from '@/engine/modules/auditor';

export interface AuditResolverResult {
  readonly pass: boolean;
  readonly blockingFailures: readonly string[];
  readonly rewriteFeedback: string | null;
  readonly forceAccepted: boolean;
}

function buildRewriteFeedback(failures: readonly ParsedAuditAnswer[]): string {
  const lines = failures.map(
    (failure) =>
      `- ${failure.question} | Correct answer: ${failure.expected ? 'YES' : 'NO'} | Your last draft implied: ${failure.answer ? 'YES' : 'NO'}`,
  );

  return [
    'Blocking audit failures detected. Revise the draft to satisfy all of the following:',
    ...lines,
  ].join('\n');
}

/**
 * Resolves parsed audit answers into flow-control decisions for the rewrite loop.
 *
 * @see LOGOS-SPEC/04_MODULES/audit-resolver.md
 */
export function resolveAudit(
  parsedResult: ParsedAuditResult,
  retryCount: number,
): AuditResolverResult {
  const blockingFailures = parsedResult.answers.filter(
    (answer) => !answer.matches && answer.blocking,
  );

  if (blockingFailures.length === 0) {
    return deepFreeze({
      pass: true,
      blockingFailures: [],
      rewriteFeedback: null,
      forceAccepted: false,
    });
  }

  if (retryCount >= 3) {
    return deepFreeze({
      pass: true,
      blockingFailures: blockingFailures.map((failure) => failure.question),
      rewriteFeedback: null,
      forceAccepted: true,
    });
  }

  return deepFreeze({
    pass: false,
    blockingFailures: blockingFailures.map((failure) => failure.question),
    rewriteFeedback: buildRewriteFeedback(blockingFailures),
    forceAccepted: false,
  });
}
