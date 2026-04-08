import { NextResponse } from 'next/server';

import {
  bootstrapGossipelogFromWeaverSummary,
  GOSSIPELOG_BOOTSTRAP_PENDING_WARNING,
} from '@/agents/gossipelog/bootstrap';
import { loadWeaverImportSummary } from '@/agents/weaver/repository';
import { parseAdapterConfig } from '@/app/api/shared/adapter-config';
import { createAPIAdapter } from '@/engine/api-adapter/adapter';
import { createStoryPackageScaffold } from '@/story-packages/scaffold';
import {
  StoryPackageScaffoldConflictError,
  StoryPackageScaffoldImportError,
  StoryPackageScaffoldInputError,
  StoryPackageScaffoldValidationError,
  StoryPackageScaffoldWriteError,
} from '@/story-packages/scaffold-errors';
import { StoryPackageCreationRequestSchema } from '@/types/storyline-management';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripAdapterConfig(body: unknown): unknown {
  if (!isPlainObject(body) || body.mode !== 'text_import' || !('adapterConfig' in body)) {
    return body;
  }

  const normalizedBody = { ...body };
  delete normalizedBody.adapterConfig;
  return normalizedBody;
}

function normalizePackageCreationBody(body: unknown): unknown {
  if (
    body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    !('mode' in body) &&
    'displayName' in body
  ) {
    return {
      mode: 'blank',
      displayName: (body as { displayName?: unknown }).displayName,
    };
  }

  return body;
}

function mapCreatePackageError(error: unknown): { status: number; message: string } {
  if (error instanceof StoryPackageScaffoldInputError) {
    return {
      status: 400,
      message: 'Invalid story package display name.',
    };
  }

  if (error instanceof StoryPackageScaffoldImportError) {
    return {
      status: 400,
      message: error.message,
    };
  }

  if (error instanceof StoryPackageScaffoldConflictError) {
    return {
      status: 409,
      message: 'Story package already exists.',
    };
  }

  if (error instanceof StoryPackageScaffoldValidationError) {
    return {
      status: 500,
      message: 'Failed to validate story package scaffold.',
    };
  }

  if (error instanceof StoryPackageScaffoldWriteError) {
    return {
      status: 500,
      message: 'Failed to create story package root.',
    };
  }

  return {
    status: 500,
    message: 'Failed to create story package.',
  };
}

function appendBootstrapPendingWarning(warnings: readonly string[]): readonly string[] {
  return warnings.includes(GOSSIPELOG_BOOTSTRAP_PENDING_WARNING)
    ? warnings
    : [...warnings, GOSSIPELOG_BOOTSTRAP_PENDING_WARNING];
}

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => ({}));
  const parsed = StoryPackageCreationRequestSchema.safeParse(
    normalizePackageCreationBody(stripAdapterConfig(rawBody)),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid package creation payload.',
      },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.mode === 'text_import') {
      const adapterConfig = parseAdapterConfig(
        isPlainObject(rawBody) ? rawBody.adapterConfig : undefined,
      );

      if (!adapterConfig) {
        return NextResponse.json(
          {
            error: 'Text import requires a valid adapter config.',
          },
          { status: 400 },
        );
      }
      const created = await createStoryPackageScaffold({
        mode: 'text_import',
        sourceText: parsed.data.sourceText,
        adapter: createAPIAdapter(adapterConfig),
        ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
      });

      try {
        const weaverSummary = await loadWeaverImportSummary(created.packageName);
        const bootstrapResult = await bootstrapGossipelogFromWeaverSummary({
          storyPackageName: created.packageName,
          weaverSummary,
          adapter: createAPIAdapter(adapterConfig),
        });

        return NextResponse.json(
          {
            ...created,
            warnings:
              bootstrapResult.ok
                ? created.warnings
                : appendBootstrapPendingWarning(created.warnings),
          },
          { status: 201 },
        );
      } catch {
        return NextResponse.json(
          {
            ...created,
            warnings: appendBootstrapPendingWarning(created.warnings),
          },
          { status: 201 },
        );
      }

    }

    const created = await createStoryPackageScaffold({
      mode: 'blank',
      displayName: parsed.data.displayName,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const mapped = mapCreatePackageError(error);

    return NextResponse.json(
      {
        error: mapped.message,
      },
      { status: mapped.status },
    );
  }
}
