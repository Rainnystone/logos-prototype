import { NextResponse } from 'next/server';

import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import { createWorkbenchDemoAdapter } from '@/engine/__mocks__/workbench-demo-adapter';
import { createAPIAdapter } from '@/engine/api-adapter/adapter';
import type { AdapterConfig } from '@/engine/api-adapter/providers/provider-interface';
import { loadRuntimeStoryPackage } from '@/engine/story-loader';
import type { GossipelogInjectionResult } from '@/types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAdapterConfig(value: unknown): AdapterConfig | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const providerConfig = value.providerConfig;

  if (
    (value.provider !== 'anthropic' && value.provider !== 'openai-compatible') ||
    !isPlainObject(providerConfig) ||
    typeof providerConfig.apiKey !== 'string' ||
    typeof providerConfig.baseUrl !== 'string' ||
    typeof providerConfig.model !== 'string'
  ) {
    return null;
  }

  return {
    provider: value.provider,
    providerConfig: {
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      model: providerConfig.model,
    },
  };
}

function parseRelationshipLayer(value: unknown): GossipelogInjectionResult | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  if (
    typeof value.highlightedDeltasText !== 'string' ||
    typeof value.stableBackgroundText !== 'string'
  ) {
    return undefined;
  }

  return {
    highlightedDeltasText: value.highlightedDeltasText,
    stableBackgroundText: value.stableBackgroundText,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const storyPackageName =
    typeof body.storyPackageName === 'string' ? body.storyPackageName : 'sample-scene';
  const acceptedBeatText = typeof body.acceptedBeatText === 'string' ? body.acceptedBeatText : '';
  const roundId = typeof body.roundId === 'string' ? body.roundId : '';
  const adapterConfig = parseAdapterConfig(body.adapterConfig);
  const lastStableRelationshipLayer = parseRelationshipLayer(body.lastStableRelationshipLayer);
  const storyPackage = await loadRuntimeStoryPackage(storyPackageName);
  const adapter = adapterConfig
    ? createAPIAdapter(adapterConfig)
    : createWorkbenchDemoAdapter();
  const result = await runGossipelogCycle({
    adapter,
    storyPackageName,
    storyPackage,
    acceptedBeatText,
    roundId,
    ...(lastStableRelationshipLayer ? { lastStableRelationshipLayer } : {}),
  });

  return NextResponse.json(result);
}
