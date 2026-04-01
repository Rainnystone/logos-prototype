import { cpSync, rmSync } from 'node:fs';
import path from 'node:path';

import { deepFreeze } from '@/lib/deep-freeze';
import {
  validateAuditPacket,
  validateCollapseResponse,
  validateGossipelogInjectionResult,
  validateGossipelogUpdateResult,
  validatePhaseConsequenceRequest,
  validatePhaseConsequenceResponse,
  validatePromptObject,
} from '@/engine/schema-validator';
import { loadStoryPackage } from '@/engine/story-loader';
import type {
  AuditResult,
  CollapseInput,
  GenerateResult,
  LLMAdapter,
  RouteRequest,
} from '@/engine/types/adapter-interface';
import type {
  AuditPacket,
  AuditQuestion,
  AuditQuestionSet,
  CollapseResponse,
  GossipelogInjectionResult,
  PhaseConsequenceRequest,
  PhaseConsequenceResponse,
  PromptObject,
  StoryPackage,
} from '@/types';

export type AuditBehavior = 'pass' | 'fail-once' | 'fail-always';
export type AdapterMode = 'generate' | 'audit' | 'settlement' | 'collapse' | 'route';

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
  readonly routeCalls: RouteRequest[];
  getCallCounts(): Readonly<Record<AdapterMode, number>>;
}

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const samplePackagePath = path.resolve(storyPackagesRoot, 'sample-scene');
const tempPackagePaths: string[] = [];

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

function resolveRelationshipPair(roleIds: readonly string[]) {
  const [sourceRoleId, targetRoleId] = [...new Set(roleIds)].slice(0, 2);

  if (!sourceRoleId || !targetRoleId || sourceRoleId === targetRoleId) {
    return null;
  }

  return { sourceRoleId, targetRoleId };
}

export async function createTempSampleSceneFixture(): Promise<{
  readonly packageName: string;
  readonly storyPackage: StoryPackage;
}> {
  const packageName = `tmp-gossipelog-e2e-${Math.random().toString(16).slice(2)}`;
  const packagePath = path.resolve(storyPackagesRoot, packageName);

  tempPackagePaths.push(packagePath);
  cpSync(samplePackagePath, packagePath, { recursive: true });

  return {
    packageName,
    storyPackage: await loadStoryPackage(packageName),
  };
}

export function cleanupTempSampleSceneFixtures(): void {
  while (tempPackagePaths.length > 0) {
    const packagePath = tempPackagePaths.pop();

    if (packagePath) {
      rmSync(packagePath, { recursive: true, force: true });
    }
  }
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
  const routeCalls: RouteRequest[] = [];

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

      async route(request) {
        callLog.push('route');
        routeCalls.push(request);
        const normalizedHint = request.context.routerHint?.trim();

        const selectedRouter =
          request.availableRouters.find((router) => router.routerName === normalizedHint) ??
          request.availableRouters.find((router) =>
            normalizedHint ? normalizedHint.includes(router.routerName) : false,
          ) ??
          request.availableRouters[0];

        if (!selectedRouter) {
          throw new Error('E2E mock route requires at least one available router.');
        }

        return deepFreeze({
          routerName: selectedRouter.routerName,
          inferenceTrace: `Route derived from volume ${request.context.currentVolume}.`,
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

      async gossipelogUpdate(request) {
        const pair = resolveRelationshipPair(request.sceneCastRoleIds);
        const involvedRoleIds = [...new Set(request.sceneCastRoleIds)].slice(0, 2);

        return deepFreeze(
          validateGossipelogUpdateResult(
            pair
              ? {
                  involvedRoleIds,
                  invocationNoOp: false,
                  edgeUpdates: [
                    {
                      sourceRoleId: pair.sourceRoleId,
                      targetRoleId: pair.targetRoleId,
                      mode: 'delta',
                      replaceBaseline: false,
                      recentDelta: {
                        state: `E2E refresh for ${request.roundId}.`,
                        sourceRound: request.roundId,
                      },
                    },
                  ],
                }
              : {
                  involvedRoleIds,
                  invocationNoOp: true,
                  edgeUpdates: [],
                },
          ),
        );
      },

      async gossipelogInjection(request) {
        const firstEdgeSource = Object.keys(request.relationshipSubgraph.relationshipsBySource)[0];
        const firstEdgeTarget = firstEdgeSource
          ? Object.keys(request.relationshipSubgraph.relationshipsBySource[firstEdgeSource]?.targets ?? {})[0]
          : null;
        const highlightedDeltasText =
          firstEdgeSource && firstEdgeTarget
            ? `${firstEdgeSource} -> ${firstEdgeTarget} refreshed for ${request.sceneCastFraming.sceneId}.`
            : `No refreshed edges for ${request.sceneCastFraming.sceneId}.`;

        return deepFreeze(
          validateGossipelogInjectionResult({
            highlightedDeltasText,
            stableBackgroundText: `Stable relationship background for ${request.relationshipSubgraph.meta.storyPackage}.`,
          } satisfies GossipelogInjectionResult),
        );
      },
    },
    callLog,
    generateCalls,
    auditCalls,
    settlementCalls,
    collapseCalls,
    routeCalls,
    getCallCounts() {
      return {
        generate: generateCalls.length,
        audit: auditCalls.length,
        settlement: settlementCalls.length,
        collapse: collapseCalls.length,
        route: routeCalls.length,
      };
    },
  };
}
