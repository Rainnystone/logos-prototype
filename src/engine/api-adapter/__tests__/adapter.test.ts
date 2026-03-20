import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAPIAdapter } from '@/engine/api-adapter/adapter';
import {
  sampleAuditPacket,
  sampleCollapseRequest,
  sampleInitialCollapseRequest,
  samplePromptObject,
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
      generate: expect.any(Function),
      audit: expect.any(Function),
      settlement: expect.any(Function),
    });
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

    await expect(adapter.generate?.(samplePromptObject)).rejects.toThrow(/generateResult/i);
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

  it('audit throws on non-boolean answers or mismatched answer counts', async () => {
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

    await expect(adapter.audit?.(sampleAuditPacket)).rejects.toThrow(/auditResult/i);
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

  it('uses the correct default temperatures for generate, audit, settlement, and collapse', async () => {
    const fetchMock = vi.fn(async () => {
      const callIndex = fetchMock.mock.calls.length;

      if (callIndex === 1) {
        return createOpenAIResponse({ beatText: 'generated-beat', options: ['1', '2', '3', '4'] });
      }

      if (callIndex === 2) {
        return createOpenAIResponse({ answers: [true, false, true] });
      }

      if (callIndex === 3) {
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

    expect(temperatures).toEqual([0.8, 0.3, 0.2, 0.5]);
  });
});
