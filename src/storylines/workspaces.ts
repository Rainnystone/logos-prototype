import { access, cp, mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';

import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import { assertSafeStorylineScopedId } from '@/types/storyline-repository';

export const MANAGED_VARIANT_AUTHORING_FILES = [
  'world-base.yaml',
  'scene.yaml',
  'phase-plans.yaml',
  'router-lexicon.yaml',
  'audit-questions.yaml',
  'control-modules.yaml',
] as const;

function resolveStoryPackageRoot(packageName: string): string {
  return resolvePackageRoot(packageName);
}

function assertPathInsideBase(resolvedPath: string, baseDirectory: string, label: string): void {
  const normalizedBase = path.resolve(baseDirectory);
  const normalizedTarget = path.resolve(resolvedPath);
  const relative = path.relative(normalizedBase, normalizedTarget);

  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return;
  }

  throw new Error(
    `${label} escapes its base directory: ${normalizedTarget} is outside ${normalizedBase}.`,
  );
}

function resolvePathInsideBase(
  baseDirectory: string,
  label: string,
  ...segments: string[]
): string {
  const resolved = path.resolve(baseDirectory, ...segments);
  assertPathInsideBase(resolved, baseDirectory, label);
  return resolved;
}

function resolveVariantsRoot(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), 'variants');
}

function resolveVariantStagesRoot(packageName: string): string {
  return resolvePathInsideBase(resolveVariantsRoot(packageName), 'variant stage root', '.stage');
}

function assertSafeVariantId(variantId: string): string {
  return assertSafeStorylineScopedId(variantId, 'variantId');
}

function assertSafeStageId(stageId: string): string {
  return assertSafeStorylineScopedId(stageId, 'stageId');
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

export function resolveVariantWorkspaceRoot(packageName: string, variantId: string): string {
  const safeVariantId = assertSafeVariantId(variantId);
  return resolvePathInsideBase(resolveVariantsRoot(packageName), 'variant workspace root', safeVariantId);
}

export function resolveVariantWorkspacePath(
  packageName: string,
  variantId: string,
  ...segments: string[]
): string {
  const variantRoot = resolveVariantWorkspaceRoot(packageName, variantId);
  return resolvePathInsideBase(variantRoot, 'variant workspace path', ...segments);
}

export function resolveVariantWorkspaceStageRoot(packageName: string, stageId: string): string {
  const safeStageId = assertSafeStageId(stageId);
  return resolvePathInsideBase(resolveVariantStagesRoot(packageName), 'staged workspace root', safeStageId);
}

export async function stageVariantWorkspaceFromBaseline(input: {
  readonly packageName: string;
  readonly stageId: string;
}): Promise<string> {
  const packageRoot = resolveStoryPackageRoot(input.packageName);
  const stageRoot = resolveVariantWorkspaceStageRoot(input.packageName, input.stageId);

  await rm(stageRoot, { recursive: true, force: true });
  await mkdir(stageRoot, { recursive: true });

  for (const managedFileName of MANAGED_VARIANT_AUTHORING_FILES) {
    await cp(path.resolve(packageRoot, managedFileName), path.resolve(stageRoot, managedFileName));
  }

  return stageRoot;
}

export async function stageVariantWorkspaceFromVariant(input: {
  readonly packageName: string;
  readonly sourceVariantId: string;
  readonly stageId: string;
}): Promise<string> {
  const sourceRoot = resolveVariantWorkspaceRoot(input.packageName, input.sourceVariantId);
  const stageRoot = resolveVariantWorkspaceStageRoot(input.packageName, input.stageId);

  await rm(stageRoot, { recursive: true, force: true });
  await mkdir(path.dirname(stageRoot), { recursive: true });
  await cp(sourceRoot, stageRoot, { recursive: true });

  return stageRoot;
}

export async function promoteStagedVariantWorkspace(input: {
  readonly packageName: string;
  readonly stageId: string;
  readonly targetVariantId: string;
}): Promise<string> {
  const stageRoot = resolveVariantWorkspaceStageRoot(input.packageName, input.stageId);
  const targetRoot = resolveVariantWorkspaceRoot(input.packageName, input.targetVariantId);

  if (!(await pathExists(stageRoot))) {
    throw new Error(`Cannot promote staged workspace: staged workspace "${stageRoot}" does not exist.`);
  }

  if (await pathExists(targetRoot)) {
    throw new Error(
      `Cannot promote staged workspace: target variant workspace already exists at ${targetRoot}.`,
    );
  }

  await mkdir(path.dirname(targetRoot), { recursive: true });
  await rename(stageRoot, targetRoot);

  return targetRoot;
}

export async function cloneVariantWorkspace(input: {
  readonly packageName: string;
  readonly sourceVariantId: string;
  readonly targetVariantId: string;
}): Promise<string> {
  const sourceRoot = resolveVariantWorkspaceRoot(input.packageName, input.sourceVariantId);
  const targetRoot = resolveVariantWorkspaceRoot(input.packageName, input.targetVariantId);

  if (await pathExists(targetRoot)) {
    throw new Error(
      `Cannot clone variant workspace: target variant workspace already exists at ${targetRoot}.`,
    );
  }

  await mkdir(path.dirname(targetRoot), { recursive: true });
  await cp(sourceRoot, targetRoot, { recursive: true, force: false, errorOnExist: true });

  return targetRoot;
}

export async function removeVariantWorkspace(input: {
  readonly packageName: string;
  readonly variantId: string;
}): Promise<void> {
  const targetRoot = resolveVariantWorkspaceRoot(input.packageName, input.variantId);
  await rm(targetRoot, { recursive: true, force: true });
}
