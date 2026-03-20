import { deepFreeze } from '@/lib/deep-freeze';
import { validateAuditPacket } from '@/engine/schema-validator';
import type { AuditResult, LLMAdapter } from '@/engine/types/adapter-interface';
import type { AuditPacket, AuditQuestion, AuditQuestionSet, HistoryEntry } from '@/types';

export interface SelectedAuditQuestions {
  readonly selectedQuestions: readonly AuditQuestion[];
  readonly selectedIds: readonly string[];
}

export interface ParsedAuditAnswer {
  readonly questionId: string;
  readonly question: string;
  readonly answer: boolean;
  readonly expected: boolean;
  readonly matches: boolean;
  readonly blocking: boolean;
}

export interface ParsedAuditResult {
  readonly answers: readonly ParsedAuditAnswer[];
}

export interface ExecuteAuditInput {
  readonly adapter: LLMAdapter;
  readonly questionSet: AuditQuestionSet;
  readonly currentPhaseId: string;
  readonly precedingBeats: readonly HistoryEntry[];
  readonly beatText: string;
  readonly options: readonly string[];
}

export interface ExecuteAuditOutput {
  readonly packet: AuditPacket;
  readonly selectedQuestions: readonly AuditQuestion[];
  readonly selectedIds: readonly string[];
  readonly auditResult: AuditResult;
  readonly parsedResult: ParsedAuditResult;
}

function buildQuestionIndex(questionSet: AuditQuestionSet): Map<string, AuditQuestion> {
  const phaseSpecificQuestions = Object.values(questionSet.phaseSpecificQuestions ?? {}).flat();
  const questions = [
    ...questionSet.globalQuestions,
    ...questionSet.controlQuestions,
    ...phaseSpecificQuestions,
  ];

  return new Map(questions.map((question) => [question.id, question]));
}

/**
 * Selects the audit questions for the active phase using the configured default policy plus
 * any phase-specific append rules.
 *
 * @see LOGOS-SPEC/04_MODULES/auditor.md
 */
export function selectAuditQuestions(
  questionSet: AuditQuestionSet,
  currentPhaseId: string,
): SelectedAuditQuestions {
  const phaseAppendIds = questionSet.selectionPolicy.phaseOverrides?.[currentPhaseId]?.append ?? [];
  const selectedIds = Array.from(
    new Set([...questionSet.selectionPolicy.default, ...phaseAppendIds]),
  );
  const questionIndex = buildQuestionIndex(questionSet);
  const selectedQuestions = selectedIds.map((id) => {
    const question = questionIndex.get(id);

    if (!question) {
      throw new Error(`Audit question ID was not found in AuditQuestionSet: ${id}`);
    }

    return question;
  });

  return deepFreeze({
    selectedQuestions: selectedQuestions.map((question) => ({ ...question })),
    selectedIds: [...selectedIds],
  });
}

/**
 * Builds the current round's AuditPacket from accessible history, generation output, and the
 * selected audit questions.
 *
 * @see LOGOS-SPEC/04_MODULES/auditor.md
 */
export function buildAuditPacket(
  precedingBeats: readonly HistoryEntry[],
  beatText: string,
  options: readonly string[],
  selectedQuestions: readonly AuditQuestion[],
): AuditPacket {
  return deepFreeze(
    validateAuditPacket({
      context: {
        precedingBeats: precedingBeats.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
      },
      generatedContent: {
        beatText,
        options: [...options],
      },
      auditQuestions: selectedQuestions.map((question) => question.question),
    }),
  );
}

/**
 * Zips the adapter's boolean answers back onto the selected audit questions.
 *
 * @see LOGOS-SPEC/04_MODULES/auditor.md
 */
export function parseAuditResult(
  auditResult: AuditResult,
  selectedQuestions: readonly AuditQuestion[],
): ParsedAuditResult {
  if (auditResult.answers.length !== selectedQuestions.length) {
    throw new Error('Audit answers length must match the selected audit question count.');
  }

  return deepFreeze({
    answers: selectedQuestions.map((question, index) => ({
      questionId: question.id,
      question: question.question,
      answer: auditResult.answers[index] ?? false,
      expected: question.expected,
      matches: auditResult.answers[index] === question.expected,
      blocking: question.blocking,
    })),
  });
}

/**
 * Executes the complete audit step for the current beat.
 *
 * @see LOGOS-SPEC/04_MODULES/auditor.md
 */
export async function executeAudit(input: ExecuteAuditInput): Promise<ExecuteAuditOutput> {
  if (!input.adapter.audit) {
    throw new Error('LLMAdapter.audit is not configured.');
  }

  const { selectedQuestions, selectedIds } = selectAuditQuestions(
    input.questionSet,
    input.currentPhaseId,
  );
  const packet = buildAuditPacket(
    input.precedingBeats,
    input.beatText,
    input.options,
    selectedQuestions,
  );
  const auditResult = await input.adapter.audit(packet);
  const parsedResult = parseAuditResult(auditResult, selectedQuestions);

  return deepFreeze({
    packet,
    selectedQuestions,
    selectedIds,
    auditResult,
    parsedResult,
  });
}
