import type { GradientType, Volume } from '@/types';

export const PHASE_BEAT_COUNT = 4;

const GRADIENT_MAP: Readonly<Record<GradientType, readonly Volume[]>> = {
  Rising: ['Low', 'Med', 'Med', 'High'],
  Falling: ['High', 'Med', 'Med', 'Low'],
  'Static High': ['High', 'High', 'High', 'High'],
  'U-Shape': ['High', 'Low', 'Low', 'High'],
  Arch: ['Low', 'High', 'High', 'Low'],
  Pulse: ['High', 'Low', 'High', 'Low'],
  Steady: ['Med', 'Med', 'Med', 'Med'],
};

function getGradientSequence(gradientType: GradientType): readonly Volume[] {
  const sequence = GRADIENT_MAP[gradientType];

  if (!sequence) {
    throw new Error(`Unknown gradient type: ${gradientType}`);
  }

  return sequence;
}

/**
 * Maps a phase gradient type to a four-beat volume sequence.
 *
 * @see archive/vendor/LOGOS-SPEC/04_MODULES/phase-gradient.md
 * @see archive/vendor/LOGOS-SPEC/02_DOMAIN/control-primitives.md
 */
export function buildVolumeSequence(gradientType: GradientType): readonly Volume[] {
  return [...getGradientSequence(gradientType)];
}

/**
 * Returns the current beat's volume for a 0-based beat index inside the active phase.
 *
 * @see archive/vendor/LOGOS-SPEC/04_MODULES/phase-gradient.md
 * @see archive/vendor/LOGOS-SPEC/02_DOMAIN/control-primitives.md
 */
export function getCurrentVolume(gradientType: GradientType, beatIndex: number): Volume {
  if (!Number.isInteger(beatIndex) || beatIndex < 0 || beatIndex >= PHASE_BEAT_COUNT) {
    throw new Error(`Beat index must be 0-3, got: ${beatIndex}`);
  }

  return getGradientSequence(gradientType)[beatIndex]!;
}
