import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { parseWithSchema } from '@/lib/validation';
import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import { WorldBaseSchema, type WorldBase } from '@/types';
import type { SaveRequest } from '@/authoring/contracts';

export function resolveStoryPackageRoot(packageName: string): string {
  return resolvePackageRoot(packageName);
}

function resolveWorldBasePath(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), 'world-base.yaml');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function getNextMainCharacters(request: SaveRequest): string | null {
  const rawPayload = request.payload as unknown;
  if (!isPlainObject(rawPayload)) {
    return null;
  }

  if (isPlainObject(rawPayload.uiFields) && typeof rawPayload.uiFields.mainCharacters === 'string') {
    return rawPayload.uiFields.mainCharacters;
  }

  const patchCandidates = Array.isArray(rawPayload.patchCandidates) ? rawPayload.patchCandidates : [];
  const patchCandidate = patchCandidates.find((candidate) => {
    if (!isPlainObject(candidate)) {
      return false;
    }

    return (
      candidate.type === 'replace' &&
      candidate.path === 'mainCharacters' &&
      typeof candidate.value === 'string'
    );
  });

  if (patchCandidate && typeof patchCandidate.value === 'string') {
    return patchCandidate.value;
  }

  return null;
}

export function extractWorldBaseDraftUpdate(request: SaveRequest): string | null {
  return getNextMainCharacters(request);
}

export async function persistWorldBaseDraft(request: SaveRequest): Promise<readonly string[]> {
  if (request.sectionId !== 'worldbase-cast') {
    throw new Error(`Task 1 persistence only supports worldbase-cast, not "${request.sectionId}".`);
  }

  const nextMainCharacters = getNextMainCharacters(request);

  if (nextMainCharacters === null) {
    throw new Error('No deterministic world-base update was provided.');
  }

  const worldBasePath = resolveWorldBasePath(request.packageName);
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
