import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAnthropicProvider } from '@/engine/api-adapter/providers/anthropic';
import { createOpenAICompatibleProvider } from '@/engine/api-adapter/providers/openai-compatible';
import { sampleProviderRequest } from '@/engine/api-adapter/__tests__/fixtures';

describe('providers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('formats Anthropic requests with system and messages and parses usage', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            content: [{ type: 'text', text: '{"beatText":"beat","options":["a","b","c","d"]}' }],
            usage: { input_tokens: 12, output_tokens: 8 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const provider = createAnthropicProvider({
      apiKey: 'anthropic-key',
      baseUrl: 'https://anthropic.test',
      model: 'claude-test',
    });

    const response = await provider.call(sampleProviderRequest);
    const call = fetchMock.mock.calls.at(0);

    if (!call) {
      throw new Error('expected fetch to be called');
    }

    const [url, init] = call as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    const headers = new Headers(init.headers);

    expect(url).toBe('https://anthropic.test/v1/messages');
    expect(headers.get('x-api-key')).toBe('anthropic-key');
    expect(body.system).toBe(sampleProviderRequest.system);
    expect(body.messages).toEqual(sampleProviderRequest.messages);
    expect(body.temperature).toBe(sampleProviderRequest.temperature);
    expect(body.max_tokens).toBe(sampleProviderRequest.maxOutputTokens);
    expect(response.content).toContain('"beatText":"beat"');
    expect(response.usage).toEqual({
      promptTokens: 12,
      completionTokens: 8,
      totalTokens: 20,
    });
  });

  it('maps system-role history messages to user for Anthropic and allows responses without usage', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            content: [{ type: 'text', text: '{"beatText":"beat","options":["a","b","c","d"]}' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const provider = createAnthropicProvider({
      apiKey: 'anthropic-key',
      baseUrl: 'https://anthropic.test/',
      model: 'claude-test',
    });

    const response = await provider.call({
      ...sampleProviderRequest,
      messages: [{ role: 'system', content: 'embedded-system' }],
    });
    const call = fetchMock.mock.calls.at(0);

    if (!call) {
      throw new Error('expected fetch to be called');
    }

    const [, init] = call as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(body.messages).toEqual([{ role: 'user', content: 'embedded-system' }]);
    expect(response).toEqual({
      content: '{"beatText":"beat","options":["a","b","c","d"]}',
    });
  });

  it('includes Anthropic error details from JSON error responses', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: 'bad request' } }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const provider = createAnthropicProvider({
      apiKey: 'anthropic-key',
      baseUrl: 'https://anthropic.test',
      model: 'claude-test',
    });

    await expect(provider.call(sampleProviderRequest)).rejects.toThrow(/400.*bad request/i);
  });

  it('formats OpenAI-compatible requests as a messages array and parses usage', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: '{"answers":[true,false,true]}',
                },
              },
            ],
            usage: { prompt_tokens: 21, completion_tokens: 5, total_tokens: 26 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const provider = createOpenAICompatibleProvider({
      apiKey: 'openai-key',
      baseUrl: 'https://openai.test',
      model: 'gpt-test',
    });

    const response = await provider.call(sampleProviderRequest);
    const call = fetchMock.mock.calls.at(0);

    if (!call) {
      throw new Error('expected fetch to be called');
    }

    const [url, init] = call as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    const headers = new Headers(init.headers);

    expect(url).toBe('https://openai.test/chat/completions');
    expect(headers.get('authorization')).toBe('Bearer openai-key');
    expect(body.messages).toEqual([
      { role: 'system', content: sampleProviderRequest.system },
      ...sampleProviderRequest.messages,
    ]);
    expect(body.temperature).toBe(sampleProviderRequest.temperature);
    expect(body.max_tokens).toBe(sampleProviderRequest.maxOutputTokens);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(response.content).toBe('{"answers":[true,false,true]}');
    expect(response.usage).toEqual({
      promptTokens: 21,
      completionTokens: 5,
      totalTokens: 26,
    });
  });

  it('supports content-part arrays and omits usage when the provider does not return it', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: [{ type: 'output_text', text: '{"answers":[true]}' }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const provider = createOpenAICompatibleProvider({
      apiKey: 'openai-key',
      baseUrl: 'https://openai.test/',
      model: 'gpt-test',
    });

    const response = await provider.call({
      messages: [{ role: 'user', content: 'prompt' }],
      temperature: 0.3,
      maxOutputTokens: 512,
    });
    const call = fetchMock.mock.calls.at(0);

    if (!call) {
      throw new Error('expected fetch to be called');
    }

    const [, init] = call as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(body.messages).toEqual([{ role: 'user', content: 'prompt' }]);
    expect(response).toEqual({ content: '{"answers":[true]}' });
  });

  it('normalizes Gemini chat completion base URLs and sends json_schema response formats', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: '{"beatText":"beat","options":["a","b","c","d"]}',
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const provider = createOpenAICompatibleProvider({
      apiKey: 'google-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completion',
      model: 'gemini-3-flash-preview',
    });

    await provider.call({
      ...sampleProviderRequest,
      responseFormat: {
        type: 'json_schema',
        name: 'logos_generate_result',
        strict: true,
        schema: {
          type: 'object',
        },
      },
    });

    const call = fetchMock.mock.calls.at(0);

    if (!call) {
      throw new Error('expected fetch to be called');
    }

    const [url, init] = call as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'logos_generate_result',
        schema: {
          type: 'object',
        },
        strict: true,
      },
    });
    expect(body.reasoning_effort).toBeUndefined();
  });

  it('includes OpenAI-compatible plain-text error details for non-JSON failures', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('gateway down', {
          status: 502,
          headers: { 'Content-Type': 'text/plain' },
        }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const provider = createOpenAICompatibleProvider({
      apiKey: 'openai-key',
      baseUrl: 'https://openai.test',
      model: 'gpt-test',
    });

    await expect(provider.call(sampleProviderRequest)).rejects.toThrow(/502.*gateway down/i);
  });

  it('throws a descriptive error on provider network failure', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('socket hang up');
    });

    vi.stubGlobal('fetch', fetchMock);

    const provider = createOpenAICompatibleProvider({
      apiKey: 'openai-key',
      baseUrl: 'https://openai.test',
      model: 'gpt-test',
    });

    await expect(provider.call(sampleProviderRequest)).rejects.toThrow(
      /OpenAI-compatible provider request failed/i,
    );
  });
});
