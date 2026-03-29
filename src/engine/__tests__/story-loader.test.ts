import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';

import { loadStoryPackage } from '@/engine/story-loader';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const tempPackageNames = [
  '__invalid-sample-scene__',
  '__structured-sample-scene__',
  '__legacy-migration-sample-scene__',
  '__runtime-cast-sample-scene__',
] as const;

const tempPackagePaths = tempPackageNames.map((packageName) =>
  path.resolve(storyPackagesRoot, packageName),
);

type StructuredStoryPackage = Awaited<ReturnType<typeof loadStoryPackage>> & {
  readonly worldBase: {
    readonly hero: { readonly characterId: string; readonly name: string };
    readonly coreCast: readonly unknown[];
    readonly antagonists: readonly unknown[];
    readonly locationPatch: string;
  };
};

function cleanupTempPackages(): void {
  for (const packagePath of tempPackagePaths) {
    rmSync(packagePath, { recursive: true, force: true });
  }
}

afterEach(() => {
  cleanupTempPackages();
});

function copySamplePackage(packageName: string): string {
  const packagePath = path.resolve(storyPackagesRoot, packageName);

  cleanupTempPackages();
  cpSync(path.resolve(storyPackagesRoot, 'sample-scene'), packagePath, { recursive: true });

  return packagePath;
}

function createStructuredWorldBase() {
  return {
    worldBaseSetting: 'world-setting',
    worldRules: 'world-rules',
    toneBaseline: 'tone-baseline',
    hero: {
      characterId: 'chr_hero01',
      name: 'Hero One',
      identityRole: 'Lead character',
      lightNovelTrait: 'Calm and precise',
      gender: 'Female',
      personality: 'Reserved',
      age: '16',
      occupation: 'Student',
      characterSummary: 'Primary viewpoint character.',
      capabilityBoundary: 'Uses only physical methods.',
      behaviorBoundary: 'Does not panic under pressure.',
      oocRedLine: 'Never breaks character.',
      clothing: 'School uniform',
      propsWeapon: 'None',
    },
    coreCast: [
      {
        characterId: 'chr_core01',
        name: 'Core One',
        identityRole: 'Support',
        lightNovelTrait: 'Reliable',
        gender: 'Male',
        personality: 'Steady',
        age: '17',
        occupation: 'Student',
        characterSummary: 'Core supporting character.',
        capabilityBoundary: 'Stays within the setting.',
        behaviorBoundary: 'Remains grounded.',
        oocRedLine: 'Does not leave the scene.',
        clothing: 'School uniform',
        propsWeapon: 'Notebook',
      },
      {
        characterId: 'chr_core02',
        name: 'Core Two',
        identityRole: 'Support',
        lightNovelTrait: 'Alert',
        gender: 'Female',
        personality: 'Pragmatic',
        age: '17',
        occupation: 'Student',
        characterSummary: 'Second core cast member.',
        capabilityBoundary: 'Keeps pace with the scene.',
        behaviorBoundary: 'Remains cooperative.',
        oocRedLine: 'Does not vanish from the story.',
        clothing: 'School uniform',
        propsWeapon: 'Phone',
      },
    ],
    antagonists: [
      {
        characterId: 'chr_anti01',
        name: 'Villain One',
        identityRole: 'Opponent',
        lightNovelTrait: 'Menacing',
        gender: 'Male',
        personality: 'Aggressive',
        age: '18',
        occupation: 'Unknown',
        characterSummary: 'Primary opposing force.',
        capabilityBoundary: 'Operates within the fiction.',
        behaviorBoundary: 'Pushes the conflict forward.',
        oocRedLine: 'Never becomes passive.',
        clothing: 'Coat',
        propsWeapon: 'None',
        fatalWeakness: 'Overconfidence',
      },
    ],
    npcCharacters: 'NPC pool',
    locationPatch: 'Location notes',
  };
}

function writeStructuredWorldBase(packagePath: string): void {
  writeFileSync(
    path.resolve(packagePath, 'world-base.yaml'),
    YAML.stringify(createStructuredWorldBase()),
    'utf8',
  );
}

function writeSceneCast(packagePath: string, cast: readonly string[]): void {
  const sceneSpec = YAML.parse(readFileSync(path.resolve(packagePath, 'scene.yaml'), 'utf8')) as Record<
    string,
    unknown
  >;

  writeFileSync(
    path.resolve(packagePath, 'scene.yaml'),
    YAML.stringify({
      ...sceneSpec,
      cast: [...cast],
    }),
    'utf8',
  );
}

describe('story loader', () => {
  it('loads a structured story package through the full-package path', async () => {
    const packageName = '__structured-sample-scene__';
    const packagePath = copySamplePackage(packageName);
    writeStructuredWorldBase(packagePath);

    const storyPackage = (await loadStoryPackage(packageName)) as StructuredStoryPackage;

    expect(storyPackage.worldBase.hero.characterId).toBe('chr_hero01');
    expect(storyPackage.worldBase.coreCast).toHaveLength(2);
    expect(storyPackage.worldBase.antagonists).toHaveLength(1);
    expect(storyPackage.sceneSpec.sceneId).toBeDefined();
    expect(storyPackage.phasePlans.length).toBeGreaterThan(0);
    expect(Object.isFrozen(storyPackage)).toBe(true);
  });

  it('exports a dedicated runtime-projected loader entrypoint', async () => {
    const packageName = '__runtime-cast-sample-scene__';
    const packagePath = copySamplePackage(packageName);
    writeStructuredWorldBase(packagePath);
    writeSceneCast(packagePath, ['chr_core01']);

    const storyLoader = await import('@/engine/story-loader');

    expect(storyLoader.loadRuntimeStoryPackage).toBeTypeOf('function');

    const runtimePackage = await storyLoader.loadRuntimeStoryPackage(packageName);

    expect(runtimePackage.worldBase.hero.characterId).toBeDefined();
    expect(runtimePackage.worldBase.coreCast).toHaveLength(1);
    expect(runtimePackage.worldBase.antagonists).toHaveLength(0);
    expect(runtimePackage.worldBase.coreCast[0]?.characterId).toBeDefined();
  });

  it('migrates legacy world-base content in memory when loading a package', async () => {
    const packageName = '__legacy-migration-sample-scene__';
    copySamplePackage(packageName);

    const storyPackage = (await loadStoryPackage(packageName)) as StructuredStoryPackage;

    expect(storyPackage.worldBase.hero.name).toBe('雾间凪');
    expect(storyPackage.worldBase.coreCast).toHaveLength(2);
    expect(storyPackage.worldBase.antagonists).toHaveLength(1);
    expect(storyPackage.worldBase.locationPatch.length).toBeGreaterThan(0);
  });

  it('keeps the full-package path on the structured story package data', async () => {
    const packageName = '__runtime-cast-sample-scene__';
    const packagePath = copySamplePackage(packageName);
    writeStructuredWorldBase(packagePath);

    const fullPackage = (await loadStoryPackage(packageName)) as StructuredStoryPackage;

    expect(fullPackage.worldBase.hero.characterId).toBe('chr_hero01');
    expect(fullPackage.worldBase.coreCast).toHaveLength(2);
    expect(fullPackage.worldBase.antagonists).toHaveLength(1);
    expect(fullPackage.worldBase.coreCast[0]?.characterId).toBe('chr_core01');
  });

  it('throws a descriptive error when the story package does not exist', async () => {
    await expect(loadStoryPackage('nonexistent-package')).rejects.toThrow(/story package/i);
  });

  it('wraps validation errors with the failing file path', async () => {
    const invalidPackageName = '__invalid-sample-scene__';
    const invalidPackagePath = copySamplePackage(invalidPackageName);

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
