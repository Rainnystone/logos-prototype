import { z } from 'zod';

import { AuditQuestionSetSchema } from '@/types/audit-question-set';
import { PhasePlanSchema } from '@/types/phase-plan';
import { StateSnapshotSchema } from '@/types/state-snapshot';
import { WorldBaseSchema } from '@/types/prompt-object';

/** Derived from Phase 00 story package requirements and sample-scene fixtures. */
export const SceneSpecSchema = z
  .object({
    sceneId: z.string(),
    sceneName: z.string(),
    cast: z.array(z.string()).optional(),
    locationIds: z.array(z.string()).optional(),
    openingSituation: z.string().optional(),
    startPoint: z.string().optional(),
    mainAxis: z.string(),
    endLine: z.string(),
    openingHook: z.string().optional(),
    samplePurpose: z.string().optional(),
    source: z.string().optional(),
  })
  .strict();
export type SceneSpec = z.infer<typeof SceneSpecSchema>;

/** Derived from LOGOS-SPEC sample-scene/router-lexicon.yaml after execution-plan field mapping. */
export const RouterProfileSchema = z
  .object({
    routerName: z.string(),
    routerSemanticCore: z.string(),
    verbLexicon: z.array(z.string()).min(1),
  })
  .strict();
export type RouterProfile = z.infer<typeof RouterProfileSchema>;

/** Story package wrapper for phase plans. */
export const PhasePlansFileSchema = z
  .object({
    sceneId: z.string(),
    sceneName: z.string().optional(),
    source: z.string().optional(),
    phasePlans: z.array(PhasePlanSchema).min(1),
  })
  .strict();
export type PhasePlansFile = z.infer<typeof PhasePlansFileSchema>;

/** Story package wrapper for router lexicons. */
export const RouterLexiconFileSchema = z
  .object({
    sceneId: z.string(),
    source: z.string().optional(),
    description: z.string().optional(),
    routers: z.array(RouterProfileSchema).min(1),
  })
  .strict();
export type RouterLexiconFile = z.infer<typeof RouterLexiconFileSchema>;

export const LightConeCustomizationSchema = z
  .object({
    boundaryGuidance: z.string(),
    convergenceGuidance: z.string(),
    phaseSettlementGuidance: z.string(),
  })
  .strict();
export type LightConeCustomization = z.infer<typeof LightConeCustomizationSchema>;

export const DirectorNoteAdditionsSchema = z
  .object({
    beatConstraintsAdditions: z.string(),
  })
  .strict();
export type DirectorNoteAdditions = z.infer<typeof DirectorNoteAdditionsSchema>;

export const BeatVolumeDefinitionSchema = z
  .object({
    beatConstraints: z.string(),
    optionFormatting: z.string(),
  })
  .strict();
export type BeatVolumeDefinition = z.infer<typeof BeatVolumeDefinitionSchema>;

export const BeatVolumeDefinitionsSchema = z
  .object({
    Low: BeatVolumeDefinitionSchema,
    Med: BeatVolumeDefinitionSchema,
    High: BeatVolumeDefinitionSchema,
  })
  .strict();
export type BeatVolumeDefinitions = z.infer<typeof BeatVolumeDefinitionsSchema>;

export const ControlModulesSchema = z
  .object({
    sceneId: z.string(),
    source: z.string().optional(),
    lightConeCustomization: LightConeCustomizationSchema,
    directorNoteAdditions: DirectorNoteAdditionsSchema,
    beatVolumeDefinitions: BeatVolumeDefinitionsSchema,
  })
  .strict();
export type ControlModules = z.infer<typeof ControlModulesSchema>;

/** Story package wrapper for reference state snapshots. */
export const StateSnapshotFixtureSchema = StateSnapshotSchema.extend({
  snapshotId: z.string(),
  purpose: z.string(),
}).strict();
export type StateSnapshotFixture = z.infer<typeof StateSnapshotFixtureSchema>;

/** Story package wrapper for sample-scene state snapshots. */
export const StateSnapshotsFileSchema = z
  .object({
    sceneId: z.string(),
    description: z.string().optional(),
    snapshots: z.array(StateSnapshotFixtureSchema).min(1),
  })
  .strict();
export type StateSnapshotsFile = z.infer<typeof StateSnapshotsFileSchema>;

/** Runtime story package aggregate used by the loader. */
export const StoryPackageSchema = z
  .object({
    sceneSpec: SceneSpecSchema,
    phasePlans: z.array(PhasePlanSchema).min(1),
    routerProfiles: z.array(RouterProfileSchema).min(1),
    auditQuestionSet: AuditQuestionSetSchema,
    controlModules: ControlModulesSchema,
    worldBase: WorldBaseSchema,
  })
  .strict();
export type StoryPackage = z.infer<typeof StoryPackageSchema>;
