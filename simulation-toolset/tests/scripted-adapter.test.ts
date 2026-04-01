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
});
