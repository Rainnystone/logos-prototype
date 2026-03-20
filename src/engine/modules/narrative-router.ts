import { deepFreeze } from '@/lib/deep-freeze';
import type { RouterProfile } from '@/types';

export interface RouterSelection {
  readonly routerName: string;
  readonly routerSemanticCore: string;
  readonly verbLexicon: readonly string[];
}

function selectMatchingProfile(
  routerProfiles: readonly RouterProfile[],
  routerHint?: string,
): RouterProfile {
  const [firstProfile] = routerProfiles;

  if (!firstProfile) {
    throw new Error('Narrative Router requires at least one router profile.');
  }

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

/**
 * Selects the active router and its verb lexicon for the current round.
 *
 * @see LOGOS-SPEC/04_MODULES/narrative-router.md
 */
export function selectRouter(
  routerProfiles: readonly RouterProfile[],
  routerHint?: string,
): RouterSelection {
  const profile = selectMatchingProfile(routerProfiles, routerHint);

  return deepFreeze({
    routerName: profile.routerName,
    routerSemanticCore: profile.routerSemanticCore,
    verbLexicon: [...profile.verbLexicon],
  });
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
