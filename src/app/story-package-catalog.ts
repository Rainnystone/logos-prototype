import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { loadStoryPackage } from '@/engine/story-loader';

export interface StoryPackageCatalogReadyEntry {
  readonly packageName: string;
  readonly sceneId: string;
  readonly sceneName: string;
  readonly mainAxis: string;
  readonly endLine: string;
  readonly source?: string | undefined;
  readonly samplePurpose?: string | undefined;
  readonly phaseCount: number;
  readonly totalBeatCount: number;
}

export interface StoryPackageCatalogErrorEntry {
  readonly packageName: string;
  readonly error: string;
}

export type StoryPackageCatalogEntry =
  | StoryPackageCatalogReadyEntry
  | StoryPackageCatalogErrorEntry;

export function isReadyStoryPackageEntry(
  entry: StoryPackageCatalogEntry,
): entry is StoryPackageCatalogReadyEntry {
  return 'sceneId' in entry;
}

export async function listStoryPackageCatalog(): Promise<readonly StoryPackageCatalogEntry[]> {
  const packageRoot = path.resolve(process.cwd(), 'src/story-packages');
  const directoryEntries = await readdir(packageRoot, { withFileTypes: true });
  const packageNames = directoryEntries
    .filter(
      (entry) => entry.isDirectory() && !entry.name.startsWith('__') && !entry.name.startsWith('.'),
    )
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const packages = await Promise.all(
    packageNames.map(async (packageName) => {
      try {
        const storyPackage = await loadStoryPackage(packageName);

        return {
          packageName,
          sceneId: storyPackage.sceneSpec.sceneId,
          sceneName: storyPackage.sceneSpec.sceneName,
          mainAxis: storyPackage.sceneSpec.mainAxis,
          endLine: storyPackage.sceneSpec.endLine,
          source: storyPackage.sceneSpec.source,
          samplePurpose: storyPackage.sceneSpec.samplePurpose,
          phaseCount: storyPackage.phasePlans.length,
          totalBeatCount: storyPackage.phasePlans.reduce(
            (beatCount, phasePlan) => beatCount + phasePlan.beatCount,
            0,
          ),
        } satisfies StoryPackageCatalogReadyEntry;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        return {
          packageName,
          error: message,
        } satisfies StoryPackageCatalogErrorEntry;
      }
    }),
  );

  return packages;
}
