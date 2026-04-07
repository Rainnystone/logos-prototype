const STORY_PACKAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WINDOWS_RESERVED_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
]);

function hashDisplayName(displayName: string): string {
  const normalized = displayName.trim().normalize('NFKC');
  let hash = 0x811c9dc5;

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function assertValidStoryPackageSlug(slug: string): string {
  if (slug.trim().length === 0) {
    throw new Error('Story package slug must not be empty.');
  }

  if (slug !== slug.trim()) {
    throw new Error('Story package slug must not start or end with whitespace.');
  }

  if (slug.endsWith('.')) {
    throw new Error('Story package slug must not end with a dot.');
  }

  if (!STORY_PACKAGE_SLUG_PATTERN.test(slug)) {
    throw new Error(
      'Story package slug must use lowercase letters, numbers, and single hyphen separators only.',
    );
  }

  if (WINDOWS_RESERVED_NAMES.has(slug.toLowerCase())) {
    throw new Error(`Story package slug "${slug}" uses a Windows reserved name.`);
  }

  return slug;
}

export function buildStoryPackageSlug(displayName: string): string {
  const trimmedDisplayName = displayName.trim();
  if (trimmedDisplayName.length === 0) {
    throw new Error('Story package display name is required.');
  }

  const normalized = trimmedDisplayName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const slug =
    normalized.length > 0 ? normalized : `story-package-${hashDisplayName(trimmedDisplayName)}`;

  return assertValidStoryPackageSlug(slug);
}
