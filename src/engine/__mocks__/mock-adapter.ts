import { deepFreeze } from '@/lib/deep-freeze';
import {
  validateCollapseResponse,
  validateGossipelogInjectionResult,
  validateGossipelogUpdateResult,
} from '@/engine/schema-validator';
import type { CollapseInput, LLMAdapter } from '@/engine/types/adapter-interface';

function resolveCollapseSeed(request: CollapseInput): string {
  const firstConsequence = request.phaseConsequences?.[0];

  if (firstConsequence) {
    return firstConsequence;
  }

  return `${request.context.mainAxis} -> ${request.context.endLine}`;
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

export function createMockAdapter(): LLMAdapter {
  return {
    async collapse(request) {
      const seed = resolveCollapseSeed(request);
      const response = validateCollapseResponse({
        alpha: `[Mock] Aggressive boundary after: ${seed}`,
        beta: `[Mock] Conservative boundary after: ${seed}`,
        inferenceTrace: `[Mock] Inferred from ${request.phaseConsequences?.length ?? 0} consequences`,
      });

      return deepFreeze(response);
    },

    async gossipelogUpdate(request) {
      const heroRoleId = request.candidateRoles[0]?.characterId ?? null;
      const pair = resolveRelationshipPair(request.sceneCastRoleIds, heroRoleId);

      return deepFreeze(
        validateGossipelogUpdateResult(
          pair
            ? {
                involvedRoleIds: [...new Set(request.sceneCastRoleIds)].slice(0, 2),
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
                      mindsetTags: ['[Mock] observed shift'],
                      summary: `[Mock] ${request.acceptedBeatText.length} chars absorbed for ${pair.sourceRoleId} -> ${pair.targetRoleId}.`,
                      triggerEvent: '[Mock] accepted beat processed',
                      reasoning: '[Mock] deterministic adapter refreshed the current relation',
                      causalAction: '[Mock] store the refreshed relation as current memory',
                    },
                  },
                ],
              }
            : {
                involvedRoleIds: [...new Set(request.sceneCastRoleIds)].slice(0, 2),
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
          .map((role) => role.name)
          .join(', ') || 'no role definitions';

      return deepFreeze(
        validateGossipelogInjectionResult({
          highlightedDeltasText: `[Mock] Highlighted deltas for ${request.sceneCastRoleIds.join(
            ' -> ',
          ) || 'an empty cast'}.`,
          stableBackgroundText: `[Mock] Stable background for ${request.relationshipSubgraph.meta.storyPackage} with ${roleSummary}.`,
        }),
      );
    },

    async route(request) {
      const [firstRouter] = request.availableRouters;

      if (!firstRouter) {
        throw new Error('Mock adapter route requires at least one available router.');
      }

      return deepFreeze({
        routerName: firstRouter.routerName,
        inferenceTrace: '[Mock] Selected the first available router.',
      });
    },
  };
}
