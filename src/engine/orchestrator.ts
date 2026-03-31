import { deepFreeze } from '@/lib/deep-freeze';
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
  StateSnapshot,
  StoryPackage,
  AuditQuestion,
  HistoryEntry,
  PhasePlan,
  PromptObject,
  DirectorNote,
  RoundState,
  SceneState,
} from '@/types';
import type { GenerateResult, LLMAdapter } from '@/engine/types/adapter-interface';

export interface OrchestratorConfig {
  readonly adapter: LLMAdapter;
  readonly storyPackage: StoryPackage;
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
  runBeat(playerInput: string): Promise<{ beatResult: BeatResult; state: StateSnapshot }>;
  getState(): StateSnapshot;
  isSceneComplete(): boolean;
}

interface AttemptOutcome {
  readonly promptObject: PromptObject;
  readonly generationResult: GenerateResult;
  readonly retryCount: number;
  readonly resolution: ReturnType<typeof resolveAudit>;
  readonly auditAnswers: readonly boolean[];
}

const PASS_WITHOUT_AUDIT: AuditResolverResult = deepFreeze({
  pass: true,
  blockingFailures: [],
  rewriteFeedback: null,
  forceAccepted: false,
});

function cloneHistoryEntry(entry: HistoryEntry): HistoryEntry {
  return {
    role: entry.role,
    content: entry.content,
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
): PromptAssemblerInput {
  return {
    worldBase: storyPackage.worldBase,
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

export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  const lightConeCollapse = createLightConeCollapse(
    config.adapter,
    config.storyPackage.controlModules.lightConeCustomization,
  );
  const narrativeRouter = createNarrativeRouter(config.adapter);
  let currentState: StateSnapshot | null = null;
  let sceneComplete = false;
  let acceptedHistory: HistoryEntry[] = [];
  let currentPhaseTranscript: HistoryEntry[] = [];

  function requireState(): StateSnapshot {
    if (!currentState) {
      throw new Error('Scene has not been initialized.');
    }

    return currentState;
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

    const promptAssemblerInput = buildPromptAssemblerInput(
      config.storyPackage,
      phasePlan,
      workingState,
      historyWindow,
      directorNote,
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

      acceptedHistory = [];
      currentPhaseTranscript = [];
      sceneComplete = false;
      currentState = freezeState({
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

      acceptedHistory = [
        ...acceptedHistory.map(cloneHistoryEntry),
        { role: 'user', content: playerInput },
        {
          role: 'assistant',
          content: attemptOutcome.generationResult.beatText,
        },
      ];
      currentPhaseTranscript = [
        ...currentPhaseTranscript.map(cloneHistoryEntry),
        { role: 'user', content: playerInput },
        {
          role: 'assistant',
          content: attemptOutcome.generationResult.beatText,
        },
      ];

      const completedBeatCount = stateBeforeBeat.sceneState.currentBeatIndexInPhase;
      const phaseCompleted = completedBeatCount >= phasePlan.beatCount;

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
          currentPhaseTranscript,
          nextSceneState.sceneProgress,
          nextSceneState.currentPhaseIndex,
        );
        const settlementResponse = await settlePhaseConsequences(settlementRequest, config.adapter);
        const nextPhasePlan = config.storyPackage.phasePlans.find(
          (candidate) => candidate.phaseIndex === phasePlan.phaseIndex + 1,
        );

        nextSceneState = {
          ...nextSceneState,
          phaseConsequences: [...settlementResponse.phaseConsequences],
          sceneProgress: `Completed ${phasePlan.phaseId}`,
        };

        if (nextPhasePlan) {
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
            currentPhaseIndex: nextPhasePlan.phaseIndex,
            currentBeatIndexInPhase: 1,
            alpha: collapsedBoundaries.alpha,
            beta: collapsedBoundaries.beta,
          };

          const nextHistoryWindow = getHistoryWindow(acceptedHistory);
          const nextVolume = buildVolumeSequence(nextPhasePlan.gradientType)[0]!;
          const nextRouter = await narrativeRouter.selectRouter(
            buildRouteRequest(
              config.storyPackage,
              nextPhasePlan,
              nextSceneState,
              nextHistoryWindow,
              nextVolume,
            ),
          );

          nextRoundState = buildRoundState(
            nextPhasePlan,
            nextVolume,
            nextRouter,
            nextHistoryWindow,
            buildDirectorConstraints(
              nextPhasePlan,
              selectAuditQuestions(config.storyPackage.auditQuestionSet, nextPhasePlan.phaseId)
                .selectedQuestions,
            ),
          );
          currentPhaseTranscript = [];
        } else {
          sceneComplete = true;
          nextSceneState = {
            ...nextSceneState,
            currentBeatIndexInPhase: phasePlan.beatCount,
          };
          nextRoundState = {
            ...roundState,
            historyWindow: getHistoryWindow(acceptedHistory).map(cloneHistoryEntry),
          };
        }
      } else {
        const nextBeatIndex = completedBeatCount + 1;
        const nextVolume = buildVolumeSequence(phasePlan.gradientType)[nextBeatIndex - 1]!;
        const nextHistoryWindow = getHistoryWindow(acceptedHistory);

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

      currentState = freezeState({
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

      return {
        beatResult: deepFreeze({
          beatText: attemptOutcome.generationResult.beatText,
          options: [...attemptOutcome.generationResult.options],
          auditPassed: attemptOutcome.resolution.blockingFailures.length === 0,
          forceAccepted: attemptOutcome.resolution.forceAccepted,
          retryCount: attemptOutcome.retryCount,
        }),
        state: currentState,
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
