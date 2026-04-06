import { cp, mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';

import { resolvePackageRoot } from '@/authoring/persistence/package-state';

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

export function resolveVariantWorkspaceRoot(packageName: string, variantId: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), 'variants', variantId);
}

export function resolveVariantWorkspacePath(
  packageName: string,
  variantId: string,
  ...segments: string[]
): string {
  return path.resolve(resolveVariantWorkspaceRoot(packageName, variantId), ...segments);
}

export function resolveVariantWorkspaceStageRoot(packageName: string, stageId: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), 'variants', '.stage', stageId);
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

  await mkdir(path.dirname(targetRoot), { recursive: true });
  await rm(targetRoot, { recursive: true, force: true });
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

  await mkdir(path.dirname(targetRoot), { recursive: true });
  await rm(targetRoot, { recursive: true, force: true });
  await cp(sourceRoot, targetRoot, { recursive: true });

  return targetRoot;
}
