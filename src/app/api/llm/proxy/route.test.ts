import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/llm/proxy/route';

function createTextStreamResponse(
  chunks: readonly string[],
  init: ResponseInit = {},
): Response {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }

        controller.close();
      },
    }),
    init,
  );
}

describe('/api/llm/proxy POST', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns 400 when targetUrl is missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/llm/proxy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { message: 'targetUrl is required.' },
    });
  });

  it('passes through streamed upstream bodies without json buffering', async () => {
    const upstreamBody = [
      'event: message\n',
      'data: {"type":"beatTextDelta","delta":"hel"}\n\n',
      'data: {"type":"finalResult","result":{"beatText":"hello","options":["a","b","c","d"]}}\n\n',
    ].join('');
    const fetchMock = vi.fn(async () =>
      createTextStreamResponse([upstreamBody], {
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'x-upstream': 'kept',
        },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      new Request('http://localhost/api/llm/proxy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetUrl: 'https://provider.test/chat/completions',
          targetHeaders: { authorization: 'Bearer secret' },
          targetBody: { stream: true },
        }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith('https://provider.test/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer secret',
      },
      body: JSON.stringify({ stream: true }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('x-upstream')).toBe('kept');
    await expect(response.text()).resolves.toBe(upstreamBody);
  });

  it('strips upstream decoding headers that no longer match the streamed response body', async () => {
    const upstreamBody = 'event: message\ndata: {"type":"beatTextDelta","delta":"hel"}\n\n';
    const fetchMock = vi.fn(async () =>
      createTextStreamResponse([upstreamBody], {
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'content-encoding': 'gzip',
          'content-length': '999',
          'x-upstream': 'kept',
        },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      new Request('http://localhost/api/llm/proxy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetUrl: 'https://provider.test/chat/completions',
          targetHeaders: { authorization: 'Bearer secret' },
          targetBody: { stream: true },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('x-upstream')).toBe('kept');
    expect(response.headers.get('content-encoding')).toBeNull();
    expect(response.headers.get('content-length')).toBeNull();
    await expect(response.text()).resolves.toBe(upstreamBody);
  });
});
