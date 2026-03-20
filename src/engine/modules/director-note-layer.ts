import { deepFreeze } from '@/lib/deep-freeze';
import { parseWithSchema } from '@/lib/validation';
import {
  DirectorNoteSchema,
  type DirectorNote,
  type RoundState,
  type SceneState,
  type Volume,
  type WorldBase,
} from '@/types';

const VOLUME_BEAT_CONSTRAINTS: Readonly<Record<Volume, string>> = {
  Low: 'Use narrative montage, summary framing, and accelerated time flow. Focus on results and consequences rather than moment-by-moment action.',
  Med: 'Maintain real-time pacing with standard interaction density. Balance dialogue and action while keeping the causal chain clear.',
  High: 'Use a slow-motion lens with time stretching and dense sensory detail. Focus on heartbeat, micro-expressions, textures, and subtext.',
};

const VOLUME_OPTION_FORMATTING: Readonly<Record<Volume, string>> = {
  Low: 'broad-strokes action wording with compressed time and macro-level framing',
  Med: 'standard action wording with clear real-time affordances',
  High: 'micro-sensory action wording with compressed physical time and heightened immediacy',
};

function buildCanonGrounding(): string {
  return [
    'Treat the supplied WorldBase as the local canon authority for this round.',
    'You may draw on compatible franchise, worldview, and character knowledge when it preserves continuity and tone.',
    'Do not contradict WorldBase, and do not write any character out of character.',
  ].join(' ');
}

function resolveDirectorConstraints(directorConstraints: string | undefined): string {
  const normalizedConstraints = directorConstraints?.trim() ?? '';

  if (normalizedConstraints.length === 0) {
    return 'No additional local hard rules were supplied for this round.';
  }

  return `Audit-grounded answer targets: ${normalizedConstraints}`;
}

function buildBeatConstraints(roundState: RoundState, sceneState: SceneState): string {
  return [
    `Volume discipline (${roundState.currentVolume}): ${VOLUME_BEAT_CONSTRAINTS[roundState.currentVolume]}`,
    `This Beat should advance the current Phase goal: ${roundState.phaseGoal}.`,
    `Generated prose must stay within Alpha boundary (${sceneState.alpha}) and Beta boundary (${sceneState.beta}).`,
    `Router alignment remains ${roundState.currentRouter}; keep the prose compatible with the active verb lexicon.`,
    'Reading experience rule: never output the beat as one giant wall of text. Use multiple well-paced paragraphs, preserve natural paragraph breaks, and keep the visual rhythm easy to read on screen.',
    buildCanonGrounding(),
    resolveDirectorConstraints(roundState.directorConstraints),
  ].join(' ');
}

function resolveCharacterProfile(characterProfile: string): string {
  const normalizedProfile = characterProfile.trim();

  if (normalizedProfile.length > 0) {
    return normalizedProfile;
  }

  return 'No character profile supplied; default to baseline plausibility checks.';
}

/**
 * Encodes the Option Generator three-step pipeline as `optionConstraints`.
 *
 * @see LOGOS-SPEC/04_MODULES/option-generator.md
 */
export function buildOptionConstraints(
  roundState: RoundState,
  sceneState: SceneState,
  characterProfile: string,
): string {
  const verbCount = roundState.verbLexicon.length;
  const verbList = roundState.verbLexicon.join(', ');
  const resolvedCharacterProfile = resolveCharacterProfile(characterProfile);

  return [
    `Step 1 - Route Locking: Generate exactly 4 options. Select 4 from these ${verbCount} verb directions: [${verbList}]. Each option must be orthogonal to the others and map to a distinct action direction.`,
    `Step 2 - Anti-OOC Engine: Before finalizing each option, run an Anti-OOC Chain-of-Thought check against this character profile: ${resolvedCharacterProfile}. ${buildCanonGrounding()} Verify the action remains psychologically plausible and compliant with Alpha (${sceneState.alpha}) / Beta (${sceneState.beta}) boundaries.`,
    `Step 3 - Volume Formatting: Format each option at ${roundState.currentVolume} grain using ${VOLUME_OPTION_FORMATTING[roundState.currentVolume]}.`,
    resolveDirectorConstraints(roundState.directorConstraints),
  ].join(' ');
}

/**
 * Builds the PromptObject Layer-4 DirectorNote from current round control state.
 *
 * @see LOGOS-SPEC/04_MODULES/director-note-layer.md
 */
export function buildDirectorNote(
  roundState: RoundState,
  sceneState: SceneState,
  worldBase: WorldBase,
): DirectorNote {
  const directorNote = parseWithSchema(
    DirectorNoteSchema,
    {
      volume: roundState.currentVolume,
      router: roundState.currentRouter,
      verbLexicon: [...roundState.verbLexicon],
      beatConstraints: buildBeatConstraints(roundState, sceneState),
      optionConstraints: buildOptionConstraints(roundState, sceneState, worldBase.mainCharacters),
    },
    'directorNote',
  );

  return deepFreeze(directorNote);
}
