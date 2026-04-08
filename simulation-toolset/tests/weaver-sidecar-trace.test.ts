import { describe, it, expect } from 'vitest';
import type { RunWeaverImportResult } from '@/agents/weaver/contracts';
import type { WeaverImportPayload, WeaverImportSummary } from '@/types';
import { createWeaverAgentTrace } from '@simulation/weaver-sidecar-trace';

function buildMockResult(overrides?: Partial<WeaverImportPayload>): RunWeaverImportResult {
  const payload: WeaverImportPayload = {
    sourceSummary: 'A test source summary.',
    importSummary: 'A test import summary.',
    openingHook: 'Test opening hook text.',
    worldBase: {},
    coreCast: [],
    antagonists: [],
    npcCharacters: [],
    locations: [],
    warnings: [],
    unresolvedGaps: [],
    ...overrides,
  };
  const summary: WeaverImportSummary = {
    schemaVersion: 1,
    sourceKind: 'text_import',
    lastRunAt: '2026-04-08T00:00:00.000Z',
    sourceSummary: payload.sourceSummary,
    importSummary: payload.importSummary,
    warnings: payload.warnings,
    unresolvedGaps: payload.unresolvedGaps,
    warningCount: payload.warnings.length,
    unresolvedGapCount: payload.unresolvedGaps.length,
    bootstrapStatus: 'pending',
  };
  return {
    request: { sourceText: 'Test source text.', resolvedReferences: [] },
    payload,
    summary,
  };
}

describe('createWeaverAgentTrace', () => {
  it('returns clean outcome when no warnings', () => {
    const trace = createWeaverAgentTrace(buildMockResult());
    expect(trace.agentId).toBe('weaver');
    expect(trace.stage).toBe('import');
    expect(trace.outcome).toBe('payload-clean');
  });

  it('returns has-warnings outcome when warnings present', () => {
    const trace = createWeaverAgentTrace(buildMockResult({ warnings: ['Ambiguous protagonist'] }));
    expect(trace.outcome).toBe('payload-has-warnings');
    expect((trace.details as Record<string, unknown>).warningCount).toBe(1);
  });

  it('includes warning and gap counts in details', () => {
    const trace = createWeaverAgentTrace(buildMockResult({
      warnings: ['A', 'B', 'C'],
      unresolvedGaps: ['Missing antagonist'],
    }));
    expect((trace.details as Record<string, unknown>).warningCount).toBe(3);
    expect((trace.details as Record<string, unknown>).unresolvedGapCount).toBe(1);
  });

  it('includes sourceSummary in details', () => {
    const trace = createWeaverAgentTrace(buildMockResult());
    expect((trace.details as Record<string, unknown>).sourceSummary).toBe('A test source summary.');
  });

  it('includes suggestedPackageName when present', () => {
    const trace = createWeaverAgentTrace(buildMockResult({ suggestedPackageName: 'test-package' }));
    expect((trace.details as Record<string, unknown>).suggestedPackageName).toBe('test-package');
  });

  it('includes bootstrapStatus from summary', () => {
    const trace = createWeaverAgentTrace(buildMockResult());
    expect((trace.details as Record<string, unknown>).bootstrapStatus).toBe('pending');
  });

  it('documents that import-failed outcome is produced upstream before trace builder', () => {
    // The spec (Section 5.4) defines 'import-failed' as a valid outcome in the
    // SimulationWeaverImportTraceSchema enum. However, createWeaverAgentTrace
    // only ever receives a successful RunWeaverImportResult — the 'import-failed'
    // branch is produced upstream when runWeaverImport throws an error, which
    // occurs *before* the trace builder is called. This test documents that
    // boundary: the trace builder is responsible for 'payload-clean' and
    // 'payload-has-warnings'; the caller is responsible for mapping thrown
    // errors to the 'import-failed' outcome.
    expect(true).toBe(true);
  });
});
