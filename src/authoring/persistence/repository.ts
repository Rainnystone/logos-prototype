import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { parseWithSchema } from '@/lib/validation';
import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import { WorldBaseSchema, type WorldBase } from '@/types';

export function resolveStoryPackageRoot(packageName: string): string {
  return resolvePackageRoot(packageName);
}

export async function ensureStoryPackageExists(packageName: string): Promise<string> {
  const packageRoot = resolveStoryPackageRoot(packageName);

  try {
    await access(packageRoot);
  } catch {
    throw new Error(`Story package "${packageName}" was not found at ${packageRoot}.`);
  }

  return packageRoot;
}

function resolveWorldBasePath(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), 'world-base.yaml');
}

export async function readWorldBaseDraftContents(packageName: string): Promise<string> {
  const worldBasePath = resolveWorldBasePath(packageName);
  return readFile(worldBasePath, 'utf8');
}

export async function persistWorldBaseDraft(
  packageName: string,
  nextMainCharacters: string,
): Promise<readonly string[]> {
  const worldBasePath = resolveWorldBasePath(packageName);
  const currentWorldBase = parseWithSchema(
    WorldBaseSchema,
    YAML.parse(await readFile(worldBasePath, 'utf8')) as unknown,
    'worldBase',
  ) as WorldBase;

  const nextWorldBase: WorldBase = {
    ...currentWorldBase,
    mainCharacters: nextMainCharacters,
  };

  await writeFile(worldBasePath, `${YAML.stringify(nextWorldBase)}`, 'utf8');

  return ['world-base.yaml'];
}

export async function restoreWorldBaseDraft(
  packageName: string,
  originalContents: string,
): Promise<void> {
  const worldBasePath = resolveWorldBasePath(packageName);
  await writeFile(worldBasePath, originalContents, 'utf8');
}
