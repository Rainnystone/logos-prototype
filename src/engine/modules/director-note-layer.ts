import { deepFreeze } from '@/lib/deep-freeze';
import { parseWithSchema } from '@/lib/validation';
import {
  type BeatVolumeDefinitions,
  type ControlModules,
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

type DirectorNoteControlOverrides = Pick<
  ControlModules,
  'directorNoteAdditions' | 'beatVolumeDefinitions'
>;

function normalizeOptionalText(value: string | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

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

  return `Local hard rules to obey without exception: ${normalizedConstraints}`;
}

function buildParagraphDiscipline(): string {
  return [
    'Paragraph discipline is mandatory: beatText must be split into multiple readable paragraphs.',
    'A single oversized paragraph, visually dense wall of text, or collapsed block with no visible paragraph breaks is unacceptable and counts as a hard failure even if the story content is otherwise correct.',
    'Insert a paragraph break immediately whenever the focus, action, speaker, time step, or causal beat shifts.',
    'If unsure, prefer shorter paragraphs and more breaks over one long block.',
  ].join(' ');
}

function resolveBeatConstraintText(
  volume: Volume,
  beatVolumeDefinitions?: BeatVolumeDefinitions,
): string {
  return beatVolumeDefinitions?.[volume].beatConstraints ?? VOLUME_BEAT_CONSTRAINTS[volume];
}

function resolveOptionFormattingText(
  volume: Volume,
  beatVolumeDefinitions?: BeatVolumeDefinitions,
): string {
  return beatVolumeDefinitions?.[volume].optionFormatting ?? VOLUME_OPTION_FORMATTING[volume];
}

function appendAuthorAddition(base: string, addition: string | undefined): string {
  const normalizedAddition = normalizeOptionalText(addition);
  return normalizedAddition ? `${base} Author addition: ${normalizedAddition}` : base;
}

function buildBeatConstraints(
  roundState: RoundState,
  sceneState: SceneState,
  controlOverrides?: DirectorNoteControlOverrides,
): string {
  return [
    `Volume discipline (${roundState.currentVolume}): ${resolveBeatConstraintText(
      roundState.currentVolume,
      controlOverrides?.beatVolumeDefinitions,
    )}`,
    `Phase discipline: Strictly obey the current Phase plan and advance the current Phase goal (${roundState.phaseGoal}) without skipping ahead to later-phase outcomes or violating active red lines.`,
    `Generated prose must stay within Alpha boundary (${sceneState.alpha}) and Beta boundary (${sceneState.beta}).`,
    buildParagraphDiscipline(),
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
 * @see archive/vendor/LOGOS-SPEC/04_MODULES/option-generator.md
 */
export function buildOptionConstraints(
  roundState: RoundState,
  sceneState: SceneState,
  characterProfile: string,
  controlOverrides?: DirectorNoteControlOverrides,
): string {
  const resolvedCharacterProfile = resolveCharacterProfile(characterProfile);

  return [
    'Step 1 - Orthogonal Action Framing: Generate exactly 4 options. Each option must be materially distinct in approach, commitment level, risk profile, or immediate tactic. Do not collapse the set into paraphrases of the same move, and let variety emerge from the live local situation.',
    `Step 2 - Anti-OOC Engine: Before finalizing each option, run an Anti-OOC Chain-of-Thought check against this character profile: ${resolvedCharacterProfile}. ${buildCanonGrounding()} Verify the action remains psychologically plausible and compliant with Alpha (${sceneState.alpha}) / Beta (${sceneState.beta}) boundaries.`,
    `Phase discipline: Every option must strictly obey the current Phase plan and remain a plausible move toward the current Phase goal (${roundState.phaseGoal}) without jumping to later-phase resolutions or violating active red lines.`,
    `Step 3 - Volume Formatting: Format each option at ${roundState.currentVolume} grain using ${resolveOptionFormattingText(roundState.currentVolume, controlOverrides?.beatVolumeDefinitions)}.`,
    resolveDirectorConstraints(roundState.directorConstraints),
  ].join(' ');
}

/**
 * Builds the PromptObject Layer-4 DirectorNote from current round control state.
 *
 * @see archive/vendor/LOGOS-SPEC/04_MODULES/director-note-layer.md
 */
export function buildDirectorNote(
  roundState: RoundState,
  sceneState: SceneState,
  worldBase: WorldBase,
  controlOverrides?: DirectorNoteControlOverrides,
): DirectorNote {
  const directorNote = parseWithSchema(
    DirectorNoteSchema,
    {
      volume: roundState.currentVolume,
      beatConstraints: appendAuthorAddition(
        buildBeatConstraints(roundState, sceneState, controlOverrides),
        controlOverrides?.directorNoteAdditions.beatConstraintsAdditions,
      ),
      optionConstraints: appendAuthorAddition(
        buildOptionConstraints(
          roundState,
          sceneState,
          worldBase.mainCharacters,
          controlOverrides,
        ),
        controlOverrides?.directorNoteAdditions.optionConstraintsAdditions,
      ),
    },
    'directorNote',
  );

  return deepFreeze(directorNote);
}
