import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import { gossipelogAgentDefinition } from '@/agents/gossipelog/definition';
import { parseWithSchema } from '@/lib/validation';
import {
  CharacterRelationshipsFileSchema,
  CharacterRelationshipsFileV2Schema,
  type CharacterRelationshipsFile,
  type CharacterRelationshipsFileV1,
  type CharacterRelationshipsFileV2,
  type RelationshipEdge,
  type RelationshipMemoryEdge,
  type RelationshipMemoryEntry,
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
      schemaVersion: 2,
      storyPackage: packageName,
    },
    relationshipsBySource: {},
  };
}

function createLegacyMemoryEntry(
  roundId: string,
  summary: string,
): RelationshipMemoryEntry {
  return {
    phaseId: null,
    beatIndex: null,
    roundId,
    functionalRole: null,
    mindsetTags: [],
    summary,
    triggerEvent: '',
    reasoning: '',
    causalAction: '',
  };
}

function migrateLegacyEdgeToMemoryEdge(edge: RelationshipEdge): RelationshipMemoryEdge {
  const history: RelationshipMemoryEntry[] = [
    createLegacyMemoryEntry(edge.baseline.lastAbsorbedRound, edge.baseline.state),
  ];

  if (edge.recentDelta) {
    history.push(createLegacyMemoryEntry(edge.recentDelta.sourceRound, edge.recentDelta.state));
  }

  return {
    sourceRoleId: edge.sourceRoleId,
    targetRoleId: edge.targetRoleId,
    currentRelation: history[history.length - 1]!,
    history,
  };
}

function migrateV1FileToV2(file: CharacterRelationshipsFileV1): CharacterRelationshipsFileV2 {
  return {
    meta: {
      fileType: 'character-relationships',
      schemaVersion: 2,
      storyPackage: file.meta.storyPackage,
    },
    relationshipsBySource: Object.fromEntries(
      Object.entries(file.relationshipsBySource).map(([sourceRoleId, sourceBucket]) => [
        sourceRoleId,
        {
          targets: Object.fromEntries(
            Object.entries(sourceBucket.targets).map(([targetRoleId, edge]) => [
              targetRoleId,
              migrateLegacyEdgeToMemoryEdge(edge),
            ]),
          ),
        },
      ]),
    ),
  };
}

function isCharacterRelationshipsFileV2(
  file: CharacterRelationshipsFile,
): file is CharacterRelationshipsFileV2 {
  return file.meta.schemaVersion === 2;
}

function normalizeRelationshipsFileToV2(
  file: CharacterRelationshipsFile,
): CharacterRelationshipsFileV2 {
  if (isCharacterRelationshipsFileV2(file)) {
    return file;
  }

  return migrateV1FileToV2(file);
}

async function ensureStoryPackageExists(packageName: string): Promise<void> {
  const packageRoot = resolveStoryPackageRoot(packageName);

  try {
    await access(packageRoot);
  } catch {
    throw new Error(`Story package "${packageName}" was not found at ${packageRoot}.`);
  }
}

async function readCharacterRelationshipsFile(filePath: string): Promise<CharacterRelationshipsFileV2> {
  const fileContents = await readFile(filePath, 'utf8');
  const parsedFile = parseWithSchema(
    CharacterRelationshipsFileSchema,
    YAML.parse(fileContents) as unknown,
    'characterRelationships',
  );

  return normalizeRelationshipsFileToV2(parsedFile);
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

export async function inspectCharacterRelationshipsState(
  packageName: string,
): Promise<'readable' | 'missing' | 'unreadable'> {
  await ensureStoryPackageExists(packageName);
  const filePath = resolveCharacterRelationshipsPath(packageName);

  try {
    await readCharacterRelationshipsFile(filePath);
    return 'readable';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 'missing';
    }

    return 'unreadable';
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

  const normalizedFile = normalizeRelationshipsFileToV2(file);
  const validatedFile = parseWithSchema(
    CharacterRelationshipsFileV2Schema,
    normalizedFile,
    'characterRelationships',
  );
  const filePath = resolveCharacterRelationshipsPath(packageName);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${YAML.stringify(validatedFile)}`, 'utf8');
}
