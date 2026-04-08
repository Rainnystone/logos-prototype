import type { UsageInfo } from '@/types';

export type ProviderType = 'anthropic' | 'openai-compatible';

export interface ProviderConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
}

export interface ProviderMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface JsonObjectResponseFormat {
  readonly type: 'json_object';
}

export interface JsonSchemaResponseFormat {
  readonly type: 'json_schema';
  readonly name: string;
  readonly schema: Record<string, unknown>;
  readonly strict?: boolean | undefined;
}

export type ProviderResponseFormat = JsonObjectResponseFormat | JsonSchemaResponseFormat;

export interface ProviderRequest {
  readonly messages: readonly ProviderMessage[];
  readonly system?: string;
  readonly temperature: number;
  readonly maxOutputTokens: number;
  readonly model?: string;
  readonly responseFormat?: ProviderResponseFormat | undefined;
}

export interface ProviderResponse {
  readonly content: string;
  readonly usage?: UsageInfo | undefined;
}

export interface Provider {
  call(request: ProviderRequest): Promise<ProviderResponse>;
}

export interface ModeConfig {
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
}

export interface AdapterConfig {
  readonly provider: ProviderType;
  readonly providerConfig: ProviderConfig;
  readonly routeConfig?: ModeConfig;
  readonly generateConfig?: ModeConfig;
  readonly auditConfig?: ModeConfig;
  readonly settlementConfig?: ModeConfig;
  readonly collapseConfig?: ModeConfig;
  readonly gossipelogUpdateConfig?: ModeConfig;
  readonly gossipelogInjectionConfig?: ModeConfig;
  readonly weaverImportConfig?: ModeConfig;
}

export type FetchLike = typeof fetch;
