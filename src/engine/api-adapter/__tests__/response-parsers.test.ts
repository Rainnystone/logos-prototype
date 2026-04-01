import { describe, expect, it } from 'vitest';

import {
  parseAuditResult,
  parseCollapseResult,
  parseGenerateResult,
  parseGossipelogInjectionResult,
  parseGossipelogUpdateResult,
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

  it('recovers settlement results from malformed truncated JSON when phase consequences are present', () => {
    const result = parseSettlementResult(
      '{"phaseConsequences":["fact-1","fact-2"],"settlementTrace":"Recovered from the phase',
    );

    expect(result.phaseConsequences).toEqual(['fact-1', 'fact-2']);
    expect(result.settlementTrace).toContain('Recovered from the phase');
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

  it('parses gossipelog update results and preserves usage', () => {
    const result = parseGossipelogUpdateResult(
      '{"involvedRoleIds":["chr_core01","chr_hero01"],"invocationNoOp":false,"edgeUpdates":[{"sourceRoleId":"chr_core01","targetRoleId":"chr_hero01","mode":"delta","replaceBaseline":false,"recentDelta":{"state":"trust increased after direct protection","sourceRound":"round-0009"}}]}',
      {
        promptTokens: 4,
        completionTokens: 2,
        totalTokens: 6,
      },
    );

    expect(result.involvedRoleIds).toEqual(['chr_core01', 'chr_hero01']);
    expect(result.usage).toEqual({
      promptTokens: 4,
      completionTokens: 2,
      totalTokens: 6,
    });
  });

  it('parses gossipelog noop edge updates', () => {
    const result = parseGossipelogUpdateResult(
      '{"involvedRoleIds":["chr_core01","chr_hero01"],"invocationNoOp":false,"edgeUpdates":[{"sourceRoleId":"chr_core01","targetRoleId":"chr_hero01","mode":"noop"}]}',
    );

    expect(result.edgeUpdates).toEqual([
      {
        sourceRoleId: 'chr_core01',
        targetRoleId: 'chr_hero01',
        mode: 'noop',
      },
    ]);
  });

  it('rejects a delta update that carries a baseline while replaceBaseline is false', () => {
    expect(() =>
      parseGossipelogUpdateResult(
        '{"involvedRoleIds":["chr_core01","chr_hero01"],"invocationNoOp":false,"edgeUpdates":[{"sourceRoleId":"chr_core01","targetRoleId":"chr_hero01","mode":"delta","replaceBaseline":false,"baseline":{"state":"should-not-exist","lastAbsorbedRound":"round-0008"},"recentDelta":{"state":"trust increased","sourceRound":"round-0009"}}]}',
      ),
    ).toThrow(/gossipelogUpdateResult/i);
  });

  it('parses gossipelog injection results from fenced JSON', () => {
    const result = parseGossipelogInjectionResult(
      '```json\n{"highlightedDeltasText":"delta","stableBackgroundText":"background"}\n```',
    );

    expect(result).toEqual({
      highlightedDeltasText: 'delta',
      stableBackgroundText: 'background',
    });
  });
});
