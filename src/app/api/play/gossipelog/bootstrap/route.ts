import { NextResponse } from 'next/server';

import { bootstrapGossipelogFromWeaverSummary } from '@/agents/gossipelog/bootstrap';
import { inspectCharacterRelationshipsState } from '@/agents/gossipelog/repository';
import {
  loadWeaverImportSummaryIfPresent,
  saveWeaverImportSummary,
} from '@/agents/weaver/repository';
import { parseAdapterConfig } from '@/app/api/shared/adapter-config';
import { createAPIAdapter } from '@/engine/api-adapter/adapter';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const storyPackageName =
    typeof body.storyPackageName === 'string' ? body.storyPackageName.trim() : '';
  const adapterConfig = parseAdapterConfig(body.adapterConfig);

  if (storyPackageName.length === 0) {
    return NextResponse.json(
      {
        error: 'A valid storyPackageName is required for gossipelog bootstrap.',
      },
      { status: 400 },
    );
  }

  if (!adapterConfig) {
    return NextResponse.json(
      {
        error: 'A valid adapter config is required for gossipelog bootstrap.',
      },
      { status: 400 },
    );
  }

  const weaverSummary = await loadWeaverImportSummaryIfPresent(storyPackageName);

  if (!weaverSummary || weaverSummary.sourceKind !== 'text_import') {
    return NextResponse.json({
      status: 'noop',
      reason: 'no_weaver_summary',
    });
  }

  const relationshipState = await inspectCharacterRelationshipsState(storyPackageName);

  if (relationshipState === 'readable') {
    if (weaverSummary.bootstrapStatus !== 'succeeded') {
      try {
        await saveWeaverImportSummary(storyPackageName, {
          ...weaverSummary,
          bootstrapStatus: 'succeeded',
        });
      } catch {
        // Keep bootstrap fallback bounded; readable gossipelog state remains the source of truth.
      }
    }

    return NextResponse.json({
      status: 'noop',
      reason: 'gossipelog_state_present',
      bootstrapStatus: 'succeeded',
    });
  }

  const bootstrapResult = await bootstrapGossipelogFromWeaverSummary({
    storyPackageName,
    weaverSummary,
    relationshipState,
    adapter: createAPIAdapter(adapterConfig),
  });

  return NextResponse.json({
    status: bootstrapResult.ok ? 'bootstrapped' : 'fallback_pending',
    bootstrapStatus: bootstrapResult.bootstrapStatus,
    ...(isPlainObject(bootstrapResult) && typeof bootstrapResult.errorMessage === 'string'
      ? { errorMessage: bootstrapResult.errorMessage }
      : {}),
  });
}
