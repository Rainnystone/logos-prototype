import type {
  FetchLike,
  Provider,
  ProviderConfig,
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

export function createOpenAICompatibleProvider(
  config: ProviderConfig,
  fetchImpl: FetchLike = fetch,
): Provider {
  return {
    async call(request: ProviderRequest): Promise<ProviderResponse> {
      const url = resolveChatCompletionsUrl(config.baseUrl);
      const requestBody: Record<string, unknown> = {
        model: request.model ?? config.model,
        messages: request.system
          ? [{ role: 'system', content: request.system }, ...request.messages]
          : request.messages,
        temperature: request.temperature,
        max_tokens: request.maxOutputTokens,
        response_format: resolveResponseFormat(config.baseUrl, request.responseFormat),
      };

      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(requestBody),
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
