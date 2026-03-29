import type { ModuleScope } from '@/authoring/contracts';
import type {
  AuditQuestion,
  AuditQuestionSet,
  ControlModules,
  RouterProfile,
  StoryPackage,
} from '@/types';

type ControlModulesStorySlice = Pick<
  StoryPackage,
  'controlModules' | 'routerProfiles' | 'auditQuestionSet' | 'phasePlans'
>;

export interface ControlModulesDraft {
  readonly controlModules: ControlModules;
  readonly routerProfiles: RouterProfile[];
  readonly auditQuestionSet: AuditQuestionSet;
}

interface ControlModulesRenderResult {
  readonly controlModules?: ControlModules;
  readonly routerProfiles?: readonly RouterProfile[];
  readonly auditQuestionSet?: AuditQuestionSet;
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function normalizeStringList(values: readonly string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeText(value))
        .filter((value) => value.length > 0),
    ),
  );
}

function cloneAuditQuestion(question: AuditQuestion): AuditQuestion {
  return {
    ...question,
    ...(question.rationale ? { rationale: question.rationale } : {}),
  };
}

function cloneAuditQuestionList(questions: readonly AuditQuestion[]): AuditQuestion[] {
  return questions.map(cloneAuditQuestion);
}

function cloneAuditQuestionSet(questionSet: AuditQuestionSet): AuditQuestionSet {
  return {
    ...questionSet,
    globalQuestions: cloneAuditQuestionList(questionSet.globalQuestions),
    controlQuestions: cloneAuditQuestionList(questionSet.controlQuestions),
    ...(questionSet.phaseSpecificQuestions
      ? {
          phaseSpecificQuestions: Object.fromEntries(
            Object.entries(questionSet.phaseSpecificQuestions).map(([phaseId, questions]) => [
              phaseId,
              cloneAuditQuestionList(questions),
            ]),
          ),
        }
      : {}),
    selectionPolicy: {
      ...questionSet.selectionPolicy,
      default: [...questionSet.selectionPolicy.default],
      ...(questionSet.selectionPolicy.phaseOverrides
        ? {
            phaseOverrides: Object.fromEntries(
              Object.entries(questionSet.selectionPolicy.phaseOverrides).map(([phaseId, override]) => [
                phaseId,
                {
                  append: [...override.append],
                },
              ]),
            ),
          }
        : {}),
    },
  };
}

function cloneRouterProfile(profile: RouterProfile): RouterProfile {
  return {
    ...profile,
    verbLexicon: [...profile.verbLexicon],
  };
}

function extractPhaseLabel(phaseId: string): string {
  const match = phaseId.match(/^phase-(\d+)/i);
  if (!match) {
    return 'PX';
  }

  const parsed = Number.parseInt(match[1] ?? '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? `P${parsed}` : 'PX';
}

function nextAuditQuestionId(
  existingIds: Set<string>,
  scope: 'global' | 'control' | 'phase',
  phaseId?: string,
): string {
  const prefix =
    scope === 'global'
      ? 'AQ-G'
      : scope === 'control'
        ? 'AQ-C'
        : `AQ-${extractPhaseLabel(phaseId ?? '')}`;

  let nextIndex = 1;
  while (existingIds.has(`${prefix}-${String(nextIndex).padStart(3, '0')}`)) {
    nextIndex += 1;
  }

  return `${prefix}-${String(nextIndex).padStart(3, '0')}`;
}

function normalizeAuditQuestion(
  question: AuditQuestion,
  existingIds: Set<string>,
  scope: 'global' | 'control' | 'phase',
  phaseId?: string,
): AuditQuestion {
  const requestedId = normalizeText(question.id);
  const id = requestedId.length > 0 ? requestedId : nextAuditQuestionId(existingIds, scope, phaseId);
  existingIds.add(id);

  return {
    ...question,
    id,
    question: normalizeText(question.question),
    ...(question.rationale ? { rationale: normalizeText(question.rationale) } : {}),
  };
}

function normalizeRouterProfiles(routerProfiles: readonly RouterProfile[]): RouterProfile[] {
  const seenNames = new Set<string>();
  const nextProfiles: RouterProfile[] = [];

  for (const profile of routerProfiles) {
    const routerName = normalizeText(profile.routerName);
    const routerSemanticCore = normalizeText(profile.routerSemanticCore);
    const verbLexicon = normalizeStringList(profile.verbLexicon);

    if (!routerName || seenNames.has(routerName)) {
      continue;
    }

    seenNames.add(routerName);
    nextProfiles.push({
      routerName,
      routerSemanticCore,
      verbLexicon,
    });
  }

  return nextProfiles;
}

function normalizeAuditQuestionSet(questionSet: AuditQuestionSet): AuditQuestionSet {
  const existingIds = new Set<string>();
  const globalQuestions = questionSet.globalQuestions.map((question) =>
    normalizeAuditQuestion(question, existingIds, 'global'),
  );
  const controlQuestions = questionSet.controlQuestions.map((question) =>
    normalizeAuditQuestion(question, existingIds, 'control'),
  );
  const phaseSpecificQuestions = questionSet.phaseSpecificQuestions
    ? Object.fromEntries(
        Object.entries(questionSet.phaseSpecificQuestions).map(([phaseId, questions]) => [
          phaseId,
          questions.map((question) => normalizeAuditQuestion(question, existingIds, 'phase', phaseId)),
        ]),
      )
    : undefined;

  const validIds = new Set<string>([
    ...globalQuestions.map((question) => question.id),
    ...controlQuestions.map((question) => question.id),
    ...(phaseSpecificQuestions
      ? Object.values(phaseSpecificQuestions).flat().map((question) => question.id)
      : []),
  ]);

  const nextDefault = questionSet.selectionPolicy.default.filter((id) => validIds.has(id));
  const nextPhaseOverrides = questionSet.selectionPolicy.phaseOverrides
    ? Object.fromEntries(
        Object.entries(questionSet.selectionPolicy.phaseOverrides)
          .map((entry) => {
            const [phaseId, override] = entry;
            if (typeof override === 'string') {
              return null;
            }

            return [
              phaseId,
              {
                append: override.append.filter((id) => validIds.has(id)),
              },
            ] as const;
          })
          .filter((entry): entry is readonly [string, { append: string[] }] => {
            return entry !== null && entry[1].append.length > 0;
          }),
      )
    : undefined;

  return {
    ...questionSet,
    globalQuestions,
    controlQuestions,
    ...(phaseSpecificQuestions ? { phaseSpecificQuestions } : {}),
    selectionPolicy: {
      ...questionSet.selectionPolicy,
      default: nextDefault,
      ...(nextPhaseOverrides && Object.keys(nextPhaseOverrides).length > 0
        ? { phaseOverrides: nextPhaseOverrides }
        : {}),
    },
  };
}

export function createControlModulesDraft(
  source: Pick<StoryPackage, 'controlModules' | 'routerProfiles' | 'auditQuestionSet'>,
): ControlModulesDraft {
  return {
    controlModules: {
      ...source.controlModules,
      lightConeCustomization: {
        ...source.controlModules.lightConeCustomization,
      },
      directorNoteAdditions: {
        ...source.controlModules.directorNoteAdditions,
      },
      beatVolumeDefinitions: {
        Low: { ...source.controlModules.beatVolumeDefinitions.Low },
        Med: { ...source.controlModules.beatVolumeDefinitions.Med },
        High: { ...source.controlModules.beatVolumeDefinitions.High },
      },
    },
    routerProfiles: source.routerProfiles.map(cloneRouterProfile),
    auditQuestionSet: cloneAuditQuestionSet(source.auditQuestionSet),
  };
}

export function validateControlModulesDraft(
  current: ControlModulesStorySlice,
  draft: ControlModulesDraft,
  moduleScope: ModuleScope,
): readonly string[] {
  const issues: string[] = [];

  if (moduleScope === 'light-cone') {
    if (!normalizeText(draft.controlModules.lightConeCustomization.boundaryGuidance)) {
      issues.push('光锥边界说明是必填项。');
    }
    if (!normalizeText(draft.controlModules.lightConeCustomization.convergenceGuidance)) {
      issues.push('光锥收束说明是必填项。');
    }
    if (!normalizeText(draft.controlModules.lightConeCustomization.phaseSettlementGuidance)) {
      issues.push('光锥 Phase 收束说明是必填项。');
    }
  }

  if (moduleScope === 'director-note-additions') {
    if (!normalizeText(draft.controlModules.directorNoteAdditions.beatConstraintsAdditions)) {
      issues.push('导演提示补充至少需要一个非空字段。');
    }
  }

  if (moduleScope === 'beat-volume-definitions') {
    for (const volume of ['Low', 'Med', 'High'] as const) {
      if (!normalizeText(draft.controlModules.beatVolumeDefinitions[volume].beatConstraints)) {
        issues.push(`${volume} Beat 限制是必填项。`);
      }
      if (!normalizeText(draft.controlModules.beatVolumeDefinitions[volume].optionFormatting)) {
        issues.push(`${volume} 选项格式是必填项。`);
      }
    }
  }

  if (moduleScope === 'router-profile-set') {
    const nextProfiles = normalizeRouterProfiles(draft.routerProfiles);
    if (nextProfiles.length === 0) {
      issues.push('至少需要一个 Router 配置。');
    }

    const nextNames = new Set(nextProfiles.map((profile) => profile.routerName));
    for (const phasePlan of current.phasePlans) {
      const routerHint = phasePlan.routerHint?.trim();
      if (routerHint && !nextNames.has(routerHint)) {
        issues.push(
          `Router 配置 "${routerHint}" 仍被一个或多个 Phase 的 Router 提示引用。`,
        );
        break;
      }
    }

    for (const profile of nextProfiles) {
      if (!profile.routerSemanticCore) {
        issues.push(`Router 配置 "${profile.routerName}" 缺少语义核心。`);
      }
      if (profile.verbLexicon.length === 0) {
        issues.push(`Router 配置 "${profile.routerName}" 必须保留至少一个动词。`);
      }
    }
  }

  if (moduleScope === 'auditor-question-set') {
    const normalized = normalizeAuditQuestionSet(draft.auditQuestionSet);
    if (normalized.globalQuestions.length === 0) {
      issues.push('至少需要一个全局审计问题。');
    }
    for (const question of normalized.globalQuestions) {
      if (!normalizeText(question.question)) {
        issues.push(`审计问题 "${question.id}" 缺少问题文本。`);
      }
    }
    for (const question of normalized.controlQuestions) {
      if (!normalizeText(question.question)) {
        issues.push(`审计问题 "${question.id}" 缺少问题文本。`);
      }
    }
    for (const questions of Object.values(normalized.phaseSpecificQuestions ?? {})) {
      for (const question of questions) {
        if (!normalizeText(question.question)) {
          issues.push(`审计问题 "${question.id}" 缺少问题文本。`);
        }
      }
    }
  }

  return issues;
}

export function renderControlModulesSave(
  current: ControlModulesStorySlice,
  draft: ControlModulesDraft,
  moduleScope: ModuleScope,
): ControlModulesRenderResult {
  if (moduleScope === 'light-cone') {
    return {
      controlModules: {
        ...current.controlModules,
        lightConeCustomization: {
          boundaryGuidance: normalizeText(draft.controlModules.lightConeCustomization.boundaryGuidance),
          convergenceGuidance: normalizeText(
            draft.controlModules.lightConeCustomization.convergenceGuidance,
          ),
          phaseSettlementGuidance: normalizeText(
            draft.controlModules.lightConeCustomization.phaseSettlementGuidance,
          ),
        },
      },
    };
  }

  if (moduleScope === 'director-note-additions') {
    return {
      controlModules: {
        ...current.controlModules,
        directorNoteAdditions: {
          beatConstraintsAdditions: normalizeText(
            draft.controlModules.directorNoteAdditions.beatConstraintsAdditions,
          ),
        },
      },
    };
  }

  if (moduleScope === 'beat-volume-definitions') {
    const nextDefinitions = draft.controlModules.beatVolumeDefinitions;

    return {
      controlModules: {
        ...current.controlModules,
        beatVolumeDefinitions: {
          Low: {
            beatConstraints: normalizeText(nextDefinitions.Low.beatConstraints),
            optionFormatting: normalizeText(nextDefinitions.Low.optionFormatting),
          },
          Med: {
            beatConstraints: normalizeText(nextDefinitions.Med.beatConstraints),
            optionFormatting: normalizeText(nextDefinitions.Med.optionFormatting),
          },
          High: {
            beatConstraints: normalizeText(nextDefinitions.High.beatConstraints),
            optionFormatting: normalizeText(nextDefinitions.High.optionFormatting),
          },
        },
      },
    };
  }

  if (moduleScope === 'router-profile-set') {
    return {
      routerProfiles: normalizeRouterProfiles(draft.routerProfiles),
    };
  }

  return {
    auditQuestionSet: normalizeAuditQuestionSet(draft.auditQuestionSet),
  };
}
