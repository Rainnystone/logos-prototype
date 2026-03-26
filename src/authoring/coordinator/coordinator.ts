import type { SaveRequest } from '@/authoring/contracts';
import { saveSectionDraft } from '@/authoring/persistence/bridge';

import {
  buildCoordinatorSaveRequest,
  summarizeCoordinatorResult,
  type CoordinatorInvocation,
  type CoordinatorRunResult,
} from './dispatch';

function tryDeterministicRepair(
  input: CoordinatorInvocation,
  request: SaveRequest,
): SaveRequest | null {
  void input;
  void request;
  return null;
}

export async function runCoordinatorSave(
  input: CoordinatorInvocation,
): Promise<CoordinatorRunResult> {
  const firstPass = buildCoordinatorSaveRequest(input);

  if ('saveResult' in firstPass) {
    return firstPass;
  }

  const firstResult = await saveSectionDraft(firstPass);

  if (firstResult.kind !== 'save_blocked') {
    return {
      saveResult: firstResult,
      coordinatorSummary: summarizeCoordinatorResult(firstResult, false),
      usedRepair: false,
    };
  }

  const repairedRequest = tryDeterministicRepair(input, firstPass);

  if (!repairedRequest) {
    return {
      saveResult: firstResult,
      coordinatorSummary: summarizeCoordinatorResult(firstResult, false),
      usedRepair: false,
    };
  }

  const repairedResult = await saveSectionDraft(repairedRequest);

  return {
    saveResult: repairedResult,
    coordinatorSummary: summarizeCoordinatorResult(repairedResult, true),
    usedRepair: true,
  };
}
