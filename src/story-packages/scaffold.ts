import * as fileSystem from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import { parseWithSchema } from '@/lib/validation';
import { loadStoryPackage } from '@/engine/story-loader';
import { buildStoryPackageSlug } from '@/story-packages/package-slug';
import {
  StoryPackageScaffoldConflictError,
  StoryPackageScaffoldError,
  StoryPackageScaffoldInputError,
  StoryPackageScaffoldValidationError,
  StoryPackageScaffoldWriteError,
} from '@/story-packages/scaffold-errors';
import { MANAGED_VARIANT_AUTHORING_FILES } from '@/storylines/workspaces';
import type {
  AuditQuestionSet,
  ControlModules,
  PhasePlan,
  PhasePlansFile,
  RouterLexiconFile,
  RuntimeSessionsFile,
  SceneSpec,
  StateSnapshotsFile,
  StorylineRepositoryFile,
  WorldBase,
} from '@/types';
import {
  AuditQuestionSetSchema,
  ControlModulesSchema,
  PhasePlansFileSchema,
  RouterLexiconFileSchema,
  SceneSpecSchema,
  StateSnapshotsFileSchema,
  StorylineRepositoryFileSchema,
  RuntimeSessionsFileSchema,
  WorldBaseSchema,
  assertRuntimeSessionsFileConsistency,
  assertStorylineRepositoryFileConsistency,
} from '@/types';

const storyPackagesRoot = path.resolve(process.cwd(), 'src/story-packages');
const DEFAULT_STORYLINE_ID = 'storyline_main';
const DEFAULT_VARIANT_ID = 'variant_main';

export interface CreateStoryPackageScaffoldInput {
  readonly displayName: string;
}

export interface CreateStoryPackageScaffoldResult {
  readonly packageName: string;
  readonly activeStorylineId: typeof DEFAULT_STORYLINE_ID;
  readonly createdAt: string;
}

function assertPathInsideBase(resolvedPath: string, baseDirectory: string, label: string): string {
  const normalizedBase = path.resolve(baseDirectory);
  const normalizedTarget = path.resolve(resolvedPath);
  const relative = path.relative(normalizedBase, normalizedTarget);

  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return normalizedTarget;
  }

  throw new Error(
    `${label} escapes story package root: ${normalizedTarget} is outside ${normalizedBase}.`,
  );
}

function resolveStoryPackagePath(...segments: string[]): string {
  return assertPathInsideBase(path.resolve(storyPackagesRoot, ...segments), storyPackagesRoot, 'path');
}

function resolveStageRoot(packageName: string, stageId: string): string {
  return resolveStoryPackagePath(`.${packageName}.stage-${stageId}`);
}

function createStageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCharacterProfile(characterId: string, name: string, role: string) {
  return {
    characterId,
    name,
    identityRole: role,
    lightNovelTrait: `${name} keeps the package scaffold generic and grounded.`,
    gender: 'Unspecified',
    personality: 'Adaptable',
    age: 'Unknown',
    occupation: 'Open role',
    characterSummary: `${name} is a placeholder profile for a newly scaffolded package.`,
    capabilityBoundary: 'Define concrete capabilities during authoring.',
    behaviorBoundary: 'Define scene-specific behavior during authoring.',
    oocRedLine: 'Do not assume genre-specific powers or plot obligations.',
    clothing: 'Open',
    propsWeapon: 'Open',
  };
}

function createWorldBase(displayName: string): WorldBase {
  return parseWithSchema(
    WorldBaseSchema,
    {
      worldBaseSetting: `Baseline scaffold for ${displayName}.`,
      worldRules: 'Author-defined constraints will be added during package setup.',
      toneBaseline: 'Flexible narrative baseline.',
      hero: createCharacterProfile('chr_hero01', 'Primary Lead', 'Lead perspective'),
      coreCast: [createCharacterProfile('chr_core01', 'Supporting Cast', 'Supporting role')],
      antagonists: [],
      npcCharacters: 'Add supporting background characters as needed.',
      locations: [
        {
          locationId: 'loc_a1b2c3',
          name: 'Primary Location',
          description: 'A generic starting location for a new package.',
          environmentAppearance: 'Defined during authoring.',
          atmosphereDescription: 'Neutral and ready for customization.',
          humanContextDescription: 'Open to the package author.',
        },
      ],
      locationPatch: 'Primary Location: customize during authoring.',
    },
    'worldBase',
  );
}

function createSceneSpec(displayName: string, packageName: string): SceneSpec {
  return parseWithSchema(
    SceneSpecSchema,
    {
      sceneId: `scene-${packageName}`,
      sceneName: displayName,
      cast: ['chr_hero01', 'chr_core01'],
      locationIds: ['loc_a1b2c3'],
      openingSituation: 'The package begins in a neutral authored baseline state.',
      startPoint: 'Establish the authored premise.',
      mainAxis: 'Establish premise -> develop conflict -> resolve outcome.',
      endLine: 'The authored storyline reaches a defined conclusion.',
      openingHook: 'The package is ready for authoring customization.',
      samplePurpose: 'Generic Phase 3 scaffold for a new story package.',
      source: 'phase-3-scaffold',
    },
    'sceneSpec',
  );
}

function createPhasePlans(sceneSpec: SceneSpec): PhasePlansFile {
  const phasePlans: readonly PhasePlan[] = [
    {
      phaseId: 'phase-01-opening',
      phaseIndex: 1,
      phaseName: 'Opening',
      phaseGoal: 'Establish the authored premise and player context.',
      phaseEndPoint: 'The package is ready to branch into authored content.',
      gradientType: 'Rising',
      beatCount: 4,
      routerHint: 'Exploration',
      notes: 'Replace with package-specific structure during authoring.',
    },
  ];

  return parseWithSchema(
    PhasePlansFileSchema,
    {
      sceneId: sceneSpec.sceneId,
      sceneName: sceneSpec.sceneName,
      source: 'phase-3-scaffold',
      phasePlans,
    },
    'phasePlans',
  );
}

function createRouterLexicon(sceneSpec: SceneSpec): RouterLexiconFile {
  return parseWithSchema(
    RouterLexiconFileSchema,
    {
      sceneId: sceneSpec.sceneId,
      source: 'phase-3-scaffold',
      description: 'Baseline router lexicon for a new package scaffold.',
      routers: [
        {
          routerName: 'Exploration',
          routerSemanticCore: 'Discovery, setup, and authored expansion.',
          verbLexicon: ['observe', 'probe', 'connect'],
        },
      ],
    },
    'routerLexicon',
  );
}

function createAuditQuestionSet(sceneSpec: SceneSpec): AuditQuestionSet {
  return parseWithSchema(
    AuditQuestionSetSchema,
    {
      sceneId: sceneSpec.sceneId,
      source: 'phase-3-scaffold',
      globalQuestions: [
        {
          id: 'AQ-G-001',
          question: 'Does the authored output stay inside the package-defined premise?',
          expected: true,
          blocking: true,
          rationale: 'Baseline safeguard for newly scaffolded packages.',
        },
      ],
      controlQuestions: [],
      selectionPolicy: {
        default: ['AQ-G-001'],
      },
    },
    'auditQuestionSet',
  );
}

function createControlModules(sceneSpec: SceneSpec): ControlModules {
  return parseWithSchema(
    ControlModulesSchema,
    {
      sceneId: sceneSpec.sceneId,
      source: 'phase-3-scaffold',
      lightConeCustomization: {
        boundaryGuidance: 'Keep the authored possibility space explicit and bounded.',
        convergenceGuidance: 'Narrow toward the defined end line as choices accumulate.',
        phaseSettlementGuidance: 'Re-evaluate consequences only after a phase resolves.',
      },
      directorNoteAdditions: {
        beatConstraintsAdditions: 'Keep beats specific, legible, and easy to author further.',
      },
      beatVolumeDefinitions: {
        Low: {
          beatConstraints: 'Summarize stable motion and setup clearly.',
          optionFormatting: 'Offer calm exploratory options.',
        },
        Med: {
          beatConstraints: 'Maintain clear scene action and response.',
          optionFormatting: 'Offer standard progression options.',
        },
        High: {
          beatConstraints: 'Focus tightly on immediate stakes and detail.',
          optionFormatting: 'Offer urgent, high-pressure options.',
        },
      },
    },
    'controlModules',
  );
}

function createStateSnapshots(sceneSpec: SceneSpec): StateSnapshotsFile {
  return parseWithSchema(
    StateSnapshotsFileSchema,
    {
      sceneId: sceneSpec.sceneId,
      description: 'Baseline reference snapshot for a new story package scaffold.',
      snapshots: [
        {
          snapshotId: 'ss-opening',
          purpose: 'Initial authored baseline.',
          sceneState: {
            sceneId: sceneSpec.sceneId,
            currentPhaseIndex: 1,
            currentBeatIndexInPhase: 1,
            mainAxis: sceneSpec.mainAxis,
            endLine: sceneSpec.endLine,
            alpha: 'Author-defined proactive boundary.',
            beta: 'Author-defined reactive boundary.',
            sceneProgress: 'Initial authored state.',
            phaseConsequences: [],
          },
          roundState: {
            phaseGoal: 'Establish the authored premise and player context.',
            currentVolume: 'Low',
            currentRouter: 'Exploration',
            verbLexicon: ['observe'],
            historyWindow: [],
            directorConstraints: 'Keep the scaffold generic until authored.',
          },
          generationState: {
            directorNoteSummary: 'Initial scaffold summary.',
            promptObject: {},
            currentBeatText: null,
            currentOptions: [],
          },
          evaluationState: {
            auditAnswers: [],
            blockingFailures: [],
            retryCount: 0,
            rewriteFeedback: null,
          },
        },
      ],
    },
    'stateSnapshots',
  );
}

function createRuntimeSessionsFile(createdAt: string): RuntimeSessionsFile {
  const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  return parseWithSchema(
    RuntimeSessionsFileSchema,
    {
      version: 1,
      activeSessionId: sessionId,
      sessionsById: {
        [sessionId]: {
          sessionId,
          lifecycle: 'awaiting_start',
          createdAt,
          updatedAt: createdAt,
          headCheckpointId: null,
          activeCheckpointId: null,
          orderedCheckpointIds: [],
          checkpointsById: {},
          lastStableRelationshipLayer: {
            highlightedDeltasText: '',
            stableBackgroundText: '',
          },
        },
      },
    },
    'runtimeSessionsFile',
  );
}

function createStorylineRepositoryFile(
  createdAt: string,
  activeSessionId: string,
): StorylineRepositoryFile {
  return parseWithSchema(
    StorylineRepositoryFileSchema,
    {
      version: 1,
      activeStorylineId: DEFAULT_STORYLINE_ID,
      storylinesById: {
        [DEFAULT_STORYLINE_ID]: {
          storylineId: DEFAULT_STORYLINE_ID,
          name: 'Main Line',
          status: 'active',
          sourceCheckpointId: null,
          headCheckpointId: null,
          variantId: DEFAULT_VARIANT_ID,
          activeSessionId,
          createdAt,
          updatedAt: createdAt,
        },
      },
      variantsById: {
        [DEFAULT_VARIANT_ID]: {
          variantId: DEFAULT_VARIANT_ID,
          workspaceRoot: `variants/${DEFAULT_VARIANT_ID}`,
          createdFromStorylineId: null,
          createdAt,
          updatedAt: createdAt,
        },
      },
    },
    'storylineRepositoryFile',
  );
}

async function ensurePackageNameAvailable(packageName: string): Promise<void> {
  const directoryEntries = await fileSystem.readdir(storyPackagesRoot, { withFileTypes: true });
  const packageNameLower = packageName.toLowerCase();

  for (const entry of directoryEntries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }

    if (entry.name.toLowerCase() === packageNameLower) {
      throw new StoryPackageScaffoldConflictError('Story package already exists.');
    }
  }
}

async function writeYamlDocument(filePath: string, value: unknown): Promise<void> {
  await fileSystem.writeFile(filePath, YAML.stringify(value), 'utf8');
}

async function copyVariantManagedFiles(stageRoot: string): Promise<void> {
  const variantRoot = path.resolve(stageRoot, 'variants', DEFAULT_VARIANT_ID);
  await fileSystem.mkdir(variantRoot, { recursive: true });

  for (const fileName of MANAGED_VARIANT_AUTHORING_FILES) {
    await fileSystem.cp(path.resolve(stageRoot, fileName), path.resolve(variantRoot, fileName));
  }
}

async function validateStageRepositories(stageRoot: string): Promise<void> {
  const storylineRepository = assertStorylineRepositoryFileConsistency(
    parseWithSchema(
      StorylineRepositoryFileSchema,
      JSON.parse(
        await fileSystem.readFile(path.resolve(stageRoot, 'storyline-repository.json'), 'utf8'),
      ) as unknown,
      'storylineRepositoryFile',
    ),
  );
  const runtimeSessions = assertRuntimeSessionsFileConsistency(
    parseWithSchema(
      RuntimeSessionsFileSchema,
      JSON.parse(
        await fileSystem.readFile(path.resolve(stageRoot, 'runtime-sessions.json'), 'utf8'),
      ) as unknown,
      'runtimeSessionsFile',
    ),
  );

  const storyline = storylineRepository.storylinesById[storylineRepository.activeStorylineId];
  if (!storyline) {
    throw new StoryPackageScaffoldValidationError('Staged storyline repository is missing the active storyline.');
  }

  if (!runtimeSessions.sessionsById[storyline.activeSessionId]) {
    throw new StoryPackageScaffoldValidationError(
      `Staged repository mismatch: storyline "${storyline.storylineId}" references missing session "${storyline.activeSessionId}".`,
    );
  }

  if (runtimeSessions.activeSessionId !== storyline.activeSessionId) {
    throw new StoryPackageScaffoldValidationError(
      'Staged repository mismatch: runtime activeSessionId does not mirror storyline_main.',
    );
  }
}

async function validateStagePackage(packageName: string, stageRoot: string): Promise<void> {
  try {
    await loadStoryPackage(packageName, {
      authoredRootOverride: stageRoot,
    });
    await loadStoryPackage(packageName, {
      authoredRootOverride: path.resolve(stageRoot, 'variants', DEFAULT_VARIANT_ID),
    });
    await validateStageRepositories(stageRoot);
  } catch (error) {
    if (error instanceof StoryPackageScaffoldError) {
      throw error;
    }

    throw new StoryPackageScaffoldValidationError('Scaffold validation failed.');
  }
}

async function cleanupStageRoot(stageRoot: string): Promise<void> {
  await fileSystem.rm(stageRoot, { recursive: true, force: true }).catch(() => undefined);
}

export async function createStoryPackageScaffold(
  input: CreateStoryPackageScaffoldInput,
): Promise<CreateStoryPackageScaffoldResult> {
  const displayName = input.displayName.trim();
  let packageName: string;
  let stageRoot: string | null = null;

  try {
    try {
      packageName = buildStoryPackageSlug(displayName);
    } catch {
      throw new StoryPackageScaffoldInputError('Invalid story package display name.');
    }

    await ensurePackageNameAvailable(packageName);

    const createdAt = new Date().toISOString();
    const sceneSpec = createSceneSpec(displayName, packageName);
    const phasePlans = createPhasePlans(sceneSpec);
    const routerLexicon = createRouterLexicon(sceneSpec);
    const auditQuestionSet = createAuditQuestionSet(sceneSpec);
    const worldBase = createWorldBase(displayName);
    const controlModules = createControlModules(sceneSpec);
    const stateSnapshots = createStateSnapshots(sceneSpec);
    const runtimeSessions = createRuntimeSessionsFile(createdAt);
    const activeSessionId = runtimeSessions.activeSessionId;

    if (!activeSessionId) {
      throw new StoryPackageScaffoldValidationError(
        'Scaffold runtime session bootstrap failed to create an active session.',
      );
    }

    const storylineRepository = createStorylineRepositoryFile(createdAt, activeSessionId);
    const stageRootPath = resolveStageRoot(packageName, createStageId());
    stageRoot = stageRootPath;
    const targetRoot = resolvePackageRoot(packageName);

    await fileSystem.mkdir(stageRootPath, { recursive: true });

    await writeYamlDocument(path.resolve(stageRootPath, 'world-base.yaml'), worldBase);
    await writeYamlDocument(path.resolve(stageRootPath, 'scene.yaml'), sceneSpec);
    await writeYamlDocument(path.resolve(stageRootPath, 'phase-plans.yaml'), phasePlans);
    await writeYamlDocument(path.resolve(stageRootPath, 'router-lexicon.yaml'), routerLexicon);
    await writeYamlDocument(path.resolve(stageRootPath, 'audit-questions.yaml'), auditQuestionSet);
    await writeYamlDocument(path.resolve(stageRootPath, 'control-modules.yaml'), controlModules);
    await writeYamlDocument(path.resolve(stageRootPath, 'state-snapshots.yaml'), stateSnapshots);
    await fileSystem.writeFile(
      path.resolve(stageRootPath, 'runtime-sessions.json'),
      `${JSON.stringify(runtimeSessions, null, 2)}\n`,
      'utf8',
    );
    await fileSystem.writeFile(
      path.resolve(stageRootPath, 'storyline-repository.json'),
      `${JSON.stringify(storylineRepository, null, 2)}\n`,
      'utf8',
    );
    await copyVariantManagedFiles(stageRootPath);

    await validateStagePackage(packageName, stageRootPath);
    await fileSystem.access(targetRoot).then(
      () => {
        throw new StoryPackageScaffoldConflictError('Story package already exists.');
      },
      (error) => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      },
    );
    await fileSystem.rename(stageRootPath, targetRoot);

    return {
      packageName,
      activeStorylineId: DEFAULT_STORYLINE_ID,
      createdAt,
    };
  } catch (error) {
    if (stageRoot) {
      await cleanupStageRoot(stageRoot);
    }

    if (error instanceof StoryPackageScaffoldError) {
      throw error;
    }

    throw new StoryPackageScaffoldWriteError('Could not create package root under src/story-packages.');
  }
}
