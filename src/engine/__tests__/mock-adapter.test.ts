import { describe, expect, it } from 'vitest';

import { createMockAdapter } from '@/engine/__mocks__/mock-adapter';
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
});
