import { deepFreeze } from '@/lib/deep-freeze';
import { parseWithSchema } from '@/lib/validation';
import { validateCollapseRequest, validateCollapseResponse } from '@/engine/schema-validator';
import type { CollapseRequest, CollapseResponse, LightConeCustomization, SceneSpec } from '@/types';
import { SceneSpecSchema } from '@/types';
import type { InitialCollapseRequest, LLMAdapter } from '@/engine/types/adapter-interface';

const COLLAPSE_MAX_ATTEMPTS = 3;

function normalizeGuidance(value: string | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function appendGuidance(base: string, label: string, guidance: string | null): string {
  if (!guidance) {
    return base;
  }

  return `${base}\n\n[${label}] ${guidance}`;
}

function buildInitialCollapseRequest(
  sceneSpec: SceneSpec,
  customization?: LightConeCustomization,
): InitialCollapseRequest {
  const boundaryGuidance = normalizeGuidance(customization?.boundaryGuidance);
  const convergenceGuidance = normalizeGuidance(customization?.convergenceGuidance);
  const phaseSettlementGuidance = normalizeGuidance(customization?.phaseSettlementGuidance);

  return {
    context: {
      mainAxis: appendGuidance(
        appendGuidance(sceneSpec.mainAxis, 'Light Cone Boundary Guidance', boundaryGuidance),
        'Light Cone Phase Settlement Guidance',
        phaseSettlementGuidance,
      ),
      endLine: appendGuidance(
        sceneSpec.endLine,
        'Light Cone Convergence Guidance',
        convergenceGuidance,
      ),
    },
  };
}

function applyCollapseCustomization(
  request: CollapseRequest,
  customization?: LightConeCustomization,
): CollapseRequest {
  const boundaryGuidance = normalizeGuidance(customization?.boundaryGuidance);
  const convergenceGuidance = normalizeGuidance(customization?.convergenceGuidance);
  const phaseSettlementGuidance = normalizeGuidance(customization?.phaseSettlementGuidance);

  if (!boundaryGuidance && !convergenceGuidance && !phaseSettlementGuidance) {
    return request;
  }

  return {
    ...request,
    context: {
      ...request.context,
      mainAxis: appendGuidance(
        appendGuidance(request.context.mainAxis, 'Light Cone Boundary Guidance', boundaryGuidance),
        'Light Cone Phase Settlement Guidance',
        phaseSettlementGuidance,
      ),
      endLine: appendGuidance(
        request.context.endLine,
        'Light Cone Convergence Guidance',
        convergenceGuidance,
      ),
    },
  };
}

/**
 * Light Cone Collapse manages initial and phase-end Alpha/Beta boundary inference.
 *
 * @see LOGOS-SPEC/04_MODULES/light-cone-collapse.md
 */
export function createLightConeCollapse(adapter: LLMAdapter, customization?: LightConeCustomization) {
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
      const request = buildInitialCollapseRequest(validatedSceneSpec, customization);
      return executeCollapseWithRetries(request);
    },

    async reInferBoundaries(request: CollapseRequest): Promise<CollapseResponse> {
      const validatedRequest = validateCollapseRequest(
        applyCollapseCustomization(request, customization),
      );
      return executeCollapseWithRetries(validatedRequest);
    },
  };
}
