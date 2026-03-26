import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { parseWithSchema } from '@/lib/validation';
import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import {
  AuditQuestionSetSchema,
  type AuditQuestionSet,
  type ControlModules,
  type PhasePlan,
  type RouterProfile,
  type SceneSpec,
  type WorldBase,
  WorldBaseSchema,
} from '@/types';
import {
  ControlModulesSchema,
  PhasePlansFileSchema,
  RouterLexiconFileSchema,
  type PhasePlansFile,
  type RouterLexiconFile,
} from '@/types/story-package';

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

function resolveRouterLexiconPath(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), 'router-lexicon.yaml');
}

function resolveAuditQuestionsPath(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), 'audit-questions.yaml');
}

function resolveControlModulesPath(packageName: string): string {
  return path.resolve(resolveStoryPackageRoot(packageName), 'control-modules.yaml');
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

export async function readRouterLexiconDraftContents(packageName: string): Promise<string> {
  return readFile(resolveRouterLexiconPath(packageName), 'utf8');
}

export async function readAuditQuestionsDraftContents(packageName: string): Promise<string> {
  return readFile(resolveAuditQuestionsPath(packageName), 'utf8');
}

export async function readControlModulesDraftContents(packageName: string): Promise<string> {
  return readFile(resolveControlModulesPath(packageName), 'utf8');
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

  const currentPhasePlansFile = parseWithSchema(
    PhasePlansFileSchema,
    YAML.parse(await readFile(phasePlansPath, 'utf8')) as unknown,
    'phasePlans',
  ) as PhasePlansFile;

  const mergedSceneSpec: SceneSpec = { ...nextSceneSpec };
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

export async function persistRouterProfilesDraft(
  packageName: string,
  nextRouterProfiles: readonly RouterProfile[],
): Promise<readonly string[]> {
  const routerLexiconPath = resolveRouterLexiconPath(packageName);
  const currentRouterLexiconFile = parseWithSchema(
    RouterLexiconFileSchema,
    YAML.parse(await readFile(routerLexiconPath, 'utf8')) as unknown,
    'routerLexicon',
  ) as RouterLexiconFile;

  const mergedRouterLexiconFile: RouterLexiconFile = {
    ...currentRouterLexiconFile,
    routers: [...nextRouterProfiles],
  };

  await writeFile(routerLexiconPath, `${YAML.stringify(mergedRouterLexiconFile)}`, 'utf8');

  return ['router-lexicon.yaml'];
}

export async function persistAuditQuestionSetDraft(
  packageName: string,
  nextAuditQuestionSet: AuditQuestionSet,
): Promise<readonly string[]> {
  const auditQuestionsPath = resolveAuditQuestionsPath(packageName);
  const currentAuditQuestionSet = parseWithSchema(
    AuditQuestionSetSchema,
    YAML.parse(await readFile(auditQuestionsPath, 'utf8')) as unknown,
    'auditQuestionSet',
  ) as AuditQuestionSet;

  const mergedAuditQuestionSet: AuditQuestionSet = {
    ...currentAuditQuestionSet,
    ...nextAuditQuestionSet,
  };

  await writeFile(auditQuestionsPath, `${YAML.stringify(mergedAuditQuestionSet)}`, 'utf8');

  return ['audit-questions.yaml'];
}

export async function persistControlModulesDraft(
  packageName: string,
  nextControlModules: ControlModules,
): Promise<readonly string[]> {
  const controlModulesPath = resolveControlModulesPath(packageName);
  const currentControlModules = parseWithSchema(
    ControlModulesSchema,
    YAML.parse(await readFile(controlModulesPath, 'utf8')) as unknown,
    'controlModules',
  ) as ControlModules;

  const mergedControlModules: ControlModules = {
    ...currentControlModules,
    ...nextControlModules,
    lightConeCustomization: {
      ...currentControlModules.lightConeCustomization,
      ...nextControlModules.lightConeCustomization,
    },
    directorNoteAdditions: {
      ...currentControlModules.directorNoteAdditions,
      ...nextControlModules.directorNoteAdditions,
    },
    beatVolumeDefinitions: {
      Low: {
        ...currentControlModules.beatVolumeDefinitions.Low,
        ...nextControlModules.beatVolumeDefinitions.Low,
      },
      Med: {
        ...currentControlModules.beatVolumeDefinitions.Med,
        ...nextControlModules.beatVolumeDefinitions.Med,
      },
      High: {
        ...currentControlModules.beatVolumeDefinitions.High,
        ...nextControlModules.beatVolumeDefinitions.High,
      },
    },
  };

  await writeFile(controlModulesPath, `${YAML.stringify(mergedControlModules)}`, 'utf8');

  return ['control-modules.yaml'];
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

export async function restoreRouterLexiconDraft(
  packageName: string,
  originalContents: string,
): Promise<void> {
  await writeFile(resolveRouterLexiconPath(packageName), originalContents, 'utf8');
}

export async function restoreAuditQuestionSetDraft(
  packageName: string,
  originalContents: string,
): Promise<void> {
  await writeFile(resolveAuditQuestionsPath(packageName), originalContents, 'utf8');
}

export async function restoreControlModulesDraft(
  packageName: string,
  originalContents: string,
): Promise<void> {
  await writeFile(resolveControlModulesPath(packageName), originalContents, 'utf8');
}
