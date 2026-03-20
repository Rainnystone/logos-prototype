import { describe, expect, it } from 'vitest';

import { resolveAudit } from '@/engine/modules/audit-resolver';
import type { ParsedAuditResult } from '@/engine/modules/auditor';

function createParsedResult(answers: ParsedAuditResult['answers']): ParsedAuditResult {
  return {
    answers,
  };
}

describe('Audit Resolver', () => {
  it('passes when all answers match their expected values', () => {
    const result = resolveAudit(
      createParsedResult([
        {
          questionId: 'AQ-1',
          question: 'question-1',
          answer: true,
          expected: true,
          matches: true,
          blocking: true,
        },
      ]),
      0,
    );

    expect(result).toEqual({
      pass: true,
      blockingFailures: [],
      rewriteFeedback: null,
      forceAccepted: false,
    });
  });

  it('passes when only non-blocking failures exist', () => {
    const result = resolveAudit(
      createParsedResult([
        {
          questionId: 'AQ-1',
          question: 'question-1',
          answer: false,
          expected: true,
          matches: false,
          blocking: false,
        },
      ]),
      0,
    );

    expect(result.pass).toBe(true);
    expect(result.blockingFailures).toEqual([]);
    expect(result.forceAccepted).toBe(false);
  });

  it('fails with rewrite feedback when blocking failures exist and retryCount is below 3', () => {
    const result = resolveAudit(
      createParsedResult([
        {
          questionId: 'AQ-1',
          question: 'question-1',
          answer: false,
          expected: true,
          matches: false,
          blocking: true,
        },
        {
          questionId: 'AQ-2',
          question: 'question-2',
          answer: true,
          expected: false,
          matches: false,
          blocking: true,
        },
      ]),
      2,
    );

    expect(result.pass).toBe(false);
    expect(result.forceAccepted).toBe(false);
    expect(result.blockingFailures).toEqual(['question-1', 'question-2']);
    expect(result.rewriteFeedback).toContain('question-1');
    expect(result.rewriteFeedback).toContain('question-2');
    expect(result.rewriteFeedback).toContain('Correct answer: YES');
    expect(result.rewriteFeedback).toContain('Correct answer: NO');
  });

  it('force-accepts when blocking failures exist after the retry limit', () => {
    const result = resolveAudit(
      createParsedResult([
        {
          questionId: 'AQ-1',
          question: 'question-1',
          answer: false,
          expected: true,
          matches: false,
          blocking: true,
        },
      ]),
      3,
    );

    expect(result).toEqual({
      pass: true,
      blockingFailures: ['question-1'],
      rewriteFeedback: null,
      forceAccepted: true,
    });
  });

  it('passes when there are no questions at all', () => {
    expect(resolveAudit({ answers: [] }, 0)).toEqual({
      pass: true,
      blockingFailures: [],
      rewriteFeedback: null,
      forceAccepted: false,
    });
  });
});
