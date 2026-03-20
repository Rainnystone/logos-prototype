import { deepFreeze } from '@/lib/deep-freeze';
import { validateCollapseResponse } from '@/engine/schema-validator';
import type { CollapseInput, LLMAdapter } from '@/engine/types/adapter-interface';

function resolveCollapseSeed(request: CollapseInput): string {
  const firstConsequence = request.phaseConsequences?.[0];

  if (firstConsequence) {
    return firstConsequence;
  }

  return `${request.context.mainAxis} -> ${request.context.endLine}`;
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
