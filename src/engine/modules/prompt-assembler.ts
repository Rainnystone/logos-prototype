import { deepFreeze } from '@/lib/deep-freeze';
import { validatePromptObject } from '@/engine/schema-validator';
import type { DirectorNote, HistoryEntry, PreviousDraft, PromptObject, WorldBase } from '@/types';

export interface PromptAssemblerInput {
  readonly worldBase: WorldBase;
  readonly precedingBeats: readonly HistoryEntry[];
  readonly mainAxis: string;
  readonly endLine: string;
  readonly phaseGoal: string;
  readonly alpha: string;
  readonly beta: string;
  readonly currentRouter: string;
  readonly verbLexicon: readonly string[];
  readonly directorNote: DirectorNote;
}

export interface RewriteContext {
  readonly retryCount: number;
  readonly rewriteFeedback: string;
  readonly previousDraft: PreviousDraft;
}

function buildBasePromptObject(input: PromptAssemblerInput): PromptObject {
  return {
    worldBase: {
      mainCharacters: input.worldBase.mainCharacters,
      npcCharacters: input.worldBase.npcCharacters ?? '',
      locationPatch: input.worldBase.locationPatch,
    },
    history: input.precedingBeats.map((entry) => ({
      role: entry.role,
      content: entry.content,
    })),
    narrative: {
      mainAxis: input.mainAxis,
      endLine: input.endLine,
      phaseGoal: input.phaseGoal,
      alpha: input.alpha,
      beta: input.beta,
    },
    directorNote: {
      volume: input.directorNote.volume,
      router: input.currentRouter,
      verbLexicon: [...input.verbLexicon],
      beatConstraints: input.directorNote.beatConstraints,
      optionConstraints: input.directorNote.optionConstraints,
    },
  };
}

/**
 * Assembles the four-layer PromptObject for the normal generation path.
 *
 * @see archive/vendor/LOGOS-SPEC/04_MODULES/prompt-assembler.md
 */
export function assemblePromptObject(input: PromptAssemblerInput): PromptObject {
  return deepFreeze(validatePromptObject(buildBasePromptObject(input)));
}

/**
 * Assembles the PromptObject for the rewrite path with a retry-only generationControl overlay.
 *
 * @see archive/vendor/LOGOS-SPEC/04_MODULES/prompt-assembler.md
 */
export function assembleRewritePromptObject(
  input: PromptAssemblerInput,
  rewriteContext: RewriteContext,
): PromptObject {
  const basePromptObject = buildBasePromptObject(input);

  return deepFreeze(
    validatePromptObject({
      ...basePromptObject,
      generationControl: {
        isRewrite: true,
        retryCount: rewriteContext.retryCount,
        rewriteFeedback: rewriteContext.rewriteFeedback,
        previousDraft: {
          beatText: rewriteContext.previousDraft.beatText,
          options: [...rewriteContext.previousDraft.options],
        },
      },
    }),
  );
}
