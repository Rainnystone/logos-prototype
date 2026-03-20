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
});
