import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { deepFreeze } from '@/lib/deep-freeze';
import { parseWithSchema } from '@/lib/validation';
import { AuditQuestionSetSchema, WorldBaseSchema } from '@/types';
import {
  filterWorldBaseForSceneCast,
  isLegacyWorldBase,
  migrateLegacyWorldBase,
} from '@/story-packages/world-base-compat';
import {
  ControlModulesSchema,
  PhasePlansFileSchema,
  RouterLexiconFileSchema,
  SceneSpecSchema,
  StoryPackageSchema,
  type StoryPackage,
} from '@/types/story-package';

async function readYamlFile(filePath: string): Promise<unknown> {
  const fileContents = await readFile(filePath, 'utf8');
  return YAML.parse(fileContents) as unknown;
}

async function loadAndValidate<T>(
  filePath: string,
  parser: (data: unknown) => T,
  label: string,
): Promise<T> {
  try {
    const rawData = await readYamlFile(filePath);
    return parser(rawData);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load ${label} from ${filePath}: ${message}`);
  }
}

async function loadValidatedWorldBase(filePath: string) {
  return loadAndValidate(
    filePath,
    (data) => {
      const migratedWorldBase = isLegacyWorldBase(data) ? migrateLegacyWorldBase(data) : data;
      return parseWithSchema(WorldBaseSchema, migratedWorldBase, 'worldBase');
    },
    'world base',
  );
}

async function loadStoryPackageInternal(
  packageName: string,
  options?: { readonly runtimeProjection?: boolean },
): Promise<StoryPackage> {
  const packageRoot = path.resolve(process.cwd(), 'src/story-packages', packageName);

  try {
    await access(packageRoot);
  } catch {
    throw new Error(`Story package "${packageName}" was not found at ${packageRoot}.`);
  }

  const sceneSpec = await loadAndValidate(
    path.resolve(packageRoot, 'scene.yaml'),
    (data) => parseWithSchema(SceneSpecSchema, data, 'sceneSpec'),
    'scene spec',
  );
  const phasePlansFile = await loadAndValidate(
    path.resolve(packageRoot, 'phase-plans.yaml'),
    (data) => parseWithSchema(PhasePlansFileSchema, data, 'phasePlans'),
    'phase plans',
  );
  const routerLexiconFile = await loadAndValidate(
    path.resolve(packageRoot, 'router-lexicon.yaml'),
    (data) => parseWithSchema(RouterLexiconFileSchema, data, 'routerLexicon'),
    'router lexicon',
  );
  const auditQuestionSet = await loadAndValidate(
    path.resolve(packageRoot, 'audit-questions.yaml'),
    (data) => parseWithSchema(AuditQuestionSetSchema, data, 'auditQuestionSet'),
    'audit question set',
  );
  const worldBase = await loadValidatedWorldBase(path.resolve(packageRoot, 'world-base.yaml'));
  const controlModules = await loadAndValidate(
    path.resolve(packageRoot, 'control-modules.yaml'),
    (data) => parseWithSchema(ControlModulesSchema, data, 'controlModules'),
    'control modules',
  );
  const projectedWorldBase = options?.runtimeProjection
    ? filterWorldBaseForSceneCast(
        worldBase as Parameters<typeof filterWorldBaseForSceneCast>[0],
        sceneSpec.cast ? { cast: sceneSpec.cast } : undefined,
      )
    : worldBase;

  return deepFreeze(
    parseWithSchema(
      StoryPackageSchema,
      {
        sceneSpec,
        phasePlans: phasePlansFile.phasePlans,
        routerProfiles: routerLexiconFile.routers,
        auditQuestionSet,
        controlModules,
        worldBase: projectedWorldBase,
      },
      'storyPackage',
    ),
  );
}

export async function loadStoryPackage(packageName: string): Promise<StoryPackage> {
  return loadStoryPackageInternal(packageName);
}

export async function loadRuntimeStoryPackage(packageName: string): Promise<StoryPackage> {
  return loadStoryPackageInternal(packageName, { runtimeProjection: true });
}

export type { RouterProfile, SceneSpec, StoryPackage } from '@/types/story-package';
