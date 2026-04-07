import { describe, expect, it } from 'vitest';

import {
  assertValidStoryPackageSlug,
  buildStoryPackageSlug,
} from '@/story-packages/package-slug';

describe('story package slug', () => {
  it('derives a deterministic lowercase slug and rejects Windows reserved names', () => {
    expect(buildStoryPackageSlug('Café del Mar')).toBe('cafe-del-mar');
    expect(buildStoryPackageSlug('雾间回廊')).toMatch(/^story-package-[a-f0-9]{8}$/);
    expect(buildStoryPackageSlug('雾间回廊')).toBe(buildStoryPackageSlug('雾间回廊'));

    expect(() => assertValidStoryPackageSlug('con')).toThrow(/reserved/i);
    expect(() => assertValidStoryPackageSlug('aux')).toThrow(/reserved/i);
  });

  it('rejects empty or whitespace-only display names before hash fallback is considered', () => {
    expect(() => buildStoryPackageSlug('')).toThrow(/display name/i);
    expect(() => buildStoryPackageSlug('   ')).toThrow(/display name/i);
  });

  it('rejects Windows reserved names through the normal display-name path', () => {
    expect(() => buildStoryPackageSlug('CON')).toThrow(/reserved/i);
  });
});
