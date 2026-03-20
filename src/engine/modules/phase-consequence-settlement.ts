import { deepFreeze } from '@/lib/deep-freeze';
import {
  validatePhaseConsequenceRequest,
  validatePhaseConsequenceResponse,
} from '@/engine/schema-validator';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import type {
  HistoryEntry,
  PhaseConsequenceRequest,
  PhaseConsequenceResponse,
  TranscriptEntry,
} from '@/types';

function isTranscriptEntry(entry: HistoryEntry): entry is TranscriptEntry {
  return entry.role === 'user' || entry.role === 'assistant';
}

/**
 * Builds the PhaseConsequenceRequest from the accepted transcript of the completed phase.
 *
 * @see LOGOS-SPEC/04_MODULES/phase-consequence-settlement.md
 */
export function buildPhaseConsequenceRequest(
  mainAxis: string,
  endLine: string,
  phaseGoal: string,
  phaseTranscript: readonly HistoryEntry[],
  sceneProgress?: string,
  currentPhaseIndex?: number,
): PhaseConsequenceRequest {
  return deepFreeze(
    validatePhaseConsequenceRequest({
      context: {
        mainAxis,
        endLine,
        phaseGoal,
        ...(sceneProgress ? { sceneProgress } : {}),
        ...(currentPhaseIndex ? { currentPhaseIndex } : {}),
      },
      phaseTranscript: phaseTranscript.filter(isTranscriptEntry).map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
    }),
  );
}

/**
 * Executes the phase-end consequence settlement call through the shared LLM adapter.
 *
 * @see LOGOS-SPEC/04_MODULES/phase-consequence-settlement.md
 */
export async function settlePhaseConsequences(
  request: PhaseConsequenceRequest,
  adapter: LLMAdapter,
): Promise<PhaseConsequenceResponse> {
  if (!adapter.settlement) {
    throw new Error('LLMAdapter.settlement is not configured.');
  }

  const response = await adapter.settlement(validatePhaseConsequenceRequest(request));

  return deepFreeze(validatePhaseConsequenceResponse(response));
}
