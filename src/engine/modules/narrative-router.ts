import { z } from 'zod';

import { deepFreeze } from '@/lib/deep-freeze';
import { parseWithSchema } from '@/lib/validation';
import type { LLMAdapter, RouteRequest, RouteResult } from '@/engine/types/adapter-interface';
import { HistoryEntrySchema, RouterProfileSchema, VolumeSchema, type RouterProfile } from '@/types';

export interface RouterSelection {
  readonly routerName: string;
  readonly routerSemanticCore: string;
  readonly verbLexicon: readonly string[];
  readonly inferenceTrace?: string;
}

export const RouteRequestSchema = z
  .object({
    context: z
      .object({
        phaseGoal: z.string(),
        currentVolume: VolumeSchema,
        alpha: z.string(),
        beta: z.string(),
        sceneProgress: z.string().optional(),
        routerHint: z.string().optional(),
      })
      .strict(),
    historyWindow: z.array(HistoryEntrySchema),
    availableRouters: z.array(RouterProfileSchema).min(1),
  })
  .strict();

export type NarrativeRouterInput = z.infer<typeof RouteRequestSchema>;

const ROUTE_MAX_ATTEMPTS = 3;

function requireFirstProfile(routerProfiles: readonly RouterProfile[]): RouterProfile {
  const [firstProfile] = routerProfiles;

  if (!firstProfile) {
    throw new Error('Narrative Router requires at least one router profile.');
  }

  return firstProfile;
}

function selectMatchingProfile(
  routerProfiles: readonly RouterProfile[],
  routerHint?: string,
): RouterProfile {
  const firstProfile = requireFirstProfile(routerProfiles);
  const normalizedHint = routerHint?.trim();

  if (!normalizedHint) {
    return firstProfile;
  }

  return (
    routerProfiles.find((profile) => profile.routerName === normalizedHint) ??
    routerProfiles.find((profile) => normalizedHint.includes(profile.routerName)) ??
    firstProfile
  );
}

function cloneSelection(profile: RouterProfile, inferenceTrace?: string): RouterSelection {
  return deepFreeze({
    routerName: profile.routerName,
    routerSemanticCore: profile.routerSemanticCore,
    verbLexicon: [...profile.verbLexicon],
    ...(inferenceTrace ? { inferenceTrace } : {}),
  });
}

function resolveSelectedProfile(
  routerProfiles: readonly RouterProfile[],
  routeResult: RouteResult,
): RouterProfile {
  const normalizedRouterName = routeResult.routerName.trim();
  const profile = routerProfiles.find((item) => item.routerName === normalizedRouterName);

  if (!profile) {
    throw new Error(`Narrative Router returned an unknown router name: ${routeResult.routerName}`);
  }

  return profile;
}

function buildFallbackInferenceTrace(lastError: Error | null): string {
  if (!lastError) {
    return 'Fallback route selected after repeated route inference failure.';
  }

  return `Fallback route selected after repeated route inference failure: ${lastError.message}`;
}

/**
 * Fixture-safe static router selection retained for simplified cases and tests.
 *
 * @see LOGOS-SPEC/04_MODULES/narrative-router.md
 */
export function selectRouter(
  routerProfiles: readonly RouterProfile[],
  routerHint?: string,
): RouterSelection {
  const profile = selectMatchingProfile(routerProfiles, routerHint);
  return cloneSelection(profile);
}

/**
 * Returns a copy of the canonical verb lexicon for a router name.
 *
 * @see LOGOS-SPEC/04_MODULES/narrative-router.md
 */
export function getVerbLexicon(
  routerProfiles: readonly RouterProfile[],
  routerName: string,
): readonly string[] {
  const profile = routerProfiles.find((item) => item.routerName === routerName);

  if (!profile) {
    throw new Error(`Unknown router name: ${routerName}`);
  }

  return deepFreeze([...profile.verbLexicon]);
}

/**
 * LLM-driven narrative router inference for the current round.
 *
 * @see LOGOS-SPEC/04_MODULES/narrative-router.md
 */
export function createNarrativeRouter(adapter: LLMAdapter) {
  return {
    async selectRouter(input: RouteRequest): Promise<RouterSelection> {
      const validatedInput = parseWithSchema(RouteRequestSchema, input, 'routeRequest');

      if (!adapter.route) {
        return selectRouter(validatedInput.availableRouters, validatedInput.context.routerHint);
      }

      let lastError: Error | null = null;

      for (let attemptIndex = 0; attemptIndex < ROUTE_MAX_ATTEMPTS; attemptIndex += 1) {
        try {
          const routeResult = await adapter.route(validatedInput as RouteRequest);
          const profile = resolveSelectedProfile(validatedInput.availableRouters, routeResult);

          return cloneSelection(profile, routeResult.inferenceTrace);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      const fallbackSelection = selectRouter(
        validatedInput.availableRouters,
        validatedInput.context.routerHint,
      );

      return deepFreeze({
        ...fallbackSelection,
        inferenceTrace: buildFallbackInferenceTrace(lastError),
      });
    },
  };
}
