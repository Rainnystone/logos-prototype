import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';

import { loadStoryPackage } from '@/engine/story-loader';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const invalidPackageName = '__invalid-sample-scene__';
const invalidPackagePath = path.resolve(storyPackagesRoot, invalidPackageName);

function cleanupInvalidPackage(): void {
  rmSync(invalidPackagePath, { recursive: true, force: true });
}

afterEach(() => {
  cleanupInvalidPackage();
});

describe('story loader', () => {
  it('loads the sample-scene story package as typed data', async () => {
    const storyPackage = await loadStoryPackage('sample-scene');
    const scene = YAML.parse(
      readFileSync(path.resolve(storyPackagesRoot, 'sample-scene', 'scene.yaml'), 'utf8'),
    ) as { sceneId: string };

    expect(storyPackage.sceneSpec.sceneId).toBe(scene.sceneId);
    expect(storyPackage.phasePlans.length).toBeGreaterThan(0);
    expect(Object.isFrozen(storyPackage)).toBe(true);
  });

  it('throws a descriptive error when the story package does not exist', async () => {
    await expect(loadStoryPackage('nonexistent-package')).rejects.toThrow(/story package/i);
  });

  it('wraps validation errors with the failing file path', async () => {
    cleanupInvalidPackage();
    cpSync(path.resolve(storyPackagesRoot, 'sample-scene'), invalidPackagePath, {
      recursive: true,
    });

    const invalidPhasePlans = YAML.parse(
      readFileSync(path.resolve(invalidPackagePath, 'phase-plans.yaml'), 'utf8'),
    ) as {
      phasePlans: Array<Record<string, unknown>>;
    };

    invalidPhasePlans.phasePlans[0] = {
      ...invalidPhasePlans.phasePlans[0],
      beatCount: 5,
    };

    mkdirSync(invalidPackagePath, { recursive: true });
    writeFileSync(
      path.resolve(invalidPackagePath, 'phase-plans.yaml'),
      YAML.stringify(invalidPhasePlans),
      'utf8',
    );

    await expect(loadStoryPackage(invalidPackageName)).rejects.toThrow(/phase-plans\.yaml/i);
  });
});
