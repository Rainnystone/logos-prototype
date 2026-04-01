import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import { gossipelogAgentDefinition } from '@/agents/gossipelog/definition';
import { parseWithSchema } from '@/lib/validation';
import {
  CharacterRelationshipsFileSchema,
  type CharacterRelationshipsFile,
} from '@/types';

function resolveStoryPackageRoot(packageName: string): string {
  return resolvePackageRoot(packageName);
}

export function resolveCharacterRelationshipsPath(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), gossipelogAgentDefinition.packageStatePath);
}

export function createEmptyCharacterRelationshipsFile(
  packageName: string,
): CharacterRelationshipsFile {
  return {
    meta: {
      fileType: 'character-relationships',
      schemaVersion: 1,
      storyPackage: packageName,
    },
    relationshipsBySource: {},
  };
}

async function ensureStoryPackageExists(packageName: string): Promise<void> {
  const packageRoot = resolveStoryPackageRoot(packageName);

  try {
    await access(packageRoot);
  } catch {
    throw new Error(`Story package "${packageName}" was not found at ${packageRoot}.`);
  }
}

async function readCharacterRelationshipsFile(filePath: string): Promise<CharacterRelationshipsFile> {
  const fileContents = await readFile(filePath, 'utf8');
  return parseWithSchema(
    CharacterRelationshipsFileSchema,
    YAML.parse(fileContents) as unknown,
    'characterRelationships',
  );
}

export async function loadCharacterRelationships(
  packageName: string,
): Promise<CharacterRelationshipsFile> {
  await ensureStoryPackageExists(packageName);
  const filePath = resolveCharacterRelationshipsPath(packageName);

  try {
    return await readCharacterRelationshipsFile(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load character relationships for "${packageName}" from ${filePath}: ${message}`,
    );
  }
}

export async function loadOrCreateCharacterRelationships(
  packageName: string,
): Promise<CharacterRelationshipsFile> {
  await ensureStoryPackageExists(packageName);
  const filePath = resolveCharacterRelationshipsPath(packageName);

  try {
    return await readCharacterRelationshipsFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return createEmptyCharacterRelationshipsFile(packageName);
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load character relationships for "${packageName}" from ${filePath}: ${message}`,
    );
  }
}

export async function saveCharacterRelationships(
  packageName: string,
  file: CharacterRelationshipsFile,
): Promise<void> {
  await ensureStoryPackageExists(packageName);

  const validatedFile = parseWithSchema(
    CharacterRelationshipsFileSchema,
    file,
    'characterRelationships',
  );
  const filePath = resolveCharacterRelationshipsPath(packageName);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${YAML.stringify(validatedFile)}`, 'utf8');
}
