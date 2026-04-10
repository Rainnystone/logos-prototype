import { NextResponse } from 'next/server';

import { parseAdapterConfig } from '@/app/api/shared/adapter-config';
import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import { createWorkbenchDemoAdapter } from '@/engine/__mocks__/workbench-demo-adapter';
import { createAPIAdapter } from '@/engine/api-adapter/adapter';
import { loadRuntimeStoryPackage } from '@/engine/story-loader';
import type { GossipelogInjectionResult } from '@/types';
import { resolveActiveStorylineContext } from '@/storylines/substrate';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function parsePhaseId(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function parseBeatIndex(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const storyPackageName =
    typeof body.storyPackageName === 'string' ? body.storyPackageName : 'sample-scene';
  const acceptedBeatText = typeof body.acceptedBeatText === 'string' ? body.acceptedBeatText : '';
  const roundId = typeof body.roundId === 'string' ? body.roundId : '';
  const phaseId = parsePhaseId(body.phaseId);
  const beatIndex = parseBeatIndex(body.beatIndex);

  if (!phaseId) {
    return NextResponse.json(
      { error: 'phaseId is required and must be a non-empty string.' },
      { status: 400 },
    );
  }

  if (beatIndex === null) {
    return NextResponse.json(
      { error: 'beatIndex is required and must be a non-negative integer.' },
      { status: 400 },
    );
  }

  const adapterConfig = parseAdapterConfig(body.adapterConfig);
  const lastStableRelationshipLayer = parseRelationshipLayer(body.lastStableRelationshipLayer);
  const storylineContext = await resolveActiveStorylineContext(storyPackageName, {
    forWrite: false,
  });
  const storyPackage = await loadRuntimeStoryPackage(storyPackageName, {
    authoredRootOverride: storylineContext.authoredRoot,
  });
  const adapter = adapterConfig
    ? createAPIAdapter(adapterConfig)
    : createWorkbenchDemoAdapter();
  const result = await runGossipelogCycle({
    adapter,
    storyPackageName,
    storyPackage,
    acceptedBeatText,
    roundId,
    phaseId,
    beatIndex,
    ...(lastStableRelationshipLayer ? { lastStableRelationshipLayer } : {}),
  });

  return NextResponse.json(result);
}
