import { cpSync, rmSync } from 'node:fs';
import path from 'node:path';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');

const EXECUTION_STATE_RELATIVE_PATHS = [
  'runtime-sessions.json',
  'storyline-repository.json',
  'variants',
] as const;

export function resolveStoryPackagePath(packageName: string): string {
  return path.resolve(storyPackagesRoot, packageName);
}

export function resetStoryPackageCopy(packageName: string): void {
  rmSync(resolveStoryPackagePath(packageName), { recursive: true, force: true });
}

export interface CopyStoryPackageFixtureOptions {
  readonly stripExecutionState?: boolean;
}

export function copyStoryPackageFixture(
  sourcePackageName: string,
  targetPackageName: string,
  options: CopyStoryPackageFixtureOptions = {},
): string {
  resetStoryPackageCopy(targetPackageName);

  const sourcePath = resolveStoryPackagePath(sourcePackageName);
  const targetPath = resolveStoryPackagePath(targetPackageName);

  cpSync(sourcePath, targetPath, {
    recursive: true,
  });

  if (options.stripExecutionState) {
    for (const relativePath of EXECUTION_STATE_RELATIVE_PATHS) {
      rmSync(path.resolve(targetPath, relativePath), {
        recursive: true,
        force: true,
      });
    }
  }

  return targetPath;
}
