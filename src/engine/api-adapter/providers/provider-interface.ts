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

export interface ProviderRequest {
  readonly messages: readonly ProviderMessage[];
  readonly system?: string;
  readonly temperature: number;
  readonly maxOutputTokens: number;
  readonly model?: string;
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
  readonly generateConfig?: ModeConfig;
  readonly auditConfig?: ModeConfig;
  readonly settlementConfig?: ModeConfig;
  readonly collapseConfig?: ModeConfig;
}

export type FetchLike = typeof fetch;
