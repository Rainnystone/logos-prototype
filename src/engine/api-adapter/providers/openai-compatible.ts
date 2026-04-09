import type {
  FetchLike,
  Provider,
  ProviderConfig,
  ProviderGenerateStreamResult,
  ProviderRequest,
  ProviderResponseFormat,
  ProviderResponse,
} from '@/engine/api-adapter/providers/provider-interface';

interface OpenAIUsage {
  readonly prompt_tokens?: number;
  readonly completion_tokens?: number;
  readonly total_tokens?: number;
}

interface OpenAIContentPart {
  readonly type?: string;
  readonly text?: string;
}

interface OpenAIChoice {
  readonly delta?: {
    readonly content?: string | readonly OpenAIContentPart[];
  };
  readonly message?: {
    readonly content?: string | readonly OpenAIContentPart[];
  };
}

interface OpenAIApiResponse {
  readonly choices?: readonly OpenAIChoice[];
  readonly usage?: OpenAIUsage;
  readonly error?: {
    readonly message?: string;
  };
}

function extractJsonErrorDetail(payload: unknown): string | undefined {
  if (typeof payload === 'string') {
    const trimmedPayload = payload.trim();
    return trimmedPayload.length > 0 ? trimmedPayload : undefined;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const detail = extractJsonErrorDetail(item);

      if (detail) {
        return detail;
      }
    }

    return undefined;
  }

  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const directMessage =
    typeof record.message === 'string' ? record.message.trim() : undefined;

  if (directMessage && directMessage.length > 0) {
    return directMessage;
  }

  if ('error' in record) {
    const errorDetail = extractJsonErrorDetail(record.error);

    if (errorDetail) {
      return errorDetail;
    }
  }

  return undefined;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function resolveChatCompletionsUrl(baseUrl: string): string {
  const normalizedBaseUrl = trimTrailingSlash(baseUrl);

  if (/\/chat\/completions$/i.test(normalizedBaseUrl)) {
    return normalizedBaseUrl;
  }

  if (/\/chat\/completion$/i.test(normalizedBaseUrl)) {
    return normalizedBaseUrl.replace(/\/chat\/completion$/i, '/chat/completions');
  }

  return `${normalizedBaseUrl}/chat/completions`;
}

function isGeminiOpenAICompatibleBaseUrl(baseUrl: string): boolean {
  return /generativelanguage\.googleapis\.com/i.test(baseUrl);
}

function supportsJsonSchemaResponseFormat(baseUrl: string): boolean {
  return isGeminiOpenAICompatibleBaseUrl(baseUrl) || /api\.openai\.com/i.test(baseUrl);
}

function resolveResponseFormat(
  baseUrl: string,
  requestResponseFormat: ProviderResponseFormat | undefined,
): Record<string, unknown> {
  if (!requestResponseFormat) {
    return { type: 'json_object' };
  }

  if (requestResponseFormat.type === 'json_object') {
    return { type: 'json_object' };
  }

  if (!supportsJsonSchemaResponseFormat(baseUrl)) {
    return { type: 'json_object' };
  }

  return {
    type: 'json_schema',
    json_schema: {
      name: requestResponseFormat.name,
      schema: requestResponseFormat.schema,
      strict: requestResponseFormat.strict ?? true,
    },
  };
}

function extractMessageContent(content: string | readonly OpenAIContentPart[] | undefined): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => part.text ?? '')
      .join('\n')
      .trim();

    if (text.length > 0) {
      return text;
    }
  }

  throw new Error('OpenAI-compatible provider response did not include message content');
}

async function parseErrorDetail(response: Response): Promise<string | undefined> {
  const contentType = response.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as OpenAIApiResponse | unknown;

      return extractJsonErrorDetail(data);
    }

    const text = await response.text();

    return text.trim() || undefined;
  } catch {
    return undefined;
  }
}

function buildHttpErrorMessage(prefix: string, status: number, detail: string | undefined): Error {
  const suffix = detail && detail.length > 0 ? `: ${detail}` : '';

  return new Error(`${prefix} with status ${status}${suffix}`);
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

  return !/api\.openai\.com/i.test(baseUrl);
}

export function createOpenAICompatibleProvider(
  config: ProviderConfig,
  fetchImpl: FetchLike = fetch,
): Provider {
  return {
    async call(request: ProviderRequest): Promise<ProviderResponse> {
      const targetUrl = resolveChatCompletionsUrl(config.baseUrl);
      const requestBody: Record<string, unknown> = {
        model: request.model ?? config.model,
        messages: request.system
          ? [{ role: 'system', content: request.system }, ...request.messages]
          : request.messages,
        temperature: request.temperature,
        max_tokens: request.maxOutputTokens,
        response_format: resolveResponseFormat(config.baseUrl, request.responseFormat),
      };
      const targetHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      };

      let response: Response;
      try {
        if (shouldUseProxy(config.baseUrl)) {
          response = await fetchImpl('/api/llm/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl, targetHeaders, targetBody: requestBody }),
          });
        } else {
          response = await fetchImpl(targetUrl, {
            method: 'POST',
            headers: targetHeaders,
            body: JSON.stringify(requestBody),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown network error';

        throw new Error(`OpenAI-compatible provider request failed: ${message}`);
      }

      if (!response.ok) {
        throw buildHttpErrorMessage(
          'OpenAI-compatible provider request failed',
          response.status,
          await parseErrorDetail(response),
        );
      }

      const data = (await response.json()) as OpenAIApiResponse;
      const choice = data.choices?.[0];

      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens:
              data.usage.total_tokens ??
              (data.usage.prompt_tokens ?? 0) + (data.usage.completion_tokens ?? 0),
          }
        : undefined;

      return usage
        ? {
            content: extractMessageContent(choice?.message?.content),
            usage,
          }
        : {
            content: extractMessageContent(choice?.message?.content),
          };
    },

    async streamGenerate(request: ProviderRequest): Promise<ProviderGenerateStreamResult> {
      const targetUrl = resolveChatCompletionsUrl(config.baseUrl);
      const requestBody: Record<string, unknown> = {
        model: request.model ?? config.model,
        messages: request.system
          ? [{ role: 'system', content: request.system }, ...request.messages]
          : request.messages,
        temperature: request.temperature,
        max_tokens: request.maxOutputTokens,
        response_format: resolveResponseFormat(config.baseUrl, request.responseFormat),
        stream: true,
        stream_options: {
          include_usage: true,
        },
      };
      const targetHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      };

      let response: Response;
      try {
        if (shouldUseProxy(config.baseUrl)) {
          response = await fetchImpl('/api/llm/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl, targetHeaders, targetBody: requestBody }),
          });
        } else {
          response = await fetchImpl(targetUrl, {
            method: 'POST',
            headers: targetHeaders,
            body: JSON.stringify(requestBody),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown network error';

        throw new Error(`OpenAI-compatible provider request failed: ${message}`);
      }

      if (!response.ok) {
        throw buildHttpErrorMessage(
          'OpenAI-compatible provider request failed',
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
            if (data === '[DONE]') {
              break;
            }

            const payload = JSON.parse(data) as OpenAIApiResponse;
            const choice = payload.choices?.[0];
            const deltaContent = choice?.delta?.content;
            const nextChunk =
              typeof deltaContent === 'string'
                ? deltaContent
                : Array.isArray(deltaContent)
                  ? deltaContent.map((part) => part.text ?? '').join('')
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
                promptTokens: payload.usage.prompt_tokens,
                completionTokens: payload.usage.completion_tokens,
                totalTokens:
                  payload.usage.total_tokens ??
                  (payload.usage.prompt_tokens ?? 0) + (payload.usage.completion_tokens ?? 0),
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
