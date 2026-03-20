import { describe, expect, it } from 'vitest';

import type { GradientType, Volume } from '@/types';
import { buildVolumeSequence, getCurrentVolume } from '@/engine/modules/phase-gradient';

const expectedGradientMap: Record<GradientType, readonly Volume[]> = {
  Rising: ['Low', 'Med', 'Med', 'High'],
  Falling: ['High', 'Med', 'Med', 'Low'],
  'Static High': ['High', 'High', 'High', 'High'],
  'U-Shape': ['High', 'Low', 'Low', 'High'],
  Arch: ['Low', 'High', 'High', 'Low'],
  Pulse: ['High', 'Low', 'High', 'Low'],
  Steady: ['Med', 'Med', 'Med', 'Med'],
};

describe('Phase Gradient', () => {
  it.each(Object.entries(expectedGradientMap) as Array<[GradientType, readonly Volume[]]>)(
    'maps %s to the correct four-beat volume sequence',
    (gradientType, expectedSequence) => {
      expect(buildVolumeSequence(gradientType)).toEqual(expectedSequence);
    },
  );

  it.each(Object.keys(expectedGradientMap) as GradientType[])(
    'always returns a four-element sequence for %s',
    (gradientType) => {
      expect(buildVolumeSequence(gradientType)).toHaveLength(4);
    },
  );

  it.each(Object.keys(expectedGradientMap) as GradientType[])(
    'only uses valid volumes for %s',
    (gradientType) => {
      expect(
        buildVolumeSequence(gradientType).every((volume) =>
          ['Low', 'Med', 'High'].includes(volume),
        ),
      ).toBe(true);
    },
  );

  it('returns the current beat volume for valid indexes', () => {
    expect(getCurrentVolume('Rising', 0)).toBe('Low');
    expect(getCurrentVolume('Rising', 3)).toBe('High');
    expect(getCurrentVolume('Static High', 2)).toBe('High');
    expect(getCurrentVolume('Pulse', 1)).toBe('Low');
  });

  it('throws on invalid beat indexes', () => {
    expect(() => getCurrentVolume('Rising', -1)).toThrow(/0-3/);
    expect(() => getCurrentVolume('Rising', 4)).toThrow(/0-3/);
  });

  it('throws on unknown gradient types', () => {
    expect(() => buildVolumeSequence('InvalidType' as GradientType)).toThrow(
      /Unknown gradient type/,
    );
    expect(() => getCurrentVolume('InvalidType' as GradientType, 0)).toThrow(
      /Unknown gradient type/,
    );
  });

  it('returns a new array for each build call', () => {
    const firstSequence = buildVolumeSequence('Steady');
    const secondSequence = buildVolumeSequence('Steady');

    expect(firstSequence).toEqual(secondSequence);
    expect(firstSequence).not.toBe(secondSequence);
  });
});
