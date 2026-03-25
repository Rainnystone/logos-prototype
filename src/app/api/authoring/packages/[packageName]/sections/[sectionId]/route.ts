import { NextResponse } from 'next/server';

import { saveSectionDraft } from '@/authoring/persistence/bridge';
import type { SaveRequest } from '@/authoring/contracts';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStatusCode(kind: string): number {
  if (kind === 'save_blocked') {
    return 400;
  }

  if (kind === 'save_failed') {
    return 500;
  }

  return 200;
}

export async function PATCH(
  request: Request,
  context: {
    params:
      | { packageName: string; sectionId: string }
      | Promise<{ packageName: string; sectionId: string }>;
  },
) {
  const params = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = isPlainObject(body.payload) ? body.payload : {};
  const moduleScope =
    body.moduleScope === 'light-cone' ||
    body.moduleScope === 'director-note-additions' ||
    body.moduleScope === 'auditor-question-set' ||
    body.moduleScope === 'beat-volume-definitions' ||
    body.moduleScope === 'router-profile-set'
      ? body.moduleScope
      : undefined;
  const result = await saveSectionDraft({
    requestId: typeof body.requestId === 'string' ? body.requestId : `section-save-${Date.now()}`,
    packageName: params.packageName,
    sectionId: params.sectionId as SaveRequest['sectionId'],
    source:
      body.source === 'coordinator' || body.source === 'repair' ? body.source : ('page' as const),
    payload,
    ...(moduleScope !== undefined ? { moduleScope } : {}),
    ...(typeof body.dryRun === 'boolean' ? { dryRun: body.dryRun } : {}),
  });

  return NextResponse.json(result, { status: getStatusCode(result.kind) });
}
