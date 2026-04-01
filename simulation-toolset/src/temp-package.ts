import { cpSync, rmSync } from 'node:fs';
import path from 'node:path';

const storyPackagesRoot = path.resolve(__dirname, '../../src/story-packages');
const tempPackagePaths = new Set<string>();

export type TempStoryPackageFixture = {
  readonly sourcePackageName: string;
  readonly packageName: string;
  readonly packagePath: string;
  cleanup(): Promise<void>;
};

function removeTempPackage(packagePath: string) {
  tempPackagePaths.delete(packagePath);
  rmSync(packagePath, { recursive: true, force: true });
}

export async function createTempStoryPackage(
  sourcePackageName: string,
): Promise<TempStoryPackageFixture> {
  const packageName = `.tmp-simulation-${sourcePackageName}-${Math.random().toString(16).slice(2)}`;
  const sourcePath = path.resolve(storyPackagesRoot, sourcePackageName);
  const packagePath = path.resolve(storyPackagesRoot, packageName);

  cpSync(sourcePath, packagePath, { recursive: true });
  tempPackagePaths.add(packagePath);

  return {
    sourcePackageName,
    packageName,
    packagePath,
    async cleanup() {
      removeTempPackage(packagePath);
    },
  };
}

export async function cleanupTempStoryPackages(): Promise<void> {
  for (const packagePath of [...tempPackagePaths]) {
    removeTempPackage(packagePath);
  }
}
