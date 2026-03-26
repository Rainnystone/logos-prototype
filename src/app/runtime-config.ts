import type {
  AdapterConfig,
  ProviderConfig,
  ProviderType,
} from '@/engine/api-adapter/providers/provider-interface';

export const ADAPTER_CONFIG_STORAGE_KEY = 'logos-adapter-config';

export type PresetId = 'anthropic' | 'minimax' | 'openai' | 'custom';

export interface ProviderPreset {
  readonly id: PresetId;
  readonly label: string;
  readonly providerType: ProviderType;
  readonly baseUrl: string;
  readonly models: readonly string[];
  readonly defaultModel: string;
}

export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    providerType: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414'],
    defaultModel: 'claude-sonnet-4-20250514',
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    providerType: 'anthropic',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    models: ['MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'MiniMax-M2.1', 'MiniMax-M2.1-highspeed'],
    defaultModel: 'MiniMax-M2.7',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    providerType: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
    defaultModel: 'gpt-4o',
  },
  {
    id: 'custom',
    label: 'Custom Provider',
    providerType: 'openai-compatible',
    baseUrl: '',
    models: [],
    defaultModel: '',
  },
] as const;

export function getPresetById(id: PresetId): ProviderPreset {
  return PROVIDER_PRESETS.find((preset) => preset.id === id) ?? PROVIDER_PRESETS[PROVIDER_PRESETS.length - 1]!;
}

export function detectPresetFromConfig(config: AdapterConfig): PresetId {
  const baseUrl = config.providerConfig.baseUrl;
  for (const preset of PROVIDER_PRESETS) {
    if (preset.id !== 'custom' && preset.baseUrl === baseUrl) {
      return preset.id;
    }
  }
  return 'custom';
}

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
