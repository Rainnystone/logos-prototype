import type {
  FetchLike,
  Provider,
  ProviderConfig,
  ProviderRequest,
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

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
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
      const data = (await response.json()) as OpenAIApiResponse;

      return data.error?.message;
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

export function createOpenAICompatibleProvider(
  config: ProviderConfig,
  fetchImpl: FetchLike = fetch,
): Provider {
  return {
    async call(request: ProviderRequest): Promise<ProviderResponse> {
      const url = `${trimTrailingSlash(config.baseUrl)}/chat/completions`;

      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: request.model ?? config.model,
            messages: request.system
              ? [{ role: 'system', content: request.system }, ...request.messages]
              : request.messages,
            temperature: request.temperature,
            max_tokens: request.maxOutputTokens,
            response_format: { type: 'json_object' },
          }),
        });
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
  };
}
