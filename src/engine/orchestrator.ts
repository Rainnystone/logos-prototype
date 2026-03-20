import { deepFreeze } from '@/lib/deep-freeze';
import { validateStateSnapshot } from '@/engine/schema-validator';
import { resolveAudit } from '@/engine/modules/audit-resolver';
import { buildDirectorNote } from '@/engine/modules/director-note-layer';
import { createLightConeCollapse } from '@/engine/modules/light-cone-collapse';
import { getHistoryWindow } from '@/engine/modules/memory-placeholder';
import { executeAudit } from '@/engine/modules/auditor';
import { selectRouter } from '@/engine/modules/narrative-router';
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
  HistoryEntry,
  PhasePlan,
  PromptObject,
  DirectorNote,
  RoundState,
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
  return [
    `Volume=${directorNote.volume}`,
    `Router=${directorNote.router}`,
    `VerbLexicon=${directorNote.verbLexicon.join(', ')}`,
  ].join(' | ');
}

function freezeState(state: StateSnapshot): StateSnapshot {
  return deepFreeze(validateStateSnapshot(state));
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
    directorNote,
  };
}

function buildRoundState(
  phasePlan: PhasePlan,
  currentVolume: StateSnapshot['roundState']['currentVolume'],
  routerSelection: ReturnType<typeof selectRouter>,
  historyWindow: readonly HistoryEntry[],
): RoundState {
  return {
    phaseGoal: phasePlan.phaseGoal,
    currentVolume,
    currentRouter: routerSelection.routerName,
    verbLexicon: [...routerSelection.verbLexicon],
    historyWindow: historyWindow.map(cloneHistoryEntry),
  };
}

export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  const lightConeCollapse = createLightConeCollapse(config.adapter);
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
      const initialRouter = selectRouter(config.storyPackage.routerProfiles, firstPhase.routerHint);
      const initialRoundState = buildRoundState(firstPhase, initialVolume, initialRouter, []);
      const initialDirectorNote = buildDirectorNote(
        initialRoundState,
        initialSceneState,
        config.storyPackage.worldBase,
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
      const routerSelection = selectRouter(
        config.storyPackage.routerProfiles,
        phasePlan.routerHint,
      );
      const roundState = buildRoundState(phasePlan, currentVolume, routerSelection, historyWindow);
      const directorNote = buildDirectorNote(
        roundState,
        stateBeforeBeat.sceneState,
        config.storyPackage.worldBase,
      );
      const attemptOutcome = await generateAcceptedBeat(
        phasePlan,
        stateBeforeBeat,
        historyWindow,
        directorNote,
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
          const nextRouter = selectRouter(
            config.storyPackage.routerProfiles,
            nextPhasePlan.routerHint,
          );

          nextRoundState = buildRoundState(
            nextPhasePlan,
            nextVolume,
            nextRouter,
            nextHistoryWindow,
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
        nextSceneState = {
          ...nextSceneState,
          currentBeatIndexInPhase: completedBeatCount + 1,
        };
        nextRoundState = {
          ...roundState,
          historyWindow: getHistoryWindow(acceptedHistory).map(cloneHistoryEntry),
        };
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
