import type {
  AdapterConfig,
  ProviderConfig,
  ProviderType,
} from '@/engine/api-adapter/providers/provider-interface';

export const ADAPTER_CONFIG_STORAGE_KEY = 'logos-adapter-config';

const DEFAULT_BASE_URLS: Readonly<Record<ProviderType, string>> = {
  anthropic: 'https://api.anthropic.com',
  'openai-compatible': 'https://api.openai.com/v1',
};

interface ConfigRecord {
  readonly provider: ProviderType;
  readonly providerConfig: ProviderConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProviderType(value: unknown): value is ProviderType {
  return value === 'anthropic' || value === 'openai-compatible';
}

function isProviderConfig(value: unknown): value is ProviderConfig {
  return (
    isRecord(value) &&
    typeof value.apiKey === 'string' &&
    typeof value.baseUrl === 'string' &&
    typeof value.model === 'string'
  );
}

function isAdapterConfig(value: unknown): value is AdapterConfig {
  return (
    isRecord(value) && isProviderType(value.provider) && isProviderConfig(value.providerConfig)
  );
}

export function getDefaultBaseUrl(provider: ProviderType): string {
  return DEFAULT_BASE_URLS[provider];
}

export function buildAdapterConfig(
  provider: ProviderType,
  apiKey: string,
  model: string,
  baseUrl?: string,
): AdapterConfig {
  return {
    provider,
    providerConfig: {
      apiKey,
      model,
      baseUrl: (baseUrl && baseUrl.trim().length > 0
        ? baseUrl
        : getDefaultBaseUrl(provider)
      ).trim(),
    },
  };
}

export function saveAdapterConfig(config: ConfigRecord): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ADAPTER_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function loadAdapterConfig(): AdapterConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(ADAPTER_CONFIG_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    return isAdapterConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
