import { describe, expect, it } from 'vitest';

import { createMockAdapter } from '@/engine/__mocks__/mock-adapter';
import { createWorkbenchDemoAdapter } from '@/engine/__mocks__/workbench-demo-adapter';
import {
  sampleGossipelogInjectionRequest,
  sampleGossipelogUpdateRequest,
} from '@/engine/api-adapter/__tests__/fixtures';
import { validateCollapseResponse } from '@/engine/schema-validator';

describe('mock adapter', () => {
  it('returns a valid collapse response', async () => {
    const adapter = createMockAdapter();
    const response = await adapter.collapse({
      context: {
        mainAxis: 'main-axis',
        endLine: 'end-line',
      },
      phaseConsequences: ['fact-1'],
    });

    expect(response.alpha.length).toBeGreaterThan(0);
    expect(response.beta.length).toBeGreaterThan(0);
    expect(response.inferenceTrace.length).toBeGreaterThan(0);
  });

  it('returns deterministic results for the same input', async () => {
    const adapter = createMockAdapter();
    const request = {
      context: {
        mainAxis: 'main-axis',
        endLine: 'end-line',
      },
      phaseConsequences: ['fact-1'],
    } as const;

    await expect(adapter.collapse(request)).resolves.toEqual(await adapter.collapse(request));
  });

  it('returns responses that pass collapse schema validation', async () => {
    const adapter = createMockAdapter();

    await expect(
      Promise.resolve(
        validateCollapseResponse(
          await adapter.collapse({
            context: {
              mainAxis: 'main-axis',
              endLine: 'end-line',
            },
            phaseConsequences: ['fact-1'],
          }),
        ),
      ),
    ).resolves.toMatchObject({
      alpha: expect.any(String),
      beta: expect.any(String),
      inferenceTrace: expect.any(String),
    });
  });

  it('exposes deterministic gossipelog update and injection methods on the mock adapter', async () => {
    const adapter = createMockAdapter();
    await expect(adapter.gossipelogUpdate!(sampleGossipelogUpdateRequest)).resolves.toMatchObject({
      invocationNoOp: false,
      edgeUpdates: [
        expect.objectContaining({
          sourceRoleId: 'chr_core01',
          targetRoleId: 'chr_hero01',
          mode: 'new_edge',
          baseline: expect.objectContaining({
            lastAbsorbedRound: sampleGossipelogUpdateRequest.roundId,
          }),
        }),
      ],
    });
    await expect(adapter.gossipelogInjection!(sampleGossipelogInjectionRequest)).resolves.toMatchObject(
      {
        highlightedDeltasText: expect.any(String),
        stableBackgroundText: expect.any(String),
      },
    );
  });

  it('exposes deterministic gossipelog update and injection methods on the workbench demo adapter', async () => {
    const adapter = createWorkbenchDemoAdapter();
    await expect(adapter.gossipelogUpdate!(sampleGossipelogUpdateRequest)).resolves.toMatchObject({
      invocationNoOp: false,
      edgeUpdates: [
        expect.objectContaining({
          sourceRoleId: 'chr_core01',
          targetRoleId: 'chr_hero01',
          mode: 'new_edge',
          baseline: expect.objectContaining({
            lastAbsorbedRound: sampleGossipelogUpdateRequest.roundId,
          }),
        }),
      ],
    });
    await expect(adapter.gossipelogInjection!(sampleGossipelogInjectionRequest)).resolves.toMatchObject(
      {
        highlightedDeltasText: expect.any(String),
        stableBackgroundText: expect.any(String),
      },
    );
  });
});
