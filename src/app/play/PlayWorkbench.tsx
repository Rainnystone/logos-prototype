'use client';

import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

import { loadAdapterConfig } from '@/app/runtime-config';
import { AuthorControlPanel } from '@/app/components/AuthorControlPanel';
import { BeatDisplay } from '@/app/components/BeatDisplay';
import { BeatHistory, type BeatHistoryEntry } from '@/app/components/BeatHistory';
import { CollapsiblePanel } from '@/app/components/CollapsiblePanel';
import { ConfigPanel } from '@/app/components/ConfigPanel';
import { FixtureReferencePanel } from '@/app/components/FixtureReferencePanel';
import { PlayerInput } from '@/app/components/PlayerInput';
import { PromptStatusPanel } from '@/app/components/PromptStatusPanel';
import { StateInspector } from '@/app/components/StateInspector';
import {
  buildOrchestratorRestoreInput,
  createBrowserRuntimeSessionClient,
  createEmptyWorkbenchDiagnostics,
  createBrowserGossipelogCycleRunner,
  createTrackedWorkbenchAdapter,
  createWorkbenchAdapter,
  getRestoreCompatibilityError,
  getActivePhasePlan,
  getGradientSequence,
  getReadyMessage,
  shouldUseServerGossipelogBridge,
  type BrowserRuntimeSessionClient,
  type WorkbenchDiagnostics,
  type WorkbenchStatus,
} from '@/app/play/runtime';
import type { GossipelogCycleRunner } from '@/agents/gossipelog/contracts';
import {
  createOrchestrator,
  type Orchestrator,
  type RuntimeSessionStore,
} from '@/engine/orchestrator';
import type { AdapterConfig } from '@/engine/api-adapter/providers/provider-interface';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import {
  PLAY_RUNTIME_CONTINUITY_UNAVAILABLE_REASON,
} from '@/runtime-sessions/copy';
import type { PlayRuntimeSessionView } from '@/runtime-sessions/views';
import type { StateSnapshot, StoryPackage } from '@/types';

interface PlayWorkbenchProps {
  readonly storyPackage: StoryPackage;
  readonly storyPackageName: string;
  readonly initialRuntimeSession?: PlayRuntimeSessionView;
  readonly initialConfig?: AdapterConfig | null;
  readonly adapterFactory?: (
    config: AdapterConfig | null,
    storyPackage: StoryPackage,
  ) => LLMAdapter;
  readonly gossipelogCycleRunner?: GossipelogCycleRunner;
  readonly runtimeSessionClient?: BrowserRuntimeSessionClient;
}

interface PendingRelationshipSync {
  readonly promise: Promise<void>;
  resolve(): void;
  finalizeQueued: boolean;
  settled: boolean;
}

interface GossipelogBootstrapResponse {
  readonly status?: string;
  readonly bootstrapStatus?: string;
  readonly error?: string;
}

const EMPTY_RELATIONSHIP_SUMMARY: PlayRuntimeSessionView['relationshipSummary'] = {
  highlightedDeltasText: '',
  stableBackgroundText: '',
  source: 'empty',
};

function createPendingRelationshipSync(): PendingRelationshipSync {
  let resolve!: () => void;

  return {
    promise: new Promise<void>((settle) => {
      resolve = settle;
    }),
    resolve,
    finalizeQueued: false,
    settled: false,
  };
}

function hasRelationshipContent(layer: {
  readonly highlightedDeltasText: string;
  readonly stableBackgroundText: string;
}): boolean {
  return (
    layer.highlightedDeltasText.trim().length > 0 || layer.stableBackgroundText.trim().length > 0
  );
}

function buildRelationshipSummary(
  layer: {
    readonly highlightedDeltasText: string;
    readonly stableBackgroundText: string;
  },
  source: 'checkpoint' | 'session',
): PlayRuntimeSessionView['relationshipSummary'] {
  if (!hasRelationshipContent(layer)) {
    return EMPTY_RELATIONSHIP_SUMMARY;
  }

  return {
    highlightedDeltasText: layer.highlightedDeltasText,
    stableBackgroundText: layer.stableBackgroundText,
    source,
  };
}

function buildUpdatedRuntimeSessionView(
  currentView: PlayRuntimeSessionView | undefined,
  payload: Parameters<BrowserRuntimeSessionClient['recordAcceptedBeat']>[0],
  result: Awaited<ReturnType<BrowserRuntimeSessionClient['recordAcceptedBeat']>>,
): PlayRuntimeSessionView {
  const preservedBeatHistory =
    currentView?.kind === 'unavailable'
      ? []
      : (currentView?.beatHistory ?? []).filter(
          (entry) => entry.beatNumber < payload.acceptedBeatOrdinal,
        );

  return {
    kind: 'restorable',
    activeSessionId: result.activeSessionId,
    activeCheckpointId: result.activeCheckpointId,
    beatHistory: [
      ...preservedBeatHistory,
      {
        beatNumber: payload.acceptedBeatOrdinal,
        playerInput: payload.acceptedTranscript.playerInput,
        beatText: payload.acceptedTranscript.beatText,
      },
    ],
    stateSnapshot: payload.stateSnapshot,
    relationshipSummary: buildRelationshipSummary(
      payload.lastStableRelationshipLayer,
      currentView?.relationshipSummary.source === 'session' ? 'session' : 'checkpoint',
    ),
    lifecycle: payload.lifecycle,
  };
}

function buildFinalizedRuntimeSessionView(
  currentView: PlayRuntimeSessionView | undefined,
  payload: Parameters<BrowserRuntimeSessionClient['finalizeRelationshipLayer']>[0],
): PlayRuntimeSessionView | undefined {
  if (
    !currentView ||
    currentView.kind === 'unavailable' ||
    currentView.activeSessionId !== payload.sessionId ||
    currentView.activeCheckpointId !== payload.checkpointId
  ) {
    return currentView;
  }

  return {
    ...currentView,
    relationshipSummary: buildRelationshipSummary(
      payload.lastStableRelationshipLayer,
      'session',
    ),
  };
}

function isViewportNearBottom(thresholdPx = 48): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return true;
  }

  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - thresholdPx;
}

function scheduleAnchorScroll(anchor: React.RefObject<HTMLDivElement | null>) {
  if (typeof anchor.current?.scrollIntoView === 'function') {
    anchor.current.scrollIntoView({ block: 'end' });
  }
}

async function bootstrapGossipelogBeforePlayInitialization(input: {
  readonly storyPackageName: string;
  readonly adapterConfig: AdapterConfig | null;
}): Promise<GossipelogBootstrapResponse | null> {
  if (!input.adapterConfig) {
    return null;
  }

  try {
    const response = await fetch('/api/play/gossipelog/bootstrap', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        storyPackageName: input.storyPackageName,
        adapterConfig: input.adapterConfig,
      }),
    });

    const responseBody = (await response.json().catch(() => null)) as GossipelogBootstrapResponse | null;

    return response.ok ? responseBody : null;
  } catch {
    return null;
  }
}

export function PlayWorkbench({
  storyPackage,
  storyPackageName,
  initialRuntimeSession,
  initialConfig = null,
  adapterFactory,
  gossipelogCycleRunner,
  runtimeSessionClient,
}: PlayWorkbenchProps) {
  const continuityUnavailableMessage = PLAY_RUNTIME_CONTINUITY_UNAVAILABLE_REASON;
  const orchestratorRef = useRef<Orchestrator | null>(null);
  const runtimeSessionViewRef = useRef<PlayRuntimeSessionView | undefined>(initialRuntimeSession);
  const pendingRelationshipSyncsRef = useRef<Set<PendingRelationshipSync>>(new Set());
  const relationshipSyncFinalizeQueueRef = useRef<PendingRelationshipSync[]>([]);
  const activeRelationshipSyncRef = useRef<PendingRelationshipSync | null>(null);
  const currentStateRef = useRef<StateSnapshot | null>(null);
  const streamAnchorRef = useRef<HTMLDivElement | null>(null);
  const optionsAnchorRef = useRef<HTMLDivElement | null>(null);
  const shouldFollowStreamRef = useRef(true);
  const pendingOptionsFollowRef = useRef(false);
  const [adapterConfig, setAdapterConfig] = useState<AdapterConfig | null>(initialConfig);
  const [bootstrapped, setBootstrapped] = useState(initialConfig !== null);
  const [runtimeSessionView, setRuntimeSessionView] = useState<PlayRuntimeSessionView | undefined>(
    initialRuntimeSession,
  );
  const [status, setStatus] = useState<WorkbenchStatus>('initializing');
  const [runtimeSource, setRuntimeSource] = useState<string>('Loading runtime config');
  const [currentState, setCurrentState] = useState<StateSnapshot | null>(null);
  const [beatHistory, setBeatHistory] = useState<readonly BeatHistoryEntry[]>([]);
  const [roundStarted, setRoundStarted] = useState(false);
  const [rewriteFeedback, setRewriteFeedback] = useState<string | null>(null);
  const [forceAccepted, setForceAccepted] = useState(false);
  const [fixtureReferenceOpen, setFixtureReferenceOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<WorkbenchDiagnostics>(
    createEmptyWorkbenchDiagnostics(),
  );
  const [error, setError] = useState<string | null>(null);
  const [streamingBeatText, setStreamingBeatText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isRelationshipSyncPending, setIsRelationshipSyncPending] = useState(false);
  const [isHydratingWorkbench, setIsHydratingWorkbench] = useState(false);
  const currentOptions = currentState?.generationState.currentOptions ?? [];
  const displayedBeatText =
    streamingBeatText || (currentState?.generationState.currentBeatText ?? null);
  const displayedOptions =
    status === 'generating' || status === 'auditing' || status === 'rewriting'
      ? []
      : currentOptions;

  const resolvedRuntimeSessionClient = useMemo(
    () =>
      runtimeSessionClient ??
      (initialRuntimeSession !== undefined
        ? createBrowserRuntimeSessionClient({
            storyPackageName,
          })
        : null),
    [initialRuntimeSession, runtimeSessionClient, storyPackageName],
  );

  function settlePendingRelationshipSync(sync: PendingRelationshipSync | undefined) {
    if (!sync || sync.settled) {
      return;
    }

    sync.settled = true;
    pendingRelationshipSyncsRef.current.delete(sync);
    relationshipSyncFinalizeQueueRef.current = relationshipSyncFinalizeQueueRef.current.filter(
      (candidate) => candidate !== sync,
    );
    if (activeRelationshipSyncRef.current === sync) {
      activeRelationshipSyncRef.current = null;
      setIsRelationshipSyncPending(false);
    }
    sync.resolve();
  }

  const resolvedRuntimeSessionStore = useMemo<RuntimeSessionStore | null>(
    () =>
      resolvedRuntimeSessionClient
        ? {
            ensureActiveSession: async () => resolvedRuntimeSessionClient.ensureActiveSession(),
            recordAcceptedBeat: async (input) => {
              const result = await resolvedRuntimeSessionClient.recordAcceptedBeat(input);
              runtimeSessionViewRef.current = buildUpdatedRuntimeSessionView(
                runtimeSessionViewRef.current,
                input,
                result,
              );
            },
            finalizeRelationshipLayer: async (input) => {
              const sync = relationshipSyncFinalizeQueueRef.current.shift();

              try {
                await resolvedRuntimeSessionClient.finalizeRelationshipLayer(input);
                runtimeSessionViewRef.current = buildFinalizedRuntimeSessionView(
                  runtimeSessionViewRef.current,
                  input,
                );
              } finally {
                settlePendingRelationshipSync(sync);
              }
            },
          }
        : null,
    [resolvedRuntimeSessionClient],
  );

  useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

  useEffect(() => {
    runtimeSessionViewRef.current = initialRuntimeSession;
    setRuntimeSessionView(initialRuntimeSession);
  }, [initialRuntimeSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateScrollFollowState = () => {
      shouldFollowStreamRef.current = isViewportNearBottom();
    };

    updateScrollFollowState();
    window.addEventListener('scroll', updateScrollFollowState, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollFollowState);
    };
  }, []);

  useEffect(() => {
    const hasRenderableOptions = displayedOptions.length > 0;
    const accepted =
      status === 'accepted' || status === 'force-accepted';

    if (!pendingOptionsFollowRef.current || !accepted || !hasRenderableOptions) {
      return;
    }

    pendingOptionsFollowRef.current = false;

    if (shouldFollowStreamRef.current) {
      scheduleAnchorScroll(optionsAnchorRef);
    }
  }, [displayedOptions.length, status]);

  useEffect(() => {
    if (initialConfig !== null) {
      setBootstrapped(true);
      return;
    }

    const storedConfig = loadAdapterConfig();

    if (storedConfig) {
      setAdapterConfig(storedConfig);
    }

    setBootstrapped(true);
  }, [initialConfig]);

  useEffect(() => {
    if (!bootstrapped) {
      return;
    }

    let cancelled = false;

    async function initializeWorkbench() {
      const shouldPreserveVisibleSurface =
        currentStateRef.current !== null && runtimeSessionViewRef.current?.kind === 'restorable';
      const pendingRelationshipSyncs = Array.from(pendingRelationshipSyncsRef.current).map(
        (sync) => sync.promise,
      );
      setIsHydratingWorkbench(shouldPreserveVisibleSurface);

      if (!shouldPreserveVisibleSurface) {
        setStatus('initializing');
      }

      try {
        if (pendingRelationshipSyncs.length > 0) {
          await Promise.allSettled(pendingRelationshipSyncs);
        }

        if (cancelled) {
          return;
        }

        const continuityView = runtimeSessionViewRef.current;

        orchestratorRef.current = null;
        setRewriteFeedback(null);
        setForceAccepted(false);
        setError(null);
        setStreamingBeatText('');
        if (!shouldPreserveVisibleSurface) {
          setBeatHistory(continuityView?.beatHistory ?? []);
          setRoundStarted(false);
          setDiagnostics(createEmptyWorkbenchDiagnostics());
          currentStateRef.current = null;
          setCurrentState(null);
        }

        const nextRuntimeSource = adapterConfig ? 'Configured provider' : 'Local demo adapter';
        const restoreCompatibilityError = getRestoreCompatibilityError(
          storyPackage,
          continuityView,
        );

        if (continuityView?.kind === 'unavailable') {
          if (cancelled) {
            return;
          }

          setRuntimeSource(nextRuntimeSource);
          setError(continuityUnavailableMessage);
          setStatus('error');
          return;
        }

        if (restoreCompatibilityError) {
          if (cancelled) {
            return;
          }

          setRuntimeSource(nextRuntimeSource);
          setError(restoreCompatibilityError);
          setStatus('error');
          return;
        }

        if (adapterConfig) {
          await bootstrapGossipelogBeforePlayInitialization({
            storyPackageName,
            adapterConfig,
          });

          if (cancelled) {
            return;
          }
        }

        const baseAdapter = (adapterFactory ?? createWorkbenchAdapter)(adapterConfig, storyPackage);
        const trackedAdapter = createTrackedWorkbenchAdapter(
          baseAdapter,
          storyPackage.auditQuestionSet,
          {
            onStatusChange(nextStatus) {
              if (!cancelled) {
                setStatus(nextStatus);
              }
            },
            onRewriteFeedback(feedback) {
              if (!cancelled) {
                setRewriteFeedback(feedback);
              }
            },
            onUsage(operation, usage) {
              if (!cancelled) {
                setDiagnostics((currentDiagnostics) => ({
                  latestOperation: operation,
                  usage: {
                    ...currentDiagnostics.usage,
                    [operation]: usage,
                  },
                }));
              }
            },
          },
        );
        const resolvedGossipelogCycleRunner =
          gossipelogCycleRunner ??
          (shouldUseServerGossipelogBridge(trackedAdapter)
            ? createBrowserGossipelogCycleRunner({
                adapterConfig,
              })
            : undefined);
        const trackedGossipelogCycleRunner = resolvedGossipelogCycleRunner
          ? async (...args: Parameters<GossipelogCycleRunner>) => {
              const sync = createPendingRelationshipSync();
              pendingRelationshipSyncsRef.current.add(sync);
              activeRelationshipSyncRef.current = sync;
              setIsRelationshipSyncPending(true);

              try {
                const result = await resolvedGossipelogCycleRunner(...args);

                if (resolvedRuntimeSessionStore) {
                  sync.finalizeQueued = true;
                  relationshipSyncFinalizeQueueRef.current.push(sync);
                }

                return result;
              } catch (error) {
                settlePendingRelationshipSync(sync);
                throw error;
              } finally {
                if (!sync.finalizeQueued) {
                  settlePendingRelationshipSync(sync);
                }
              }
            }
          : undefined;
        const orchestrator = createOrchestrator({
          adapter: trackedAdapter,
          storyPackageName,
          storyPackage,
          ...(resolvedRuntimeSessionStore
            ? { runtimeSessionStore: resolvedRuntimeSessionStore }
            : {}),
          ...(trackedGossipelogCycleRunner
            ? { gossipelogCycleRunner: trackedGossipelogCycleRunner }
            : {}),
        });
        const initialState =
          continuityView?.kind === 'restorable'
            ? await orchestrator.hydrateScene(
                buildOrchestratorRestoreInput(continuityView),
              )
            : await orchestrator.initScene();

        if (cancelled) {
          return;
        }

        orchestratorRef.current = orchestrator;
        currentStateRef.current = initialState;
        setCurrentState(initialState);
        setBeatHistory(continuityView?.beatHistory ?? []);
        setRoundStarted(continuityView?.kind === 'restorable');
        setRuntimeSource(nextRuntimeSource);
        setStatus(continuityView?.kind === 'restorable' ? 'accepted' : 'idle');
      } catch (initializationError) {
        if (cancelled) {
          return;
        }

        setError(
          initializationError instanceof Error
            ? initializationError.message
            : 'Failed to initialize the workbench.',
        );
        setStatus('error');
      } finally {
        if (!cancelled) {
          setIsHydratingWorkbench(false);
        }
      }
    }

    void initializeWorkbench();

    return () => {
      cancelled = true;
    };
  }, [
    adapterConfig,
    adapterFactory,
    bootstrapped,
    continuityUnavailableMessage,
    gossipelogCycleRunner,
    resolvedRuntimeSessionClient,
    resolvedRuntimeSessionStore,
    runtimeSessionView,
    storyPackage,
    storyPackageName,
  ]);

  const currentPhasePlan = useMemo(() => {
    if (!currentState) {
      return storyPackage.phasePlans[0] ?? null;
    }

    return getActivePhasePlan(storyPackage, currentState.sceneState.currentPhaseIndex);
  }, [currentState, storyPackage]);

  const gradientSequence = useMemo(() => {
    if (!currentState) {
      return storyPackage.phasePlans[0] ? getGradientSequence(storyPackage, 1) : [];
    }

    return getGradientSequence(storyPackage, currentState.sceneState.currentPhaseIndex);
  }, [currentState, storyPackage]);

  const openingHookInput = useMemo(() => {
    const hook = storyPackage.sceneSpec.openingHook?.trim();

    if (hook && hook.length > 0) {
      return hook;
    }

    return `Opening hook fallback: ${storyPackage.sceneSpec.mainAxis}`;
  }, [storyPackage.sceneSpec.mainAxis, storyPackage.sceneSpec.openingHook]);

  const isInputLoading =
    status === 'initializing' ||
    status === 'generating' ||
    status === 'auditing' ||
    status === 'rewriting' ||
    isRelationshipSyncPending ||
    isHydratingWorkbench;
  const sceneComplete = orchestratorRef.current?.isSceneComplete() ?? false;
  const continuityUnavailable = runtimeSessionView?.kind === 'unavailable';

  const readyMessage = currentState
    ? roundStarted
      ? getReadyMessage(
          currentState.sceneState.currentBeatIndexInPhase,
          sceneComplete,
        )
      : 'Click Start Round to run the opening hook and generate Beat 1.'
    : continuityUnavailable
      ? continuityUnavailableMessage
      : 'Initializing Scene...';

  const gameViewSummary = currentState
    ? `Phase ${currentState.sceneState.currentPhaseIndex} · Beat ${currentState.sceneState.currentBeatIndexInPhase} / 4`
    : 'Scene bootstrap pending';

  async function runRound(playerInput: string, historyLabel = playerInput): Promise<boolean> {
    if (!orchestratorRef.current) {
      return false;
    }

    shouldFollowStreamRef.current = isViewportNearBottom();
    setError(null);
    setRewriteFeedback(null);
    setForceAccepted(false);
    setStreamingBeatText('');
    pendingOptionsFollowRef.current = false;
    setStatus('generating');

    try {
      const { beatResult, state } = await orchestratorRef.current.runBeat(playerInput, {
        onBeatTextDelta(delta) {
          setStreamingBeatText((currentText) => currentText + delta);

          if (shouldFollowStreamRef.current) {
            scheduleAnchorScroll(streamAnchorRef);
          }
        },
      });

      startTransition(() => {
        setStreamingBeatText('');
        setCurrentState(state);
        setBeatHistory((currentHistory) => [
          ...currentHistory,
          {
            beatNumber: currentHistory.length + 1,
            playerInput: historyLabel,
            beatText: beatResult.beatText,
          },
        ]);
        setForceAccepted(beatResult.forceAccepted);
        setStatus(beatResult.forceAccepted ? 'force-accepted' : 'accepted');
      });
      pendingOptionsFollowRef.current = shouldFollowStreamRef.current;
      return true;
    } catch (runError) {
      pendingOptionsFollowRef.current = false;
      setStreamingBeatText('');
      setError(runError instanceof Error ? runError.message : 'Failed to run the next beat.');
      setStatus('error');
      return false;
    }
  }

  async function handleStartRound() {
    if (roundStarted || isInputLoading) {
      return;
    }

    const started = await runRound(openingHookInput, 'Opening Hook');

    if (started) {
      setRoundStarted(true);
    }
  }

  async function handleSubmit(playerInput: string) {
    if (!roundStarted || sceneComplete) {
      return;
    }

    await runRound(playerInput);
  }

  async function handleResetWorkbench() {
    if (!resolvedRuntimeSessionClient) {
      return;
    }

    setError(null);
    setIsResetting(true);

    try {
      const result = await resolvedRuntimeSessionClient.resetWorkbench();

      const resetView: PlayRuntimeSessionView = {
        kind: 'awaiting_start',
        activeSessionId: result.activeSessionId,
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

      runtimeSessionViewRef.current = resetView;
      setRuntimeSessionView(resetView);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'Failed to reset runtime workbench.',
      );
      setStatus('error');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main className="play-page">
      <AuthorControlPanel
        storyPackage={storyPackage}
        currentPhaseIndex={currentState?.sceneState.currentPhaseIndex ?? 1}
        metaItems={[storyPackageName, runtimeSource]}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            {resolvedRuntimeSessionClient ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-none bg-white border-2 border-black px-4 py-2 text-sm font-bold text-black font-mono uppercase hover:bg-[#ff4d4d] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleResetWorkbench}
                disabled={isInputLoading || isResetting}
              >
                {isResetting ? 'Resetting...' : 'Reset Workbench'}
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-none bg-black border-2 border-black px-4 py-2 text-sm font-bold text-white font-mono uppercase hover:bg-[#00ff00] hover:text-black transition-colors"
              onClick={() => setFixtureReferenceOpen((current) => !current)}
            >
              {fixtureReferenceOpen ? 'Hide Fixture Reference' : 'Show Fixture Reference'}
            </button>
          </div>
        }
      />

      {fixtureReferenceOpen ? (
        <FixtureReferencePanel storyPackage={storyPackage} storyPackageName={storyPackageName} />
      ) : null}

      <section className="play-grid">
        <div className="play-column play-column--sidebar">
          <CollapsiblePanel title="Provider Setup" eyebrow="Runtime Config" defaultOpen={!adapterConfig}>
            <div className="p-4">
              <ConfigPanel
                initialConfig={adapterConfig}
                diagnostics={diagnostics}
                onSave={setAdapterConfig}
              />
            </div>
          </CollapsiblePanel>
          <CollapsiblePanel title="Prompt Status" eyebrow="Prompt Assembly">
            <div className="p-4">
              <PromptStatusPanel state={currentState} diagnostics={diagnostics} />
            </div>
          </CollapsiblePanel>
        </div>

        <div className="play-column">
          <section className="bg-white border-2 border-black rounded-none shadow-brutal overflow-hidden flex flex-col font-mono">
            <div className="px-5 py-4 border-b-2 border-black flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-black/50 mb-0.5">Generation Workspace</p>
                <h2 className="text-base font-bold text-black tracking-tight uppercase">{currentPhasePlan ? `Phase ${currentPhasePlan.phaseIndex}` : 'Scene'}</h2>
              </div>
              <div className="flex items-center gap-3">
                {roundStarted ? (
                  <>
                    <span className="px-2 py-1 border border-black bg-[#f5f5f5] text-[10px] uppercase font-bold">
                      {status === 'accepted' || status === 'force-accepted' ? 'Live' : 'Processing'}
                    </span>
                    <span className="px-2 py-1 border border-black bg-[#f5f5f5] text-[10px] uppercase font-bold">
                      Beat {currentState?.sceneState.currentBeatIndexInPhase ?? '-'}
                    </span>
                  </>
                ) : null}
              </div>
              <p className="text-xs text-black/40 max-w-xs text-right">{readyMessage}</p>
            </div>
            {!roundStarted && currentState ? (
              <section className="p-5 m-4 border-2 border-dashed border-black rounded-none bg-[#f5f5f5] flex flex-col gap-3">
                <p className="text-sm text-black/60">
                  Start the round with the scene opening hook before accepting player actions.
                </p>
                <blockquote className="pl-4 py-2 border-l-4 border-black bg-white rounded-none max-h-40 overflow-y-auto">
                  <p className="font-mono text-black italic text-sm">{openingHookInput}</p>
                </blockquote>
                <button
                  className="bg-[#00ff00] hover:bg-[#00cc00] text-black font-bold px-4 py-2 rounded-none border-2 border-black transition-colors self-start disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase"
                  type="button"
                  onClick={handleStartRound}
                  disabled={isInputLoading || isResetting}
                >
                  Start Round
                </button>
              </section>
            ) : null}
          </section>
          <BeatDisplay
            status={status}
            beatText={displayedBeatText}
            rewriteFeedback={rewriteFeedback}
            forceAccepted={forceAccepted}
            error={error}
            summary={gameViewSummary}
          >
            <>
              <div ref={streamAnchorRef} aria-hidden="true" />
              <PlayerInput
                options={displayedOptions}
                isLoading={isInputLoading || isResetting}
                disabled={!roundStarted || sceneComplete || isResetting}
                variant="embedded"
                onSubmit={handleSubmit}
              />
              <div ref={optionsAnchorRef} aria-hidden="true" />
            </>
          </BeatDisplay>
        </div>

        <div className="play-column play-column--feedback">
          {currentState ? (
            <StateInspector
              state={currentState}
              gradientSequence={gradientSequence}
              totalPhases={storyPackage.phasePlans.length}
            />
          ) : (
            <aside className="bg-black border-2 border-black p-5 shadow-brutal font-mono text-white text-sm break-words">
              <div className="border-b-2 border-white/20 pb-4 mb-4">
                <p className="text-[10px] tracking-widest uppercase text-[#00ff00] mb-1">[ Narrative State Dashboard ]</p>
                <h2 className="text-lg font-bold text-white tracking-tight">State Inspector</h2>
              </div>
              <p>Initializing Scene...</p>
            </aside>
          )}
          <CollapsiblePanel title="Beat History" eyebrow="Accepted Beats" defaultOpen>
            <div className="max-h-96 overflow-y-auto">
              <BeatHistory entries={beatHistory} />
            </div>
          </CollapsiblePanel>
        </div>
      </section>
    </main>
  );
}
