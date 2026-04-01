import type {
  AuditPacket,
  CollapseRequest,
  CollapseResponse,
  CharacterProfile,
  CharacterRelationshipsFile,
  GossipelogInjectionResult,
  GossipelogUpdateResult,
  HistoryEntry,
  PhaseConsequenceRequest,
  PhaseConsequenceResponse,
  PromptObject,
  RouterProfile,
  UsageInfo,
  Volume,
} from '@/types';

/**
 * Initial collapse inference uses the same semantic mode as phase-end collapse,
 * but before any `phaseConsequences` exist.
 */
export interface InitialCollapseRequest {
  readonly context: {
    readonly mainAxis: string;
    readonly endLine: string;
    readonly sceneProgress?: string;
    readonly completedPhaseGoal?: string;
  };
  readonly phaseConsequences?: readonly string[];
}

export type CollapseInput = CollapseRequest | InitialCollapseRequest;

export interface GossipelogSceneCastFraming {
  readonly sceneId: string;
  readonly castRoleIds: readonly string[];
}

export interface GossipelogUpdateRequest {
  readonly acceptedBeatText: string;
  readonly roundId: string;
  readonly sceneCastRoleIds: readonly string[];
  readonly sceneCastFraming: GossipelogSceneCastFraming;
  readonly candidateRoles: readonly CharacterProfile[];
  readonly roleDefinitions: readonly CharacterProfile[];
  readonly relationshipSubgraph: CharacterRelationshipsFile;
}

export interface GossipelogInjectionRequest {
  readonly sceneCastRoleIds: readonly string[];
  readonly sceneCastFraming: GossipelogSceneCastFraming;
  readonly roleDefinitions: readonly CharacterProfile[];
  readonly relationshipSubgraph: CharacterRelationshipsFile;
}

export type GossipelogUpdateResponse = GossipelogUpdateResult & {
  readonly usage?: UsageInfo | undefined;
};

export type GossipelogInjectionResponse = GossipelogInjectionResult & {
  readonly usage?: UsageInfo | undefined;
};

export interface GenerateResult {
  readonly beatText: string;
  readonly options: readonly string[];
  readonly usage?: UsageInfo | undefined;
}

export interface AuditResult {
  readonly answers: readonly boolean[];
  readonly usage?: UsageInfo | undefined;
}

export interface RouteRequest {
  readonly context: {
    readonly phaseGoal: string;
    readonly currentVolume: Volume;
    readonly alpha: string;
    readonly beta: string;
    readonly sceneProgress?: string;
    readonly routerHint?: string;
  };
  readonly historyWindow: readonly HistoryEntry[];
  readonly availableRouters: readonly RouterProfile[];
}

export interface RouteResult {
  readonly routerName: string;
  readonly inferenceTrace: string;
  readonly usage?: UsageInfo | undefined;
}

/**
 * Dependency injection seam for all LLM-facing engine modules.
 */
export interface LLMAdapter {
  collapse(request: CollapseInput): Promise<CollapseResponse>;
  route?(request: RouteRequest): Promise<RouteResult>;
  generate?(request: PromptObject): Promise<GenerateResult>;
  audit?(request: AuditPacket): Promise<AuditResult>;
  settlement?(request: PhaseConsequenceRequest): Promise<PhaseConsequenceResponse>;
  gossipelogUpdate?(request: GossipelogUpdateRequest): Promise<GossipelogUpdateResponse>;
  gossipelogInjection?(request: GossipelogInjectionRequest): Promise<GossipelogInjectionResponse>;
}
