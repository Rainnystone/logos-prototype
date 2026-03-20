import { describe, expect, it } from 'vitest';

import {
  parseAuditResult,
  parseCollapseResult,
  parseGenerateResult,
  parseSettlementResult,
} from '@/engine/api-adapter/response-parsers';

describe('response parsers', () => {
  it('parses fenced JSON generate results and preserves usage', () => {
    const result = parseGenerateResult(
      '```json\n{"beatText":"beat","options":["a","b","c","d"]}\n```',
      {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
      },
    );

    expect(result).toEqual({
      beatText: 'beat',
      options: ['a', 'b', 'c', 'd'],
      usage: {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
      },
    });
  });

  it('extracts object JSON embedded in surrounding text for audit results', () => {
    const result = parseAuditResult('prefix {"answers":[true,false]} suffix', 2);

    expect(result.answers).toEqual([true, false]);
  });

  it('validates settlement and collapse payloads after parsing', () => {
    const settlement = parseSettlementResult(
      '{"phaseConsequences":["fact-1"],"settlementTrace":"trace"}',
    );
    const collapse = parseCollapseResult(
      '{"alpha":"alpha","beta":"beta","inferenceTrace":"trace"}',
    );

    expect(settlement.phaseConsequences).toEqual(['fact-1']);
    expect(collapse.alpha).toBe('alpha');
  });

  it('throws when provider content does not contain structured JSON', () => {
    expect(() => parseGenerateResult('not-json')).toThrow(/structured JSON/i);
  });

  it('can hit the array-extraction fallback before failing schema validation', () => {
    expect(() => parseGenerateResult('prefix ["a","b"] suffix')).toThrow(/generateResult/i);
  });
});
