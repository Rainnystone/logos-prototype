import { createWorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';
import { loadStoryPackage } from '@/engine/story-loader';

import { createTempStoryPackage } from '@simulation/temp-package';

type AuthoringRouteSmokeResult = {
  readonly packageName: string;
  readonly sectionSave: {
    readonly requestId: string;
    readonly requestedHeroName: string;
    readonly responseStatus: number;
    readonly saveKind: string;
    readonly changedFiles: readonly string[];
    readonly reloadedHeroName: string | null;
  };
  readonly diagnostics: {
    readonly responseStatus: number;
    readonly packageName: string;
    readonly overallStatus: string;
  };
};

type PlayRouteSmokeResult = {
  readonly packageName: string;
  readonly acceptedBeatText: string;
  readonly responseStatus: number;
  readonly updateAcceptedBeatText: string;
  readonly relationshipLayer: {
    readonly highlightedDeltasText: string;
    readonly stableBackgroundText: string;
  };
};

function createRequestId(): string {
  return `simulation-route-${Math.random().toString(16).slice(2)}`;
}

function readChangedFiles(payload: Record<string, unknown>): readonly string[] {
  if (
    typeof payload.runtimeImpactSummary === 'object' &&
    payload.runtimeImpactSummary !== null &&
    Array.isArray((payload.runtimeImpactSummary as { changedFiles?: unknown }).changedFiles)
  ) {
    return (payload.runtimeImpactSummary as { changedFiles: readonly string[] }).changedFiles;
  }

  return [];
}

function readReloadedHeroName(payload: Record<string, unknown>): string | null {
  const reloadedSectionState = payload.reloadedSectionState;

  if (
    typeof reloadedSectionState === 'object' &&
    reloadedSectionState !== null &&
    typeof (reloadedSectionState as { worldBase?: unknown }).worldBase === 'object' &&
    (reloadedSectionState as { worldBase?: unknown }).worldBase !== null &&
    typeof ((reloadedSectionState as { worldBase: { hero?: unknown } }).worldBase.hero) ===
      'object' &&
    ((reloadedSectionState as { worldBase: { hero?: unknown } }).worldBase.hero) !== null &&
    typeof (
      (
        (reloadedSectionState as {
          worldBase: { hero: { name?: unknown } };
        }).worldBase.hero
      ).name
    ) === 'string'
  ) {
    return (
      (reloadedSectionState as {
        worldBase: { hero: { name: string } };
      }).worldBase.hero.name
    );
  }

  return null;
}

export async function runAuthoringRouteSmoke(
  sourcePackageName: string,
): Promise<AuthoringRouteSmokeResult> {
  const fixture = await createTempStoryPackage(sourcePackageName);

  try {
    const { PATCH } = await import(
      '@/app/api/authoring/packages/[packageName]/sections/[sectionId]/route'
    );
    const { GET } = await import('@/app/api/authoring/packages/[packageName]/diagnostics/route');
    const storyPackage = await loadStoryPackage(fixture.packageName);
    const requestId = createRequestId();
    const draft = createWorldBaseCastDraft(storyPackage.worldBase);
    const requestedHeroName = `Route Smoke Hero ${requestId.slice(-6)}`;
    const sectionResponse = await PATCH(
      new Request(
        `http://localhost/api/authoring/packages/${fixture.packageName}/sections/worldbase-cast`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            requestId,
            source: 'page',
            payload: {
              uiFields: {
                ...draft,
                hero: {
                  ...draft.hero,
                  name: requestedHeroName,
                },
              },
            },
          }),
        },
      ),
      {
        params: Promise.resolve({
          packageName: fixture.packageName,
          sectionId: 'worldbase-cast',
        }),
      },
    );
    const sectionPayload = (await sectionResponse.json()) as Record<string, unknown>;
    const diagnosticsResponse = await GET(
      new Request(`http://localhost/api/authoring/packages/${fixture.packageName}/diagnostics`),
      {
        params: Promise.resolve({
          packageName: fixture.packageName,
        }),
      },
    );
    const diagnosticsPayload = (await diagnosticsResponse.json()) as {
      readonly packageName?: string;
      readonly overallStatusView?: {
        readonly status?: string;
      };
    };

    return {
      packageName: fixture.packageName,
      sectionSave: {
        requestId,
        requestedHeroName,
        responseStatus: sectionResponse.status,
        saveKind: typeof sectionPayload.kind === 'string' ? sectionPayload.kind : 'unknown',
        changedFiles: readChangedFiles(sectionPayload),
        reloadedHeroName: readReloadedHeroName(sectionPayload),
      },
      diagnostics: {
        responseStatus: diagnosticsResponse.status,
        packageName: diagnosticsPayload.packageName ?? '',
        overallStatus: diagnosticsPayload.overallStatusView?.status ?? 'unknown',
      },
    };
  } finally {
    await fixture.cleanup();
  }
}

export async function runPlayGossipelogRouteSmoke(
  sourcePackageName: string,
): Promise<PlayRouteSmokeResult> {
  const fixture = await createTempStoryPackage(sourcePackageName);

  try {
    const { POST } = await import('@/app/api/play/gossipelog/route');
    const acceptedBeatText = 'Route smoke accepted beat text.';
    const response = await POST(
      new Request('http://localhost/api/play/gossipelog', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          storyPackageName: fixture.packageName,
          acceptedBeatText,
          roundId: 'route-smoke-round-1',
        }),
      }),
    );
    const payload = (await response.json()) as {
      readonly updateRequest?: {
        readonly acceptedBeatText?: string;
      };
      readonly relationshipLayer?: {
        readonly highlightedDeltasText?: string;
        readonly stableBackgroundText?: string;
      };
    };

    return {
      packageName: fixture.packageName,
      acceptedBeatText,
      responseStatus: response.status,
      updateAcceptedBeatText: payload.updateRequest?.acceptedBeatText ?? '',
      relationshipLayer: {
        highlightedDeltasText: payload.relationshipLayer?.highlightedDeltasText ?? '',
        stableBackgroundText: payload.relationshipLayer?.stableBackgroundText ?? '',
      },
    };
  } finally {
    await fixture.cleanup();
  }
}
