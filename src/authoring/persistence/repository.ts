import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { parseWithSchema } from '@/lib/validation';
import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import { WorldBaseSchema, type PhasePlan, type SceneSpec, type WorldBase } from '@/types';
import { PhasePlansFileSchema, SceneSpecSchema, type PhasePlansFile } from '@/types/story-package';

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

function resolveScenePath(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), 'scene.yaml');
}

function resolvePhasePlansPath(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), 'phase-plans.yaml');
}

export async function readWorldBaseDraftContents(packageName: string): Promise<string> {
  const worldBasePath = resolveWorldBasePath(packageName);
  return readFile(worldBasePath, 'utf8');
}

export async function readSceneDraftContents(packageName: string): Promise<string> {
  return readFile(resolveScenePath(packageName), 'utf8');
}

export async function readPhasePlansDraftContents(packageName: string): Promise<string> {
  return readFile(resolvePhasePlansPath(packageName), 'utf8');
}

export async function persistWorldBaseDraft(
  packageName: string,
  nextWorldBase: WorldBase,
): Promise<readonly string[]> {
  const worldBasePath = resolveWorldBasePath(packageName);
  const currentWorldBase = parseWithSchema(
    WorldBaseSchema,
    YAML.parse(await readFile(worldBasePath, 'utf8')) as unknown,
    'worldBase',
  ) as WorldBase;

  const mergedWorldBase: WorldBase = {
    ...currentWorldBase,
    ...nextWorldBase,
  };

  await writeFile(worldBasePath, `${YAML.stringify(mergedWorldBase)}`, 'utf8');

  return ['world-base.yaml'];
}

export async function persistScenePhaseDraft(
  packageName: string,
  nextSceneSpec: SceneSpec,
  nextPhasePlans: readonly PhasePlan[],
): Promise<readonly string[]> {
  const scenePath = resolveScenePath(packageName);
  const phasePlansPath = resolvePhasePlansPath(packageName);

  const currentSceneSpec = parseWithSchema(
    SceneSpecSchema,
    YAML.parse(await readFile(scenePath, 'utf8')) as unknown,
    'sceneSpec',
  ) as SceneSpec;
  const currentPhasePlansFile = parseWithSchema(
    PhasePlansFileSchema,
    YAML.parse(await readFile(phasePlansPath, 'utf8')) as unknown,
    'phasePlans',
  ) as PhasePlansFile;

  const mergedSceneSpec: SceneSpec = {
    ...currentSceneSpec,
    ...nextSceneSpec,
  };
  const mergedPhasePlansFile: PhasePlansFile = {
    ...currentPhasePlansFile,
    sceneId: mergedSceneSpec.sceneId,
    sceneName: mergedSceneSpec.sceneName,
    phasePlans: [...nextPhasePlans],
  };

  await writeFile(scenePath, `${YAML.stringify(mergedSceneSpec)}`, 'utf8');
  await writeFile(phasePlansPath, `${YAML.stringify(mergedPhasePlansFile)}`, 'utf8');

  return ['scene.yaml', 'phase-plans.yaml'];
}

export async function restoreWorldBaseDraft(
  packageName: string,
  originalContents: string,
): Promise<void> {
  const worldBasePath = resolveWorldBasePath(packageName);
  await writeFile(worldBasePath, originalContents, 'utf8');
}

export async function restoreScenePhaseDraft(
  packageName: string,
  originalSceneContents: string,
  originalPhasePlansContents: string,
): Promise<void> {
  await writeFile(resolveScenePath(packageName), originalSceneContents, 'utf8');
  await writeFile(resolvePhasePlansPath(packageName), originalPhasePlansContents, 'utf8');
}
