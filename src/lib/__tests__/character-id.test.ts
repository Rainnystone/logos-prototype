import { describe, expect, it } from 'vitest';

import { generateCharacterId } from '@/lib/character-id';

describe('generateCharacterId', () => {
  it('returns chr_ plus six lowercase hex characters', () => {
    const id = generateCharacterId();

    expect(id).toMatch(/^chr_[0-9a-f]{6}$/);
  });

  it('produces distinct ids across repeated calls', () => {
    const ids = Array.from({ length: 20 }, () => generateCharacterId());

    expect(new Set(ids).size).toBe(ids.length);
  });
});
