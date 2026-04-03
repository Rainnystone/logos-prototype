import { deepFreeze } from '@/lib/deep-freeze';
import type { GossipelogCycleRunner } from '@/agents/gossipelog/contracts';
import { validateStateSnapshot } from '@/engine/schema-validator';
import { resolveAudit, type AuditResolverResult } from '@/engine/modules/audit-resolver';
import { buildDirectorNote } from '@/engine/modules/director-note-layer';
import { createLightConeCollapse } from '@/engine/modules/light-cone-collapse';
import { getHistoryWindow } from '@/engine/modules/memory-placeholder';
import { executeAudit, selectAuditQuestions } from '@/engine/modules/auditor';
import { createNarrativeRouter, type RouterSelection } from '@/engine/modules/narrative-router';
import {
  buildPhaseConsequenceRequest,
  settlePhaseConsequences,
} from '@/engine/modules/phase-consequence-settlement';
import { buildVolumeSequence } from '@/engine/modules/phase-gradient';
import {
  assemblePromptObject,
  assembleRewritePromptObject,
  type PromptAssemblerInput,
} from '@/engine/modules/prompt-assembler';
import type {
  FinalizeRelationshipLayerInput,
  RecordAcceptedBeatInput,
} from '@/runtime-sessions/repository';
import type {
  StateSnapshot,
  StoryPackage,
  AuditQuestion,
  HistoryEntry,
  PhasePlan,
  PromptObject,
  DirectorNote,
  RoundState,
  SceneState,
  GossipelogInjectionResult,
} from '@/types';
import type { GenerateResult, LLMAdapter } from '@/engine/types/adapter-interface';

export interface OrchestratorConfig {
  readonly adapter: LLMAdapter;
  readonly storyPackage: StoryPackage;
  readonly storyPackageName: string;
  readonly gossipelogCycleRunner?: GossipelogCycleRunner;
  readonly runtimeSessionStore?: RuntimeSessionStore;
}

export interface BeatResult {
  readonly beatText: string;
  readonly options: readonly string[];
  readonly auditPassed: boolean;
  readonly forceAccepted: boolean;
  readonly retryCount: number;
}

export interface Orchestrator {
  initScene(): Promise<StateSnapshot>;
  hydrateScene(input: OrchestratorRestoreInput): Promise<StateSnapshot>;
  runBeat(playerInput: string): Promise<{ beatResult: BeatResult; state: StateSnapshot }>;
  getState(): StateSnapshot;
  isSceneComplete(): boolean;
}

export interface EnsureActiveSessionResult {
  readonly activeSessionId: string;
}

export interface OrchestratorRestoreInput {
  readonly currentState: StateSnapshot;
  readonly acceptedHistory: readonly HistoryEntry[];
  readonly lastStableRelationshipLayer: GossipelogInjectionResult;
  readonly sceneComplete: boolean;
}

export interface RuntimeSessionStore {
  ensureActiveSession(): Promise<EnsureActiveSessionResult>;
  recordAcceptedBeat(input: RecordAcceptedBeatInput): Promise<void>;
  finalizeRelationshipLayer(input: FinalizeRelationshipLayerInput): Promise<void>;
}

interface AttemptOutcome {
  readonly promptObject: PromptObject;
  readonly generationResult: GenerateResult;
  readonly retryCount: number;
  readonly resolution: ReturnType<typeof resolveAudit>;
  readonly auditAnswers: readonly boolean[];
}

interface PendingRelationshipRefresh {
  promise: Promise<void>;
  readonly fallbackLayer: GossipelogInjectionResult;
  readonly checkpointId: string;
  readonly sessionId: string | null;
  timedOut: boolean;
}

const PASS_WITHOUT_AUDIT: AuditResolverResult = deepFreeze({
  pass: true,
  blockingFailures: [],
  rewriteFeedback: null,
  forceAccepted: false,
});

const EMPTY_RELATIONSHIP_LAYER: GossipelogInjectionResult = deepFreeze({
  highlightedDeltasText: '',
  stableBackgroundText: '',
});
const GOSSIPELOG_REFRESH_WAIT_TIMEOUT_MS = 2_000;

function cloneHistoryEntry(entry: HistoryEntry): HistoryEntry {
  return {
    role: entry.role,
    content: entry.content,
  };
}

function cloneRelationshipLayer(
  relationshipLayer: GossipelogInjectionResult,
): GossipelogInjectionResult {
  return {
    highlightedDeltasText: relationshipLayer.highlightedDeltasText,
    stableBackgroundText: relationshipLayer.stableBackgroundText,
  };
}

function getPhasePlan(storyPackage: StoryPackage, phaseIndex: number): PhasePlan {
  const phasePlan = storyPackage.phasePlans.find((phase) => phase.phaseIndex === phaseIndex);

  if (!phasePlan) {
    throw new Error(`Phase plan for index ${phaseIndex} was not found.`);
  }

  return phasePlan;
}

function summarizeDirectorNote(directorNote: DirectorNote): string {
  return [`Volume=${directorNote.volume}`, 'BeatRules=Active', 'OptionRules=Active'].join(' | ');
}

function freezeState(state: StateSnapshot): StateSnapshot {
  return deepFreeze(validateStateSnapshot(state));
}

function buildAuditAnswerTargets(selectedQuestions: readonly AuditQuestion[]): string {
  if (selectedQuestions.length === 0) {
    return '';
  }

  return selectedQuestions
    .map((question) => {
      const expectedAnswer = question.expected ? 'YES' : 'NO';
      return `[${question.id}] For "${question.question}", the correct answer must be ${expectedAnswer}.`;
    })
    .join(' ');
}

function buildDirectorConstraints(
  phasePlan: PhasePlan,
  selectedQuestions: readonly AuditQuestion[],
): string | undefined {
  const constraints: string[] = [];
  const normalizedNotes = phasePlan.notes?.trim() ?? '';
  const auditAnswerTargets = buildAuditAnswerTargets(selectedQuestions);

  if (normalizedNotes.length > 0) {
    constraints.push(`Strict phase-plan red lines: ${normalizedNotes}`);
  }

  if (auditAnswerTargets.length > 0) {
    constraints.push(`Audit-grounded answer targets: ${auditAnswerTargets}`);
  }

  return constraints.length > 0 ? constraints.join(' ') : undefined;
}

function buildPromptAssemblerInput(
  storyPackage: StoryPackage,
  phasePlan: PhasePlan,
  state: StateSnapshot,
  historyWindow: readonly HistoryEntry[],
  directorNote: DirectorNote,
  relationshipLayer: GossipelogInjectionResult,
): PromptAssemblerInput {
  return {
    worldBase: storyPackage.worldBase,
    relationshipLayer,
    precedingBeats: historyWindow,
    mainAxis: state.sceneState.mainAxis,
    endLine: state.sceneState.endLine,
    phaseGoal: phasePlan.phaseGoal,
    alpha: state.sceneState.alpha,
    beta: state.sceneState.beta,
    currentRouter: state.roundState.currentRouter,
    verbLexicon: state.roundState.verbLexicon,
    directorNote,
  };
}

function buildRouteRequest(
  storyPackage: StoryPackage,
  phasePlan: PhasePlan,
  sceneState: SceneState,
  historyWindow: readonly HistoryEntry[],
  currentVolume: StateSnapshot['roundState']['currentVolume'],
) {
  const context = {
    phaseGoal: phasePlan.phaseGoal,
    currentVolume,
    alpha: sceneState.alpha,
    beta: sceneState.beta,
    ...(sceneState.sceneProgress ? { sceneProgress: sceneState.sceneProgress } : {}),
    ...(phasePlan.routerHint ? { routerHint: phasePlan.routerHint } : {}),
  };

  return {
    context,
    historyWindow: historyWindow.map(cloneHistoryEntry),
    availableRouters: storyPackage.routerProfiles.map((profile) => ({
      routerName: profile.routerName,
      routerSemanticCore: profile.routerSemanticCore,
      verbLexicon: [...profile.verbLexicon],
    })),
  };
}

function buildRoundState(
  phasePlan: PhasePlan,
  currentVolume: StateSnapshot['roundState']['currentVolume'],
  routerSelection: RouterSelection,
  historyWindow: readonly HistoryEntry[],
  directorConstraints?: string,
): RoundState {
  return {
    phaseGoal: phasePlan.phaseGoal,
    currentVolume,
    currentRouter: routerSelection.routerName,
    verbLexicon: [...routerSelection.verbLexicon],
    historyWindow: historyWindow.map(cloneHistoryEntry),
    directorConstraints,
  };
}

function countAcceptedBeats(history: readonly HistoryEntry[]): number {
  return history.filter((entry) => entry.role === 'assistant').length;
}

function createRoundIdSessionPrefix(): string {
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatRoundId(sessionPrefix: string, acceptedBeatCount: number): string {
  return `${sessionPrefix}-round-${String(acceptedBeatCount).padStart(4, '0')}`;
}

function formatCheckpointId(sessionPrefix: string, acceptedBeatCount: number): string {
  return `chk-${sessionPrefix}-${String(acceptedBeatCount).padStart(4, '0')}`;
}

function isFallbackGossipelogMethod(method: unknown): boolean {
  return Boolean(
    method &&
      typeof method === 'function' &&
      '__logosGossipelogFallback' in method &&
      (method as { __logosGossipelogFallback?: boolean }).__logosGossipelogFallback === true,
  );
}

export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  const lightConeCollapse = createLightConeCollapse(
    config.adapter,
    config.storyPackage.controlModules.lightConeCustomization,
  );
  const narrativeRouter = createNarrativeRouter(config.adapter);
  const gossipelogEnabled = Boolean(
    config.gossipelogCycleRunner &&
    config.adapter.gossipelogUpdate &&
    config.adapter.gossipelogInjection &&
    !isFallbackGossipelogMethod(config.adapter.gossipelogUpdate) &&
      !isFallbackGossipelogMethod(config.adapter.gossipelogInjection),
  );
  let currentState: StateSnapshot | null = null;
  let sceneComplete = false;
  let acceptedHistory: HistoryEntry[] = [];
  let currentPhaseTranscript: HistoryEntry[] = [];
  const roundIdSessionPrefix = createRoundIdSessionPrefix();
  let queuedRelationshipLayer = cloneRelationshipLayer(EMPTY_RELATIONSHIP_LAYER);
  let pendingRelationshipRefresh: PendingRelationshipRefresh | null = null;
  let activeRuntimeSessionId: string | null = null;
  let currentCheckpointId: string | null = null;

  function requireState(): StateSnapshot {
    if (!currentState) {
      throw new Error('Scene has not been initialized.');
    }

    return currentState;
  }

  async function ensureRuntimeSessionId(): Promise<string | null> {
    if (!config.runtimeSessionStore) {
      return null;
    }

    if (activeRuntimeSessionId) {
      return activeRuntimeSessionId;
    }

    const ensuredSession = await config.runtimeSessionStore.ensureActiveSession();
    activeRuntimeSessionId = ensuredSession.activeSessionId;
    return activeRuntimeSessionId;
  }

  function isCurrentCheckpointBinding(refresh: PendingRelationshipRefresh): boolean {
    if (currentCheckpointId !== refresh.checkpointId) {
      return false;
    }

    if (refresh.sessionId === null) {
      return true;
    }

    return activeRuntimeSessionId === refresh.sessionId;
  }

  function deriveCurrentPhaseTranscript(
    state: StateSnapshot,
    history: readonly HistoryEntry[],
    restoredSceneComplete: boolean,
  ): HistoryEntry[] {
    const currentPhasePlan = getPhasePlan(config.storyPackage, state.sceneState.currentPhaseIndex);
    const acceptedBeatsInCurrentPhase = restoredSceneComplete
      ? currentPhasePlan.beatCount
      : state.sceneState.currentBeatIndexInPhase - 1;

    if (acceptedBeatsInCurrentPhase <= 0) {
      return [];
    }

    return history
      .slice(-acceptedBeatsInCurrentPhase * 2)
      .map((entry) => cloneHistoryEntry(entry));
  }

  async function waitForPendingRelationshipRefresh(): Promise<void> {
    const refresh = pendingRelationshipRefresh;

    if (!refresh) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const result = await Promise.race([
        refresh.promise.then(() => 'completed' as const),
        new Promise<'timeout'>((resolve) => {
          timeoutId = setTimeout(() => {
            resolve('timeout');
          }, GOSSIPELOG_REFRESH_WAIT_TIMEOUT_MS);
        }),
      ]);

      if (result === 'timeout' && pendingRelationshipRefresh === refresh) {
        refresh.timedOut = true;
        pendingRelationshipRefresh = null;
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  function scheduleRelationshipRefresh(
    acceptedBeatText: string,
    roundId: string,
    checkpointId: string,
    sessionId: string | null,
  ): void {
    if (!gossipelogEnabled || !config.gossipelogCycleRunner) {
      return;
    }

    const lastStableRelationshipLayer = cloneRelationshipLayer(queuedRelationshipLayer);

    const refresh: PendingRelationshipRefresh = {
      promise: Promise.resolve(),
      fallbackLayer: lastStableRelationshipLayer,
      checkpointId,
      sessionId,
      timedOut: false,
    };

    refresh.promise = config.gossipelogCycleRunner({
      adapter: config.adapter,
      storyPackageName: config.storyPackageName,
      storyPackage: config.storyPackage,
      acceptedBeatText,
      roundId,
      lastStableRelationshipLayer,
    })
      .then(async (result) => {
        const settledRelationshipLayer = cloneRelationshipLayer(result.relationshipLayer);
        const matchesCurrentCheckpoint = isCurrentCheckpointBinding(refresh);
        const shouldPersistFinalization =
          Boolean(config.runtimeSessionStore && refresh.sessionId) &&
          (!refresh.timedOut || !matchesCurrentCheckpoint);

        if (shouldPersistFinalization) {
          try {
            await config.runtimeSessionStore!.finalizeRelationshipLayer({
              packageName: config.storyPackageName,
              sessionId: refresh.sessionId!,
              checkpointId: refresh.checkpointId,
              lastStableRelationshipLayer: settledRelationshipLayer,
            });
          } catch {
            if (matchesCurrentCheckpoint) {
              queuedRelationshipLayer = cloneRelationshipLayer(refresh.fallbackLayer);
            }
            return;
          }
        }

        if (!refresh.timedOut && matchesCurrentCheckpoint) {
          queuedRelationshipLayer = settledRelationshipLayer;
        }
      })
      .catch(() => {
        if (isCurrentCheckpointBinding(refresh)) {
          queuedRelationshipLayer = cloneRelationshipLayer(lastStableRelationshipLayer);
        }
      })
      .finally(() => {
        if (pendingRelationshipRefresh === refresh) {
          pendingRelationshipRefresh = null;
        }
      });

    pendingRelationshipRefresh = refresh;
  }

  async function generateAcceptedBeat(
    phasePlan: PhasePlan,
    workingState: StateSnapshot,
    historyWindow: readonly HistoryEntry[],
    directorNote: DirectorNote,
    selectedQuestions: readonly AuditQuestion[],
  ): Promise<AttemptOutcome> {
    if (!config.adapter.generate) {
      throw new Error('LLMAdapter.generate is not configured.');
    }

    await waitForPendingRelationshipRefresh();

    const promptAssemblerInput = buildPromptAssemblerInput(
      config.storyPackage,
      phasePlan,
      workingState,
      historyWindow,
      directorNote,
      cloneRelationshipLayer(queuedRelationshipLayer),
    );

    let retryCount = 0;
    let previousDraft: GenerateResult | null = null;
    let rewriteFeedback: string | null = null;

    for (;;) {
      const promptObject =
        previousDraft && rewriteFeedback
          ? assembleRewritePromptObject(promptAssemblerInput, {
              retryCount,
              rewriteFeedback,
              previousDraft: {
                beatText: previousDraft.beatText,
                options: [...previousDraft.options],
              },
            })
          : assemblePromptObject(promptAssemblerInput);

      const generationResult = await config.adapter.generate(promptObject);
      if (selectedQuestions.length === 0) {
        return {
          promptObject,
          generationResult,
          retryCount,
          resolution: PASS_WITHOUT_AUDIT,
          auditAnswers: [],
        };
      }

      const auditExecution = await executeAudit({
        adapter: config.adapter,
        questionSet: config.storyPackage.auditQuestionSet,
        currentPhaseId: phasePlan.phaseId,
        precedingBeats: historyWindow,
        beatText: generationResult.beatText,
        options: generationResult.options,
      });
      const resolution = resolveAudit(auditExecution.parsedResult, retryCount);

      if (resolution.pass) {
        return {
          promptObject,
          generationResult,
          retryCount,
          resolution,
          auditAnswers: auditExecution.auditResult.answers,
        };
      }

      previousDraft = generationResult;
      rewriteFeedback = resolution.rewriteFeedback;
      retryCount += 1;
    }
  }

  return {
    async initScene() {
      if (currentState) {
        return currentState;
      }

      const firstPhase = getPhasePlan(config.storyPackage, 1);
      const initialBoundaries = await lightConeCollapse.inferInitialBoundaries(
        config.storyPackage.sceneSpec,
      );
      const initialSceneState = {
        sceneId: config.storyPackage.sceneSpec.sceneId,
        currentPhaseIndex: 1,
        currentBeatIndexInPhase: 1,
        mainAxis: config.storyPackage.sceneSpec.mainAxis,
        endLine: config.storyPackage.sceneSpec.endLine,
        alpha: initialBoundaries.alpha,
        beta: initialBoundaries.beta,
        phaseConsequences: [] as string[],
      };
      const initialVolume = buildVolumeSequence(firstPhase.gradientType)[0]!;
      const initialRouter = await narrativeRouter.selectRouter(
        buildRouteRequest(config.storyPackage, firstPhase, initialSceneState, [], initialVolume),
      );
      const { selectedQuestions: initialAuditQuestions } = selectAuditQuestions(
        config.storyPackage.auditQuestionSet,
        firstPhase.phaseId,
      );
      const initialRoundState = buildRoundState(
        firstPhase,
        initialVolume,
        initialRouter,
        [],
        buildDirectorConstraints(firstPhase, initialAuditQuestions),
      );
      const initialDirectorNote = buildDirectorNote(
        initialRoundState,
        initialSceneState,
        config.storyPackage.worldBase,
        config.storyPackage.controlModules,
      );
      const initialState = freezeState({
        sceneState: initialSceneState,
        roundState: initialRoundState,
        generationState: {
          directorNoteSummary: summarizeDirectorNote(initialDirectorNote),
          promptObject: {},
          currentBeatText: null,
          currentOptions: [],
        },
        evaluationState: {
          auditAnswers: [],
          blockingFailures: [],
          retryCount: 0,
          rewriteFeedback: null,
        },
      });

      await ensureRuntimeSessionId();

      acceptedHistory = [];
      currentPhaseTranscript = [];
      sceneComplete = false;
      queuedRelationshipLayer = cloneRelationshipLayer(EMPTY_RELATIONSHIP_LAYER);
      pendingRelationshipRefresh = null;
      currentCheckpointId = null;
      currentState = initialState;

      return currentState;
    },

    async hydrateScene(input) {
      await ensureRuntimeSessionId();

      acceptedHistory = input.acceptedHistory.map(cloneHistoryEntry);
      currentPhaseTranscript = deriveCurrentPhaseTranscript(
        input.currentState,
        acceptedHistory,
        input.sceneComplete,
      );
      sceneComplete = input.sceneComplete;
      queuedRelationshipLayer = cloneRelationshipLayer(input.lastStableRelationshipLayer);
      pendingRelationshipRefresh = null;
      currentCheckpointId = null;
      currentState = freezeState(input.currentState);

      return currentState;
    },

    async runBeat(playerInput: string) {
      const stateBeforeBeat = await this.initScene();

      if (sceneComplete) {
        throw new Error('Scene is already complete.');
      }

      const phasePlan = getPhasePlan(
        config.storyPackage,
        stateBeforeBeat.sceneState.currentPhaseIndex,
      );
      const workingHistory = [
        ...acceptedHistory.map(cloneHistoryEntry),
        {
          role: 'user' as const,
          content: playerInput,
        },
      ];
      const historyWindow = getHistoryWindow(workingHistory);
      const currentVolume = buildVolumeSequence(phasePlan.gradientType)[
        stateBeforeBeat.sceneState.currentBeatIndexInPhase - 1
      ]!;
      const routerSelection = await narrativeRouter.selectRouter(
        buildRouteRequest(
          config.storyPackage,
          phasePlan,
          stateBeforeBeat.sceneState,
          historyWindow,
          currentVolume,
        ),
      );
      const { selectedQuestions } = selectAuditQuestions(
        config.storyPackage.auditQuestionSet,
        phasePlan.phaseId,
      );
      const roundState = buildRoundState(
        phasePlan,
        currentVolume,
        routerSelection,
        historyWindow,
        buildDirectorConstraints(phasePlan, selectedQuestions),
      );
      const directorNote = buildDirectorNote(
        roundState,
        stateBeforeBeat.sceneState,
        config.storyPackage.worldBase,
        config.storyPackage.controlModules,
      );
      const attemptOutcome = await generateAcceptedBeat(
        phasePlan,
        stateBeforeBeat,
        historyWindow,
        directorNote,
        selectedQuestions,
      );

      const nextAcceptedHistory = [
        ...acceptedHistory.map(cloneHistoryEntry),
        { role: 'user', content: playerInput },
        {
          role: 'assistant',
          content: attemptOutcome.generationResult.beatText,
        },
      ];
      const nextPhaseTranscript = [
        ...currentPhaseTranscript.map(cloneHistoryEntry),
        { role: 'user', content: playerInput },
        {
          role: 'assistant',
          content: attemptOutcome.generationResult.beatText,
        },
      ];
      const nextAcceptedBeatOrdinal = countAcceptedBeats(nextAcceptedHistory);
      const roundId = formatRoundId(roundIdSessionPrefix, nextAcceptedBeatOrdinal);
      const checkpointId = formatCheckpointId(roundIdSessionPrefix, nextAcceptedBeatOrdinal);
      const completedBeatCount = stateBeforeBeat.sceneState.currentBeatIndexInPhase;
      const phaseCompleted = completedBeatCount >= phasePlan.beatCount;
      const followingPhasePlan = phaseCompleted
        ? config.storyPackage.phasePlans.find(
            (candidate) => candidate.phaseIndex === phasePlan.phaseIndex + 1,
          )
        : null;
      const nextSceneComplete = phaseCompleted && !followingPhasePlan;

      let nextSceneState = {
        ...stateBeforeBeat.sceneState,
      };
      let nextRoundState = {
        ...roundState,
      };

      if (phaseCompleted) {
        const settlementRequest = buildPhaseConsequenceRequest(
          nextSceneState.mainAxis,
          nextSceneState.endLine,
          phasePlan.phaseGoal,
          nextPhaseTranscript,
          nextSceneState.sceneProgress,
          nextSceneState.currentPhaseIndex,
        );
        const settlementResponse = await settlePhaseConsequences(settlementRequest, config.adapter);

        nextSceneState = {
          ...nextSceneState,
          phaseConsequences: [...settlementResponse.phaseConsequences],
          sceneProgress: `Completed ${phasePlan.phaseId}`,
        };

        if (followingPhasePlan) {
          const collapsedBoundaries = await lightConeCollapse.reInferBoundaries({
            context: {
              mainAxis: nextSceneState.mainAxis,
              endLine: nextSceneState.endLine,
              currentAlpha: nextSceneState.alpha,
              currentBeta: nextSceneState.beta,
              sceneProgress: nextSceneState.sceneProgress,
              completedPhaseGoal: phasePlan.phaseGoal,
            },
            phaseConsequences: settlementResponse.phaseConsequences,
          });

          nextSceneState = {
            ...nextSceneState,
            currentPhaseIndex: followingPhasePlan.phaseIndex,
            currentBeatIndexInPhase: 1,
            alpha: collapsedBoundaries.alpha,
            beta: collapsedBoundaries.beta,
          };

          const nextHistoryWindow = getHistoryWindow(nextAcceptedHistory);
          const nextVolume = buildVolumeSequence(followingPhasePlan.gradientType)[0]!;
          const nextRouter = await narrativeRouter.selectRouter(
            buildRouteRequest(
              config.storyPackage,
              followingPhasePlan,
              nextSceneState,
              nextHistoryWindow,
              nextVolume,
            ),
          );

          nextRoundState = buildRoundState(
            followingPhasePlan,
            nextVolume,
            nextRouter,
            nextHistoryWindow,
            buildDirectorConstraints(
              followingPhasePlan,
              selectAuditQuestions(config.storyPackage.auditQuestionSet, followingPhasePlan.phaseId)
                .selectedQuestions,
            ),
          );
        } else {
          nextSceneState = {
            ...nextSceneState,
            currentBeatIndexInPhase: phasePlan.beatCount,
          };
          nextRoundState = {
            ...roundState,
            historyWindow: getHistoryWindow(nextAcceptedHistory).map(cloneHistoryEntry),
          };
        }
      } else {
        const nextBeatIndex = completedBeatCount + 1;
        const nextVolume = buildVolumeSequence(phasePlan.gradientType)[nextBeatIndex - 1]!;
        const nextHistoryWindow = getHistoryWindow(nextAcceptedHistory);

        nextSceneState = {
          ...nextSceneState,
          currentBeatIndexInPhase: nextBeatIndex,
        };
        const nextRouter = await narrativeRouter.selectRouter(
          buildRouteRequest(
            config.storyPackage,
            phasePlan,
            nextSceneState,
            nextHistoryWindow,
            nextVolume,
          ),
        );
        nextRoundState = buildRoundState(
          phasePlan,
          nextVolume,
          nextRouter,
          nextHistoryWindow,
          buildDirectorConstraints(phasePlan, selectedQuestions),
        );
      }

      const nextState = freezeState({
        sceneState: nextSceneState,
        roundState: nextRoundState,
        generationState: {
          directorNoteSummary: summarizeDirectorNote(directorNote),
          promptObject: attemptOutcome.promptObject as Record<string, unknown>,
          currentBeatText: attemptOutcome.generationResult.beatText,
          currentOptions: [...attemptOutcome.generationResult.options],
        },
        evaluationState: {
          auditAnswers: [...attemptOutcome.auditAnswers],
          blockingFailures: [...attemptOutcome.resolution.blockingFailures],
          retryCount: attemptOutcome.retryCount,
          rewriteFeedback: attemptOutcome.resolution.rewriteFeedback,
        },
      });
      const runtimeSessionId = await ensureRuntimeSessionId();

      if (config.runtimeSessionStore && runtimeSessionId) {
        await config.runtimeSessionStore.recordAcceptedBeat({
          packageName: config.storyPackageName,
          sessionId: runtimeSessionId,
          checkpointId,
          lifecycle: nextSceneComplete ? 'complete' : 'in_progress',
          acceptedBeatOrdinal: nextAcceptedBeatOrdinal,
          phaseIndex: stateBeforeBeat.sceneState.currentPhaseIndex,
          beatIndex: stateBeforeBeat.sceneState.currentBeatIndexInPhase,
          sceneId: stateBeforeBeat.sceneState.sceneId,
          roundId,
          acceptedTranscript: {
            playerInput,
            beatText: attemptOutcome.generationResult.beatText,
          },
          stateSnapshot: nextState,
          lastStableRelationshipLayer: cloneRelationshipLayer(queuedRelationshipLayer),
        });
      }

      acceptedHistory = nextAcceptedHistory;
      currentPhaseTranscript =
        phaseCompleted && !nextSceneComplete
          ? []
          : nextPhaseTranscript.map((entry) => cloneHistoryEntry(entry));
      sceneComplete = nextSceneComplete;
      currentCheckpointId = checkpointId;
      currentState = nextState;

      scheduleRelationshipRefresh(
        attemptOutcome.generationResult.beatText,
        roundId,
        checkpointId,
        runtimeSessionId,
      );

      return {
        beatResult: deepFreeze({
          beatText: attemptOutcome.generationResult.beatText,
          options: [...attemptOutcome.generationResult.options],
          auditPassed: attemptOutcome.resolution.blockingFailures.length === 0,
          forceAccepted: attemptOutcome.resolution.forceAccepted,
          retryCount: attemptOutcome.retryCount,
        }),
        state: nextState,
      };
    },

    getState() {
      return requireState();
    },

    isSceneComplete() {
      return sceneComplete;
    },
  };
}
