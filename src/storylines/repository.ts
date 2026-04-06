import {
  access,
  readFile as readTextFile,
  rename,
  unlink,
  writeFile as writeTextFile,
} from 'node:fs/promises';
import path from 'node:path';

import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import { parseWithSchema } from '@/lib/validation';
import type { StorylineRepositoryFile } from '@/types';
import {
  StorylineRepositoryFileSchema,
  assertStorylineRepositoryFileConsistency,
} from '@/types';

const storylineRepositoryFileName = 'storyline-repository.json';

function resolveStoryPackageRoot(packageName: string): string {
  return resolvePackageRoot(packageName);
}

export function resolveStorylineRepositoryPath(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), storylineRepositoryFileName);
}

async function ensureStoryPackageExists(packageName: string): Promise<void> {
  const packageRoot = resolveStoryPackageRoot(packageName);

  try {
    await access(packageRoot);
  } catch {
    throw new Error(`Story package "${packageName}" was not found at ${packageRoot}.`);
  }
}

function validateStorylineRepositoryFile(data: unknown): StorylineRepositoryFile {
  const parsed = parseWithSchema(StorylineRepositoryFileSchema, data, 'storylineRepository');
  return assertStorylineRepositoryFileConsistency(parsed);
}

async function readPersistedStorylineRepository(
  filePath: string,
): Promise<StorylineRepositoryFile> {
  const fileContents = await readTextFile(filePath, 'utf8');
  return validateStorylineRepositoryFile(JSON.parse(fileContents) as unknown);
}

export async function readStorylineRepository(
  packageName: string,
): Promise<StorylineRepositoryFile | null> {
  await ensureStoryPackageExists(packageName);
  const filePath = resolveStorylineRepositoryPath(packageName);

  try {
    return await readPersistedStorylineRepository(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to read storyline repository for "${packageName}" from ${filePath}: ${message}`,
    );
  }
}

export async function readStorylineRepositoryForWrite(
  packageName: string,
): Promise<StorylineRepositoryFile> {
  const repository = await readStorylineRepository(packageName);
  if (repository) {
    return repository;
  }

  throw new Error(
    `Cannot load storyline repository for write: storyline-repository.json is missing for "${packageName}".`,
  );
}

export async function writeStorylineRepository(
  packageName: string,
  file: StorylineRepositoryFile,
): Promise<void> {
  await ensureStoryPackageExists(packageName);

  const filePath = resolveStorylineRepositoryPath(packageName);
  const validated = validateStorylineRepositoryFile(file);
  const serialized = `${JSON.stringify(validated, null, 2)}\n`;
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;

  await writeTextFile(tempPath, serialized, 'utf8');

  try {
    await rename(tempPath, filePath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}
