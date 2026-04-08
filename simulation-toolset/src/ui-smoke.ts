import { createElement } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { loadAuthoringState } from '@/authoring/persistence/package-state';
import { EditWorkbench } from '@/app/edit/EditWorkbench';
import { PlayWorkbench } from '@/app/play/PlayWorkbench';
import { createWorkbenchDemoAdapter } from '@/engine/__mocks__/workbench-demo-adapter';
import { loadRuntimeStoryPackage } from '@/engine/story-loader';
import { loadAgentSurfaceItems } from '@/agents/agent-surface';
import { AgentSurfacePanel } from '@/app/edit/sections/AgentSurfacePanel';
import type { RunGossipelogCycleResult } from '@/agents/gossipelog/contracts';
import type { SaveResult } from '@/authoring/contracts';

import { createTempStoryPackage } from '@simulation/temp-package';

type EditUiSmokeResult = {
  readonly packageName: string;
  readonly requestUrl: string;
  readonly requestMethod: string;
  readonly requestId: string;
  readonly requestSource: string | null;
};

type PlayUiSmokeResult = {
  readonly packageName: string;
  readonly gossipelogCallCount: number;
  readonly roundId: string;
  readonly acceptedBeatText: string;
  readonly openingHookConsumed: boolean;
};

function buildAppliedSaveResult(
  packageName: string,
  requestId: string,
  reloadedSectionState: Awaited<ReturnType<typeof loadAuthoringState>>['state'],
): SaveResult {
  return {
    kind: 'save_applied',
    requestId,
    packageName,
    sectionId: 'worldbase-cast',
    showLocally: true,
    showInGlobalDiagnostics: false,
    reloadedSectionState,
    runtimeImpactSummary: {
      changedFiles: ['world-base.yaml', 'authoring-state.json'],
    },
  };
}

function restoreFetch(originalFetch: typeof fetch | undefined) {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    return;
  }

  Reflect.deleteProperty(globalThis, 'fetch');
}

function requireCapturedRequest(
  capturedRequest:
    | {
        readonly url: string;
        readonly init: RequestInit | undefined;
      }
    | null,
) {
  if (!capturedRequest) {
    throw new Error('Edit UI smoke did not capture the shared save request.');
  }

  return capturedRequest;
}

export async function runEditWorkbenchUiSmoke(
  sourcePackageName: string,
): Promise<EditUiSmokeResult> {
  const fixture = await createTempStoryPackage(sourcePackageName);
  const originalFetch = globalThis.fetch;

  try {
    const initialState = await loadAuthoringState(fixture.packageName);
    let capturedRequest:
      | {
          readonly url: string;
          readonly init: RequestInit | undefined;
        }
      | null = null;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const body =
        init?.body && typeof init.body === 'string'
          ? (JSON.parse(init.body) as { readonly requestId?: string })
          : {};

      capturedRequest = {
        url,
        init,
      };

      return new Response(
        JSON.stringify(
          buildAppliedSaveResult(
            fixture.packageName,
            body.requestId ?? 'worldbase-cast-ui-smoke',
            initialState.state,
          ),
        ),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }) as typeof fetch;

    render(
      createElement(EditWorkbench, {
        packageName: fixture.packageName,
        activeSection: 'worldbase-cast',
        activeSurface: 'world',
        initialState,
      }),
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '保存本页' }));
    await waitFor(() => {
      if (!capturedRequest) {
        throw new Error('Edit UI smoke did not trigger the shared save route.');
      }
    });

    const request = requireCapturedRequest(capturedRequest);

    const body =
      request.init?.body && typeof request.init.body === 'string'
        ? (JSON.parse(request.init.body) as {
            readonly requestId?: string;
            readonly source?: string;
          })
        : {};

    return {
      packageName: fixture.packageName,
      requestUrl: request.url,
      requestMethod: request.init?.method ?? 'GET',
      requestId: body.requestId ?? '',
      requestSource: body.source ?? null,
    };
  } finally {
    restoreFetch(originalFetch);
    await fixture.cleanup();
  }
}

function buildNoOpGossipelogResult(acceptedBeatText: string, roundId: string): RunGossipelogCycleResult {
  return {
    updateRequest: {
      sceneCastRoleIds: [],
      candidateRoles: [],
      roleDefinitions: [],
      relationshipSubgraph: {
        meta: {
          fileType: 'character-relationships',
          schemaVersion: 1,
          storyPackage: 'ui-smoke',
        },
        relationshipsBySource: {},
      },
      sceneCastFraming: {
        sceneId: 'ui-smoke',
        castRoleIds: [],
      },
      acceptedBeatText,
      roundId,
    },
    updateResult: {
      involvedRoleIds: [],
      invocationNoOp: true,
      edgeUpdates: [],
    },
    injectionRequest: {
      sceneCastRoleIds: [],
      roleDefinitions: [],
      relationshipSubgraph: {
        meta: {
          fileType: 'character-relationships',
          schemaVersion: 1,
          storyPackage: 'ui-smoke',
        },
        relationshipsBySource: {},
      },
      sceneCastFraming: {
        sceneId: 'ui-smoke',
        castRoleIds: [],
      },
    },
    relationshipLayer: {
      highlightedDeltasText: '',
      stableBackgroundText: '',
    },
  };
}

export async function runPlayWorkbenchUiSmoke(
  sourcePackageName: string,
): Promise<PlayUiSmokeResult> {
  const fixture = await createTempStoryPackage(sourcePackageName);

  try {
    const storyPackage = await loadRuntimeStoryPackage(fixture.packageName);
    let gossipelogCallCount = 0;
    let latestAcceptedBeatText = '';
    let latestRoundId = '';

    render(
      createElement(PlayWorkbench, {
        storyPackage,
        storyPackageName: fixture.packageName,
        adapterFactory: () => createWorkbenchDemoAdapter(),
        gossipelogCycleRunner: async (input) => {
          gossipelogCallCount += 1;
          latestAcceptedBeatText = input.acceptedBeatText;
          latestRoundId = input.roundId;
          return buildNoOpGossipelogResult(input.acceptedBeatText, input.roundId);
        },
      }),
    );

    const user = userEvent.setup();
    const startRoundButton = await screen.findByRole('button', { name: 'Start Round' });
    await user.click(startRoundButton);
    await waitFor(() => {
      if (gossipelogCallCount !== 1) {
        throw new Error('Play UI smoke did not reach the sidecar runner.');
      }
    });
    await waitFor(() => {
      if (!screen.queryByText('Opening Hook')) {
        throw new Error('Play UI smoke did not record the opening hook in beat history.');
      }
    });

    return {
      packageName: fixture.packageName,
      gossipelogCallCount,
      roundId: latestRoundId,
      acceptedBeatText: latestAcceptedBeatText,
      openingHookConsumed: Boolean(screen.queryByText('Opening Hook')),
    };
  } finally {
    await fixture.cleanup();
  }
}

type AgentSurfaceUiSmokeResult = {
  readonly packageName: string;
  readonly renderedAgentIds: readonly string[];
  readonly boundedStatusCount: number;
  readonly hasDisableToggle: boolean;
};

export async function runAgentSurfaceUiSmoke(
  sourcePackageName: string,
): Promise<AgentSurfaceUiSmokeResult> {
  const fixture = await createTempStoryPackage(sourcePackageName);

  try {
    const items = await loadAgentSurfaceItems(fixture.packageName);

    render(
      createElement(AgentSurfacePanel, {
        packageName: fixture.packageName,
        items,
      }),
    );

    const renderedAgentIds = items.map((item) => item.agentId);

    const boundedStatusCount = items.filter(
      (item) =>
        item.latestStateSummary.statePresence !== 'present',
    ).length;

    const disableToggles = screen.queryAllByRole('button', { name: /disable/i });
    const hasDisableToggle = disableToggles.length > 0;

    return {
      packageName: fixture.packageName,
      renderedAgentIds,
      boundedStatusCount,
      hasDisableToggle,
    };
  } finally {
    await fixture.cleanup();
  }
}
