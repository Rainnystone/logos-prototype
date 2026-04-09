import type {
  FetchLike,
  Provider,
  ProviderConfig,
  ProviderGenerateStreamResult,
  ProviderMessage,
  ProviderRequest,
  ProviderResponse,
} from '@/engine/api-adapter/providers/provider-interface';

interface AnthropicTextBlock {
  readonly type: string;
  readonly text?: string;
}

interface AnthropicUsage {
  readonly input_tokens?: number;
  readonly output_tokens?: number;
}

interface AnthropicApiResponse {
  readonly content?: readonly AnthropicTextBlock[];
  readonly usage?: AnthropicUsage;
  readonly error?: {
    readonly message?: string;
  };
}

interface AnthropicStreamEventPayload {
  readonly type?: string;
  readonly delta?: {
    readonly type?: string;
    readonly text?: string;
  };
  readonly usage?: AnthropicUsage;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function toAnthropicMessages(messages: readonly ProviderMessage[]) {
  return messages.map((message) => ({
    role: message.role === 'system' ? 'user' : message.role,
    content: message.content,
  }));
}

function buildHttpErrorMessage(prefix: string, status: number, detail: string | undefined): Error {
  const suffix = detail && detail.length > 0 ? `: ${detail}` : '';

  return new Error(`${prefix} with status ${status}${suffix}`);
}

async function parseErrorDetail(response: Response): Promise<string | undefined> {
  const contentType = response.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as AnthropicApiResponse;

      return data.error?.message;
    }

    const text = await response.text();

    return text.trim() || undefined;
  } catch {
    return undefined;
  }
}

function extractContent(data: AnthropicApiResponse): string {
  const text = data.content
    ?.filter((item) => item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();

  if (text && text.length > 0) {
    return text;
  }

  const thinking = data.content
    ?.filter((item) => item.type === 'thinking' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();

  if (thinking && thinking.length > 0) {
    return thinking;
  }

  throw new Error('Anthropic provider response did not include text content');
}

function decodeJsonStringPrefix(value: string): string {
  let decoded = '';

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];

    if (current !== '\\') {
      decoded += current;
      continue;
    }

    const next = value[index + 1];

    if (next === undefined) {
      break;
    }

    switch (next) {
      case '"':
      case '\\':
      case '/':
        decoded += next;
        index += 1;
        break;
      case 'b':
        decoded += '\b';
        index += 1;
        break;
      case 'f':
        decoded += '\f';
        index += 1;
        break;
      case 'n':
        decoded += '\n';
        index += 1;
        break;
      case 'r':
        decoded += '\r';
        index += 1;
        break;
      case 't':
        decoded += '\t';
        index += 1;
        break;
      case 'u': {
        const codePoint = value.slice(index + 2, index + 6);

        if (!/^[0-9a-fA-F]{4}$/.test(codePoint)) {
          return decoded;
        }

        decoded += String.fromCharCode(Number.parseInt(codePoint, 16));
        index += 5;
        break;
      }
      default:
        decoded += next;
        index += 1;
        break;
    }
  }

  return decoded;
}

function createBeatTextDeltaTracker() {
  let emittedPrefix = '';

  return (content: string): string | null => {
    const match = /"beatText"\s*:\s*"((?:\\.|[^"])*)/s.exec(content);

    if (!match?.[1]) {
      return null;
    }

    const decodedPrefix = decodeJsonStringPrefix(match[1]);

    if (!decodedPrefix.startsWith(emittedPrefix) || decodedPrefix.length <= emittedPrefix.length) {
      return null;
    }

    const delta = decodedPrefix.slice(emittedPrefix.length);
    emittedPrefix = decodedPrefix;
    return delta.length > 0 ? delta : null;
  };
}

async function* iterateSseData(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done }).replace(/\r\n/g, '\n');

    let boundaryIndex = buffer.indexOf('\n\n');

    while (boundaryIndex >= 0) {
      const block = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);
      boundaryIndex = buffer.indexOf('\n\n');

      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
        .trim();

      if (data.length > 0) {
        yield data;
      }
    }

    if (done) {
      break;
    }
  }
}

function shouldUseProxy(baseUrl: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (typeof process !== 'undefined' && process.env?.VITEST === 'true') {
    return false;
  }

  return !/api\.anthropic\.com/i.test(baseUrl);
}

export function createAnthropicProvider(
  config: ProviderConfig,
  fetchImpl: FetchLike = fetch,
): Provider {
  return {
    async call(request: ProviderRequest): Promise<ProviderResponse> {
      const targetUrl = `${trimTrailingSlash(config.baseUrl)}/v1/messages`;
      const targetHeaders = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': config.apiKey,
      };
      const targetBody = {
        model: request.model ?? config.model,
        system: request.system,
        messages: toAnthropicMessages(request.messages),
        temperature: request.temperature,
        max_tokens: request.maxOutputTokens,
      };

      let response: Response;
      try {
        if (shouldUseProxy(config.baseUrl)) {
          response = await fetchImpl('/api/llm/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl, targetHeaders, targetBody }),
          });
        } else {
          response = await fetchImpl(targetUrl, {
            method: 'POST',
            headers: targetHeaders,
            body: JSON.stringify(targetBody),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown network error';

        throw new Error(`Anthropic provider request failed: ${message}`);
      }

      if (!response.ok) {
        throw buildHttpErrorMessage(
          'Anthropic provider request failed',
          response.status,
          await parseErrorDetail(response),
        );
      }

      const data = (await response.json()) as AnthropicApiResponse;
      const usage =
        data.usage?.input_tokens !== undefined || data.usage?.output_tokens !== undefined
          ? {
              promptTokens: data.usage?.input_tokens,
              completionTokens: data.usage?.output_tokens,
              totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
            }
          : undefined;

      return usage
        ? {
            content: extractContent(data),
            usage,
          }
        : {
            content: extractContent(data),
          };
    },

    async streamGenerate(request: ProviderRequest): Promise<ProviderGenerateStreamResult> {
      const targetUrl = `${trimTrailingSlash(config.baseUrl)}/v1/messages`;
      const targetHeaders = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': config.apiKey,
      };
      const targetBody = {
        model: request.model ?? config.model,
        system: request.system,
        messages: toAnthropicMessages(request.messages),
        temperature: request.temperature,
        max_tokens: request.maxOutputTokens,
        stream: true,
      };

      let response: Response;
      try {
        if (shouldUseProxy(config.baseUrl)) {
          response = await fetchImpl('/api/llm/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl, targetHeaders, targetBody }),
          });
        } else {
          response = await fetchImpl(targetUrl, {
            method: 'POST',
            headers: targetHeaders,
            body: JSON.stringify(targetBody),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown network error';

        throw new Error(`Anthropic provider request failed: ${message}`);
      }

      if (!response.ok) {
        throw buildHttpErrorMessage(
          'Anthropic provider request failed',
          response.status,
          await parseErrorDetail(response),
        );
      }

      const contentType = response.headers.get('content-type') ?? '';

      if (!contentType.includes('text/event-stream') || !response.body) {
        return {
          kind: 'fallback',
          reason: 'non-streaming-response',
        };
      }

      return {
        kind: 'stream',
        events: (async function* () {
          let accumulatedContent = '';
          let usage: ProviderResponse['usage'];
          const emitBeatTextDelta = createBeatTextDeltaTracker();

          for await (const data of iterateSseData(response.body!)) {
            const payload = JSON.parse(data) as AnthropicStreamEventPayload;
            const nextChunk =
              payload.delta?.type === 'text_delta' && typeof payload.delta.text === 'string'
                ? payload.delta.text
                : null;

            if (nextChunk) {
              accumulatedContent += nextChunk;
              const beatTextDelta = emitBeatTextDelta(accumulatedContent);

              if (beatTextDelta) {
                yield {
                  type: 'beatTextDelta' as const,
                  delta: beatTextDelta,
                };
              }
            }

            if (payload.usage) {
              usage = {
                promptTokens: payload.usage.input_tokens ?? usage?.promptTokens,
                completionTokens: payload.usage.output_tokens ?? usage?.completionTokens,
                totalTokens:
                  (payload.usage.input_tokens ?? usage?.promptTokens ?? 0) +
                  (payload.usage.output_tokens ?? usage?.completionTokens ?? 0),
              };
            }
          }

          yield {
            type: 'finalResult' as const,
            response: usage
              ? {
                  content: accumulatedContent,
                  usage,
                }
              : {
                  content: accumulatedContent,
                },
          };
        })(),
      };
    },
  };
}
