import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlayWorkbench } from '@/app/play/PlayWorkbench';
import {
  adapterConfigFixture,
  stateSnapshotFixture,
  storyPackageFixture,
} from '@/app/__tests__/fixtures';
import { RuntimeConfigForm } from '@/app/components/RuntimeConfigForm';
import type { BrowserRuntimeSessionClient } from '@/app/play/runtime';
import type { GossipelogCycleRunner } from '@/agents/gossipelog/contracts';
import type { CollapseInput, LLMAdapter } from '@/engine/types/adapter-interface';
import type { AuditResult, GenerateResult } from '@/engine/types/adapter-interface';
import type {
  FinalizeRelationshipLayerInput,
  RecordAcceptedBeatInput,
} from '@/runtime-sessions/repository';
import type { CollapseResponse } from '@/types';
import type { PlayRuntimeSessionView } from '@/runtime-sessions/views';

type AuditMode = 'pass' | 'fail-once' | 'fail-always';

interface PlayHarnessConfig {
  readonly auditMode?: AuditMode;
  readonly delayMs?: number;
  readonly failOnAuditCall?: boolean;
}

function wait(delayMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function createCollapseResponse(request: CollapseInput): CollapseResponse {
  const suffix = request.phaseConsequences?.[0] ?? request.context.mainAxis;

  return {
    alpha: `Alpha boundary from ${suffix}`,
    beta: `Beta boundary from ${suffix}`,
    inferenceTrace: 'collapse-trace',
    usage: {
      promptTokens: 64,
      completionTokens: 24,
      totalTokens: 88,
    },
  };
}

function createPlayAdapterHarness(config: PlayHarnessConfig = {}) {
  const delayMs = config.delayMs ?? 20;
  let collapseCount = 0;
  let generateCount = 0;
  let auditCount = 0;
  const generatedPromptHistories: { role: string; content: string }[][] = [];

  const adapter: LLMAdapter = {
    async collapse(request) {
      collapseCount += 1;
      await wait(delayMs);
      return createCollapseResponse(request);
    },
    async route(request) {
      await wait(delayMs);
      const normalizedHint = request.context.routerHint?.trim();

      const selectedRouter =
        request.availableRouters.find((router) => router.routerName === normalizedHint) ??
        request.availableRouters.find((router) =>
          normalizedHint ? normalizedHint.includes(router.routerName) : false,
        ) ??
        request.availableRouters[0];

      if (!selectedRouter) {
        throw new Error('Play adapter harness requires at least one available router.');
      }

      return {
        routerName: selectedRouter.routerName,
        inferenceTrace: 'route-trace',
        usage: {
          promptTokens: 72,
          completionTokens: 14,
          totalTokens: 86,
        },
      };
    },
    async generate(promptObject) {
      generateCount += 1;
      generatedPromptHistories.push(
        promptObject.history.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
      );
      await wait(delayMs);

      const isRewrite = Boolean(promptObject.generationControl?.isRewrite);
      const suffix = isRewrite ? 'Rewritten' : 'Draft';

      return {
        beatText: `${suffix} beat ${generateCount} for ${promptObject.narrative.phaseGoal}.`,
        options: [
          `Option ${generateCount}-1`,
          `Option ${generateCount}-2`,
          `Option ${generateCount}-3`,
          `Option ${generateCount}-4`,
        ],
        usage: {
          promptTokens: 180,
          completionTokens: 52,
          totalTokens: 232,
        },
      } satisfies GenerateResult;
    },
    async audit() {
      if (config.failOnAuditCall) {
        throw new Error('Audit should not be called in this test harness.');
      }

      auditCount += 1;
      await wait(delayMs);

      if (config.auditMode === 'fail-always') {
        return {
          answers: [false, true],
          usage: {
            promptTokens: 96,
            completionTokens: 16,
            totalTokens: 112,
          },
        } satisfies AuditResult;
      }

      if (config.auditMode === 'fail-once' && auditCount === 1) {
        return {
          answers: [false, true],
          usage: {
            promptTokens: 96,
            completionTokens: 16,
            totalTokens: 112,
          },
        } satisfies AuditResult;
      }

      return {
        answers: [true, true],
        usage: {
          promptTokens: 96,
          completionTokens: 16,
          totalTokens: 112,
        },
      } satisfies AuditResult;
    },
    async settlement() {
      await wait(delayMs);
      return {
        phaseConsequences: ['The signal source has been cornered.'],
        settlementTrace: 'settlement-trace',
        usage: {
          promptTokens: 140,
          completionTokens: 48,
          totalTokens: 188,
        },
      };
    },
  };

  return {
    adapter,
    getCollapseCount: () => collapseCount,
    getGenerateCount: () => generateCount,
    getAuditCount: () => auditCount,
    getGeneratedPromptHistory: (index: number) => generatedPromptHistories[index] ?? null,
  };
}

function createRuntimeSessionClientMock(
  overrides: Partial<BrowserRuntimeSessionClient> = {},
): BrowserRuntimeSessionClient {
  return {
    ensureActiveSession: vi.fn(async () => ({
      activeSessionId: 'sess_active',
    })),
    recordAcceptedBeat: vi.fn(async () => ({
      activeSessionId: 'sess_active',
      activeCheckpointId: 'chk_active',
    })),
    finalizeRelationshipLayer: vi.fn(async () => ({
      activeSessionId: 'sess_active',
      activeCheckpointId: 'chk_active',
    })),
    resetWorkbench: vi.fn(async () => ({
      activeSessionId: 'sess_reset',
    })),
    ...overrides,
  };
}

function createRestorableRuntimeSessionView(): PlayRuntimeSessionView {
  return {
    kind: 'restorable',
    activeSessionId: 'sess_restore',
    activeCheckpointId: 'chk_restore',
    beatHistory: [
      {
        beatNumber: 1,
        playerInput: 'Opening hook',
        beatText: 'The operator enters the sealed corridor.',
      },
      {
        beatNumber: 2,
        playerInput: 'Inspect the relay cabinet.',
        beatText: 'The relay clicks and the vent light turns red.',
      },
    ],
    stateSnapshot: stateSnapshotFixture,
    relationshipSummary: {
      highlightedDeltasText: 'delta restore',
      stableBackgroundText: 'background restore',
      source: 'checkpoint',
    },
    lifecycle: 'in_progress',
  };
}

function createAwaitingStartRuntimeSessionView(): PlayRuntimeSessionView {
  return {
    kind: 'awaiting_start',
    activeSessionId: 'sess_waiting',
    activeCheckpointId: null,
    beatHistory: [],
    stateSnapshot: null,
    relationshipSummary: {
      highlightedDeltasText: '',
      stableBackgroundText: '',
      source: 'empty',
    },
    lifecycle: 'awaiting_start',
  };
}

async function startRound(
  user: ReturnType<typeof userEvent.setup>,
  options: { waitForAccepted?: boolean } = {},
) {
  const waitForAccepted = options.waitForAccepted ?? true;
  const startButton = await screen.findByRole('button', { name: 'Start Round' });

  await waitFor(() => {
    expect(startButton).toBeEnabled();
  });

  await user.click(startButton);

  if (waitForAccepted) {
    await screen.findByText('Accepted');
  }
}

describe('PlayWorkbench', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows scene initialization before the workbench is ready', async () => {
    const harness = createPlayAdapterHarness();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    expect(screen.getByText('Initializing Scene...', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Signal Room')).toBeInTheDocument();
    expect(
      await screen.findByText('Click Start Round to run the opening hook and generate Beat 1.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Round' })).toBeInTheDocument();
  });

  it('calls the bounded gossipelog bootstrap route once before initialization when adapter config exists', async () => {
    const harness = createPlayAdapterHarness();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: 'noop', bootstrapStatus: 'succeeded' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    expect(
      await screen.findByText('Click Start Round to run the opening hook and generate Beat 1.'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/play/gossipelog/bootstrap', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        storyPackageName: 'sample-scene',
        adapterConfig: adapterConfigFixture,
      }),
    });
  });

  it('skips the gossipelog bootstrap route when no adapter config exists', async () => {
    const harness = createPlayAdapterHarness();
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        adapterFactory={() => harness.adapter}
      />,
    );

    expect(
      await screen.findByText('Click Start Round to run the opening hook and generate Beat 1.'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces an explicit continuity error and blocks automatic restore when continuity is unavailable', async () => {
    const harness = createPlayAdapterHarness();
    const unsafeUnavailableReason =
      'Runtime consistency failed at /tmp/runtime-sessions.json: active session "sess_missing" does not resolve.';

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
        initialRuntimeSession={{
          kind: 'unavailable',
          activeSessionId: null,
          activeCheckpointId: null,
          beatHistory: [],
          stateSnapshot: null,
          relationshipSummary: {
            highlightedDeltasText: '',
            stableBackgroundText: '',
            source: 'empty',
          },
          lifecycle: null,
          reason: unsafeUnavailableReason,
        }}
      />,
    );

    expect(
      await screen.findAllByText(
        'Runtime continuity is unavailable. Inspect the saved runtime data before continuing.',
      ),
    ).toHaveLength(2);
    expect(screen.queryByText(unsafeUnavailableReason)).not.toBeInTheDocument();
    expect(screen.queryByText(/runtime-sessions\.json/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/does not resolve/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Round' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(harness.getCollapseCount()).toBe(0);
    });
  });

  it('blocks restore with a safe error state when the saved phase index no longer exists in the story package', async () => {
    const harness = createPlayAdapterHarness();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
        runtimeSessionClient={createRuntimeSessionClientMock()}
        initialRuntimeSession={{
          ...createRestorableRuntimeSessionView(),
          stateSnapshot: {
            ...stateSnapshotFixture,
            sceneState: {
              ...stateSnapshotFixture.sceneState,
              currentPhaseIndex: 999,
            },
          },
        }}
      />,
    );

    expect(
      await screen.findByText(
        'Saved runtime continuity is incompatible with the current story package. Reset the workbench to start a new session.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Active phase 999 was not found/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Round' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(harness.getCollapseCount()).toBe(0);
    });
  });

  it('restores accepted beat history and current state from a restorable runtime session view', async () => {
    const harness = createPlayAdapterHarness();
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
        runtimeSessionClient={createRuntimeSessionClientMock()}
        initialRuntimeSession={createRestorableRuntimeSessionView()}
      />,
    );

    expect(
      await screen.findByText('The operator leans into the blind spot of the corridor and listens for the surge behind the wall.'),
    ).toBeInTheDocument();
    expect(screen.getByText('The operator enters the sealed corridor.')).toBeInTheDocument();
    expect(screen.getByText('The relay clicks and the vent light turns red.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Round' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Free text action'), 'Advance on the control cabinet.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    await screen.findByText('Accepted');
    expect(harness.getGeneratedPromptHistory(0)).toEqual([
      { role: 'user', content: 'Opening hook' },
      { role: 'assistant', content: 'The operator enters the sealed corridor.' },
      { role: 'user', content: 'Inspect the relay cabinet.' },
      { role: 'assistant', content: 'The relay clicks and the vent light turns red.' },
      { role: 'user', content: 'Advance on the control cabinet.' },
    ]);
  });

  it('clears the local session history after reset and restarts new accepted beats from a fresh baseline', async () => {
    const user = userEvent.setup();
    const runtimeSessionClient = createRuntimeSessionClientMock();
    const harness = createPlayAdapterHarness();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
        runtimeSessionClient={runtimeSessionClient}
        initialRuntimeSession={createRestorableRuntimeSessionView()}
      />,
    );

    await screen.findByText('The operator enters the sealed corridor.');
    await user.click(screen.getByRole('button', { name: 'Reset Workbench' }));

    expect(await screen.findByText('Click Start Round to run the opening hook and generate Beat 1.')).toBeInTheDocument();
    expect(screen.getByText('No accepted beats yet.')).toBeInTheDocument();
    expect(screen.queryByText('The operator enters the sealed corridor.')).not.toBeInTheDocument();
    expect(screen.queryByText('The relay clicks and the vent light turns red.')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'The operator leans into the blind spot of the corridor and listens for the surge behind the wall.',
      ),
    ).not.toBeInTheDocument();
    expect(runtimeSessionClient.resetWorkbench).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Start Round' }));

    const firstNewBeatText = `Draft beat 1 for ${storyPackageFixture.phasePlans[0]!.phaseGoal}.`;
    expect(await screen.findAllByText(firstNewBeatText)).toHaveLength(2);
    expect(screen.queryByText('The operator enters the sealed corridor.')).not.toBeInTheDocument();
    expect(screen.queryByText('The relay clicks and the vent light turns red.')).not.toBeInTheDocument();

    const beatHistoryHeading = screen.getAllByRole('heading', { name: 'Beat History' }).at(-1);
    const beatHistorySection = beatHistoryHeading?.closest('section');
    if (!beatHistorySection) {
      throw new Error('Expected Beat History section to exist.');
    }
    expect(within(beatHistorySection).getByText('Beat 1')).toBeInTheDocument();
    expect(within(beatHistorySection).queryByText('Beat 2')).not.toBeInTheDocument();
    expect(within(beatHistorySection).getByText('Opening Hook')).toBeInTheDocument();
  });

  it('surfaces reset write failures and preserves the previous truthful local continuity state', async () => {
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => createPlayAdapterHarness().adapter}
        runtimeSessionClient={createRuntimeSessionClientMock({
          resetWorkbench: vi.fn(async () => {
            throw new Error('Failed to reset runtime workbench: disk write failed');
          }),
        })}
        initialRuntimeSession={createRestorableRuntimeSessionView()}
      />,
    );

    expect(
      await screen.findByText(
        'The operator leans into the blind spot of the corridor and listens for the surge behind the wall.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset Workbench' }));

    expect(
      await screen.findByText('Failed to reset runtime workbench: disk write failed'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The operator leans into the blind spot of the corridor and listens for the surge behind the wall.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Round' })).not.toBeInTheDocument();
  });

  it('surfaces accepted-beat persistence failures and does not append accepted beat history', async () => {
    const harness = createPlayAdapterHarness();
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
        runtimeSessionClient={createRuntimeSessionClientMock({
          recordAcceptedBeat: vi.fn(async () => {
            throw new Error('Failed to persist accepted beat: disk write failed');
          }),
        })}
        initialRuntimeSession={createAwaitingStartRuntimeSessionView()}
      />,
    );

    const startButton = await screen.findByRole('button', { name: 'Start Round' });
    await user.click(startButton);

    expect(
      await screen.findByText('Failed to persist accepted beat: disk write failed'),
    ).toBeInTheDocument();
    expect(screen.getByText('No accepted beats yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Round' })).toBeInTheDocument();
    expect(
      screen.queryByText(`Draft beat 1 for ${storyPackageFixture.phasePlans[0]!.phaseGoal}.`),
    ).not.toBeInTheDocument();
  });

  it('keeps the latest accepted continuity after saving runtime config and continues the active session without rollback', async () => {
    const harness = createPlayAdapterHarness();
    const user = userEvent.setup();
    const recordedAcceptedBeats: RecordAcceptedBeatInput[] = [];

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
        runtimeSessionClient={createRuntimeSessionClientMock({
          ensureActiveSession: vi.fn(async () => ({
            activeSessionId: 'sess_waiting',
          })),
          recordAcceptedBeat: vi.fn(async (payload) => {
            recordedAcceptedBeats.push(payload);
            return {
              activeSessionId: payload.sessionId,
              activeCheckpointId: payload.checkpointId,
            };
          }),
        })}
        initialRuntimeSession={createAwaitingStartRuntimeSessionView()}
      />,
    );

    await startRound(user);
    await user.type(screen.getByLabelText('Free text action'), 'Advance on the control cabinet.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(
      await screen.findByText('Beat 3 ready. Choose an option or write the next action.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Provider Setup/i }));
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    expect(await screen.findByText('Runtime config saved locally.')).toBeInTheDocument();
    expect(
      await screen.findByText('Beat 3 ready. Choose an option or write the next action.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Round' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Free text action'), 'Cut the local power feed.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(
      await screen.findAllByText(`Draft beat 3 for ${storyPackageFixture.phasePlans[0]!.phaseGoal}.`),
    ).toHaveLength(2);
    expect(recordedAcceptedBeats.map((entry) => entry.acceptedBeatOrdinal)).toEqual([1, 2, 3]);
    expect(recordedAcceptedBeats.every((entry) => entry.sessionId === 'sess_waiting')).toBe(true);
    expect(harness.getGeneratedPromptHistory(2)).toEqual([
      { role: 'user', content: storyPackageFixture.sceneSpec.openingHook },
      {
        role: 'assistant',
        content: `Draft beat 1 for ${storyPackageFixture.phasePlans[0]!.phaseGoal}.`,
      },
      { role: 'user', content: 'Advance on the control cabinet.' },
      {
        role: 'assistant',
        content: `Draft beat 2 for ${storyPackageFixture.phasePlans[0]!.phaseGoal}.`,
      },
      { role: 'user', content: 'Cut the local power feed.' },
    ]);
  });

  it('preserves the latest relationship continuity across runtime config save before continuing the active session', async () => {
    const harness = createPlayAdapterHarness();
    const user = userEvent.setup();
    const recordedAcceptedBeats: RecordAcceptedBeatInput[] = [];
    const finalizedRelationshipLayers: FinalizeRelationshipLayerInput[] = [];
    const settledRelationshipLayer = {
      highlightedDeltasText: 'session delta settled',
      stableBackgroundText: 'session background settled',
    };
    const adapterWithGossipelog: LLMAdapter = {
      ...harness.adapter,
      gossipelogUpdate: vi.fn(async () => ({
        involvedRoleIds: [],
        invocationNoOp: false,
        edgeUpdates: [],
      })),
      gossipelogInjection: vi.fn(async () => settledRelationshipLayer),
    };
    const gossipelogCycleRunner = vi.fn(async () => ({
      updateRequest: {} as never,
      updateResult: {
        involvedRoleIds: [],
        invocationNoOp: false,
        edgeUpdates: [],
      },
      injectionRequest: {} as never,
      relationshipLayer: settledRelationshipLayer,
    })) as unknown as GossipelogCycleRunner;

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => adapterWithGossipelog}
        gossipelogCycleRunner={gossipelogCycleRunner}
        runtimeSessionClient={createRuntimeSessionClientMock({
          ensureActiveSession: vi.fn(async () => ({
            activeSessionId: 'sess_waiting',
          })),
          recordAcceptedBeat: vi.fn(async (payload) => {
            recordedAcceptedBeats.push(payload);
            return {
              activeSessionId: payload.sessionId,
              activeCheckpointId: payload.checkpointId,
            };
          }),
          finalizeRelationshipLayer: vi.fn(async (payload) => {
            finalizedRelationshipLayers.push(payload);
            return {
              activeSessionId: payload.sessionId,
              activeCheckpointId: payload.checkpointId,
            };
          }),
        })}
        initialRuntimeSession={createAwaitingStartRuntimeSessionView()}
      />,
    );

    await startRound(user);
    await waitFor(() => {
      expect(finalizedRelationshipLayers).toHaveLength(1);
    });

    expect(recordedAcceptedBeats[0]?.lastStableRelationshipLayer).toEqual({
      highlightedDeltasText: '',
      stableBackgroundText: '',
    });
    expect(finalizedRelationshipLayers[0]?.lastStableRelationshipLayer).toEqual(
      settledRelationshipLayer,
    );

    await user.click(screen.getByRole('button', { name: /Provider Setup/i }));
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    expect(await screen.findByText('Runtime config saved locally.')).toBeInTheDocument();
    expect(
      await screen.findByText('Beat 2 ready. Choose an option or write the next action.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Free text action'), 'Cut the local power feed.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(
      await screen.findAllByText(`Draft beat 2 for ${storyPackageFixture.phasePlans[0]!.phaseGoal}.`),
    ).toHaveLength(2);
    expect(recordedAcceptedBeats[1]?.lastStableRelationshipLayer).toEqual(
      settledRelationshipLayer,
    );
  });

  it('waits for pending relationship continuity settlement before hydrating after runtime config save', async () => {
    const harness = createPlayAdapterHarness();
    const user = userEvent.setup();
    const recordedAcceptedBeats: RecordAcceptedBeatInput[] = [];
    const finalizedRelationshipLayers: FinalizeRelationshipLayerInput[] = [];
    const settledRelationshipLayer = {
      highlightedDeltasText: 'race delta settled',
      stableBackgroundText: 'race background settled',
    };
    let resolveGossipelogCycle!: () => void;
    const pendingGossipelogCycle = new Promise<void>((resolve) => {
      resolveGossipelogCycle = resolve;
    });
    const adapterWithGossipelog: LLMAdapter = {
      ...harness.adapter,
      gossipelogUpdate: vi.fn(async () => ({
        involvedRoleIds: [],
        invocationNoOp: false,
        edgeUpdates: [],
      })),
      gossipelogInjection: vi.fn(async () => settledRelationshipLayer),
    };
    const gossipelogCycleRunner = vi.fn(async () => {
      await pendingGossipelogCycle;

      return {
        updateRequest: {} as never,
        updateResult: {
          involvedRoleIds: [],
          invocationNoOp: false,
          edgeUpdates: [],
        },
        injectionRequest: {} as never,
        relationshipLayer: settledRelationshipLayer,
      };
    }) as unknown as GossipelogCycleRunner;

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => adapterWithGossipelog}
        gossipelogCycleRunner={gossipelogCycleRunner}
        runtimeSessionClient={createRuntimeSessionClientMock({
          ensureActiveSession: vi.fn(async () => ({
            activeSessionId: 'sess_waiting',
          })),
          recordAcceptedBeat: vi.fn(async (payload) => {
            recordedAcceptedBeats.push(payload);
            return {
              activeSessionId: payload.sessionId,
              activeCheckpointId: payload.checkpointId,
            };
          }),
          finalizeRelationshipLayer: vi.fn(async (payload) => {
            finalizedRelationshipLayers.push(payload);
            return {
              activeSessionId: payload.sessionId,
              activeCheckpointId: payload.checkpointId,
            };
          }),
        })}
        initialRuntimeSession={createAwaitingStartRuntimeSessionView()}
      />,
    );

    await startRound(user);
    expect(recordedAcceptedBeats[0]?.lastStableRelationshipLayer).toEqual({
      highlightedDeltasText: '',
      stableBackgroundText: '',
    });

    await user.click(screen.getByRole('button', { name: /Provider Setup/i }));
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    resolveGossipelogCycle();

    await waitFor(() => {
      expect(finalizedRelationshipLayers).toHaveLength(1);
    });
    expect(await screen.findByText('Runtime config saved locally.')).toBeInTheDocument();
    expect(
      await screen.findByText('Beat 2 ready. Choose an option or write the next action.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Free text action'), 'Advance after the save race.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(
      await screen.findAllByText(`Draft beat 2 for ${storyPackageFixture.phasePlans[0]!.phaseGoal}.`),
    ).toHaveLength(2);
    expect(recordedAcceptedBeats[1]?.lastStableRelationshipLayer).toEqual(
      settledRelationshipLayer,
    );
  });

  it('locks submission immediately when runtime config save starts a rebuild with pending relationship settlement', async () => {
    const harness = createPlayAdapterHarness();
    const user = userEvent.setup();
    const recordedAcceptedBeats: RecordAcceptedBeatInput[] = [];
    let resolveGossipelogCycle!: () => void;
    const pendingGossipelogCycle = new Promise<void>((resolve) => {
      resolveGossipelogCycle = resolve;
    });
    const adapterWithGossipelog: LLMAdapter = {
      ...harness.adapter,
      gossipelogUpdate: vi.fn(async () => ({
        involvedRoleIds: [],
        invocationNoOp: false,
        edgeUpdates: [],
      })),
      gossipelogInjection: vi.fn(async () => ({
        highlightedDeltasText: 'lock delta settled',
        stableBackgroundText: 'lock background settled',
      })),
    };
    const gossipelogCycleRunner = vi.fn(async () => {
      await pendingGossipelogCycle;

      return {
        updateRequest: {} as never,
        updateResult: {
          involvedRoleIds: [],
          invocationNoOp: false,
          edgeUpdates: [],
        },
        injectionRequest: {} as never,
        relationshipLayer: {
          highlightedDeltasText: 'lock delta settled',
          stableBackgroundText: 'lock background settled',
        },
      };
    }) as unknown as GossipelogCycleRunner;

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => adapterWithGossipelog}
        gossipelogCycleRunner={gossipelogCycleRunner}
        runtimeSessionClient={createRuntimeSessionClientMock({
          ensureActiveSession: vi.fn(async () => ({
            activeSessionId: 'sess_waiting',
          })),
          recordAcceptedBeat: vi.fn(async (payload) => {
            recordedAcceptedBeats.push(payload);
            return {
              activeSessionId: payload.sessionId,
              activeCheckpointId: payload.checkpointId,
            };
          }),
        })}
        initialRuntimeSession={createAwaitingStartRuntimeSessionView()}
      />,
    );

    await startRound(user);
    expect(recordedAcceptedBeats).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /Provider Setup/i }));
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    expect(screen.getByRole('button', { name: 'Submit Action' })).toBeDisabled();
    expect(screen.getByLabelText('Free text action')).toBeDisabled();
    expect(recordedAcceptedBeats).toHaveLength(1);

    resolveGossipelogCycle();
    await screen.findByText('Runtime config saved locally.');
  });

  it('shows generating and auditing statuses before accepting a beat', async () => {
    const harness = createPlayAdapterHarness({ delayMs: 40 });
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    await startRound(user);
    await user.type(screen.getByLabelText('Free text action'), 'Advance into the corridor.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(await screen.findByText('Generating...')).toBeInTheDocument();
    expect(await screen.findByText('Auditing...')).toBeInTheDocument();
    expect(await screen.findByText('Accepted')).toBeInTheDocument();
    expect(
      await screen.findAllByText(`Draft beat 2 for ${storyPackageFixture.phasePlans[0]!.phaseGoal}.`),
    ).toHaveLength(2);
  });

  it('displays rewrite feedback when an audit failure triggers a retry', async () => {
    const harness = createPlayAdapterHarness({ auditMode: 'fail-once' });
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    await startRound(user, { waitForAccepted: false });

    expect(await screen.findByText('Rewriting...')).toBeInTheDocument();
    expect(await screen.findByText(/Blocking audit failures detected\./)).toBeInTheDocument();
    expect(
      await screen.findAllByText(
        `Rewritten beat 2 for ${storyPackageFixture.phasePlans[0]!.phaseGoal}.`,
      ),
    ).toHaveLength(2);
  });

  it('shows a force-accept warning when retries are exhausted', async () => {
    const harness = createPlayAdapterHarness({ auditMode: 'fail-always' });
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    await startRound(user);

    expect(await screen.findByText('Force accepted after retry limit')).toBeInTheDocument();
    await waitFor(() => {
      expect(harness.getGenerateCount()).toBe(4);
    });
  });

  it('skips auditing status and accepts directly when no audit question is selected', async () => {
    const harness = createPlayAdapterHarness({ delayMs: 40, failOnAuditCall: true });
    const user = userEvent.setup();
    const storyPackageWithoutSelectedQuestions = {
      ...storyPackageFixture,
      auditQuestionSet: {
        ...storyPackageFixture.auditQuestionSet,
        selectionPolicy: {
          default: [],
        },
      },
    };

    render(
      <PlayWorkbench
        storyPackage={storyPackageWithoutSelectedQuestions}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    await startRound(user);
    await user.type(screen.getByLabelText('Free text action'), 'Move fast without audit.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(await screen.findByText('Generating...')).toBeInTheDocument();
    expect(await screen.findByText('Accepted')).toBeInTheDocument();
    expect(screen.queryByText('Auditing...')).not.toBeInTheDocument();
    expect(harness.getAuditCount()).toBe(0);
  });

  it('reads the runtime config saved through the shared form path', async () => {
    const user = userEvent.setup();
    const harness = createPlayAdapterHarness();
    const { unmount } = render(<RuntimeConfigForm onSave={() => {}} />);

    await user.type(screen.getByLabelText('API Key'), 'shared-runtime-key');
    await user.selectOptions(screen.getByLabelText('Model'), 'claude-haiku-4-20250414');
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    unmount();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        adapterFactory={() => harness.adapter}
      />,
    );

    expect(await screen.findByText('Configured provider')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('API Key')).toHaveValue('shared-runtime-key');
      expect(screen.getByLabelText('Model')).toHaveValue('claude-haiku-4-20250414');
    });
  });

  it('submits player input and advances to the next beat', async () => {
    const harness = createPlayAdapterHarness();
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    await startRound(user);
    await user.type(screen.getByLabelText('Free text action'), 'Cut the local power feed.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(
      await screen.findAllByText(`Draft beat 2 for ${storyPackageFixture.phasePlans[0]!.phaseGoal}.`),
    ).toHaveLength(2);
    expect(
      screen.getByText('Beat 3 ready. Choose an option or write the next action.'),
    ).toBeInTheDocument();
  });

  it('toggles the fixture reference drawer and shows runtime diagnostics', async () => {
    const harness = createPlayAdapterHarness();
    const user = userEvent.setup();

    render(
      <PlayWorkbench
        storyPackage={storyPackageFixture}
        storyPackageName="sample-scene"
        initialConfig={adapterConfigFixture}
        adapterFactory={() => harness.adapter}
      />,
    );

    await screen.findByText('Click Start Round to run the opening hook and generate Beat 1.');

    expect(screen.queryByText('Fixture Reference')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show Fixture Reference' }));
    expect(screen.getByText('Fixture Reference')).toBeInTheDocument();
    expect(screen.getByText(storyPackageFixture.worldBase.hero.name)).toBeInTheDocument();
    expect(screen.getByText(storyPackageFixture.worldBase.coreCast[0]!.name)).toBeInTheDocument();
    expect(screen.getByText(storyPackageFixture.worldBase.antagonists[0]!.name)).toBeInTheDocument();
    expect(screen.getByText(storyPackageFixture.worldBase.locationPatch)).toBeInTheDocument();

    const providerSetupButton = screen.getByRole('button', { name: /Provider Setup/i });
    await user.click(providerSetupButton);
    expect(screen.getByText('88 tokens')).toBeInTheDocument();

    await startRound(user);
    await user.type(screen.getByLabelText('Free text action'), 'Inspect the relay cabinet.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(await screen.findByText('232 tokens')).toBeInTheDocument();
    expect(await screen.findByText('86 tokens')).toBeInTheDocument();
    expect(await screen.findByText('112 tokens')).toBeInTheDocument();
    expect(screen.getAllByText(/Latest: Route/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Hide Fixture Reference' }));
    expect(screen.queryByText('Fixture Reference')).not.toBeInTheDocument();
  });
});
