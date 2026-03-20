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

const SETTLEMENT_MAX_ATTEMPTS = 3;

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

  const validatedRequest = validatePhaseConsequenceRequest(request);
  let lastError: Error | null = null;

  for (let attemptIndex = 0; attemptIndex < SETTLEMENT_MAX_ATTEMPTS; attemptIndex += 1) {
    try {
      const response = await adapter.settlement(validatedRequest);
      return deepFreeze(validatePhaseConsequenceResponse(response));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw new Error(
    `Phase consequence settlement failed after ${SETTLEMENT_MAX_ATTEMPTS} attempts: ${
      lastError?.message ?? 'unknown error'
    }`,
  );
}
