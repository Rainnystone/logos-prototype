import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  AdapterConfig,
  ProviderConfig,
  ProviderRequest,
  ProviderType,
} from '@/engine/api-adapter/providers/provider-interface';

describe('provider interface', () => {
  it('defines ProviderType with anthropic and openai-compatible variants', () => {
    const providers: readonly ProviderType[] = ['anthropic', 'openai-compatible'];

    expect(providers).toEqual(['anthropic', 'openai-compatible']);
    expectTypeOf<ProviderType>().toEqualTypeOf<'anthropic' | 'openai-compatible'>();
  });

  it('defines ProviderConfig with apiKey, baseUrl, and model fields', () => {
    const config: ProviderConfig = {
      apiKey: 'test-key',
      baseUrl: 'https://example.test',
      model: 'test-model',
    };

    expect(config.apiKey).toBe('test-key');
    expect(config.baseUrl).toBe('https://example.test');
    expect(config.model).toBe('test-model');
  });

  it('defines AdapterConfig with provider, providerConfig, and optional mode settings', () => {
    const config: AdapterConfig = {
      provider: 'openai-compatible',
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://example.test',
        model: 'test-model',
      },
      routeConfig: { temperature: 0.5, maxOutputTokens: 768 },
      generateConfig: { temperature: 0.8, maxOutputTokens: 2048 },
      auditConfig: { temperature: 0.3, maxOutputTokens: 512 },
      settlementConfig: { temperature: 0.2, maxOutputTokens: 768 },
      collapseConfig: { temperature: 0.5, maxOutputTokens: 1024 },
    };

    expect(config.provider).toBe('openai-compatible');
    expect(config.routeConfig?.temperature).toBe(0.5);
    expect(config.generateConfig?.temperature).toBe(0.8);
    expect(config.auditConfig?.maxOutputTokens).toBe(512);
    expect(config.settlementConfig?.temperature).toBe(0.2);
    expect(config.collapseConfig?.temperature).toBe(0.5);
  });

  it('defines ProviderRequest with messages plus generation controls', () => {
    const request: ProviderRequest = {
      system: 'system',
      messages: [{ role: 'user', content: 'prompt' }],
      temperature: 0.8,
      maxOutputTokens: 2048,
    };

    expect(request.system).toBe('system');
    expect(request.messages).toEqual([{ role: 'user', content: 'prompt' }]);
    expect(request.temperature).toBe(0.8);
    expect(request.maxOutputTokens).toBe(2048);
  });
});
