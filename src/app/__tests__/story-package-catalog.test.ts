import { describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();

  return {
    ...actual,
    readdir: vi.fn(async () => [
      { name: '__tests__', isDirectory: () => true },
      { name: '.cache', isDirectory: () => true },
      { name: 'sample-scene', isDirectory: () => true },
    ]),
  };
});

vi.mock('@/engine/story-loader', () => ({
  loadStoryPackage: vi.fn(async (packageName: string) => ({
    sceneSpec: {
      sceneId: `${packageName}-id`,
      sceneName: `${packageName}-name`,
      mainAxis: 'main-axis',
      endLine: 'end-line',
    },
    phasePlans: [
      {
        phaseId: 'phase-01',
        phaseIndex: 1,
        phaseGoal: 'phase-goal',
        gradientType: 'Rising',
        beatCount: 4,
      },
    ],
  })),
}));

describe('listStoryPackageCatalog', () => {
  it('ignores helper directories such as __tests__ and dot-prefixed folders', async () => {
    const { listStoryPackageCatalog } = await import('@/app/story-package-catalog');

    await expect(listStoryPackageCatalog()).resolves.toEqual([
      {
        packageName: 'sample-scene',
        sceneId: 'sample-scene-id',
        sceneName: 'sample-scene-name',
        mainAxis: 'main-axis',
        endLine: 'end-line',
        phaseCount: 1,
        totalBeatCount: 4,
      },
    ]);
  });
});
