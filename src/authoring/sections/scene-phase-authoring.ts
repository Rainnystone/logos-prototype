import type { GradientType, PhasePlan, RouterProfile, SceneSpec, StoryPackage } from '@/types';
import { normalizeSceneCastSelection } from '@/authoring/sections/scene-cast';

const GRADIENT_OPTIONS = [
  'Rising',
  'Falling',
  'Static High',
  'U-Shape',
  'Arch',
  'Pulse',
  'Steady',
] as const satisfies readonly GradientType[];

type ScenePhaseStorySlice = Pick<StoryPackage, 'sceneSpec' | 'phasePlans' | 'routerProfiles' | 'worldBase'>;

export interface ScenePhaseSceneDraft {
  sceneName: string;
  openingSituation: string;
  startPoint: string;
  endLine: string;
  openingHook: string;
  castMode: 'unset' | 'explicit';
  cast?: string[];
  locationIds?: string[];
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

function normalizeOptionalIdList(values: readonly string[] | undefined): string[] | undefined {
  if (!values) {
    return undefined;
  }

  const uniqueIds = Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  );

  return uniqueIds.length > 0 ? uniqueIds : undefined;
}

function deriveStartPointFromMainAxis(mainAxis: string): string {
  const normalizedMainAxis = normalizeText(mainAxis);
  const [firstSegment] = normalizedMainAxis
    .split(/\s*->\s*/g)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return firstSegment ?? normalizedMainAxis;
}

function deriveMainAxis(
  startPoint: string,
  phasePlans: readonly Pick<ScenePhasePlanDraft, 'phaseGoal'>[],
  endLine: string,
): string {
  return [
    normalizeText(startPoint),
    ...phasePlans.map((phasePlan) => normalizeText(phasePlan.phaseGoal)),
    normalizeText(endLine),
  ]
    .filter(Boolean)
    .join(' -> ');
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
      startPoint: source.sceneSpec.startPoint ?? deriveStartPointFromMainAxis(source.sceneSpec.mainAxis),
      endLine: source.sceneSpec.endLine,
      openingHook: source.sceneSpec.openingHook ?? '',
      castMode: source.sceneSpec.cast ? 'explicit' : 'unset',
      ...(source.sceneSpec.cast ? { cast: [...source.sceneSpec.cast] } : {}),
      ...(source.sceneSpec.locationIds
        ? { locationIds: [...source.sceneSpec.locationIds] }
        : {}),
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

function normalizeSceneLocationSelection(
  current: Pick<StoryPackage, 'worldBase'>,
  locationIds: readonly string[] | undefined,
): string[] {
  const normalizedLocationIds = new Set(normalizeOptionalIdList(locationIds) ?? []);

  return current.worldBase.locations
    .map((location) => location.locationId)
    .filter((locationId) => normalizedLocationIds.has(locationId));
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
    issues.push('场景名是必填项。');
  }

  if (!normalizeText(draft.sceneSpec.startPoint)) {
    issues.push('起点是必填项。');
  }

  if (!normalizeText(draft.sceneSpec.endLine)) {
    issues.push('终点线是必填项。');
  }

  if (draft.phasePlans.length === 0) {
    issues.push('至少需要一个 Phase。');
  }

  draft.phasePlans.forEach((phasePlan, index) => {
    const phaseLabel = normalizeText(phasePlan.phaseName) || `Phase ${index + 1}`;

    if (!normalizeText(phasePlan.phaseName)) {
      issues.push(`第 ${index + 1} 个 Phase 缺少 Phase 名。`);
    }

    if (!normalizeText(phasePlan.phaseGoal)) {
      issues.push(`Phase "${phaseLabel}" 缺少 Phase 目标。`);
    }

    if (!GRADIENT_OPTIONS.includes(phasePlan.gradientType)) {
      issues.push(`Phase "${phaseLabel}" 使用了不支持的 Gradient "${phasePlan.gradientType}"。`);
    }

    if (phasePlan.routerHint && !routerOptionSet.has(phasePlan.routerHint.trim())) {
      issues.push(
        `Phase "${phaseLabel}" 使用了不可用的 Router 选择 "${phasePlan.routerHint}"。`,
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
    sceneId: current.sceneSpec.sceneId,
    sceneName: normalizeText(draft.sceneSpec.sceneName),
    startPoint: normalizeText(draft.sceneSpec.startPoint),
    mainAxis: deriveMainAxis(draft.sceneSpec.startPoint, draft.phasePlans, draft.sceneSpec.endLine),
    endLine: normalizeText(draft.sceneSpec.endLine),
    ...(current.sceneSpec.source ? { source: current.sceneSpec.source } : {}),
    ...(normalizeOptionalText(draft.sceneSpec.openingSituation)
      ? { openingSituation: normalizeOptionalText(draft.sceneSpec.openingSituation) }
      : {}),
    ...(normalizeOptionalText(draft.sceneSpec.openingHook)
      ? { openingHook: normalizeOptionalText(draft.sceneSpec.openingHook) }
      : {}),
    ...(normalizeOptionalText(current.sceneSpec.samplePurpose)
      ? { samplePurpose: normalizeOptionalText(current.sceneSpec.samplePurpose) }
      : {}),
  };

  if (draft.sceneSpec.castMode === 'explicit') {
    const normalizedSceneCast = normalizeSceneCastSelection(current.worldBase, draft.sceneSpec.cast);
    nextSceneSpec.cast = normalizedSceneCast.cast;
  }

  const normalizedSceneLocationIds = normalizeSceneLocationSelection(
    current,
    draft.sceneSpec.locationIds,
  );
  if (normalizedSceneLocationIds.length > 0) {
    nextSceneSpec.locationIds = normalizedSceneLocationIds;
  }

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
