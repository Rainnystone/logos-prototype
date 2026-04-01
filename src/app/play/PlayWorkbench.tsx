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
  createEmptyWorkbenchDiagnostics,
  createTrackedWorkbenchAdapter,
  createWorkbenchAdapter,
  getActivePhasePlan,
  getGradientSequence,
  getReadyMessage,
  type WorkbenchDiagnostics,
  type WorkbenchStatus,
} from '@/app/play/runtime';
import { createOrchestrator, type Orchestrator } from '@/engine/orchestrator';
import type { AdapterConfig } from '@/engine/api-adapter/providers/provider-interface';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import type { StateSnapshot, StoryPackage } from '@/types';

interface PlayWorkbenchProps {
  readonly storyPackage: StoryPackage;
  readonly storyPackageName: string;
  readonly initialConfig?: AdapterConfig | null;
  readonly adapterFactory?: (
    config: AdapterConfig | null,
    storyPackage: StoryPackage,
  ) => LLMAdapter;
}

export function PlayWorkbench({
  storyPackage,
  storyPackageName,
  initialConfig = null,
  adapterFactory,
}: PlayWorkbenchProps) {
  const orchestratorRef = useRef<Orchestrator | null>(null);
  const [adapterConfig, setAdapterConfig] = useState<AdapterConfig | null>(initialConfig);
  const [bootstrapped, setBootstrapped] = useState(initialConfig !== null);
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
      setStatus('initializing');
      setRewriteFeedback(null);
      setForceAccepted(false);
      setError(null);
      setBeatHistory([]);
      setRoundStarted(false);
      setDiagnostics(createEmptyWorkbenchDiagnostics());

      try {
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
        const orchestrator = createOrchestrator({
          adapter: trackedAdapter,
          storyPackageName,
          storyPackage,
        });
        const initialState = await orchestrator.initScene();

        if (cancelled) {
          return;
        }

        orchestratorRef.current = orchestrator;
        setCurrentState(initialState);
        setRuntimeSource(adapterConfig ? 'Configured provider' : 'Local demo adapter');
        setStatus('idle');
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
      }
    }

    void initializeWorkbench();

    return () => {
      cancelled = true;
    };
  }, [adapterConfig, adapterFactory, bootstrapped, storyPackage, storyPackageName]);

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
    status === 'rewriting';

  const readyMessage = currentState
    ? roundStarted
      ? getReadyMessage(
          currentState.sceneState.currentBeatIndexInPhase,
          orchestratorRef.current?.isSceneComplete() ?? false,
        )
      : 'Click Start Round to run the opening hook and generate Beat 1.'
    : 'Initializing Scene...';

  const gameViewSummary = currentState
    ? `Phase ${currentState.sceneState.currentPhaseIndex} · Beat ${currentState.sceneState.currentBeatIndexInPhase} / 4`
    : 'Scene bootstrap pending';

  async function runRound(playerInput: string, historyLabel = playerInput): Promise<boolean> {
    if (!orchestratorRef.current) {
      return false;
    }

    setError(null);
    setRewriteFeedback(null);
    setForceAccepted(false);
    setStatus('generating');

    try {
      const { beatResult, state } = await orchestratorRef.current.runBeat(playerInput);

      startTransition(() => {
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
      return true;
    } catch (runError) {
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
    if (!roundStarted) {
      return;
    }

    await runRound(playerInput);
  }

  const currentOptions = currentState?.generationState.currentOptions ?? [];

  return (
    <main className="play-page">
      <AuthorControlPanel
        storyPackage={storyPackage}
        currentPhaseIndex={currentState?.sceneState.currentPhaseIndex ?? 1}
        metaItems={[storyPackageName, runtimeSource]}
        actions={
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-none bg-black border-2 border-black px-4 py-2 text-sm font-bold text-white font-mono uppercase hover:bg-[#00ff00] hover:text-black transition-colors"
            onClick={() => setFixtureReferenceOpen((current) => !current)}
          >
            {fixtureReferenceOpen ? 'Hide Fixture Reference' : 'Show Fixture Reference'}
          </button>
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
            {!roundStarted ? (
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
                  disabled={isInputLoading}
                >
                  Start Round
                </button>
              </section>
            ) : null}
          </section>
          <BeatDisplay
            status={status}
            beatText={currentState?.generationState.currentBeatText ?? null}
            rewriteFeedback={rewriteFeedback}
            forceAccepted={forceAccepted}
            error={error}
            summary={gameViewSummary}
          >
            <PlayerInput
              options={currentOptions}
              isLoading={isInputLoading}
              disabled={!roundStarted}
              variant="embedded"
              onSubmit={handleSubmit}
            />
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
