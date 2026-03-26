import type {
  FetchLike,
  Provider,
  ProviderConfig,
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

  throw new Error('Anthropic provider response did not include text content');
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
  };
}
