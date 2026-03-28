import type { ModuleScope, SaveRequest, SaveResult } from '@/authoring/contracts';
import { createSaveBlockedResult } from '@/authoring/persistence/save-results';

export interface CoordinatorActorInput {
  readonly rawText?: string;
  readonly normalizedText?: string;
  readonly uiFields?: Record<string, unknown>;
  readonly source: 'chat' | 'form' | 'migration';
}

export interface CoordinatorInvocation {
  readonly requestId: string;
  readonly packageName: string;
  readonly activeSection:
    | 'worldbase-cast'
    | 'scene-phase-authoring'
    | 'control-modules'
    | 'package-wiring-validation';
  readonly actorInput: CoordinatorActorInput;
  readonly moduleScope?: ModuleScope;
  readonly dryRun?: boolean;
}

export interface CoordinatorRunResult {
  readonly saveResult: SaveResult;
  readonly coordinatorSummary: string;
  readonly usedRepair: boolean;
}

function createCoordinatorLocalBlockedResult(
  input: CoordinatorInvocation,
  blockingIssue: string,
): SaveResult {
  return createSaveBlockedResult(
    {
      requestId: input.requestId,
      packageName: input.packageName,
      sectionId:
        input.activeSection === 'package-wiring-validation'
          ? 'package-wiring-validation'
          : input.activeSection,
      showLocally: true,
      showInGlobalDiagnostics: false,
    },
    [blockingIssue],
  );
}

export function buildCoordinatorSaveRequest(
  input: CoordinatorInvocation,
): SaveRequest | CoordinatorRunResult {
  if (input.activeSection === 'package-wiring-validation') {
    return {
      saveResult: createCoordinatorLocalBlockedResult(
        input,
        '控制台是只读的，请先回到可编辑页面再保存。',
      ),
      coordinatorSummary:
        '页面助理不能直接在控制台写入，请先切回可编辑页面。',
      usedRepair: false,
    };
  }

  if (!input.actorInput.uiFields) {
    return {
      saveResult: createCoordinatorLocalBlockedResult(
        input,
        '重试这次保存前，需要当前页面字段。',
      ),
      coordinatorSummary:
        '页面助理需要当前页面字段，才能重试这次保存。',
      usedRepair: false,
    };
  }

  if (input.activeSection === 'control-modules' && !input.moduleScope) {
    return {
      saveResult: createCoordinatorLocalBlockedResult(
        input,
        '重试这次保存前，需要当前激活的控制模块。',
      ),
      coordinatorSummary:
        '页面助理需要当前激活的控制模块，才能重试这次保存。',
      usedRepair: false,
    };
  }

  return {
    requestId: input.requestId,
    packageName: input.packageName,
    sectionId: input.activeSection,
    source: 'coordinator',
    payload: {
      uiFields: input.actorInput.uiFields,
    },
    ...(input.moduleScope ? { moduleScope: input.moduleScope } : {}),
    ...(input.dryRun ? { dryRun: input.dryRun } : {}),
  };
}

export function summarizeCoordinatorResult(
  result: SaveResult,
  usedRepair: boolean,
): string {
  if (result.kind === 'save_applied') {
    return usedRepair
      ? '页面助理已修复当前页面，并通过共享保存路径完成保存。'
      : '页面助理已通过共享保存路径保存当前页面。';
  }

  if (result.kind === 'save_applied_with_warnings') {
    const warningText = result.warnings?.join(' ') ?? '请查看剩余警告。';
    return usedRepair
      ? `页面助理已修复当前页面并完成保存，但仍有警告。${warningText}`
      : `页面助理已完成当前页面保存，但仍有警告。${warningText}`;
  }

  if (result.kind === 'save_failed') {
    return '页面助理已走到共享保存路径，但页面仍然保存失败。';
  }

  return usedRepair
    ? '页面助理已重试页面，但仍无法修复阻塞问题。'
    : '页面助理保留了本地请求，但仍无法修复阻塞问题。';
}
