import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { createAPIAdapter } from '@/engine/api-adapter/adapter';
import {
  sampleGossipelogInjectionRequest,
  sampleGossipelogUpdateRequest,
  sampleAuditPacket,
  sampleCollapseRequest,
  sampleInitialCollapseRequest,
  samplePromptObject,
  sampleRouteRequest,
  sampleSettlementRequest,
  sampleWeaverImportRequest,
} from '@/engine/api-adapter/__tests__/fixtures';
import { DEFAULT_MODE_CONFIGS } from '@/engine/api-adapter/schema-mapper';
import {
  validateCollapseResponse,
  validatePhaseConsequenceResponse,
  validatePromptObject,
} from '@/engine/schema-validator';
import type { GenerateStreamEvent, GenerateStreamResult } from '@/engine/types/adapter-interface';

async function collectAsyncEvents<T>(events: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = [];

  for await (const event of events) {
    collected.push(event);
  }

  return collected;
}

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
      streamGenerate: expect.any(Function),
      audit: expect.any(Function),
      settlement: expect.any(Function),
      gossipelogUpdate: expect.any(Function),
      gossipelogInjection: expect.any(Function),
      weaverImport: expect.any(Function),
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

  it('streamGenerate exposes beatTextDelta events and a parsed final result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            [
              'data: {"choices":[{"delta":{"content":"{\\"beatText\\":\\"Hel"}}]}\n\n',
              'data: {"choices":[{"delta":{"content":"lo\\",\\"options\\":[\\"a\\",\\"b\\",\\"c\\",\\"d\\"]}"}}],"usage":{"prompt_tokens":11,"completion_tokens":7,"total_tokens":18}}\n\n',
              'data: [DONE]\n\n',
            ].join(''),
            {
              status: 200,
              headers: { 'Content-Type': 'text/event-stream' },
            },
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

    const streamResult = await adapter.streamGenerate?.(samplePromptObject);

    expectTypeOf<GenerateStreamResult>().toMatchTypeOf(streamResult as GenerateStreamResult);
    expect(streamResult?.kind).toBe('stream');
    const events =
      streamResult?.kind === 'stream'
        ? await collectAsyncEvents<GenerateStreamEvent>(streamResult.events)
        : [];
    const beatTextDeltas = events
      .filter((event): event is Extract<(typeof events)[number], { type: 'beatTextDelta' }> =>
        event.type === 'beatTextDelta',
      )
      .map((event) => event.delta);
    const finalEvent = events.find(
      (event): event is Extract<(typeof events)[number], { type: 'finalResult' }> =>
        event.type === 'finalResult',
    );

    expect(beatTextDeltas.join('')).toBe('Hello');
    expect(finalEvent).toEqual({
      type: 'finalResult',
      result: {
        beatText: 'Hello',
        options: ['a', 'b', 'c', 'd'],
        usage: {
          promptTokens: 11,
          completionTokens: 7,
          totalTokens: 18,
        },
      },
    });
  });

  it('streamGenerate reports fallback without changing buffered generate', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
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

    await expect(adapter.streamGenerate?.(samplePromptObject)).resolves.toEqual({
      kind: 'fallback',
      reason: 'non-streaming-response',
    });
    await expect(adapter.generate?.(samplePromptObject)).resolves.toEqual({
      beatText: 'generated-beat',
      options: ['opt-1', 'opt-2', 'opt-3', 'opt-4'],
      usage: {
        promptTokens: 11,
        completionTokens: 7,
        totalTokens: 18,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

    expect(maxOutputTokens).toEqual([4096, 36864, 4096, 8192, 36864]);
  });

  it('gossipelogUpdate rejects invalid input', async () => {
    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    await expect(
      adapter.gossipelogUpdate!({
        acceptedBeatText: 'accepted beat text',
      } as never),
    ).rejects.toThrow(/gossipelogUpdateRequest/i);
  });

  it('gossipelogInjection rejects invalid input', async () => {
    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    await expect(
      adapter.gossipelogInjection!({
        sceneCastRoleIds: ['chr_hero01'],
      } as never),
    ).rejects.toThrow(/gossipelogInjectionRequest/i);
  });

  it('gossipelogUpdate returns a frozen gossipelog update result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        createOpenAIResponse({
          involvedRoleIds: ['chr_core01', 'chr_hero01'],
          invocationNoOp: false,
          edgeUpdates: [
            {
              sourceRoleId: 'chr_core01',
              targetRoleId: 'chr_hero01',
              mode: 'delta',
              replaceBaseline: false,
              recentDelta: {
                state: 'trust increased after direct protection',
                sourceRound: 'round-0009',
              },
            },
          ],
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

    const result = await adapter.gossipelogUpdate!(sampleGossipelogUpdateRequest);

    expect(result).toEqual({
      involvedRoleIds: ['chr_core01', 'chr_hero01'],
      invocationNoOp: false,
      edgeUpdates: [
        {
          sourceRoleId: 'chr_core01',
          targetRoleId: 'chr_hero01',
          mode: 'delta',
          replaceBaseline: false,
          recentDelta: {
            state: 'trust increased after direct protection',
            sourceRound: 'round-0009',
          },
        },
      ],
      usage: {
        promptTokens: 11,
        completionTokens: 7,
        totalTokens: 18,
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('gossipelogInjection returns a frozen gossipelog injection result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        createOpenAIResponse({
          highlightedDeltasText: 'delta',
          stableBackgroundText: 'background',
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

    const result = await adapter.gossipelogInjection!(sampleGossipelogInjectionRequest);

    expect(result).toEqual({
      highlightedDeltasText: 'delta',
      stableBackgroundText: 'background',
      usage: {
        promptTokens: 11,
        completionTokens: 7,
        totalTokens: 18,
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('uses default gossipelog config values when none are overridden', async () => {
    const observedBodies: Array<{ temperature: number; max_tokens: number }> = [];
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (!init?.body) {
        throw new Error('expected fetch body');
      }

      observedBodies.push(JSON.parse(String(init.body)) as { temperature: number; max_tokens: number });

      if (observedBodies.length === 1) {
        return createOpenAIResponse({
          involvedRoleIds: ['chr_core01', 'chr_hero01'],
          invocationNoOp: false,
          edgeUpdates: [
            {
              sourceRoleId: 'chr_core01',
              targetRoleId: 'chr_hero01',
              mode: 'delta',
              replaceBaseline: false,
              recentDelta: {
                state: 'trust increased after direct protection',
                sourceRound: 'round-0009',
              },
            },
          ],
        });
      }

      return createOpenAIResponse({
        highlightedDeltasText: 'delta',
        stableBackgroundText: 'background',
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

    await adapter.gossipelogUpdate!(sampleGossipelogUpdateRequest);
    await adapter.gossipelogInjection!(sampleGossipelogInjectionRequest);

    expect(observedBodies[0]).toMatchObject({
      temperature: DEFAULT_MODE_CONFIGS.gossipelogUpdate.temperature,
      max_tokens: DEFAULT_MODE_CONFIGS.gossipelogUpdate.maxOutputTokens,
    });
    expect(observedBodies[1]).toMatchObject({
      temperature: DEFAULT_MODE_CONFIGS.gossipelogInjection.temperature,
      max_tokens: DEFAULT_MODE_CONFIGS.gossipelogInjection.maxOutputTokens,
    });
  });

  it('honors gossipelog config overrides on the adapter path', async () => {
    const observedBodies: Array<{ temperature: number; max_tokens: number }> = [];
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (!init?.body) {
        throw new Error('expected fetch body');
      }

      observedBodies.push(JSON.parse(String(init.body)) as { temperature: number; max_tokens: number });

      if (observedBodies.length === 1) {
        return createOpenAIResponse({
          involvedRoleIds: ['chr_core01', 'chr_hero01'],
          invocationNoOp: false,
          edgeUpdates: [
            {
              sourceRoleId: 'chr_core01',
              targetRoleId: 'chr_hero01',
              mode: 'delta',
              replaceBaseline: false,
              recentDelta: {
                state: 'trust increased after direct protection',
                sourceRound: 'round-0009',
              },
            },
          ],
        });
      }

      return createOpenAIResponse({
        highlightedDeltasText: 'delta',
        stableBackgroundText: 'background',
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
      gossipelogUpdateConfig: {
        temperature: 0.77,
        maxOutputTokens: 1234,
      },
      gossipelogInjectionConfig: {
        temperature: 0.45,
        maxOutputTokens: 2222,
      },
    });

    await adapter.gossipelogUpdate!(sampleGossipelogUpdateRequest);
    await adapter.gossipelogInjection!(sampleGossipelogInjectionRequest);

    expect(observedBodies[0]).toMatchObject({
      temperature: 0.77,
      max_tokens: 1234,
    });
    expect(observedBodies[1]).toMatchObject({
      temperature: 0.45,
      max_tokens: 2222,
    });
  });

  it('honors weaverImport defaults and config overrides on the adapter path', async () => {
    const observedBodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(async (_input, init?: RequestInit) => {
      if (init?.body && typeof init.body === 'string') {
        observedBodies.push(JSON.parse(init.body) as Record<string, unknown>);
      }

      return createOpenAIResponse({
        suggestedPackageName: 'woven-package',
        sourceSummary: '外部文本来源摘要',
        importSummary: '已提取基础世界观与角色框架',
        openingHook: '原始 opening hook 文本',
        worldBase: {
          settingSummary: '近未来沿海都市',
        },
        hero: {
          displayName: '林深',
          roleSummary: '被迫接管灯塔网络的主角',
        },
        coreCast: [],
        antagonists: [],
        npcCharacters: [],
        locations: [],
        warnings: [],
        unresolvedGaps: [],
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const defaultAdapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });
    const overrideAdapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
      weaverImportConfig: {
        temperature: 0.61,
        maxOutputTokens: 3456,
      },
    });

    await defaultAdapter.weaverImport!(sampleWeaverImportRequest);
    await overrideAdapter.weaverImport!(sampleWeaverImportRequest);

    expect(observedBodies[0]).toMatchObject({
      temperature: DEFAULT_MODE_CONFIGS.weaverImport.temperature,
      max_tokens: DEFAULT_MODE_CONFIGS.weaverImport.maxOutputTokens,
    });
    expect(observedBodies[1]).toMatchObject({
      temperature: 0.61,
      max_tokens: 3456,
    });
  });

  it('rejects gossipelogUpdate responses that include a baseline when replaceBaseline is false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        createOpenAIResponse({
          involvedRoleIds: ['chr_core01', 'chr_hero01'],
          invocationNoOp: false,
          edgeUpdates: [
            {
              sourceRoleId: 'chr_core01',
              targetRoleId: 'chr_hero01',
              mode: 'delta',
              replaceBaseline: false,
              baseline: {
                state: 'should-not-exist',
                lastAbsorbedRound: 'round-0008',
              },
              recentDelta: {
                state: 'trust increased after direct protection',
                sourceRound: 'round-0009',
              },
            },
          ],
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

    await expect(adapter.gossipelogUpdate!(sampleGossipelogUpdateRequest)).rejects.toThrow(
      /gossipelogUpdateResult/i,
    );
  });

  it('weaverImport rejects invalid input before provider execution', async () => {
    const adapter = createAPIAdapter({
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'openai-key',
        baseUrl: 'https://openai.test',
        model: 'gpt-test',
      },
    });

    await expect(
      adapter.weaverImport!({
        sourceText: '一段外部作者文本',
      } as never),
    ).rejects.toThrow(/weaverImportRequest/i);
  });

  it('weaverImport returns a frozen validated payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        createOpenAIResponse({
          suggestedPackageName: 'woven-package',
          sourceSummary: '外部文本来源摘要',
          importSummary: '已提取基础世界观与角色框架',
          openingHook: '原始 opening hook 文本',
          worldBase: {
            settingSummary: '近未来沿海都市',
          },
          hero: {
            displayName: '林深',
            roleSummary: '被迫接管灯塔网络的主角',
          },
          coreCast: [],
          antagonists: [],
          npcCharacters: [],
          locations: [],
          warnings: ['角色关系只得到部分文本支持'],
          unresolvedGaps: ['缺少明确的地点时间线'],
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

    const result = await adapter.weaverImport!(sampleWeaverImportRequest);

    expect(result).toEqual({
      suggestedPackageName: 'woven-package',
      sourceSummary: '外部文本来源摘要',
      importSummary: '已提取基础世界观与角色框架',
      openingHook: '原始 opening hook 文本',
      worldBase: {
        settingSummary: '近未来沿海都市',
      },
      hero: {
        displayName: '林深',
        roleSummary: '被迫接管灯塔网络的主角',
      },
      coreCast: [],
      antagonists: [],
      npcCharacters: [],
      locations: [],
      warnings: ['角色关系只得到部分文本支持'],
      unresolvedGaps: ['缺少明确的地点时间线'],
      usage: {
        promptTokens: 11,
        completionTokens: 7,
        totalTokens: 18,
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
  });
});
