import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import { createOrchestrator, type RuntimeSessionStore } from '@/engine/orchestrator';
import { loadStoryPackage } from '@/engine/story-loader';
import type { BeatResult } from '@/engine/orchestrator';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import type { StateSnapshot, StoryPackage } from '@/types';

type PlayerTrace = {
  readonly accepted: boolean;
  readonly forceAccepted: boolean;
  readonly currentBeatIndexInPhase: number;
};

type PlayerBeatResult = {
  readonly beatResult: BeatResult;
  readonly state: StateSnapshot;
  readonly trace: PlayerTrace;
};

export type PlayerSimulator = {
  initScene(): Promise<StateSnapshot>;
  runBeat(playerInput: string): Promise<PlayerBeatResult>;
  getState(): StateSnapshot;
};

export type CreatePlayerSimulatorOptions = {
  readonly packageName: string;
  readonly adapter: LLMAdapter;
  readonly storyPackageOverride?: StoryPackage;
  readonly runtimeSessionStore?: RuntimeSessionStore;
};

export async function createPlayerSimulator(
  options: CreatePlayerSimulatorOptions,
): Promise<PlayerSimulator> {
  const storyPackage = options.storyPackageOverride ?? (await loadStoryPackage(options.packageName));
  const orchestrator = createOrchestrator({
    adapter: options.adapter,
    storyPackageName: options.packageName,
    storyPackage,
    gossipelogCycleRunner: runGossipelogCycle,
    ...(options.runtimeSessionStore ? { runtimeSessionStore: options.runtimeSessionStore } : {}),
  });

  let initialized = false;

  return {
    async initScene() {
      const state = await orchestrator.initScene();
      initialized = true;
      return state;
    },
    async runBeat(playerInput) {
      if (!initialized) {
        await orchestrator.initScene();
        initialized = true;
      }

      const result = await orchestrator.runBeat(playerInput);

      return {
        ...result,
        trace: {
          accepted: result.beatResult.auditPassed || result.beatResult.forceAccepted,
          forceAccepted: result.beatResult.forceAccepted,
          currentBeatIndexInPhase: result.state.sceneState.currentBeatIndexInPhase,
        },
      };
    },
    getState() {
      return orchestrator.getState();
    },
  };
}
