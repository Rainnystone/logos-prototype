import type { GradientType, PhasePlan, RouterProfile, SceneSpec, StoryPackage } from '@/types';

const GRADIENT_OPTIONS = [
  'Rising',
  'Falling',
  'Static High',
  'U-Shape',
  'Arch',
  'Pulse',
  'Steady',
] as const satisfies readonly GradientType[];

type ScenePhaseStorySlice = Pick<StoryPackage, 'sceneSpec' | 'phasePlans' | 'routerProfiles'>;

export interface ScenePhaseSceneDraft {
  sceneName: string;
  openingSituation: string;
  mainAxis: string;
  endLine: string;
  openingHook: string;
  samplePurpose: string;
}

export interface ScenePhasePlanDraft {
  phaseId?: string;
  phaseName: string;
  phaseGoal: string;
  phaseEndPoint?: string;
  gradientType: GradientType;
  routerHint?: string;
  notes?: string;
}

export interface ScenePhaseAuthoringDraft {
  sceneSpec: ScenePhaseSceneDraft;
  phasePlans: ScenePhasePlanDraft[];
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : undefined;
}

function slugifyPhaseName(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized : 'phase';
}

function buildGeneratedPhaseId(phaseName: string, phaseIndex: number): string {
  return `phase-${String(phaseIndex).padStart(2, '0')}-${slugifyPhaseName(phaseName)}`;
}

function getPhaseDisplayName(phase: PhasePlan): string {
  return normalizeOptionalText(phase.phaseName) ?? phase.phaseId;
}

export function createScenePhaseAuthoringDraft(
  source: Pick<StoryPackage, 'sceneSpec' | 'phasePlans'>,
): ScenePhaseAuthoringDraft {
  return {
    sceneSpec: {
      sceneName: source.sceneSpec.sceneName,
      openingSituation: source.sceneSpec.openingSituation ?? '',
      mainAxis: source.sceneSpec.mainAxis,
      endLine: source.sceneSpec.endLine,
      openingHook: source.sceneSpec.openingHook ?? '',
      samplePurpose: source.sceneSpec.samplePurpose ?? '',
    },
    phasePlans: source.phasePlans.map((phasePlan) => ({
      phaseId: phasePlan.phaseId,
      phaseName: getPhaseDisplayName(phasePlan),
      phaseGoal: phasePlan.phaseGoal,
      ...(phasePlan.phaseEndPoint ? { phaseEndPoint: phasePlan.phaseEndPoint } : {}),
      gradientType: phasePlan.gradientType,
      ...(phasePlan.routerHint ? { routerHint: phasePlan.routerHint } : {}),
      ...(phasePlan.notes ? { notes: phasePlan.notes } : {}),
    })),
  };
}

export function createEmptyScenePhaseDraft(index: number): ScenePhasePlanDraft {
  return {
    phaseName: `Phase ${index}`,
    phaseGoal: '',
    phaseEndPoint: '',
    gradientType: 'Steady',
    notes: '',
  };
}

export function validateScenePhaseAuthoringDraft(
  draft: ScenePhaseAuthoringDraft,
  routerOptions: readonly string[],
): readonly string[] {
  const issues: string[] = [];
  const routerOptionSet = new Set(routerOptions.map((option) => option.trim()).filter(Boolean));

  if (!normalizeText(draft.sceneSpec.sceneName)) {
    issues.push('Scene name is required.');
  }

  if (!normalizeText(draft.sceneSpec.mainAxis)) {
    issues.push('Main axis is required.');
  }

  if (!normalizeText(draft.sceneSpec.endLine)) {
    issues.push('End line is required.');
  }

  if (draft.phasePlans.length === 0) {
    issues.push('At least one phase is required.');
  }

  draft.phasePlans.forEach((phasePlan, index) => {
    const phaseLabel = normalizeText(phasePlan.phaseName) || `Phase ${index + 1}`;

    if (!normalizeText(phasePlan.phaseName)) {
      issues.push(`Phase ${index + 1} is missing a phase name.`);
    }

    if (!normalizeText(phasePlan.phaseGoal)) {
      issues.push(`Phase "${phaseLabel}" is missing a phase goal.`);
    }

    if (!GRADIENT_OPTIONS.includes(phasePlan.gradientType)) {
      issues.push(`Phase "${phaseLabel}" uses an unsupported gradient "${phasePlan.gradientType}".`);
    }

    if (phasePlan.routerHint && !routerOptionSet.has(phasePlan.routerHint.trim())) {
      issues.push(
        `Phase "${phaseLabel}" uses an unavailable router selection "${phasePlan.routerHint}".`,
      );
    }
  });

  return issues;
}

export function renderScenePhaseAuthoring(
  current: ScenePhaseStorySlice,
  draft: ScenePhaseAuthoringDraft,
): {
  sceneSpec: SceneSpec;
  phasePlans: PhasePlan[];
} {
  const nextSceneSpec: SceneSpec = {
    ...current.sceneSpec,
    sceneName: normalizeText(draft.sceneSpec.sceneName),
    mainAxis: normalizeText(draft.sceneSpec.mainAxis),
    endLine: normalizeText(draft.sceneSpec.endLine),
    ...(normalizeOptionalText(draft.sceneSpec.openingSituation)
      ? { openingSituation: normalizeOptionalText(draft.sceneSpec.openingSituation) }
      : {}),
    ...(normalizeOptionalText(draft.sceneSpec.openingHook)
      ? { openingHook: normalizeOptionalText(draft.sceneSpec.openingHook) }
      : {}),
    ...(normalizeOptionalText(draft.sceneSpec.samplePurpose)
      ? { samplePurpose: normalizeOptionalText(draft.sceneSpec.samplePurpose) }
      : {}),
  };

  const nextPhasePlans: PhasePlan[] = draft.phasePlans.map((phaseDraft, index) => {
    const phaseName = normalizeText(phaseDraft.phaseName);

    return {
      phaseId: phaseDraft.phaseId ?? buildGeneratedPhaseId(phaseName, index + 1),
      phaseIndex: index + 1,
      phaseName,
      phaseGoal: normalizeText(phaseDraft.phaseGoal),
      ...(normalizeOptionalText(phaseDraft.phaseEndPoint)
        ? { phaseEndPoint: normalizeOptionalText(phaseDraft.phaseEndPoint) }
        : {}),
      gradientType: phaseDraft.gradientType,
      beatCount: 4,
      ...(normalizeOptionalText(phaseDraft.routerHint)
        ? { routerHint: normalizeOptionalText(phaseDraft.routerHint) }
        : {}),
      ...(normalizeOptionalText(phaseDraft.notes)
        ? { notes: normalizeOptionalText(phaseDraft.notes) }
        : {}),
    };
  });

  return {
    sceneSpec: nextSceneSpec,
    phasePlans: nextPhasePlans,
  };
}

export function getRouterOptions(routerProfiles: readonly RouterProfile[]): string[] {
  return routerProfiles.map((profile) => profile.routerName);
}

export { GRADIENT_OPTIONS };
