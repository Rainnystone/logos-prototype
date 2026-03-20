import { describe, expect, it } from 'vitest';

import {
  parseAuditResult,
  parseCollapseResult,
  parseGenerateResult,
  parseRouteResult,
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

  it('normalizes over-complete generate option arrays down to four slots', () => {
    const result = parseGenerateResult('{"beatText":"beat","options":["a","b","c","d","e"]}');

    expect(result).toEqual({
      beatText: 'beat',
      options: ['a', 'b', 'c', 'd'],
    });
  });

  it('extracts object JSON embedded in surrounding text for audit results', () => {
    const result = parseAuditResult('prefix {"answers":[true,false]} suffix', 2);

    expect(result.answers).toEqual([true, false]);
  });

  it('recovers audit answers from malformed truncated JSON', () => {
    const result = parseAuditResult('{"answers":[false,false,false,true,', 5);

    expect(result.answers).toEqual([false, false, false, true, false]);
  });

  it('coerces mixed answer value types into booleans for audit results', () => {
    const result = parseAuditResult('{"answers":[{"pass":true},"false",1,{"result":"no"},0]}', 5);

    expect(result.answers).toEqual([true, false, true, false, false]);
  });

  it('recovers route results from malformed truncated JSON when routerName is present', () => {
    const result = parseRouteResult(
      '{"routerName":"悬疑/探案","inferenceTrace":"The phase goal of breaking the',
    );

    expect(result.routerName).toBe('悬疑/探案');
    expect(result.inferenceTrace).toContain('The phase goal');
  });

  it('recovers collapse results from malformed truncated JSON when alpha and beta are present', () => {
    const result = parseCollapseResult(
      '{"alpha":"aggressive-boundary","beta":"passive-boundary","inferenceTrace":"Recovered from the phase',
    );

    expect(result.alpha).toBe('aggressive-boundary');
    expect(result.beta).toBe('passive-boundary');
    expect(result.inferenceTrace).toContain('Recovered from the phase');
  });

  it('falls back to a safe false array when no boolean signal can be recovered', () => {
    const result = parseAuditResult('{"answers":[', 3);

    expect(result.answers).toEqual([false, false, false]);
  });

  it('can recover the valid generate payload when multiple JSON objects appear in one response', () => {
    const content = [
      'Model note: {"debug":"non-schema object"}',
      '```json',
      '{"beatText":"beat","options":["a","b","c","d"]}',
      '```',
    ].join('\n');

    const result = parseGenerateResult(content);

    expect(result).toEqual({
      beatText: 'beat',
      options: ['a', 'b', 'c', 'd'],
    });
  });

  it('throws a targeted error when beat text is present but the four-option set is incomplete', () => {
    expect(() => parseGenerateResult('{"beatText":"beat-only"}')).toThrow(
      /incomplete generate payload/i,
    );
  });

  it('validates settlement and collapse payloads after parsing', () => {
    const settlement = parseSettlementResult(
      '{"phaseConsequences":["fact-1"],"settlementTrace":"trace"}',
    );
    const collapse = parseCollapseResult(
      '{"alpha":"alpha","beta":"beta","inferenceTrace":"trace"}',
    );
    const route = parseRouteResult('prefix {"routerName":"悬疑/探案","inferenceTrace":"trace"}');

    expect(settlement.phaseConsequences).toEqual(['fact-1']);
    expect(collapse.alpha).toBe('alpha');
    expect(route.routerName).toBe('悬疑/探案');
  });

  it('throws when provider content does not contain structured JSON', () => {
    expect(() => parseGenerateResult('not-json')).toThrow(/structured JSON/i);
  });

  it('can hit the array-extraction fallback before failing schema validation', () => {
    expect(() => parseGenerateResult('prefix ["a","b"] suffix')).toThrow(/generateResult/i);
  });
});
