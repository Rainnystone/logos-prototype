import type {
  AuditPacket,
  CollapseRequest,
  CollapseResponse,
  PhaseConsequenceRequest,
  PhaseConsequenceResponse,
  PromptObject,
  UsageInfo,
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

export interface GenerateResult {
  readonly beatText: string;
  readonly options: readonly string[];
  readonly usage?: UsageInfo | undefined;
}

export interface AuditResult {
  readonly answers: readonly boolean[];
  readonly usage?: UsageInfo | undefined;
}

/**
 * Dependency injection seam for all LLM-facing engine modules.
 */
export interface LLMAdapter {
  collapse(request: CollapseInput): Promise<CollapseResponse>;
  generate?(request: PromptObject): Promise<GenerateResult>;
  audit?(request: AuditPacket): Promise<AuditResult>;
  settlement?(request: PhaseConsequenceRequest): Promise<PhaseConsequenceResponse>;
}
