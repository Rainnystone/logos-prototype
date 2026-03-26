import { NextResponse } from 'next/server';

import { loadAuthoringState } from '@/authoring/persistence/package-state';
import { buildPackageDiagnostics } from '@/authoring/sections/package-diagnostics';

export async function GET(
  _request: Request,
  context: {
    params: { packageName: string } | Promise<{ packageName: string }>;
  },
) {
  const params = await context.params;
  const state = await loadAuthoringState(params.packageName);
  const diagnostics = buildPackageDiagnostics({
    packageName: params.packageName,
    source: state.source,
    storyPackage: state.state,
    recentSaveResults: [],
  });

  return NextResponse.json(diagnostics, { status: 200 });
}
