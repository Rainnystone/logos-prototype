import { describe, expect, it } from 'vitest';

import { validatePhaseConsequenceResponse } from '@/engine/schema-validator';
import {
  buildPhaseConsequenceRequest,
  settlePhaseConsequences,
} from '@/engine/modules/phase-consequence-settlement';
import { createRecordingAdapter } from '@/engine/__tests__/fixtures/audit-loop-fixtures';

describe('Phase Consequence Settlement', () => {
  it('builds a request with scene context and chronological user/assistant transcript only', () => {
    const request = buildPhaseConsequenceRequest(
      'main-axis',
      'end-line',
      'phase-goal',
      [
        { role: 'system', content: 'ignore-system-message' },
        { role: 'user', content: 'player-choice-1' },
        { role: 'assistant', content: 'accepted-beat-1' },
      ],
      'scene-progress',
      2,
    );

    expect(request.context).toEqual({
      mainAxis: 'main-axis',
      endLine: 'end-line',
      phaseGoal: 'phase-goal',
      sceneProgress: 'scene-progress',
      currentPhaseIndex: 2,
    });
    expect(request.phaseTranscript).toEqual([
      { role: 'user', content: 'player-choice-1' },
      { role: 'assistant', content: 'accepted-beat-1' },
    ]);
  });

  it('calls adapter.settlement with a valid request and returns a validated response', async () => {
    const { adapter, settlementCalls } = createRecordingAdapter({
      settlementResults: [
        {
          phaseConsequences: ['fact-1', 'fact-2'],
          settlementTrace: 'settlement-trace',
        },
      ],
    });
    const request = buildPhaseConsequenceRequest('main-axis', 'end-line', 'phase-goal', [
      { role: 'user', content: 'player-choice-1' },
      { role: 'assistant', content: 'accepted-beat-1' },
    ]);

    const response = await settlePhaseConsequences(request, adapter);

    expect(settlementCalls).toHaveLength(1);
    expect(validatePhaseConsequenceResponse(response)).toEqual(response);
    expect(response.phaseConsequences).toEqual(['fact-1', 'fact-2']);
    expect(response.settlementTrace).toBe('settlement-trace');
  });

  it('rejects responses with 0 phase consequences', async () => {
    const { adapter } = createRecordingAdapter({
      settlementResults: [
        {
          phaseConsequences: [],
          settlementTrace: 'settlement-trace',
        } as never,
      ],
    });
    const request = buildPhaseConsequenceRequest('main-axis', 'end-line', 'phase-goal', [
      { role: 'user', content: 'player-choice-1' },
    ]);

    await expect(settlePhaseConsequences(request, adapter)).rejects.toThrow(/phaseConsequences/i);
  });

  it('rejects responses with more than 6 phase consequences', async () => {
    const { adapter } = createRecordingAdapter({
      settlementResults: [
        {
          phaseConsequences: ['1', '2', '3', '4', '5', '6', '7'],
          settlementTrace: 'settlement-trace',
        } as never,
      ],
    });
    const request = buildPhaseConsequenceRequest('main-axis', 'end-line', 'phase-goal', [
      { role: 'user', content: 'player-choice-1' },
    ]);

    await expect(settlePhaseConsequences(request, adapter)).rejects.toThrow(/phaseConsequences/i);
  });

  it('rejects responses missing settlementTrace', async () => {
    const { adapter } = createRecordingAdapter({
      settlementResults: [
        {
          phaseConsequences: ['fact-1'],
        } as never,
      ],
    });
    const request = buildPhaseConsequenceRequest('main-axis', 'end-line', 'phase-goal', [
      { role: 'user', content: 'player-choice-1' },
    ]);

    await expect(settlePhaseConsequences(request, adapter)).rejects.toThrow(/settlementTrace/i);
  });
});
