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

function resolveRelationshipPair(roleIds: readonly string[]) {
  const [sourceRoleId, targetRoleId] = [...new Set(roleIds)].slice(0, 2);

  if (!sourceRoleId || !targetRoleId || sourceRoleId === targetRoleId) {
    return null;
  }

  return { sourceRoleId, targetRoleId };
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
      const pair = resolveRelationshipPair(request.sceneCastRoleIds);

      return deepFreeze(
        validateGossipelogUpdateResult(
          pair
            ? {
                involvedRoleIds: [...new Set(request.sceneCastRoleIds)].slice(0, 2),
                invocationNoOp: false,
                edgeUpdates: [
                  {
                    sourceRoleId: pair.sourceRoleId,
                    targetRoleId: pair.targetRoleId,
                    mode: 'delta',
                    replaceBaseline: false,
                    recentDelta: {
                      state: `[Mock] ${request.acceptedBeatText.length} chars absorbed for ${pair.sourceRoleId} -> ${pair.targetRoleId}.`,
                      sourceRound: request.roundId,
                    },
                  },
                ],
              }
            : {
                involvedRoleIds: [...new Set(request.sceneCastRoleIds)].slice(0, 2),
                invocationNoOp: true,
                edgeUpdates: [],
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
