import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import { weaverAgentDefinition } from '@/agents/weaver/definition';
import { parseWithSchema } from '@/lib/validation';
import { WeaverImportSummarySchema } from '@/types';
import type { WeaverImportSummary } from '@/types';

function resolveStoryPackageRoot(packageName: string): string {
  return resolvePackageRoot(packageName);
}

export function resolveWeaverImportSummaryPath(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), weaverAgentDefinition.packageStatePath);
}

async function ensureStoryPackageExists(packageName: string): Promise<void> {
  const packageRoot = resolveStoryPackageRoot(packageName);

  try {
    await access(packageRoot);
  } catch {
    throw new Error(`Story package "${packageName}" was not found at ${packageRoot}.`);
  }
}

export async function loadWeaverImportSummary(packageName: string): Promise<WeaverImportSummary> {
  await ensureStoryPackageExists(packageName);
  const filePath = resolveWeaverImportSummaryPath(packageName);

  try {
    const fileContents = await readFile(filePath, 'utf8');
    return parseWithSchema(
      WeaverImportSummarySchema,
      YAML.parse(fileContents) as unknown,
      'weaverImportSummary',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load weaver import summary for "${packageName}" from ${filePath}: ${message}`,
    );
  }
}

export async function loadWeaverImportSummaryIfPresent(
  packageName: string,
): Promise<WeaverImportSummary | null> {
  await ensureStoryPackageExists(packageName);
  const filePath = resolveWeaverImportSummaryPath(packageName);

  try {
    const fileContents = await readFile(filePath, 'utf8');
    return parseWithSchema(
      WeaverImportSummarySchema,
      YAML.parse(fileContents) as unknown,
      'weaverImportSummary',
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load weaver import summary for "${packageName}" from ${filePath}: ${message}`,
    );
  }
}

export async function saveWeaverImportSummary(
  packageName: string,
  summary: WeaverImportSummary,
): Promise<void> {
  const validatedSummary = parseWithSchema(
    WeaverImportSummarySchema,
    summary,
    'weaverImportSummary',
  );

  await ensureStoryPackageExists(packageName);
  const filePath = resolveWeaverImportSummaryPath(packageName);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${YAML.stringify(validatedSummary)}`, 'utf8');
}
