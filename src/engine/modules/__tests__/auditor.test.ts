import { describe, expect, it } from 'vitest';

import { validateAuditPacket } from '@/engine/schema-validator';
import {
  buildAuditPacket,
  executeAudit,
  parseAuditResult,
  selectAuditQuestions,
} from '@/engine/modules/auditor';
import {
  auditQuestionSetFixture,
  createRecordingAdapter,
} from '@/engine/__tests__/fixtures/audit-loop-fixtures';

describe('Auditor', () => {
  it('selects the default audit questions for a phase without overrides', () => {
    const { selectedQuestions, selectedIds } = selectAuditQuestions(
      auditQuestionSetFixture,
      'phase-01',
    );

    expect(selectedIds).toEqual(['AQ-G-001', 'AQ-C-001']);
    expect(selectedQuestions.map((question) => question.question)).toEqual(
      auditQuestionSetFixture.selectionPolicy.default.map((id) => {
        const allQuestions = [
          ...auditQuestionSetFixture.globalQuestions,
          ...auditQuestionSetFixture.controlQuestions,
        ];

        return allQuestions.find((question) => question.id === id)?.question;
      }),
    );
  });

  it('appends phase-specific questions when a phase override exists', () => {
    const { selectedQuestions, selectedIds } = selectAuditQuestions(
      auditQuestionSetFixture,
      'phase-02',
    );

    expect(selectedIds).toEqual(['AQ-G-001', 'AQ-C-001', 'AQ-P2-001']);
    expect(selectedQuestions.at(-1)?.id).toBe('AQ-P2-001');
  });

  it('builds a valid AuditPacket from history, beat text, options, and selected questions', () => {
    const { selectedQuestions } = selectAuditQuestions(auditQuestionSetFixture, 'phase-01');
    const packet = buildAuditPacket(
      [
        { role: 'assistant', content: 'accepted-beat-1' },
        { role: 'user', content: 'player-choice-1' },
      ],
      'generated-beat',
      ['option-1', 'option-2', 'option-3', 'option-4'],
      selectedQuestions,
    );

    expect(packet.context.precedingBeats).toEqual([
      { role: 'assistant', content: 'accepted-beat-1' },
      { role: 'user', content: 'player-choice-1' },
    ]);
    expect(packet.generatedContent.beatText).toBe('generated-beat');
    expect(packet.generatedContent.options).toEqual([
      'option-1',
      'option-2',
      'option-3',
      'option-4',
    ]);
    expect(packet.auditQuestions).toEqual(selectedQuestions.map((question) => question.question));
    expect(validateAuditPacket(packet)).toEqual(packet);
  });

  it('parses boolean answers into structured audit rows', () => {
    const { selectedQuestions } = selectAuditQuestions(auditQuestionSetFixture, 'phase-02');
    const parsed = parseAuditResult(
      {
        answers: [true, false, true],
      },
      selectedQuestions,
    );

    expect(parsed.answers).toEqual([
      {
        questionId: 'AQ-G-001',
        question: auditQuestionSetFixture.globalQuestions[0]?.question,
        answer: true,
        expected: true,
        matches: true,
        blocking: true,
      },
      {
        questionId: 'AQ-C-001',
        question: auditQuestionSetFixture.controlQuestions[0]?.question,
        answer: false,
        expected: true,
        matches: false,
        blocking: false,
      },
      {
        questionId: 'AQ-P2-001',
        question: auditQuestionSetFixture.phaseSpecificQuestions?.['phase-02']?.[0]?.question,
        answer: true,
        expected: true,
        matches: true,
        blocking: true,
      },
    ]);
  });

  it('throws when answers length does not match the selected question count', () => {
    const { selectedQuestions } = selectAuditQuestions(auditQuestionSetFixture, 'phase-01');

    expect(() =>
      parseAuditResult(
        {
          answers: [true],
        },
        selectedQuestions,
      ),
    ).toThrow(/answers length/i);
  });

  it('calls adapter.audit and returns parsed boolean answers aligned with question order', async () => {
    const { adapter, auditCalls } = createRecordingAdapter({
      auditResults: [
        {
          answers: [true, false],
        },
      ],
    });

    const result = await executeAudit({
      adapter,
      questionSet: auditQuestionSetFixture,
      currentPhaseId: 'phase-01',
      precedingBeats: [{ role: 'user', content: 'player-choice-1' }],
      beatText: 'generated-beat',
      options: ['option-1', 'option-2', 'option-3', 'option-4'],
    });

    expect(auditCalls).toHaveLength(1);
    expect(result.selectedIds).toEqual(['AQ-G-001', 'AQ-C-001']);
    expect(result.auditResult.answers).toEqual([true, false]);
    expect(result.parsedResult.answers[1]?.questionId).toBe('AQ-C-001');
  });
});
