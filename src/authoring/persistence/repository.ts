import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { parseWithSchema } from '@/lib/validation';
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
  return path.resolve(process.cwd(), 'src/story-packages', packageName);
}

export interface AuthoringPersistenceTarget {
  readonly packageName: string;
  readonly authoredRoot: string;
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

export function resolveAuthoringPersistenceTarget(
  packageName: string,
  authoredRootOverride?: string,
): AuthoringPersistenceTarget {
  return {
    packageName,
    authoredRoot: authoredRootOverride ?? resolveStoryPackageRoot(packageName),
  };
}

function resolveTargetAuthoredRoot(
  packageName: string,
  target?: AuthoringPersistenceTarget,
): string {
  if (target && target.packageName !== packageName) {
    throw new Error(
      `Authoring persistence target package mismatch: expected "${packageName}" but received "${target.packageName}".`,
    );
  }

  return target?.authoredRoot ?? resolveStoryPackageRoot(packageName);
}

function resolveWorldBasePath(packageName: string, target?: AuthoringPersistenceTarget): string {
  return path.resolve(resolveTargetAuthoredRoot(packageName, target), 'world-base.yaml');
}

function resolveScenePath(packageName: string, target?: AuthoringPersistenceTarget): string {
  return path.resolve(resolveTargetAuthoredRoot(packageName, target), 'scene.yaml');
}

function resolvePhasePlansPath(packageName: string, target?: AuthoringPersistenceTarget): string {
  return path.resolve(resolveTargetAuthoredRoot(packageName, target), 'phase-plans.yaml');
}

function resolveRouterLexiconPath(packageName: string, target?: AuthoringPersistenceTarget): string {
  return path.resolve(resolveTargetAuthoredRoot(packageName, target), 'router-lexicon.yaml');
}

function resolveAuditQuestionsPath(packageName: string, target?: AuthoringPersistenceTarget): string {
  return path.resolve(resolveTargetAuthoredRoot(packageName, target), 'audit-questions.yaml');
}

function resolveControlModulesPath(packageName: string, target?: AuthoringPersistenceTarget): string {
  return path.resolve(resolveTargetAuthoredRoot(packageName, target), 'control-modules.yaml');
}

export async function readWorldBaseDraftContents(
  packageName: string,
  target?: AuthoringPersistenceTarget,
): Promise<string> {
  const worldBasePath = resolveWorldBasePath(packageName, target);
  return readFile(worldBasePath, 'utf8');
}

export async function readSceneDraftContents(
  packageName: string,
  target?: AuthoringPersistenceTarget,
): Promise<string> {
  return readFile(resolveScenePath(packageName, target), 'utf8');
}

export async function readPhasePlansDraftContents(
  packageName: string,
  target?: AuthoringPersistenceTarget,
): Promise<string> {
  return readFile(resolvePhasePlansPath(packageName, target), 'utf8');
}

export async function readRouterLexiconDraftContents(
  packageName: string,
  target?: AuthoringPersistenceTarget,
): Promise<string> {
  return readFile(resolveRouterLexiconPath(packageName, target), 'utf8');
}

export async function readAuditQuestionsDraftContents(
  packageName: string,
  target?: AuthoringPersistenceTarget,
): Promise<string> {
  return readFile(resolveAuditQuestionsPath(packageName, target), 'utf8');
}

export async function readControlModulesDraftContents(
  packageName: string,
  target?: AuthoringPersistenceTarget,
): Promise<string> {
  return readFile(resolveControlModulesPath(packageName, target), 'utf8');
}

export async function persistWorldBaseDraft(
  packageName: string,
  nextWorldBase: WorldBase,
  target?: AuthoringPersistenceTarget,
): Promise<readonly string[]> {
  const worldBasePath = resolveWorldBasePath(packageName, target);
  const validatedWorldBase = parseWithSchema(
    WorldBaseSchema,
    nextWorldBase,
    'worldBase',
  ) as WorldBase;
  await writeFile(worldBasePath, `${YAML.stringify(validatedWorldBase)}`, 'utf8');

  return ['world-base.yaml'];
}

export async function persistScenePhaseDraft(
  packageName: string,
  nextSceneSpec: SceneSpec,
  nextPhasePlans: readonly PhasePlan[],
  target?: AuthoringPersistenceTarget,
): Promise<readonly string[]> {
  const scenePath = resolveScenePath(packageName, target);
  const phasePlansPath = resolvePhasePlansPath(packageName, target);

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
  target?: AuthoringPersistenceTarget,
): Promise<readonly string[]> {
  const routerLexiconPath = resolveRouterLexiconPath(packageName, target);
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
  target?: AuthoringPersistenceTarget,
): Promise<readonly string[]> {
  const auditQuestionsPath = resolveAuditQuestionsPath(packageName, target);
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
  target?: AuthoringPersistenceTarget,
): Promise<readonly string[]> {
  const controlModulesPath = resolveControlModulesPath(packageName, target);
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
  target?: AuthoringPersistenceTarget,
): Promise<void> {
  const worldBasePath = resolveWorldBasePath(packageName, target);
  await writeFile(worldBasePath, originalContents, 'utf8');
}

export async function restoreScenePhaseDraft(
  packageName: string,
  originalSceneContents: string,
  originalPhasePlansContents: string,
  target?: AuthoringPersistenceTarget,
): Promise<void> {
  await writeFile(resolveScenePath(packageName, target), originalSceneContents, 'utf8');
  await writeFile(resolvePhasePlansPath(packageName, target), originalPhasePlansContents, 'utf8');
}

export async function restoreRouterLexiconDraft(
  packageName: string,
  originalContents: string,
  target?: AuthoringPersistenceTarget,
): Promise<void> {
  await writeFile(resolveRouterLexiconPath(packageName, target), originalContents, 'utf8');
}

export async function restoreAuditQuestionSetDraft(
  packageName: string,
  originalContents: string,
  target?: AuthoringPersistenceTarget,
): Promise<void> {
  await writeFile(resolveAuditQuestionsPath(packageName, target), originalContents, 'utf8');
}

export async function restoreControlModulesDraft(
  packageName: string,
  originalContents: string,
  target?: AuthoringPersistenceTarget,
): Promise<void> {
  await writeFile(resolveControlModulesPath(packageName, target), originalContents, 'utf8');
}
