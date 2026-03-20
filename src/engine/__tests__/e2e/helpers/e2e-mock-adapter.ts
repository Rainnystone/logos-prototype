import { deepFreeze } from '@/lib/deep-freeze';
import {
  validateAuditPacket,
  validateCollapseResponse,
  validatePhaseConsequenceRequest,
  validatePhaseConsequenceResponse,
  validatePromptObject,
} from '@/engine/schema-validator';
import type {
  AuditResult,
  CollapseInput,
  GenerateResult,
  LLMAdapter,
} from '@/engine/types/adapter-interface';
import type {
  AuditPacket,
  AuditQuestion,
  AuditQuestionSet,
  CollapseResponse,
  PhaseConsequenceRequest,
  PhaseConsequenceResponse,
  PromptObject,
} from '@/types';

export type AuditBehavior = 'pass' | 'fail-once' | 'fail-always';
export type AdapterMode = 'generate' | 'audit' | 'settlement' | 'collapse';

export interface E2EMockAdapterConfig {
  readonly questionSet?: AuditQuestionSet;
  readonly generateResponses?: readonly GenerateResult[];
  readonly auditBehavior?: AuditBehavior;
  readonly settlementResponse?: PhaseConsequenceResponse;
  readonly collapseResponses?: readonly CollapseResponse[];
}

export interface E2EMockAdapterHarness {
  readonly adapter: LLMAdapter;
  readonly callLog: AdapterMode[];
  readonly generateCalls: PromptObject[];
  readonly auditCalls: AuditPacket[];
  readonly settlementCalls: PhaseConsequenceRequest[];
  readonly collapseCalls: CollapseInput[];
  getCallCounts(): Readonly<Record<AdapterMode, number>>;
}

function buildQuestionMap(questionSet?: AuditQuestionSet): Map<string, AuditQuestion> {
  if (!questionSet) {
    return new Map();
  }

  const phaseQuestions = Object.values(questionSet.phaseSpecificQuestions ?? {}).flat();
  const allQuestions = [
    ...questionSet.globalQuestions,
    ...questionSet.controlQuestions,
    ...phaseQuestions,
  ];

  return new Map(allQuestions.map((question) => [question.question, question]));
}

function defaultGenerateResult(index: number): GenerateResult {
  return deepFreeze({
    beatText: `Generic beat output ${index + 1}.`,
    options: [
      `Option ${index + 1}-A`,
      `Option ${index + 1}-B`,
      `Option ${index + 1}-C`,
      `Option ${index + 1}-D`,
    ],
  });
}

function defaultSettlementResponse(request: PhaseConsequenceRequest): PhaseConsequenceResponse {
  const consequences = request.phaseTranscript
    .filter((entry) => entry.role === 'assistant')
    .slice(-3)
    .map((entry, index) => `Settled fact ${index + 1}: ${entry.content}`)
    .slice(0, 6);

  return validatePhaseConsequenceResponse({
    phaseConsequences:
      consequences.length > 0 ? consequences : ['Settled fact 1: phase transcript was accepted.'],
    settlementTrace: `Settlement derived from ${request.phaseTranscript.length} transcript entries.`,
  });
}

function defaultCollapseResponse(request: CollapseInput, index: number): CollapseResponse {
  const suffix =
    request.phaseConsequences?.[0] ?? `${request.context.mainAxis} -> ${request.context.endLine}`;

  return validateCollapseResponse({
    alpha: `Mock alpha ${index + 1}: ${suffix}`,
    beta: `Mock beta ${index + 1}: ${suffix}`,
    inferenceTrace: `Collapse derived from ${request.phaseConsequences?.length ?? 0} consequences.`,
  });
}

function resolveGenerateResult(
  responses: readonly GenerateResult[] | undefined,
  index: number,
): GenerateResult {
  if (!responses || responses.length === 0) {
    return defaultGenerateResult(index);
  }

  return responses[Math.min(index, responses.length - 1)] ?? defaultGenerateResult(index);
}

function buildAuditAnswers(
  packet: AuditPacket,
  auditBehavior: AuditBehavior,
  auditCallCount: number,
  questionMap: Map<string, AuditQuestion>,
): readonly boolean[] {
  const expectedAnswers = packet.auditQuestions.map(
    (questionText) => questionMap.get(questionText)?.expected ?? true,
  );
  const blockingIndex = packet.auditQuestions.findIndex(
    (questionText) => questionMap.get(questionText)?.blocking ?? false,
  );
  const failingIndex = blockingIndex >= 0 ? blockingIndex : 0;
  const shouldFail =
    auditBehavior === 'fail-always' || (auditBehavior === 'fail-once' && auditCallCount === 1);

  if (!shouldFail || packet.auditQuestions.length === 0) {
    return expectedAnswers;
  }

  return expectedAnswers.map((answer, index) => (index === failingIndex ? !answer : answer));
}

/**
 * Deterministic multi-mode adapter used by the Phase 07 E2E suite.
 */
export function createE2EMockAdapter(config: E2EMockAdapterConfig = {}): E2EMockAdapterHarness {
  const callLog: AdapterMode[] = [];
  const generateCalls: PromptObject[] = [];
  const auditCalls: AuditPacket[] = [];
  const settlementCalls: PhaseConsequenceRequest[] = [];
  const collapseCalls: CollapseInput[] = [];

  const questionMap = buildQuestionMap(config.questionSet);

  let generateCallCount = 0;
  let auditCallCount = 0;
  let collapseCallCount = 0;

  return {
    adapter: {
      async generate(prompt) {
        callLog.push('generate');
        const validatedPrompt = validatePromptObject(prompt);

        generateCalls.push(validatedPrompt);

        const response = resolveGenerateResult(config.generateResponses, generateCallCount);
        generateCallCount += 1;

        return deepFreeze({
          beatText: response.beatText,
          options: [...response.options],
          ...(response.usage ? { usage: response.usage } : {}),
        });
      },

      async audit(packet) {
        callLog.push('audit');
        const validatedPacket = validateAuditPacket(packet);

        auditCalls.push(validatedPacket);
        auditCallCount += 1;

        const answers = buildAuditAnswers(
          validatedPacket,
          config.auditBehavior ?? 'pass',
          auditCallCount,
          questionMap,
        );

        return deepFreeze({
          answers: [...answers],
        } satisfies AuditResult);
      },

      async settlement(request) {
        callLog.push('settlement');
        const validatedRequest = validatePhaseConsequenceRequest(request);

        settlementCalls.push(validatedRequest);

        return deepFreeze(
          validatePhaseConsequenceResponse(
            config.settlementResponse ?? defaultSettlementResponse(validatedRequest),
          ),
        );
      },

      async collapse(request) {
        callLog.push('collapse');
        collapseCalls.push(request);

        const response =
          config.collapseResponses?.[
            Math.min(collapseCallCount, config.collapseResponses.length - 1)
          ] ?? defaultCollapseResponse(request, collapseCallCount);
        collapseCallCount += 1;

        return deepFreeze(validateCollapseResponse(response));
      },
    },
    callLog,
    generateCalls,
    auditCalls,
    settlementCalls,
    collapseCalls,
    getCallCounts() {
      return {
        generate: generateCalls.length,
        audit: auditCalls.length,
        settlement: settlementCalls.length,
        collapse: collapseCalls.length,
      };
    },
  };
}
