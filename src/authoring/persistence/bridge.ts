import { SAVE_SECTION_IDS, type SaveRequest, type SaveResult } from '@/authoring/contracts';
import * as authoringStatus from '@/authoring/persistence/authoring-status';
import {
  type AuthoringPersistenceTarget,
  ensureStoryPackageExists,
  persistAuditQuestionSetDraft,
  persistControlModulesDraft,
  persistRouterProfilesDraft,
  persistScenePhaseDraft,
  persistWorldBaseDraft,
  readAuditQuestionsDraftContents,
  readControlModulesDraftContents,
  readPhasePlansDraftContents,
  readRouterLexiconDraftContents,
  readSceneDraftContents,
  readWorldBaseDraftContents,
  resolveAuthoringPersistenceTarget,
  restoreAuditQuestionSetDraft,
  restoreControlModulesDraft,
  restoreRouterLexiconDraft,
  restoreScenePhaseDraft,
  restoreWorldBaseDraft,
} from '@/authoring/persistence/repository';
import {
  createSaveAppliedResult,
  createSaveAppliedWithWarningsResult,
  createSaveBlockedResult,
  createSaveFailedResult,
} from '@/authoring/persistence/save-results';
import { reloadStoryPackage } from '@/authoring/persistence/reload';
import {
  createControlModulesDraft,
  renderControlModulesSave,
  validateControlModulesDraft,
  type ControlModulesDraft,
} from '@/authoring/sections/control-modules';
import {
  renderScenePhaseAuthoring,
  validateScenePhaseAuthoringDraft,
  type ScenePhaseAuthoringDraft,
} from '@/authoring/sections/scene-phase-authoring';
import {
  applyWorldBaseCastDraft,
  type WorldBaseCastDraft,
  type WorldBaseCharacterDraft,
} from '@/authoring/sections/worldbase-cast';
import type { StoryPackage } from '@/types';
import type { WorldLocationDraft } from '@/authoring/sections/world-locations';
import { resolveActiveStorylineContext } from '@/storylines/substrate';

const supportedSectionIds = new Set<SaveRequest['sectionId']>(SAVE_SECTION_IDS);
const supportedSaveSources = new Set<SaveRequest['source']>(['page', 'coordinator', 'repair']);
const supportedModuleScopes = new Set<NonNullable<SaveRequest['moduleScope']>>([
  'light-cone',
  'director-note-additions',
  'auditor-question-set',
  'beat-volume-definitions',
  'router-profile-set',
]);

const supportedDeterministicWriteSections = new Set<SaveRequest['sectionId']>(SAVE_SECTION_IDS);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function hasAppendArray(value: unknown): value is { append: unknown[] } {
  return isPlainObject(value) && Array.isArray(value.append);
}

function normalizeSaveRequest(input: SaveRequest): { request: SaveRequest; issues: readonly string[] } {
  const issues: string[] = [];
  const rawInput = isPlainObject(input) ? input : ({} as Record<string, unknown>);
  const requestId =
    typeof rawInput.requestId === 'string'
      ? rawInput.requestId
      : (issues.push('请求编号必须是字符串。'), '');
  const packageName =
    typeof rawInput.packageName === 'string'
      ? rawInput.packageName
      : (issues.push('包名必须是字符串。'), '');
  const sectionId =
    typeof rawInput.sectionId === 'string'
      ? (rawInput.sectionId as SaveRequest['sectionId'])
      : (issues.push('页面标识必须是字符串。'), '' as SaveRequest['sectionId']);
  const source =
    typeof rawInput.source === 'string'
      ? (rawInput.source as SaveRequest['source'])
      : (issues.push('保存来源必须是字符串。'), 'page');
  const moduleScope =
    rawInput.moduleScope === undefined
      ? undefined
      : typeof rawInput.moduleScope === 'string'
        ? (rawInput.moduleScope as NonNullable<SaveRequest['moduleScope']>)
        : (issues.push('模块范围在提供时必须是字符串。'), undefined);
  const dryRun =
    rawInput.dryRun === undefined
      ? false
      : typeof rawInput.dryRun === 'boolean'
        ? rawInput.dryRun
        : (issues.push('试运行标记在提供时必须是布尔值。'), false);
  const rawPayload = rawInput.payload as unknown;
  const payload: {
    uiFields?: Record<string, unknown>;
    patchCandidates?: readonly Record<string, unknown>[];
  } = {};

  if (!isPlainObject(rawPayload)) {
    issues.push('保存内容必须是对象。');
    return {
      request: {
        requestId,
        packageName,
        sectionId,
        source,
        ...(moduleScope ? { moduleScope } : {}),
        ...(dryRun ? { dryRun } : {}),
        payload,
      },
      issues,
    };
  }

  if ('uiFields' in rawPayload) {
    if (isPlainObject(rawPayload.uiFields)) {
      payload.uiFields = { ...rawPayload.uiFields };
    } else {
      issues.push('界面字段在提供时必须是对象。');
    }
  }

  if ('patchCandidates' in rawPayload) {
    if (Array.isArray(rawPayload.patchCandidates)) {
      const sanitizedPatchCandidates: Array<Record<string, unknown>> = [];
      for (const candidate of rawPayload.patchCandidates) {
        if (isPlainObject(candidate)) {
          sanitizedPatchCandidates.push({ ...candidate });
        } else {
          issues.push('补丁候选里只能放对象。');
        }
      }

      if (sanitizedPatchCandidates.length > 0) {
        payload.patchCandidates = sanitizedPatchCandidates;
      }
    } else {
      issues.push('补丁候选在提供时必须是数组。');
    }
  }

  return {
    request: {
      requestId,
      packageName,
      sectionId,
      source,
      ...(moduleScope ? { moduleScope } : {}),
      ...(dryRun ? { dryRun } : {}),
      payload: payload as SaveRequest['payload'],
    },
    issues,
  };
}

function validateSaveRequest(request: SaveRequest): readonly string[] {
  const issues: string[] = [];

  if (!supportedSectionIds.has(request.sectionId)) {
    issues.push(`不支持的页面 "${request.sectionId}"。`);
  }

  if (!supportedSaveSources.has(request.source)) {
    issues.push(`不支持的保存来源 "${request.source}"。`);
  }

  if (request.moduleScope && !supportedModuleScopes.has(request.moduleScope)) {
    issues.push(`不支持的模块范围 "${request.moduleScope}"。`);
  }

  if (request.moduleScope && request.sectionId !== 'control-modules') {
    issues.push('只有控制模块保存才能使用模块范围。');
  }

  if (request.sectionId === 'control-modules' && !request.moduleScope) {
    issues.push('控制模块保存需要模块范围。');
  }

  if (!request.requestId.trim()) {
    issues.push('请求编号是必填项。');
  }

  if (!request.packageName.trim()) {
    issues.push('包名是必填项。');
  }

  return issues;
}

function isStringField(value: unknown): value is string {
  return typeof value === 'string';
}

function isWorldBaseCharacterDraft(value: unknown): value is WorldBaseCharacterDraft {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.draftId === 'string' &&
    typeof value.characterId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.identityRole === 'string' &&
    typeof value.lightNovelTrait === 'string' &&
    typeof value.gender === 'string' &&
    typeof value.personality === 'string' &&
    typeof value.age === 'string' &&
    typeof value.occupation === 'string' &&
    typeof value.characterSummary === 'string' &&
    typeof value.capabilityBoundary === 'string' &&
    typeof value.behaviorBoundary === 'string' &&
    typeof value.oocRedLine === 'string' &&
    typeof value.clothing === 'string' &&
    typeof value.propsWeapon === 'string' &&
    (value.fatalWeakness === undefined || typeof value.fatalWeakness === 'string')
  );
}

function extractCharacterList(value: unknown): WorldBaseCharacterDraft[] | undefined {
  if (!isUnknownArray(value)) {
    return undefined;
  }

  const characters = value.filter(isWorldBaseCharacterDraft);
  return characters.length === value.length ? [...characters] : undefined;
}

function isWorldLocationDraft(value: unknown): value is WorldLocationDraft {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.draftId === 'string' &&
    typeof value.locationId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.environmentAppearance === 'string' &&
    typeof value.atmosphereDescription === 'string' &&
    typeof value.humanContextDescription === 'string'
  );
}

function extractLocationList(value: unknown): WorldLocationDraft[] | undefined {
  if (!isUnknownArray(value)) {
    return undefined;
  }

  const locations = value.filter(isWorldLocationDraft);
  return locations.length === value.length ? [...locations] : undefined;
}

function extractWorldBaseCastDraft(
  request: SaveRequest,
): Partial<WorldBaseCastDraft> | null {
  const uiFields = request.payload.uiFields;

  if (!uiFields) {
    return null;
  }

  const worldBaseSetting = isStringField(uiFields.worldBaseSetting)
    ? uiFields.worldBaseSetting
    : undefined;
  const worldRules = isStringField(uiFields.worldRules) ? uiFields.worldRules : undefined;
  const toneBaseline = isStringField(uiFields.toneBaseline) ? uiFields.toneBaseline : undefined;
  const hero = isWorldBaseCharacterDraft(uiFields.hero) ? uiFields.hero : undefined;
  const coreCast = extractCharacterList(uiFields.coreCast);
  const antagonists = extractCharacterList(uiFields.antagonists);
  const supportingCast = isStringField(uiFields.supportingCast) ? uiFields.supportingCast : undefined;
  const locations = extractLocationList(uiFields.locations);
  const locationPool = isStringField(uiFields.locationPool) ? uiFields.locationPool : undefined;

  if (
    worldBaseSetting === undefined &&
    worldRules === undefined &&
    toneBaseline === undefined &&
    hero === undefined &&
    coreCast === undefined &&
    antagonists === undefined &&
    supportingCast === undefined &&
    locations === undefined &&
    locationPool === undefined
  ) {
    return null;
  }

  return {
    ...(worldBaseSetting !== undefined ? { worldBaseSetting } : {}),
    ...(worldRules !== undefined ? { worldRules } : {}),
    ...(toneBaseline !== undefined ? { toneBaseline } : {}),
    ...(hero !== undefined ? { hero } : {}),
    ...(coreCast !== undefined ? { coreCast } : {}),
    ...(antagonists !== undefined ? { antagonists } : {}),
    ...(supportingCast !== undefined ? { supportingCast } : {}),
    ...(locations !== undefined ? { locations } : {}),
    ...(locationPool !== undefined ? { locationPool } : {}),
  };
}

function extractScenePhaseAuthoringDraft(
  request: SaveRequest,
): ScenePhaseAuthoringDraft | null {
  const uiFields = request.payload.uiFields;

  if (!uiFields) {
    return null;
  }

  const sceneSpec = uiFields.sceneSpec;
  const phasePlans = uiFields.phasePlans;

  if (!isPlainObject(sceneSpec) || !Array.isArray(phasePlans)) {
    return null;
  }

  const normalizedPhasePlans = phasePlans
    .filter((phase) => isPlainObject(phase))
    .map((phase) => ({
      ...(isStringField(phase.phaseId) ? { phaseId: phase.phaseId } : {}),
      phaseName: isStringField(phase.phaseName) ? phase.phaseName : '',
      phaseGoal: isStringField(phase.phaseGoal) ? phase.phaseGoal : '',
      ...(isStringField(phase.phaseEndPoint) ? { phaseEndPoint: phase.phaseEndPoint } : {}),
      gradientType: isStringField(phase.gradientType)
        ? (phase.gradientType as ScenePhaseAuthoringDraft['phasePlans'][number]['gradientType'])
        : 'Steady',
      ...(isStringField(phase.routerHint) ? { routerHint: phase.routerHint } : {}),
      ...(isStringField(phase.notes) ? { notes: phase.notes } : {}),
    }));

  const rawCast = sceneSpec.cast as unknown;
  const castIsArray = Array.isArray(rawCast);
  const cast = castIsArray
    ? rawCast.filter((value): value is string => isStringField(value))
    : undefined;
  const rawLocationIds = sceneSpec.locationIds as unknown;
  const locationIdsAreArray = Array.isArray(rawLocationIds);
  const locationIds = locationIdsAreArray
    ? rawLocationIds.filter((value): value is string => isStringField(value))
    : undefined;
  const filteredCast = cast ?? [];
  const castMode =
    sceneSpec.castMode === 'explicit' || sceneSpec.castMode === 'unset'
      ? sceneSpec.castMode
      : cast
        ? 'explicit'
        : 'unset';

  if (castMode === 'explicit' && !castIsArray) {
    return null;
  }

  if (castMode === 'explicit' && castIsArray && rawCast.length > 0 && filteredCast.length === 0) {
    return null;
  }

  if (
    locationIdsAreArray &&
    rawLocationIds.length > 0 &&
    (locationIds === undefined || locationIds.length === 0)
  ) {
    return null;
  }

  return {
    sceneSpec: {
      sceneName: isStringField(sceneSpec.sceneName) ? sceneSpec.sceneName : '',
      openingSituation: isStringField(sceneSpec.openingSituation) ? sceneSpec.openingSituation : '',
      startPoint: isStringField(sceneSpec.startPoint)
        ? sceneSpec.startPoint
        : isStringField(sceneSpec.mainAxis)
          ? sceneSpec.mainAxis
          : '',
      endLine: isStringField(sceneSpec.endLine) ? sceneSpec.endLine : '',
      openingHook: isStringField(sceneSpec.openingHook) ? sceneSpec.openingHook : '',
      castMode,
      ...(cast ? { cast } : {}),
      ...(locationIds ? { locationIds } : {}),
    },
    phasePlans: normalizedPhasePlans,
  };
}

function getDeletedSceneLocationReferenceIssues(
  currentStoryPackage: StoryPackage,
  nextWorldBase: StoryPackage['worldBase'],
): readonly string[] {
  const currentSceneLocationIds = currentStoryPackage.sceneSpec.locationIds ?? [];

  if (currentSceneLocationIds.length === 0) {
    return [];
  }

  const nextLocationIds = new Set(nextWorldBase.locations.map((location) => location.locationId));
  const missingLocationIds = currentSceneLocationIds.filter(
    (locationId) => !nextLocationIds.has(locationId),
  );

  if (missingLocationIds.length === 0) {
    return [];
  }

  return missingLocationIds.map(
    (locationId) =>
      `地点 "${locationId}" 仍被场景 "${currentStoryPackage.sceneSpec.sceneName}" (${currentStoryPackage.sceneSpec.sceneId}) 引用。`,
  );
}

function extractControlModulesDraft(request: SaveRequest): ControlModulesDraft | null {
  const uiFields = request.payload.uiFields;

  if (!uiFields) {
    return null;
  }

  const controlModules = uiFields.controlModules;
  const routerProfiles = uiFields.routerProfiles;
  const auditQuestionSet = uiFields.auditQuestionSet;

  if (!isPlainObject(controlModules) || !Array.isArray(routerProfiles) || !isPlainObject(auditQuestionSet)) {
    return null;
  }

  const lightConeCustomization = isPlainObject(controlModules.lightConeCustomization)
    ? controlModules.lightConeCustomization
    : {};
  const directorNoteAdditions = isPlainObject(controlModules.directorNoteAdditions)
    ? controlModules.directorNoteAdditions
    : {};
  const beatVolumeDefinitions = isPlainObject(controlModules.beatVolumeDefinitions)
    ? controlModules.beatVolumeDefinitions
    : {};

  const toVolumeEntry = (value: unknown) => {
    const record = isPlainObject(value) ? value : {};
    return {
      beatConstraints: isStringField(record.beatConstraints) ? record.beatConstraints : '',
      optionFormatting: isStringField(record.optionFormatting) ? record.optionFormatting : '',
    };
  };

  const normalizedRouterProfiles = routerProfiles
    .filter((profile) => isPlainObject(profile))
    .map((profile) => ({
      routerName: isStringField(profile.routerName) ? profile.routerName : '',
      routerSemanticCore: isStringField(profile.routerSemanticCore) ? profile.routerSemanticCore : '',
      verbLexicon: Array.isArray(profile.verbLexicon)
        ? profile.verbLexicon.filter((value): value is string => isStringField(value))
        : [],
    }));

  const toQuestion = (value: unknown) => {
    const record = isPlainObject(value) ? value : {};
    return {
      id: isStringField(record.id) ? record.id : '',
      question: isStringField(record.question) ? record.question : '',
      expected: typeof record.expected === 'boolean' ? record.expected : true,
      blocking: typeof record.blocking === 'boolean' ? record.blocking : false,
      ...(isStringField(record.rationale) ? { rationale: record.rationale } : {}),
    };
  };

  const phaseSpecificQuestions = isPlainObject(auditQuestionSet.phaseSpecificQuestions)
    ? Object.fromEntries(
        Object.entries(auditQuestionSet.phaseSpecificQuestions)
          .filter((entry) => isUnknownArray(entry[1]))
          .map(([phaseId, questions]) => [
            phaseId,
            (questions as unknown[]).map((question) => toQuestion(question)),
          ]),
      )
    : undefined;

  const phaseOverrides = isPlainObject(auditQuestionSet.selectionPolicy)
    && isPlainObject(auditQuestionSet.selectionPolicy.phaseOverrides)
      ? Object.fromEntries(
          Object.entries(auditQuestionSet.selectionPolicy.phaseOverrides)
            .filter((entry) => hasAppendArray(entry[1]))
            .map(([phaseId, override]) => [
              phaseId,
              {
                append: (override as { append: unknown[] }).append.filter(
                  (id): id is string => isStringField(id),
                ),
              },
            ]),
        )
      : undefined;

  return {
    controlModules: {
      sceneId: isStringField(controlModules.sceneId) ? controlModules.sceneId : '',
      ...(isStringField(controlModules.source) ? { source: controlModules.source } : {}),
      lightConeCustomization: {
        boundaryGuidance: isStringField(lightConeCustomization.boundaryGuidance)
          ? lightConeCustomization.boundaryGuidance
          : '',
        convergenceGuidance: isStringField(lightConeCustomization.convergenceGuidance)
          ? lightConeCustomization.convergenceGuidance
          : '',
        phaseSettlementGuidance: isStringField(lightConeCustomization.phaseSettlementGuidance)
          ? lightConeCustomization.phaseSettlementGuidance
          : '',
      },
      directorNoteAdditions: {
        beatConstraintsAdditions: isStringField(directorNoteAdditions.beatConstraintsAdditions)
          ? directorNoteAdditions.beatConstraintsAdditions
          : '',
      },
      beatVolumeDefinitions: {
        Low: toVolumeEntry(beatVolumeDefinitions.Low),
        Med: toVolumeEntry(beatVolumeDefinitions.Med),
        High: toVolumeEntry(beatVolumeDefinitions.High),
      },
    },
    routerProfiles: normalizedRouterProfiles,
    auditQuestionSet: {
      sceneId: isStringField(auditQuestionSet.sceneId) ? auditQuestionSet.sceneId : '',
      ...(isStringField(auditQuestionSet.source) ? { source: auditQuestionSet.source } : {}),
      globalQuestions: Array.isArray(auditQuestionSet.globalQuestions)
        ? auditQuestionSet.globalQuestions.map((question) => toQuestion(question))
        : [],
      controlQuestions: Array.isArray(auditQuestionSet.controlQuestions)
        ? auditQuestionSet.controlQuestions.map((question) => toQuestion(question))
        : [],
      ...(phaseSpecificQuestions ? { phaseSpecificQuestions } : {}),
      selectionPolicy: {
        default:
          isPlainObject(auditQuestionSet.selectionPolicy) &&
          Array.isArray(auditQuestionSet.selectionPolicy.default)
            ? auditQuestionSet.selectionPolicy.default.filter((id): id is string => isStringField(id))
            : [],
        ...(phaseOverrides && Object.keys(phaseOverrides).length > 0 ? { phaseOverrides } : {}),
      },
    },
  };
}

async function resolveSaveTarget(
  packageName: string,
  forWrite: boolean,
): Promise<AuthoringPersistenceTarget> {
  const context = await resolveActiveStorylineContext(packageName, {
    forWrite,
  });

  return resolveAuthoringPersistenceTarget(packageName, context.authoredRoot);
}

export async function saveSectionDraft(input: SaveRequest): Promise<SaveResult> {
  const { request, issues: payloadIssues } = normalizeSaveRequest(input);
  const validationIssues = [...payloadIssues, ...validateSaveRequest(request)];

  if (validationIssues.length > 0) {
    return createSaveBlockedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: false,
      },
      validationIssues,
    );
  }

  if (!supportedDeterministicWriteSections.has(request.sectionId)) {
    return createSaveBlockedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: false,
      },
      [`当前不支持 "${request.sectionId}" 的确定性写入路径。`],
    );
  }

  const nextWorldBaseDraft = extractWorldBaseCastDraft(request);
  const nextScenePhaseDraft = extractScenePhaseAuthoringDraft(request);
  const nextControlModulesDraft = extractControlModulesDraft(request);

  if (request.sectionId === 'worldbase-cast' && nextWorldBaseDraft === null) {
    return createSaveBlockedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: false,
      },
      ['没有提供可确定的世界基础更新。'],
    );
  }

  if (request.sectionId === 'scene-phase-authoring' && nextScenePhaseDraft === null) {
    return createSaveBlockedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: false,
      },
      ['没有提供可确定的场景与阶段更新。'],
    );
  }

  if (request.sectionId === 'control-modules' && nextControlModulesDraft === null) {
    return createSaveBlockedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: false,
      },
      ['没有提供可确定的控制模块更新。'],
    );
  }

  if (request.dryRun) {
    try {
      await ensureStoryPackageExists(request.packageName);
      const target = await resolveSaveTarget(request.packageName, false);
      const reloadedSectionState = await reloadStoryPackage(request.packageName, {
        forWrite: false,
        target,
      });

      return createSaveAppliedWithWarningsResult(
        {
          requestId: request.requestId,
          packageName: request.packageName,
          sectionId: request.sectionId,
          showLocally: true,
          showInGlobalDiagnostics: false,
        },
        reloadedSectionState,
        ['试运行已完成，但没有写入文件。'],
        [],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return createSaveFailedResult(
        {
          requestId: request.requestId,
          packageName: request.packageName,
          sectionId: request.sectionId,
          showLocally: true,
          showInGlobalDiagnostics: true,
        },
        message,
      );
    }
  }

  try {
    await ensureStoryPackageExists(request.packageName);
    const readTarget = await resolveSaveTarget(request.packageName, false);
    const currentStoryPackage = await reloadStoryPackage(request.packageName, {
      forWrite: false,
      target: readTarget,
    });
    let changedFiles: readonly string[];
    let reloadedSectionState: StoryPackage;
    let writeTarget: AuthoringPersistenceTarget | null = null;

    const ensureWriteTarget = async (): Promise<AuthoringPersistenceTarget> => {
      if (!writeTarget) {
        writeTarget = await resolveSaveTarget(request.packageName, true);
      }

      return writeTarget;
    };

    try {
      if (request.sectionId === 'worldbase-cast') {
        const nextWorldBase = applyWorldBaseCastDraft(
          currentStoryPackage.worldBase,
          nextWorldBaseDraft!,
        );
        const locationReferenceIssues = getDeletedSceneLocationReferenceIssues(
          currentStoryPackage,
          nextWorldBase,
        );

        if (locationReferenceIssues.length > 0) {
          return createSaveBlockedResult(
            {
              requestId: request.requestId,
              packageName: request.packageName,
              sectionId: request.sectionId,
              showLocally: true,
              showInGlobalDiagnostics: false,
            },
            locationReferenceIssues,
          );
        }

        const activeWriteTarget = await ensureWriteTarget();
        const originalWorldBaseContents = await readWorldBaseDraftContents(
          request.packageName,
          activeWriteTarget,
        );

        try {
          changedFiles = await persistWorldBaseDraft(
            request.packageName,
            nextWorldBase,
            activeWriteTarget,
          );
          reloadedSectionState = await reloadStoryPackage(request.packageName, {
            forWrite: true,
            target: activeWriteTarget,
          });
        } catch (writeOrReloadError) {
          await restoreWorldBaseDraft(
            request.packageName,
            originalWorldBaseContents,
            activeWriteTarget,
          );
          throw writeOrReloadError;
        }
      } else if (request.sectionId === 'scene-phase-authoring') {
        const routerOptions = currentStoryPackage.routerProfiles.map((profile) => profile.routerName);
        const locationOptions = currentStoryPackage.worldBase.locations.map(
          (location) => location.locationId,
        );
        const scenePhaseIssues = validateScenePhaseAuthoringDraft(
          nextScenePhaseDraft!,
          routerOptions,
          locationOptions,
        );

        if (scenePhaseIssues.length > 0) {
          return createSaveBlockedResult(
            {
              requestId: request.requestId,
              packageName: request.packageName,
              sectionId: request.sectionId,
              showLocally: true,
              showInGlobalDiagnostics: false,
            },
            scenePhaseIssues,
          );
        }

        const activeWriteTarget = await ensureWriteTarget();
        const originalSceneContents = await readSceneDraftContents(
          request.packageName,
          activeWriteTarget,
        );
        const originalPhasePlansContents = await readPhasePlansDraftContents(
          request.packageName,
          activeWriteTarget,
        );

        try {
          const renderedScenePhase = renderScenePhaseAuthoring(currentStoryPackage, nextScenePhaseDraft!);
          changedFiles = await persistScenePhaseDraft(
            request.packageName,
            renderedScenePhase.sceneSpec,
            renderedScenePhase.phasePlans,
            activeWriteTarget,
          );
          reloadedSectionState = await reloadStoryPackage(request.packageName, {
            forWrite: true,
            target: activeWriteTarget,
          });
        } catch (writeOrReloadError) {
          await restoreScenePhaseDraft(
            request.packageName,
            originalSceneContents,
            originalPhasePlansContents,
            activeWriteTarget,
          );
          throw writeOrReloadError;
        }
      } else {
        const moduleScope = request.moduleScope!;
        const controlIssues = validateControlModulesDraft(
          currentStoryPackage,
          nextControlModulesDraft!,
          moduleScope,
        );

        if (controlIssues.length > 0) {
          return createSaveBlockedResult(
            {
              requestId: request.requestId,
              packageName: request.packageName,
              sectionId: request.sectionId,
              showLocally: true,
              showInGlobalDiagnostics: false,
            },
            controlIssues,
          );
        }

        try {
          const renderedControlModules = renderControlModulesSave(
            currentStoryPackage,
            nextControlModulesDraft ?? createControlModulesDraft(currentStoryPackage),
            moduleScope,
          );

          if (moduleScope === 'router-profile-set') {
            const activeWriteTarget = await ensureWriteTarget();
            const originalRouterLexiconContents = await readRouterLexiconDraftContents(
              request.packageName,
              activeWriteTarget,
            );

            try {
              changedFiles = await persistRouterProfilesDraft(
                request.packageName,
                renderedControlModules.routerProfiles ?? currentStoryPackage.routerProfiles,
                activeWriteTarget,
              );
              reloadedSectionState = await reloadStoryPackage(request.packageName, {
                forWrite: true,
                target: activeWriteTarget,
              });
            } catch (writeOrReloadError) {
              await restoreRouterLexiconDraft(
                request.packageName,
                originalRouterLexiconContents,
                activeWriteTarget,
              );
              throw writeOrReloadError;
            }
          } else if (moduleScope === 'auditor-question-set') {
            const activeWriteTarget = await ensureWriteTarget();
            const originalAuditQuestionsContents = await readAuditQuestionsDraftContents(
              request.packageName,
              activeWriteTarget,
            );

            try {
              changedFiles = await persistAuditQuestionSetDraft(
                request.packageName,
                renderedControlModules.auditQuestionSet ?? currentStoryPackage.auditQuestionSet,
                activeWriteTarget,
              );
              reloadedSectionState = await reloadStoryPackage(request.packageName, {
                forWrite: true,
                target: activeWriteTarget,
              });
            } catch (writeOrReloadError) {
              await restoreAuditQuestionSetDraft(
                request.packageName,
                originalAuditQuestionsContents,
                activeWriteTarget,
              );
              throw writeOrReloadError;
            }
          } else {
            const activeWriteTarget = await ensureWriteTarget();
            const originalControlModulesContents = await readControlModulesDraftContents(
              request.packageName,
              activeWriteTarget,
            );

            try {
              changedFiles = await persistControlModulesDraft(
                request.packageName,
                renderedControlModules.controlModules ?? currentStoryPackage.controlModules,
                activeWriteTarget,
              );
              reloadedSectionState = await reloadStoryPackage(request.packageName, {
                forWrite: true,
                target: activeWriteTarget,
              });
            } catch (writeOrReloadError) {
              await restoreControlModulesDraft(
                request.packageName,
                originalControlModulesContents,
                activeWriteTarget,
              );
              throw writeOrReloadError;
            }
          }
        } catch (writeOrReloadError) {
          throw writeOrReloadError;
        }
      }
    } catch (earlyResult) {
      if (typeof earlyResult === 'object' && earlyResult !== null && 'kind' in earlyResult) {
        return earlyResult as SaveResult;
      }
      throw earlyResult;
    }

    try {
      await authoringStatus.writeAuthoringStatus(request.packageName, {
        hasSuccessfulSave: true,
        lastSavedAt: new Date().toISOString(),
        lastSavedRequestId: request.requestId,
        lastEditedSection: request.sectionId,
      });

      return createSaveAppliedResult(
        {
          requestId: request.requestId,
          packageName: request.packageName,
          sectionId: request.sectionId,
          showLocally: true,
          showInGlobalDiagnostics: false,
        },
        reloadedSectionState,
        [...changedFiles, 'authoring-state.json'],
      );
    } catch (markerError) {
      const markerMessage =
        markerError instanceof Error ? markerError.message : String(markerError);

      return createSaveAppliedWithWarningsResult(
        {
          requestId: request.requestId,
          packageName: request.packageName,
          sectionId: request.sectionId,
          showLocally: true,
          showInGlobalDiagnostics: true,
        },
        reloadedSectionState,
        [`作者状态标记写入失败：${markerMessage}`],
        changedFiles,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return createSaveFailedResult(
      {
        requestId: request.requestId,
        packageName: request.packageName,
        sectionId: request.sectionId,
        showLocally: true,
        showInGlobalDiagnostics: true,
      },
      message,
    );
  }
}
