import { deepFreeze } from '@/lib/deep-freeze';
import {
  validateCollapseResponse,
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
