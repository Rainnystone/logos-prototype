import { deepFreeze } from '@/lib/deep-freeze';
import { parseWithSchema } from '@/lib/validation';
import { validateCollapseRequest, validateCollapseResponse } from '@/engine/schema-validator';
import type { CollapseRequest, CollapseResponse, SceneSpec } from '@/types';
import { SceneSpecSchema } from '@/types';
import type { InitialCollapseRequest, LLMAdapter } from '@/engine/types/adapter-interface';

const COLLAPSE_MAX_ATTEMPTS = 3;

function buildInitialCollapseRequest(sceneSpec: SceneSpec): InitialCollapseRequest {
  return {
    context: {
      mainAxis: sceneSpec.mainAxis,
      endLine: sceneSpec.endLine,
    },
  };
}

/**
 * Light Cone Collapse manages initial and phase-end Alpha/Beta boundary inference.
 *
 * @see LOGOS-SPEC/04_MODULES/light-cone-collapse.md
 */
export function createLightConeCollapse(adapter: LLMAdapter) {
  async function executeCollapseWithRetries(
    request: InitialCollapseRequest | CollapseRequest,
  ): Promise<CollapseResponse> {
    let lastError: Error | null = null;

    for (let attemptIndex = 0; attemptIndex < COLLAPSE_MAX_ATTEMPTS; attemptIndex += 1) {
      try {
        const response = await adapter.collapse(request);
        return deepFreeze(validateCollapseResponse(response));
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw new Error(
      `Light Cone Collapse failed after ${COLLAPSE_MAX_ATTEMPTS} attempts: ${
        lastError?.message ?? 'unknown error'
      }`,
    );
  }

  return {
    async inferInitialBoundaries(sceneSpec: SceneSpec): Promise<CollapseResponse> {
      const validatedSceneSpec = parseWithSchema(SceneSpecSchema, sceneSpec, 'sceneSpec');
      const request = buildInitialCollapseRequest(validatedSceneSpec);
      return executeCollapseWithRetries(request);
    },

    async reInferBoundaries(request: CollapseRequest): Promise<CollapseResponse> {
      const validatedRequest = validateCollapseRequest(request);
      return executeCollapseWithRetries(validatedRequest);
    },
  };
}
