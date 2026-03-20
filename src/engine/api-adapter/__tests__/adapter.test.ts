import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAPIAdapter } from '@/engine/api-adapter/adapter';
import {
  sampleAuditPacket,
  sampleCollapseRequest,
  sampleInitialCollapseRequest,
  samplePromptObject,
  sampleRouteRequest,
  sampleSettlementRequest,
} from '@/engine/api-adapter/__tests__/fixtures';
import {
  validateCollapseResponse,
  validatePhaseConsequenceResponse,
  validatePromptObject,
} from '@/engine/schema-validator';

function createOpenAIResponse(
  content: unknown,
  usage = { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(content) } }],
      usage,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('api adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('createAPIAdapter returns an object implementing the full LLMAdapter surface', () => {
    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    expect(adapter).toMatchObject({
      collapse: expect.any(Function),
      route: expect.any(Function),
      generate: expect.any(Function),
      audit: expect.any(Function),
      settlement: expect.any(Function),
    });
  });

  it('route returns a frozen RouteResult', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        createOpenAIResponse({
          routerName: 'suspense-investigation',
          inferenceTrace: 'trace',
        }),
      ),
    );

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    const result = await adapter.route?.(sampleRouteRequest);

    expect(result).toEqual({
      routerName: 'suspense-investigation',
      inferenceTrace: 'trace',
      usage: {
        promptTokens: 11,
        completionTokens: 7,
        totalTokens: 18,
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('route recovers the routerName from truncated provider JSON when possible', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content:
                      '{"routerName":"suspense-investigation","inferenceTrace":"The phase goal of tracking the',
                  },
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    const result = await adapter.route?.(sampleRouteRequest);

    expect(result?.routerName).toBe('suspense-investigation');
    expect(result?.inferenceTrace).toContain('The phase goal');
  });

  it('generate validates PromptObject input and returns a frozen GenerateResult', async () => {
    const fetchMock = vi.fn(async () =>
      createOpenAIResponse({
        beatText: 'generated-beat',
        options: ['opt-1', 'opt-2', 'opt-3', 'opt-4'],
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    const result = await adapter.generate?.(validatePromptObject(samplePromptObject));

    expect(result).toEqual({
      beatText: 'generated-beat',
      options: ['opt-1', 'opt-2', 'opt-3', 'opt-4'],
      usage: {
        promptTokens: 11,
        completionTokens: 7,
        totalTokens: 18,
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.options)).toBe(true);
  });

  it('generate throws when provider response is missing the required options array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => createOpenAIResponse({ beatText: 'generated-beat' })),
    );

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    await expect(adapter.generate?.(samplePromptObject)).rejects.toThrow(
      /incomplete generate payload/i,
    );
  });

  it('audit returns boolean answers whose length matches the question count', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => createOpenAIResponse({ answers: [true, false, true] })),
    );

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    const result = await adapter.audit?.(sampleAuditPacket);

    expect(result).toEqual({
      answers: [true, false, true],
      usage: {
        promptTokens: 11,
        completionTokens: 7,
        totalTokens: 18,
      },
    });
    expect(result?.answers).toHaveLength(sampleAuditPacket.auditQuestions.length);
  });

  it('audit normalizes malformed or mismatched answer arrays into the expected length', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => createOpenAIResponse({ answers: [true, 'nope'] })),
    );

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    const result = await adapter.audit?.(sampleAuditPacket);

    expect(result?.answers).toEqual([true, false, false]);
  });

  it('settlement returns a validated PhaseConsequenceResponse', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        createOpenAIResponse({
          phaseConsequences: ['fact-1', 'fact-2'],
          settlementTrace: 'trace',
        }),
      ),
    );

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    const result = await adapter.settlement?.(sampleSettlementRequest);

    expect(validatePhaseConsequenceResponse(result)).toEqual(result);
  });

  it('settlement recovers phase consequences from truncated provider JSON when consequences are present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content:
                      '{"phaseConsequences":["fact-1","fact-2"],"settlementTrace":"Recovered from the phase',
                  },
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    const result = await adapter.settlement?.(sampleSettlementRequest);

    expect(result?.phaseConsequences).toEqual(['fact-1', 'fact-2']);
    expect(result?.settlementTrace).toContain('Recovered from the phase');
  });

  it('collapse returns a validated CollapseResponse on the standard re-inference path', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        createOpenAIResponse({
          alpha: 'next-alpha',
          beta: 'next-beta',
          inferenceTrace: 'trace',
        }),
      ),
    );

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    const result = await adapter.collapse(sampleCollapseRequest);

    expect(validateCollapseResponse(result)).toEqual(result);
  });

  it('collapse also supports the initial-collapse path required by Phase 02', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        createOpenAIResponse({
          alpha: 'initial-alpha',
          beta: 'initial-beta',
          inferenceTrace: 'initial-trace',
        }),
      ),
    );

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    await expect(adapter.collapse(sampleInitialCollapseRequest)).resolves.toEqual({
      alpha: 'initial-alpha',
      beta: 'initial-beta',
      inferenceTrace: 'initial-trace',
      usage: {
        promptTokens: 11,
        completionTokens: 7,
        totalTokens: 18,
      },
    });
  });

  it('collapse recovers alpha and beta from truncated provider JSON when both boundaries are present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content:
                      '{"alpha":"aggressive-boundary","beta":"passive-boundary","inferenceTrace":"Recovered from the phase',
                  },
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    const result = await adapter.collapse(sampleInitialCollapseRequest);

    expect(result.alpha).toBe('aggressive-boundary');
    expect(result.beta).toBe('passive-boundary');
    expect(result.inferenceTrace).toContain('Recovered from the phase');
  });

  it('uses the correct default temperatures for route, generate, audit, settlement, and collapse', async () => {
    const fetchMock = vi.fn(async () => {
      const callIndex = fetchMock.mock.calls.length;

      if (callIndex === 1) {
        return createOpenAIResponse({
          routerName: 'suspense-investigation',
          inferenceTrace: 'trace',
        });
      }

      if (callIndex === 2) {
        return createOpenAIResponse({ beatText: 'generated-beat', options: ['1', '2', '3', '4'] });
      }

      if (callIndex === 3) {
        return createOpenAIResponse({ answers: [true, false, true] });
      }

      if (callIndex === 4) {
        return createOpenAIResponse({
          phaseConsequences: ['fact-1'],
          settlementTrace: 'trace',
        });
      }

      return createOpenAIResponse({
        alpha: 'next-alpha',
        beta: 'next-beta',
        inferenceTrace: 'trace',
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    await adapter.route?.(sampleRouteRequest);
    await adapter.generate?.(samplePromptObject);
    await adapter.audit?.(sampleAuditPacket);
    await adapter.settlement?.(sampleSettlementRequest);
    await adapter.collapse(sampleCollapseRequest);

    const temperatures = fetchMock.mock.calls.map((call) => {
      const init = (call as unknown[])[1] as RequestInit | undefined;

      if (!init) {
        throw new Error('expected fetch init');
      }

      return JSON.parse(String(init.body)).temperature;
    });

    expect(temperatures).toEqual([0.2, 1, 0.3, 0.1, 0.5]);
  });

  it('uses the correct default maxOutputTokens for route, generate, audit, settlement, and collapse', async () => {
    const fetchMock = vi.fn(async () => {
      const callIndex = fetchMock.mock.calls.length;

      if (callIndex === 1) {
        return createOpenAIResponse({
          routerName: 'suspense-investigation',
          inferenceTrace: 'trace',
        });
      }

      if (callIndex === 2) {
        return createOpenAIResponse({ beatText: 'generated-beat', options: ['1', '2', '3', '4'] });
      }

      if (callIndex === 3) {
        return createOpenAIResponse({ answers: [true, false, true] });
      }

      if (callIndex === 4) {
        return createOpenAIResponse({
          phaseConsequences: ['fact-1'],
          settlementTrace: 'trace',
        });
      }

      return createOpenAIResponse({
        alpha: 'next-alpha',
        beta: 'next-beta',
        inferenceTrace: 'trace',
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    await adapter.route?.(sampleRouteRequest);
    await adapter.generate?.(samplePromptObject);
    await adapter.audit?.(sampleAuditPacket);
    await adapter.settlement?.(sampleSettlementRequest);
    await adapter.collapse(sampleCollapseRequest);

    const maxOutputTokens = fetchMock.mock.calls.map((call) => {
      const init = (call as unknown[])[1] as RequestInit | undefined;

      if (!init) {
        throw new Error('expected fetch init');
      }

      return JSON.parse(String(init.body)).max_tokens;
    });

    expect(maxOutputTokens).toEqual([4096, 36864, 512, 8192, 36864]);
  });
});
