'use client';

import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

import { loadAdapterConfig } from '@/app/runtime-config';
import { AuthorControlPanel } from '@/app/components/AuthorControlPanel';
import { BeatDisplay } from '@/app/components/BeatDisplay';
import { BeatHistory, type BeatHistoryEntry } from '@/app/components/BeatHistory';
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
  }, [adapterConfig, adapterFactory, bootstrapped, storyPackage]);

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
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c4e2f] to-[#355f76] px-4 py-2 text-sm font-medium text-[#fffaf2]"
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
        <div className="play-column">
          <PromptStatusPanel state={currentState} diagnostics={diagnostics} />
          <ConfigPanel
            initialConfig={adapterConfig}
            diagnostics={diagnostics}
            onSave={setAdapterConfig}
          />
        </div>

        <div className="play-column">
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
            <aside className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg font-mono text-slate-300 text-sm break-words">
              <div className="border-b border-slate-800 pb-4 mb-4">
                <p className="text-[10px] tracking-widest uppercase text-emerald-500 mb-1">[ Narrative State Dashboard ]</p>
                <h2 className="text-lg font-bold text-slate-100 tracking-tight">State Inspector</h2>
              </div>
              <p>Initializing Scene...</p>
            </aside>
          )}
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col font-sans mb-[1.25rem]">
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-start gap-2">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-slate-500 mb-1">Generation Workspace</p>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">{currentPhasePlan ? `Phase ${currentPhasePlan.phaseIndex}` : 'Scene'}</h2>
              </div>
              <p className="text-xs text-slate-400 max-w-sm md:text-right">{readyMessage}</p>
            </div>
            {!roundStarted ? (
              <section className="p-5 m-5 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col gap-4">
                <p className="text-sm text-slate-600">
                  Start the round with the scene opening hook before accepting player actions.
                </p>
                <blockquote className="pl-4 py-2 border-l-4 border-slate-300 bg-white rounded-r-md">
                  <p className="font-serif text-slate-800 italic">{openingHookInput}</p>
                </blockquote>
                <button 
                  className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2 rounded-lg transition-colors self-start disabled:opacity-50 disabled:cursor-not-allowed text-sm" 
                  type="button" 
                  onClick={handleStartRound} 
                  disabled={isInputLoading}
                >
                  Start Round
                </button>
              </section>
            ) : (
              <div className="p-5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <span className="block text-[10px] uppercase text-slate-500 mb-1">Round State</span>
                    <strong className="text-slate-800">
                      {status === 'accepted' || status === 'force-accepted' ? 'Live' : 'Processing'}
                    </strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <span className="block text-[10px] uppercase text-slate-500 mb-1">Current Beat</span>
                    <strong className="text-slate-800">
                      {currentState
                        ? `Beat ${currentState.sceneState.currentBeatIndexInPhase}`
                        : 'Pending'}
                    </strong>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Opening hook has been dispatched. New options will replace the fixed four slots
                  after each accepted beat.
                </p>
              </div>
            )}
          </section>
          <BeatHistory entries={beatHistory} />
        </div>
      </section>
    </main>
  );
}
