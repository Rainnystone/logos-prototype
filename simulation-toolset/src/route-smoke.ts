import { createScenePhaseAuthoringDraft } from '@/authoring/sections/scene-phase-authoring';
import { createWorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';
import { loadRuntimeStoryPackage, loadStoryPackage } from '@/engine/story-loader';
import type { PromptObject, StoryPackage } from '@/types';

import { createPlayerSimulator } from '@simulation/player-simulator';
import { createScriptedAdapter } from '@simulation/scripted-adapter';
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

type SceneLocationPromptProjectionResult = {
  readonly packageName: string;
  readonly selectedLocationId: string;
  readonly selectedLocationName: string;
  readonly excludedLocationName: string;
  readonly selected: {
    readonly responseStatus: number;
    readonly savedLocationIds: readonly string[];
    readonly runtimeLocationNames: readonly string[];
    readonly promptLocationPatch: string;
  };
  readonly cleared: {
    readonly responseStatus: number;
    readonly savedLocationIds: readonly string[];
    readonly runtimeLocationNames: readonly string[];
    readonly promptLocationPatch: string;
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

function readReloadedSceneLocationIds(payload: Record<string, unknown>): readonly string[] {
  const reloadedSectionState = payload.reloadedSectionState;

  if (
    typeof reloadedSectionState === 'object' &&
    reloadedSectionState !== null &&
    typeof (reloadedSectionState as { sceneSpec?: unknown }).sceneSpec === 'object' &&
    (reloadedSectionState as { sceneSpec?: unknown }).sceneSpec !== null &&
    Array.isArray(((reloadedSectionState as { sceneSpec: { locationIds?: unknown } }).sceneSpec).locationIds)
  ) {
    return (
      (
        reloadedSectionState as {
          sceneSpec: { locationIds: readonly string[] };
        }
      ).sceneSpec.locationIds
    ).filter((value): value is string => typeof value === 'string');
  }

  return [];
}

function disableAuditQuestions(storyPackage: StoryPackage): StoryPackage {
  return {
    ...storyPackage,
    auditQuestionSet: {
      ...storyPackage.auditQuestionSet,
      selectionPolicy: {
        default: [],
      },
    },
  };
}

function readGeneratePromptLocationPatch(
  operations: readonly {
    readonly operation: string;
    readonly request: unknown;
  }[],
): string {
  const generateRequest = operations.find((item) => item.operation === 'generate')?.request;

  if (
    typeof generateRequest === 'object' &&
    generateRequest !== null &&
    typeof (generateRequest as { worldBase?: unknown }).worldBase === 'object' &&
    (generateRequest as { worldBase?: unknown }).worldBase !== null &&
    typeof (
      (
        generateRequest as {
          worldBase: { locationPatch?: unknown };
        }
      ).worldBase.locationPatch
    ) === 'string'
  ) {
    return (generateRequest as PromptObject).worldBase.locationPatch;
  }

  throw new Error('Route smoke could not read the generate request location patch.');
}

async function capturePromptLocationPatch(packageName: string): Promise<{
  readonly runtimeLocationNames: readonly string[];
  readonly promptLocationPatch: string;
}> {
  const runtimeStoryPackage = disableAuditQuestions(await loadRuntimeStoryPackage(packageName));
  const adapter = createScriptedAdapter({
    collapse: [{ alpha: 'alpha-init', beta: 'beta-init', inferenceTrace: 'collapse-trace' }],
    route: [{ routerName: 'investigation', inferenceTrace: 'route-trace' }],
    generate: [{ beatText: 'route-smoke-beat', options: ['a', 'b', 'c', 'd'] }],
  });
  const player = await createPlayerSimulator({
    packageName,
    adapter,
    storyPackageOverride: runtimeStoryPackage,
  });

  await player.initScene();
  await player.runBeat('scene location prompt smoke');

  return {
    runtimeLocationNames: runtimeStoryPackage.worldBase.locations.map((location) => location.name),
    promptLocationPatch: readGeneratePromptLocationPatch(adapter.getTrace().operations),
  };
}

async function saveScenePhaseLocationSelection(input: {
  readonly packageName: string;
  readonly locationIds: readonly string[];
}): Promise<{
  readonly responseStatus: number;
  readonly savedLocationIds: readonly string[];
}> {
  const { PATCH } = await import(
    '@/app/api/authoring/packages/[packageName]/sections/[sectionId]/route'
  );
  const storyPackage = await loadStoryPackage(input.packageName);
  const requestId = createRequestId();
  const draft = createScenePhaseAuthoringDraft(storyPackage);
  const response = await PATCH(
    new Request(
      `http://localhost/api/authoring/packages/${input.packageName}/sections/scene-phase-authoring`,
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
              sceneSpec: {
                ...draft.sceneSpec,
                locationIds: [...input.locationIds],
              },
            },
          },
        }),
      },
    ),
    {
      params: Promise.resolve({
        packageName: input.packageName,
        sectionId: 'scene-phase-authoring',
      }),
    },
  );
  const payload = (await response.json()) as Record<string, unknown>;

  return {
    responseStatus: response.status,
    savedLocationIds: readReloadedSceneLocationIds(payload),
  };
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

export async function runSceneLocationPromptProjectionSmoke(
  sourcePackageName: string,
): Promise<SceneLocationPromptProjectionResult> {
  const fixture = await createTempStoryPackage(sourcePackageName);

  try {
    const storyPackage = await loadStoryPackage(fixture.packageName);
    const [selectedLocation, excludedLocation] = storyPackage.worldBase.locations;

    if (!selectedLocation || !excludedLocation) {
      throw new Error(
        'Scene location prompt projection smoke requires at least two structured locations.',
      );
    }

    const selectedSave = await saveScenePhaseLocationSelection({
      packageName: fixture.packageName,
      locationIds: [selectedLocation.locationId],
    });
    const selectedPromptProjection = await capturePromptLocationPatch(fixture.packageName);

    const clearedSave = await saveScenePhaseLocationSelection({
      packageName: fixture.packageName,
      locationIds: [],
    });
    const clearedPromptProjection = await capturePromptLocationPatch(fixture.packageName);

    return {
      packageName: fixture.packageName,
      selectedLocationId: selectedLocation.locationId,
      selectedLocationName: selectedLocation.name,
      excludedLocationName: excludedLocation.name,
      selected: {
        responseStatus: selectedSave.responseStatus,
        savedLocationIds: selectedSave.savedLocationIds,
        runtimeLocationNames: selectedPromptProjection.runtimeLocationNames,
        promptLocationPatch: selectedPromptProjection.promptLocationPatch,
      },
      cleared: {
        responseStatus: clearedSave.responseStatus,
        savedLocationIds: clearedSave.savedLocationIds,
        runtimeLocationNames: clearedPromptProjection.runtimeLocationNames,
        promptLocationPatch: clearedPromptProjection.promptLocationPatch,
      },
    };
  } finally {
    await fixture.cleanup();
  }
}
