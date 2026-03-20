import { deepFreeze } from '@/lib/deep-freeze';
import { parseWithSchema } from '@/lib/validation';
import { validateCollapseRequest, validateCollapseResponse } from '@/engine/schema-validator';
import type { CollapseRequest, CollapseResponse, SceneSpec } from '@/types';
import { SceneSpecSchema } from '@/types';
import type { InitialCollapseRequest, LLMAdapter } from '@/engine/types/adapter-interface';

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
  return {
    async inferInitialBoundaries(sceneSpec: SceneSpec): Promise<CollapseResponse> {
      const validatedSceneSpec = parseWithSchema(SceneSpecSchema, sceneSpec, 'sceneSpec');
      const request = buildInitialCollapseRequest(validatedSceneSpec);
      const response = await adapter.collapse(request);

      return deepFreeze(validateCollapseResponse(response));
    },

    async reInferBoundaries(request: CollapseRequest): Promise<CollapseResponse> {
      const validatedRequest = validateCollapseRequest(request);
      const response = await adapter.collapse(validatedRequest);

      return deepFreeze(validateCollapseResponse(response));
    },
  };
}
