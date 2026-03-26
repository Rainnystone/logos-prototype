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

export type OperationMode = 'route' | 'generate' | 'audit' | 'settlement' | 'collapse';

export const OPERATION_MODES: readonly OperationMode[] = [
  'collapse', 'route', 'generate', 'audit', 'settlement',
] as const;

export const OPERATION_MODE_LABELS: Readonly<Record<OperationMode, string>> = {
  collapse: 'Collapse',
  route: 'Route',
  generate: 'Generate',
  audit: 'Audit',
  settlement: 'Settlement',
};

export interface ModeOverrides {
  readonly [mode: string]: { readonly temperature?: number; readonly maxOutputTokens?: number } | undefined;
}

function buildModeConfig(override: { temperature?: number; maxOutputTokens?: number } | undefined) {
  if (!override) {
    return undefined;
  }

  const result: { temperature?: number; maxOutputTokens?: number } = {};
  if (override.temperature !== undefined) {
    result.temperature = override.temperature;
  }
  if (override.maxOutputTokens !== undefined) {
    result.maxOutputTokens = override.maxOutputTokens;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export function buildAdapterConfig(
  provider: ProviderType,
  apiKey: string,
  model: string,
  baseUrl?: string,
  modeOverrides?: ModeOverrides,
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
    ...(modeOverrides?.route ? { routeConfig: buildModeConfig(modeOverrides.route) } : {}),
    ...(modeOverrides?.generate ? { generateConfig: buildModeConfig(modeOverrides.generate) } : {}),
    ...(modeOverrides?.audit ? { auditConfig: buildModeConfig(modeOverrides.audit) } : {}),
    ...(modeOverrides?.settlement ? { settlementConfig: buildModeConfig(modeOverrides.settlement) } : {}),
    ...(modeOverrides?.collapse ? { collapseConfig: buildModeConfig(modeOverrides.collapse) } : {}),
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
