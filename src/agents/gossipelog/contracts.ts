import type { LLMAdapter } from '@/engine/types/adapter-interface';
import type { GossipelogInjectionResult, StoryPackage } from '@/types';

export interface RunGossipelogCycleInput {
  readonly adapter: Pick<LLMAdapter, 'gossipelogInjection' | 'gossipelogUpdate'>;
  readonly storyPackageName: string;
  readonly storyPackage: StoryPackage;
  readonly acceptedBeatText: string;
  readonly roundId: string;
  readonly phaseId: string;
  readonly beatIndex: number;
  readonly lastStableRelationshipLayer?: GossipelogInjectionResult;
}

export interface RunGossipelogCycleResult {
  readonly updateRequest: import('@/engine/types/adapter-interface').GossipelogUpdateRequest;
  readonly updateResult: import('@/types').GossipelogUpdateResult;
  readonly injectionRequest: import('@/engine/types/adapter-interface').GossipelogInjectionRequest;
  readonly relationshipLayer: GossipelogInjectionResult;
  readonly usedFallbackSource?: 'persisted-relationship-state';
  readonly usedFallbackLayer?: 'last-stable-layer' | 'empty-layer';
}

export type GossipelogCycleRunner = (
  input: RunGossipelogCycleInput,
) => Promise<RunGossipelogCycleResult>;
