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

  const readyMessage = currentState
    ? getReadyMessage(
        currentState.sceneState.currentBeatIndexInPhase,
        orchestratorRef.current?.isSceneComplete() ?? false,
      )
    : 'Initializing Scene...';

  async function handleSubmit(playerInput: string) {
    if (!orchestratorRef.current) {
      return;
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
            playerInput,
            beatText: beatResult.beatText,
          },
        ]);
        setForceAccepted(beatResult.forceAccepted);
        setStatus(beatResult.forceAccepted ? 'force-accepted' : 'accepted');
      });
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Failed to run the next beat.');
      setStatus('error');
    }
  }

  const currentOptions = currentState?.generationState.currentOptions ?? [];

  return (
    <main className="play-page">
      <section className="context-strip">
        <div>
          <p className="panel-eyebrow">Sample Context</p>
          <h1>{storyPackage.sceneSpec.sceneName}</h1>
          <p>{storyPackage.sceneSpec.mainAxis}</p>
        </div>
        <div className="context-strip__side">
          <div className="context-strip__meta">
            <span>{storyPackageName}</span>
            <span>{storyPackage.sceneSpec.endLine}</span>
            <span>{runtimeSource}</span>
          </div>
          <div className="context-strip__actions">
            <button type="button" onClick={() => setFixtureReferenceOpen((current) => !current)}>
              {fixtureReferenceOpen ? 'Hide Fixture Reference' : 'Show Fixture Reference'}
            </button>
          </div>
        </div>
      </section>

      {fixtureReferenceOpen ? (
        <FixtureReferencePanel storyPackage={storyPackage} storyPackageName={storyPackageName} />
      ) : null}

      <section className="play-grid">
        <div className="play-column play-column--controls">
          <AuthorControlPanel
            storyPackage={storyPackage}
            currentPhaseIndex={currentState?.sceneState.currentPhaseIndex ?? 1}
          />
          <ConfigPanel initialConfig={adapterConfig} onSave={setAdapterConfig} />
          <PromptStatusPanel state={currentState} diagnostics={diagnostics} />
        </div>

        <div className="play-column play-column--main">
          <BeatDisplay
            status={status}
            beatText={currentState?.generationState.currentBeatText ?? null}
            rewriteFeedback={rewriteFeedback}
            forceAccepted={forceAccepted}
            error={error}
          />
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-eyebrow">Generation Workspace</p>
                <h2>{currentPhasePlan ? `Phase ${currentPhasePlan.phaseIndex}` : 'Scene'}</h2>
              </div>
              <p className="panel-note">{readyMessage}</p>
            </div>
            <BeatHistory entries={beatHistory} />
            <PlayerInput
              options={currentOptions}
              isLoading={status !== 'idle' && status !== 'accepted' && status !== 'force-accepted'}
              onSubmit={handleSubmit}
            />
          </section>
        </div>

        <div className="play-column play-column--feedback">
          {currentState ? (
            <StateInspector
              state={currentState}
              gradientSequence={gradientSequence}
              totalPhases={storyPackage.phasePlans.length}
            />
          ) : (
            <aside className="panel inspector-panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-eyebrow">Narrative State Dashboard</p>
                  <h2>State Inspector</h2>
                </div>
              </div>
              <p>Initializing Scene...</p>
            </aside>
          )}
        </div>
      </section>
    </main>
  );
}
