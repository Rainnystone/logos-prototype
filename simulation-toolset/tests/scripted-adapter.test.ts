import { describe, expect, it } from 'vitest';

import { createScriptedAdapter } from '@simulation/scripted-adapter';

describe('scripted adapter', () => {
  it('records outbound generate calls and returns scripted inbound data', async () => {
    const adapter = createScriptedAdapter({
      generate: [{ beatText: 'beat-1', options: ['a', 'b', 'c', 'd'] }],
    });

    const result = await adapter.generate?.({} as never);

    expect(result?.beatText).toBe('beat-1');
    expect(adapter.getTrace().operations[0]).toMatchObject({
      operation: 'generate',
      outcome: 'result',
    });
  });

  it('records a timeout failure mode', async () => {
    const adapter = createScriptedAdapter({
      generate: [{ kind: 'timeout', message: 'generate timed out' }],
    });

    await expect(adapter.generate?.({} as never)).rejects.toThrow(/timed out/i);
    expect(adapter.getTrace().operations[0]).toMatchObject({
      operation: 'generate',
      outcome: 'timeout',
    });
  });

  it('records a malformed response mode', async () => {
    const adapter = createScriptedAdapter({
      generate: [{ kind: 'malformed', value: { wrong: 'shape' } }],
    });

    const result = await adapter.generate?.({} as never);

    expect(result).toEqual({ wrong: 'shape' });
    expect(adapter.getTrace().operations[0]).toMatchObject({
      operation: 'generate',
      outcome: 'malformed',
    });
  });

  it('records a provider error mode', async () => {
    const adapter = createScriptedAdapter({
      generate: [{ kind: 'error', message: 'provider failed' }],
    });

    await expect(adapter.generate?.({} as never)).rejects.toThrow(/provider failed/i);
    expect(adapter.getTrace().operations[0]).toMatchObject({
      operation: 'generate',
      outcome: 'error',
    });
  });

  it('records a duplicate response mode', async () => {
    const adapter = createScriptedAdapter({
      generate: [
        {
          kind: 'duplicate',
          value: { beatText: 'duplicate-beat', options: ['a', 'b', 'c', 'd'] },
        },
      ],
    });

    const result = await adapter.generate?.({} as never);

    expect(result?.beatText).toBe('duplicate-beat');
    expect(adapter.getTrace().operations[0]).toMatchObject({
      operation: 'generate',
      outcome: 'duplicate',
    });
  });

  it('records an out-of-order response mode', async () => {
    const adapter = createScriptedAdapter({
      generate: [
        {
          kind: 'out-of-order',
          value: { beatText: 'out-of-order-beat', options: ['a', 'b', 'c', 'd'] },
        },
      ],
    });

    const result = await adapter.generate?.({} as never);

    expect(result?.beatText).toBe('out-of-order-beat');
    expect(adapter.getTrace().operations[0]).toMatchObject({
      operation: 'generate',
      outcome: 'out-of-order',
    });
  });

  it('records a delayed response mode with timing metadata', async () => {
    const adapter = createScriptedAdapter({
      generate: [
        {
          kind: 'delay',
          delayMs: 20,
          value: { beatText: 'delayed-beat', options: ['a', 'b', 'c', 'd'] },
        },
      ],
    });

    const startedAt = Date.now();
    const result = await adapter.generate?.({} as never);
    const elapsedMs = Date.now() - startedAt;

    expect(result?.beatText).toBe('delayed-beat');
    expect(elapsedMs).toBeGreaterThanOrEqual(10);
    expect(adapter.getTrace().operations[0]).toMatchObject({
      operation: 'generate',
      outcome: 'delayed',
      delayMs: 20,
    });
    expect(adapter.getTrace().operations[0]?.elapsedMs).toBeGreaterThanOrEqual(10);
    expect(adapter.getTrace().operations[0]?.completedAtMs).toBeGreaterThanOrEqual(
      adapter.getTrace().operations[0]?.startedAtMs ?? 0,
    );
  });

  // ============================================================================
  // Trace Compatibility Tests (Task 5)
  // ============================================================================

  describe('trace compatibility with shared storyline trace format', () => {
    it('trace entries contain operation and outcome fields', async () => {
      const adapter = createScriptedAdapter({
        route: [{ routerName: 'test-router', inferenceTrace: 'trace' }],
        generate: [{ beatText: 'test', options: ['a', 'b'] }],
      });

      await adapter.route?.({} as never);
      await adapter.generate?.({} as never);

      const trace = adapter.getTrace();

      // First operation (route)
      expect(trace.operations[0]).toMatchObject({
        operation: 'route',
        outcome: 'result',
        request: {},
        response: { routerName: 'test-router', inferenceTrace: 'trace' },
      });

      // Second operation (generate)
      expect(trace.operations[1]).toMatchObject({
        operation: 'generate',
        outcome: 'result',
      });
    });

    it('trace entries preserve request input', async () => {
      const adapter = createScriptedAdapter({
        collapse: [{ alpha: 'alpha-val', beta: 'beta-val', inferenceTrace: 'collapse-trace' }],
      });

      const requestInput = {
        context: {
          mainAxis: 'main-axis',
          endLine: 'end-line',
          sceneProgress: 'phase-1',
        },
        phaseConsequences: ['delta-1'],
      };

      await adapter.collapse?.(requestInput);

      const trace = adapter.getTrace();
      expect(trace.operations[0]?.request).toMatchObject(requestInput);
    });

    it('trace entries preserve error information', async () => {
      const adapter = createScriptedAdapter({
        generate: [{ kind: 'error', message: 'provider error' }],
      });

      await expect(adapter.generate?.({} as never)).rejects.toThrow();

      const trace = adapter.getTrace();
      expect(trace.operations[0]).toMatchObject({
        operation: 'generate',
        outcome: 'error',
        error: 'provider error',
      });
    });

    it('trace supports gossipelog operations', async () => {
      const adapter = createScriptedAdapter({
        gossipelogUpdate: [
          {
            involvedRoleIds: ['char_001', 'char_002'],
            invocationNoOp: false,
            edgeUpdates: [
              {
                sourceRoleId: 'char_001',
                targetRoleId: 'char_002',
                mode: 'delta',
                replaceBaseline: false,
                recentDelta: {
                  state: 'friendship strengthened',
                  sourceRound: 'round_001',
                },
              },
            ],
          },
        ],
        gossipelogInjection: [
          {
            highlightedDeltasText: 'delta text',
            stableBackgroundText: 'background text',
          },
        ],
      });

      await adapter.gossipelogUpdate?.({} as never);
      await adapter.gossipelogInjection?.({} as never);

      const trace = adapter.getTrace();

      expect(trace.operations[0]?.operation).toBe('gossipelogUpdate');
      expect(trace.operations[0]?.outcome).toBe('result');

      expect(trace.operations[1]?.operation).toBe('gossipelogInjection');
      expect(trace.operations[1]?.outcome).toBe('result');
    });

    it('resolves weaverImport from queue', async () => {
      const adapter = createScriptedAdapter({
        weaverImport: [
          {
            sourceSummary: 'Mock source summary.',
            importSummary: 'Mock import summary.',
            openingHook: 'Mock hook.',
            worldBase: {},
            coreCast: [],
            antagonists: [],
            npcCharacters: [],
            locations: [],
            warnings: [],
            unresolvedGaps: [],
          },
        ],
      });

      const result = await adapter.weaverImport!({
        sourceText: 'Test input.',
        resolvedReferences: [],
      });

      expect(result.sourceSummary).toBe('Mock source summary.');
      expect(adapter.getTrace().operations).toHaveLength(1);
      expect(adapter.getTrace().operations[0]!.operation).toBe('weaverImport');
    });

    it('uses default weaverImport response when queue is empty', async () => {
      const adapter = createScriptedAdapter({});

      const result = await adapter.weaverImport!({
        sourceText: 'Test input.',
        resolvedReferences: [],
      });

      expect(result.sourceSummary).toBe('');
      expect(result.warnings).toEqual([]);
    });

    it('trace can be exported for report integration', async () => {
      const adapter = createScriptedAdapter({
        generate: [{ beatText: 'test-beat', options: ['a', 'b', 'c', 'd'] }],
      });

      await adapter.generate?.({} as never);

      const trace = adapter.getTrace();

      // Trace format should be compatible with SimulationAdapterTrace schema
      const adapterTraceEntry = trace.operations[0];
      expect(adapterTraceEntry).toBeDefined();
      expect(typeof adapterTraceEntry?.operation).toBe('string');
      expect(typeof adapterTraceEntry?.outcome).toBe('string');
      // Optional fields for timing metadata
      if (adapterTraceEntry?.delayMs !== undefined) {
        expect(typeof adapterTraceEntry.delayMs).toBe('number');
      }
      if (adapterTraceEntry?.error !== undefined) {
        expect(typeof adapterTraceEntry.error).toBe('string');
      }
    });
  });
});
