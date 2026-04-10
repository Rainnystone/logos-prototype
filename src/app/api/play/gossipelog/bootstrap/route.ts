import { NextResponse } from 'next/server';

import { bootstrapGossipelogFromWeaverSummary } from '@/agents/gossipelog/bootstrap';
import { inspectCharacterRelationshipsState } from '@/agents/gossipelog/repository';
import {
  loadWeaverImportSummaryIfPresent,
  saveWeaverImportSummary,
} from '@/agents/weaver/repository';
import { parseAdapterConfig } from '@/app/api/shared/adapter-config';
import { createAPIAdapter } from '@/engine/api-adapter/adapter';
import { RuntimeStoryPackageNotFoundError } from '@/runtime-sessions/repository';
import { assertValidStoryPackageSlug } from '@/story-packages/package-slug';
import { resolveActiveStorylineContext } from '@/storylines/substrate';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissingStoryPackageError(error: unknown): boolean {
  if (error instanceof RuntimeStoryPackageNotFoundError) {
    return true;
  }

  return (
    error instanceof Error &&
    /Story package ".*" was not found at /.test(error.message)
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const rawStoryPackageName =
    typeof body.storyPackageName === 'string' ? body.storyPackageName.trim() : '';
  const adapterConfig = parseAdapterConfig(body.adapterConfig);

  let storyPackageName: string;
  try {
    storyPackageName = assertValidStoryPackageSlug(rawStoryPackageName);
  } catch {
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

  let weaverSummary: Awaited<ReturnType<typeof loadWeaverImportSummaryIfPresent>>;
  try {
    weaverSummary = await loadWeaverImportSummaryIfPresent(storyPackageName);
  } catch (error) {
    if (isMissingStoryPackageError(error)) {
      return NextResponse.json(
        {
          error: 'Story package was not found for gossipelog bootstrap.',
        },
        { status: 400 },
      );
    }

    throw error;
  }

  if (!weaverSummary || weaverSummary.sourceKind !== 'text_import') {
    return NextResponse.json({
      status: 'noop',
      reason: 'no_weaver_summary',
    });
  }

  let relationshipState: Awaited<ReturnType<typeof inspectCharacterRelationshipsState>>;
  try {
    relationshipState = await inspectCharacterRelationshipsState(storyPackageName);
  } catch (error) {
    if (isMissingStoryPackageError(error)) {
      return NextResponse.json(
        {
          error: 'Story package was not found for gossipelog bootstrap.',
        },
        { status: 400 },
      );
    }

    throw error;
  }

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

  let storylineContext;
  try {
    storylineContext = await resolveActiveStorylineContext(storyPackageName, {
      forWrite: false,
    });
  } catch (error) {
    if (isMissingStoryPackageError(error)) {
      return NextResponse.json(
        {
          error: 'Story package was not found for gossipelog bootstrap.',
        },
        { status: 400 },
      );
    }

    throw error;
  }

  const bootstrapResult = await bootstrapGossipelogFromWeaverSummary({
    storyPackageName,
    weaverSummary,
    relationshipState,
    authoredRootOverride: storylineContext.authoredRoot,
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
