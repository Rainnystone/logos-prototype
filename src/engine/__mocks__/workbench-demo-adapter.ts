import { deepFreeze } from '@/lib/deep-freeze';
import {
  validateCollapseResponse,
  validateGossipelogInjectionResult,
  validateGossipelogUpdateResult,
  validatePhaseConsequenceResponse,
} from '@/engine/schema-validator';
import type { CollapseInput, GenerateResult, LLMAdapter } from '@/engine/types/adapter-interface';

function buildOptions(
  beatIndex: number,
  verbs: readonly string[],
  router: string,
): readonly string[] {
  const fallbackVerbs = ['advance', 'observe', 'divert', 'hold'];
  const optionSeeds = [...verbs, ...fallbackVerbs].slice(0, 4);

  return optionSeeds.map(
    (verb, index) =>
      `${verb[0]?.toUpperCase() ?? 'A'}${verb.slice(1)} through ${router} lane ${beatIndex}-${index + 1}.`,
  );
}

function resolvePlayerInput(
  promptObject: Parameters<NonNullable<LLMAdapter['generate']>>[0],
): string {
  const latestUserEntry = [...promptObject.history]
    .reverse()
    .find((entry) => entry.role === 'user');

  return latestUserEntry?.content ?? 'Advance the current beat.';
}

function resolveCollapseSeed(request: CollapseInput): string {
  return request.phaseConsequences?.[0] ?? request.context.mainAxis;
}

function resolveRelationshipPair(
  roleIds: readonly string[],
  heroRoleId: string | null,
) {
  const uniqueRoleIds = [...new Set(roleIds)];

  if (uniqueRoleIds.length < 2) {
    return null;
  }

  const nonHeroRoleIds = heroRoleId
    ? uniqueRoleIds.filter((roleId) => roleId !== heroRoleId)
    : uniqueRoleIds;

  const preferredSourceRoleId = nonHeroRoleIds[0];
  const preferredTargetRoleId = heroRoleId ?? uniqueRoleIds.find((roleId) => roleId !== preferredSourceRoleId);

  if (
    preferredSourceRoleId &&
    preferredTargetRoleId &&
    preferredSourceRoleId !== preferredTargetRoleId
  ) {
    return {
      sourceRoleId: preferredSourceRoleId,
      targetRoleId: preferredTargetRoleId,
    };
  }

  const [sourceRoleId, targetRoleId] = uniqueRoleIds.slice(0, 2);

  if (!sourceRoleId || !targetRoleId || sourceRoleId === targetRoleId) {
    return null;
  }

  return { sourceRoleId, targetRoleId };
}

function hasExistingRelationshipEdge(
  relationshipSubgraph: Parameters<NonNullable<LLMAdapter['gossipelogUpdate']>>[0]['relationshipSubgraph'],
  sourceRoleId: string,
  targetRoleId: string,
): boolean {
  return Boolean(
    relationshipSubgraph.relationshipsBySource[sourceRoleId]?.targets[targetRoleId],
  );
}

/**
 * Deterministic local adapter for the workbench UI when no provider config is saved yet.
 */
export function createWorkbenchDemoAdapter(): LLMAdapter {
  let generateCount = 0;

  return {
    async collapse(request) {
      const seed = resolveCollapseSeed(request);

      return deepFreeze(
        validateCollapseResponse({
          alpha: `Demo alpha boundary anchored to: ${seed}`,
          beta: `Demo beta boundary anchored to: ${seed}`,
          inferenceTrace: 'Derived locally from the active scene context.',
          usage: {
            promptTokens: 72,
            completionTokens: 24,
            totalTokens: 96,
          },
        }),
      );
    },

    async gossipelogUpdate(request) {
      const heroRoleId = request.candidateRoles[0]?.characterId ?? null;
      const pair = resolveRelationshipPair(request.sceneCastRoleIds, heroRoleId);
      const involvedRoleIds = [...new Set(request.sceneCastRoleIds)].slice(0, 2);

      return deepFreeze(
        validateGossipelogUpdateResult(
          pair
            ? {
                involvedRoleIds,
                invocationNoOp: false,
                memoryUpdates: [
                  {
                    sourceRoleId: pair.sourceRoleId,
                    targetRoleId: pair.targetRoleId,
                    shouldCreateEdge: !hasExistingRelationshipEdge(
                      request.relationshipSubgraph,
                      pair.sourceRoleId,
                      pair.targetRoleId,
                    ),
                    nextCurrentRelation: {
                      phaseId: request.phaseId,
                      beatIndex: request.beatIndex,
                      roundId: request.roundId,
                      functionalRole: null,
                      mindsetTags: ['demo continuity'],
                      summary: `Demo update grounded in ${request.sceneCastFraming.sceneId} and ${request.acceptedBeatText.length} characters of accepted beat text.`,
                      triggerEvent: 'Demo accepted beat processed',
                      reasoning: 'Demo adapter derives one deterministic relation refresh from the scene cast.',
                      causalAction: 'Carry the refreshed relation into the next prompt context.',
                    },
                  },
                ],
              }
            : {
                involvedRoleIds,
                invocationNoOp: true,
                memoryUpdates: [],
              },
        ),
      );
    },

    async gossipelogInjection(request) {
      const roleSummary =
        request.roleDefinitions
          .slice(0, 2)
          .map((role) => role.identityRole)
          .join(', ') || 'no role definitions';

      return deepFreeze(
        validateGossipelogInjectionResult({
          highlightedDeltasText: `Demo deltas for ${request.sceneCastRoleIds.join(
            ' -> ',
          ) || 'an empty cast'} inside ${request.sceneCastFraming.sceneId}.`,
          stableBackgroundText: `Demo background for ${request.relationshipSubgraph.meta.storyPackage} with ${roleSummary}.`,
        }),
      );
    },

    async route(request) {
      const normalizedHint = request.context.routerHint?.trim();
      const hintedRouter = request.availableRouters.find(
        (router) => router.routerName === normalizedHint,
      );
      const partiallyMatchedRouter = normalizedHint
        ? request.availableRouters.find((router) => normalizedHint.includes(router.routerName))
        : undefined;
      const latestUserEntry = [...request.historyWindow]
        .reverse()
        .find((entry) => entry.role === 'user');
      const fallbackRouter =
        request.availableRouters.find((router) =>
          latestUserEntry?.content.includes(router.routerName),
        ) ?? request.availableRouters[0];
      const selectedRouter = hintedRouter ?? partiallyMatchedRouter ?? fallbackRouter;

      if (!selectedRouter) {
        throw new Error('Workbench demo adapter requires at least one available router.');
      }

      return deepFreeze({
        routerName: selectedRouter.routerName,
        inferenceTrace: 'Derived locally from the active round context and router prior.',
        usage: {
          promptTokens: 64,
          completionTokens: 20,
          totalTokens: 84,
        },
      });
    },

    async generate(promptObject) {
      generateCount += 1;

      const playerInput = resolvePlayerInput(promptObject);
      const prefix = promptObject.generationControl?.isRewrite ? 'Revised beat' : 'Demo beat';

      return deepFreeze({
        beatText: `${prefix} ${generateCount}. The player action "${playerInput}" pushes toward ${promptObject.narrative.phaseGoal} at ${promptObject.directorNote.volume} intensity while the engine stays inside the active boundaries.`,
        options: buildOptions(
          generateCount,
          promptObject.directorNote.verbLexicon,
          promptObject.directorNote.router,
        ),
        usage: {
          promptTokens: 168,
          completionTokens: 54,
          totalTokens: 222,
        },
      } satisfies GenerateResult);
    },

    async audit(packet) {
      return deepFreeze({
        answers: packet.auditQuestions.map(() => true),
        usage: {
          promptTokens: 84,
          completionTokens: 18,
          totalTokens: 102,
        },
      });
    },

    async settlement(packet) {
      const recentConsequences = packet.phaseTranscript
        .filter((entry) => entry.role === 'assistant')
        .slice(-3)
        .map((entry, index) => `Demo consequence ${index + 1}: ${entry.content}`)
        .slice(0, 6);

      return deepFreeze(
        validatePhaseConsequenceResponse({
          phaseConsequences:
            recentConsequences.length > 0
              ? recentConsequences
              : ['Demo consequence 1: the current phase has been accepted.'],
          settlementTrace: 'Derived locally from the accepted transcript.',
          usage: {
            promptTokens: 114,
            completionTokens: 32,
            totalTokens: 146,
          },
        }),
      );
    },
  };
}
