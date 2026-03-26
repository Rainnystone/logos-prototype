import { describe, expect, it, vi } from 'vitest';

import { createLightConeCollapse } from '@/engine/modules/light-cone-collapse';
import type { CollapseRequest, CollapseResponse, SceneSpec } from '@/types';
import type { LLMAdapter } from '@/engine/types/adapter-interface';

const sceneSpec: SceneSpec = {
  sceneId: 'scene-id',
  sceneName: 'scene-name',
  mainAxis: 'main-axis',
  endLine: 'end-line',
};

function createRecordingAdapter(response: CollapseResponse) {
  const collapse = vi.fn(async () => response);
  const adapter: LLMAdapter = {
    collapse,
  };

  return {
    adapter,
    collapse,
  };
}

function createRetryingAdapter(sequence: readonly (CollapseResponse | Error)[]): {
  adapter: LLMAdapter;
  collapse: ReturnType<typeof vi.fn>;
} {
  let index = 0;
  const collapse = vi.fn(async () => {
    const next = sequence[Math.min(index, sequence.length - 1)];
    index += 1;

    if (!next) {
      throw new Error('collapse retry sequence must contain at least one entry');
    }

    if (next instanceof Error) {
      throw next;
    }

    return next;
  });
  const adapter: LLMAdapter = {
    collapse,
  };

  return {
    adapter,
    collapse,
  };
}

describe('Light Cone Collapse', () => {
  it('infers initial boundaries from a valid SceneSpec', async () => {
    const { adapter } = createRecordingAdapter({
      alpha: 'alpha',
      beta: 'beta',
      inferenceTrace: 'trace',
    });

    await expect(
      createLightConeCollapse(adapter).inferInitialBoundaries(sceneSpec),
    ).resolves.toEqual(
      expect.objectContaining({
        alpha: 'alpha',
        beta: 'beta',
        inferenceTrace: 'trace',
      }),
    );
  });

  it('calls the adapter once with mainAxis and endLine for initial inference', async () => {
    const { adapter, collapse } = createRecordingAdapter({
      alpha: 'alpha',
      beta: 'beta',
      inferenceTrace: 'trace',
    });

    await createLightConeCollapse(adapter).inferInitialBoundaries(sceneSpec);

    expect(collapse).toHaveBeenCalledTimes(1);
    expect(collapse).toHaveBeenCalledWith({
      context: {
        mainAxis: 'main-axis',
        endLine: 'end-line',
      },
    });
  });

  it('appends control-module light cone guidance before initial inference', async () => {
    const { adapter, collapse } = createRecordingAdapter({
      alpha: 'alpha',
      beta: 'beta',
      inferenceTrace: 'trace',
    });

    await createLightConeCollapse(adapter, {
      boundaryGuidance: 'Keep the current player state as the apex.',
      convergenceGuidance: 'Narrow the cone more sharply near the end line.',
      phaseSettlementGuidance: 'Only re-evaluate after each settled phase.',
    }).inferInitialBoundaries(sceneSpec);

    expect(collapse).toHaveBeenCalledWith({
      context: {
        mainAxis: expect.stringContaining('Keep the current player state as the apex.'),
        endLine: expect.stringContaining('Narrow the cone more sharply near the end line.'),
      },
    });
  });

  it('throws when initial inference receives an invalid SceneSpec', async () => {
    const { adapter } = createRecordingAdapter({
      alpha: 'alpha',
      beta: 'beta',
      inferenceTrace: 'trace',
    });

    await expect(
      createLightConeCollapse(adapter).inferInitialBoundaries({
        sceneId: 'scene-id',
        sceneName: 'scene-name',
        endLine: 'end-line',
      } as SceneSpec),
    ).rejects.toThrow(/mainAxis/i);
  });

  it('re-infers boundaries from a valid CollapseRequest', async () => {
    const request: CollapseRequest = {
      context: {
        mainAxis: 'main-axis',
        endLine: 'end-line',
        currentAlpha: 'current-alpha',
        currentBeta: 'current-beta',
      },
      phaseConsequences: ['fact-1'],
    };
    const { adapter, collapse } = createRecordingAdapter({
      alpha: 'next-alpha',
      beta: 'next-beta',
      inferenceTrace: 'trace',
    });

    await expect(createLightConeCollapse(adapter).reInferBoundaries(request)).resolves.toEqual(
      expect.objectContaining({
        alpha: 'next-alpha',
        beta: 'next-beta',
      }),
    );
    expect(collapse).toHaveBeenCalledWith(request);
  });

  it('throws when re-inference receives an empty phaseConsequences array', async () => {
    const { adapter } = createRecordingAdapter({
      alpha: 'next-alpha',
      beta: 'next-beta',
      inferenceTrace: 'trace',
    });

    await expect(
      createLightConeCollapse(adapter).reInferBoundaries({
        context: {
          mainAxis: 'main-axis',
          endLine: 'end-line',
          currentAlpha: 'current-alpha',
          currentBeta: 'current-beta',
        },
        phaseConsequences: [],
      } as CollapseRequest),
    ).rejects.toThrow(/phaseConsequences/i);
  });

  it('does not mutate its SceneSpec or CollapseRequest inputs', async () => {
    const frozenSceneSpec = Object.freeze({ ...sceneSpec });
    const frozenRequest = Object.freeze({
      context: Object.freeze({
        mainAxis: 'main-axis',
        endLine: 'end-line',
        currentAlpha: 'current-alpha',
        currentBeta: 'current-beta',
      }),
      phaseConsequences: Object.freeze(['fact-1']),
    }) as CollapseRequest;
    const { adapter } = createRecordingAdapter({
      alpha: 'next-alpha',
      beta: 'next-beta',
      inferenceTrace: 'trace',
    });

    await expect(
      createLightConeCollapse(adapter).inferInitialBoundaries(frozenSceneSpec),
    ).resolves.toBeDefined();
    await expect(
      createLightConeCollapse(adapter).reInferBoundaries(frozenRequest),
    ).resolves.toBeDefined();
  });

  it('returns immutable validated responses', async () => {
    const { adapter } = createRecordingAdapter({
      alpha: 'alpha',
      beta: 'beta',
      inferenceTrace: 'trace',
    });

    const response = await createLightConeCollapse(adapter).reInferBoundaries({
      context: {
        mainAxis: 'main-axis',
        endLine: 'end-line',
        currentAlpha: 'current-alpha',
        currentBeta: 'current-beta',
      },
      phaseConsequences: ['fact-1'],
    });

    expect(Object.isFrozen(response)).toBe(true);
  });

  it('retries transient collapse failures before succeeding', async () => {
    const { adapter, collapse } = createRetryingAdapter([
      new Error('Provider response did not contain valid structured JSON'),
      {
        alpha: 'alpha',
        beta: 'beta',
        inferenceTrace: 'trace',
      },
    ]);

    const response = await createLightConeCollapse(adapter).inferInitialBoundaries(sceneSpec);

    expect(response.alpha).toBe('alpha');
    expect(collapse).toHaveBeenCalledTimes(2);
  });

  it('throws a collapse-specific error after exhausting retries', async () => {
    const { adapter, collapse } = createRetryingAdapter([
      new Error('truncated-json'),
      new Error('truncated-json'),
      new Error('truncated-json'),
    ]);

    await expect(
      createLightConeCollapse(adapter).inferInitialBoundaries(sceneSpec),
    ).rejects.toThrow(/Light Cone Collapse failed after 3 attempts/i);
    expect(collapse).toHaveBeenCalledTimes(3);
  });
});
