import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_STORY_PACKAGES_ROOT = path.resolve(__dirname, '../../src/story-packages');
const TEMP_PACKAGE_PREFIX = '.tmp-simulation-';

export type TempPackageScavengeResult = {
  readonly removedPaths: readonly string[];
};

export async function listSimulationTempPackages(
  rootDir = DEFAULT_STORY_PACKAGES_ROOT,
): Promise<readonly string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(TEMP_PACKAGE_PREFIX))
    .map((entry) => path.resolve(rootDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

export async function scavengeSimulationTempPackages(input?: {
  readonly rootDir?: string;
  readonly dryRun?: boolean;
}): Promise<TempPackageScavengeResult> {
  const rootDir = input?.rootDir ?? DEFAULT_STORY_PACKAGES_ROOT;
  const removedPaths = await listSimulationTempPackages(rootDir);

  if (!input?.dryRun) {
    for (const targetPath of removedPaths) {
      await rm(targetPath, { recursive: true, force: true });
    }
  }

  return {
    removedPaths,
  };
}
