import type {
  AdapterConfig,
  ModeConfig,
  ProviderType,
} from '@/engine/api-adapter/providers/provider-interface';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseModeConfig(value: unknown): ModeConfig | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  let temperature: number | undefined;
  let maxOutputTokens: number | undefined;

  if (value.temperature !== undefined) {
    if (typeof value.temperature !== 'number' || Number.isNaN(value.temperature)) {
      return undefined;
    }
    temperature = value.temperature;
  }

  if (value.maxOutputTokens !== undefined) {
    if (
      typeof value.maxOutputTokens !== 'number' ||
      !Number.isInteger(value.maxOutputTokens) ||
      value.maxOutputTokens < 0
    ) {
      return undefined;
    }
    maxOutputTokens = value.maxOutputTokens;
  }

  return {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
  };
}

function parseProvider(value: unknown): ProviderType | null {
  if (value === 'anthropic' || value === 'openai-compatible') {
    return value;
  }

  return null;
}

export function parseAdapterConfig(value: unknown): AdapterConfig | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const provider = parseProvider(value.provider);
  const providerConfig = value.providerConfig;

  if (
    !provider ||
    !isPlainObject(providerConfig) ||
    typeof providerConfig.apiKey !== 'string' ||
    typeof providerConfig.baseUrl !== 'string' ||
    typeof providerConfig.model !== 'string'
  ) {
    return null;
  }

  const routeConfig = parseModeConfig(value.routeConfig);
  const generateConfig = parseModeConfig(value.generateConfig);
  const auditConfig = parseModeConfig(value.auditConfig);
  const settlementConfig = parseModeConfig(value.settlementConfig);
  const collapseConfig = parseModeConfig(value.collapseConfig);
  const gossipelogUpdateConfig = parseModeConfig(value.gossipelogUpdateConfig);
  const gossipelogInjectionConfig = parseModeConfig(value.gossipelogInjectionConfig);

  const optionalConfigs = [
    ['routeConfig', value.routeConfig, routeConfig],
    ['generateConfig', value.generateConfig, generateConfig],
    ['auditConfig', value.auditConfig, auditConfig],
    ['settlementConfig', value.settlementConfig, settlementConfig],
    ['collapseConfig', value.collapseConfig, collapseConfig],
    ['gossipelogUpdateConfig', value.gossipelogUpdateConfig, gossipelogUpdateConfig],
    ['gossipelogInjectionConfig', value.gossipelogInjectionConfig, gossipelogInjectionConfig],
  ] as const;

  if (optionalConfigs.some(([, rawValue, parsedConfig]) => rawValue !== undefined && !parsedConfig)) {
    return null;
  }

  return {
    provider,
    providerConfig: {
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      model: providerConfig.model,
    },
    ...(routeConfig ? { routeConfig } : {}),
    ...(generateConfig ? { generateConfig } : {}),
    ...(auditConfig ? { auditConfig } : {}),
    ...(settlementConfig ? { settlementConfig } : {}),
    ...(collapseConfig ? { collapseConfig } : {}),
    ...(gossipelogUpdateConfig ? { gossipelogUpdateConfig } : {}),
    ...(gossipelogInjectionConfig ? { gossipelogInjectionConfig } : {}),
  };
}
