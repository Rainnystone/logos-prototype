import { NextResponse } from 'next/server';

import { runCoordinatorSave } from '@/authoring/coordinator/coordinator';
import type { ModuleScope } from '@/authoring/contracts';

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

function parseModuleScope(value: unknown): ModuleScope | undefined {
  return value === 'light-cone' ||
    value === 'director-note-additions' ||
    value === 'auditor-question-set' ||
    value === 'beat-volume-definitions' ||
    value === 'router-profile-set'
    ? value
    : undefined;
}

export async function POST(
  request: Request,
  context: {
    params: { packageName: string } | Promise<{ packageName: string }>;
  },
) {
  const params = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const actorInput = isPlainObject(body.actorInput) ? body.actorInput : {};
  const moduleScope = parseModuleScope(body.moduleScope);

  const result = await runCoordinatorSave({
    requestId:
      typeof body.requestId === 'string' ? body.requestId : `coordinator-save-${Date.now()}`,
    packageName: params.packageName,
    activeSection:
      body.activeSection === 'worldbase-cast' ||
      body.activeSection === 'scene-phase-authoring' ||
      body.activeSection === 'control-modules' ||
      body.activeSection === 'package-wiring-validation'
        ? body.activeSection
        : 'package-wiring-validation',
    actorInput: {
      source:
        actorInput.source === 'chat' || actorInput.source === 'migration'
          ? actorInput.source
          : 'form',
      ...(typeof actorInput.rawText === 'string' ? { rawText: actorInput.rawText } : {}),
      ...(typeof actorInput.normalizedText === 'string'
        ? { normalizedText: actorInput.normalizedText }
        : {}),
      ...(isPlainObject(actorInput.uiFields) ? { uiFields: actorInput.uiFields } : {}),
    },
    ...(moduleScope ? { moduleScope } : {}),
    ...(typeof body.dryRun === 'boolean' ? { dryRun: body.dryRun } : {}),
  });

  return NextResponse.json(result, {
    status: getStatusCode(result.saveResult.kind),
  });
}
