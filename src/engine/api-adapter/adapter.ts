import { z } from 'zod';

import { deepFreeze } from '@/lib/deep-freeze';
import { parseWithSchema } from '@/lib/validation';
import {
  parseAuditResult,
  parseCollapseResult,
  parseGenerateResult,
  parseRouteResult,
  parseSettlementResult,
} from '@/engine/api-adapter/response-parsers';
import {
  mapForAudit,
  mapForCollapse,
  mapForGenerate,
  mapForRoute,
  mapForSettlement,
} from '@/engine/api-adapter/schema-mapper';
import { createAnthropicProvider } from '@/engine/api-adapter/providers/anthropic';
import { createOpenAICompatibleProvider } from '@/engine/api-adapter/providers/openai-compatible';
import type {
  AdapterConfig,
  Provider,
  ProviderRequest,
} from '@/engine/api-adapter/providers/provider-interface';
import {
  validateAuditPacket,
  validateCollapseRequest,
  validatePhaseConsequenceRequest,
  validatePromptObject,
} from '@/engine/schema-validator';
import type {
  CollapseInput,
  InitialCollapseRequest,
  LLMAdapter,
} from '@/engine/types/adapter-interface';

const InitialCollapseRequestSchema = z
  .object({
    context: z
      .object({
        mainAxis: z.string(),
        endLine: z.string(),
        sceneProgress: z.string().optional(),
        completedPhaseGoal: z.string().optional(),
      })
      .strict(),
    phaseConsequences: z.array(z.string()).min(1).optional(),
  })
  .strict();

function createProvider(config: AdapterConfig): Provider {
  if (config.provider === 'anthropic') {
    return createAnthropicProvider(config.providerConfig);
  }

  return createOpenAICompatibleProvider(config.providerConfig);
}

function attachModel(request: ProviderRequest, model: string): ProviderRequest {
  return {
    ...request,
    model,
  };
}

function validateCollapseInput(request: CollapseInput): CollapseInput {
  const collapseResult = (() => {
    try {
      return validateCollapseRequest(request);
    } catch {
      return null;
    }
  })();

  if (collapseResult) {
    return collapseResult;
  }

  return parseWithSchema(
    InitialCollapseRequestSchema,
    request,
    'initialCollapseRequest',
  ) as InitialCollapseRequest;
}

export function createAPIAdapter(config: AdapterConfig): LLMAdapter {
  const provider = createProvider(config);

  return {
    async route(routeRequest) {
      const request = attachModel(
        mapForRoute(routeRequest, config.provider, config.routeConfig),
        config.providerConfig.model,
      );
      const response = await provider.call(request);

      return deepFreeze(parseRouteResult(response.content, response.usage));
    },

    async generate(promptObject) {
      const request = attachModel(
        mapForGenerate(validatePromptObject(promptObject), config.provider, config.generateConfig),
        config.providerConfig.model,
      );
      const response = await provider.call(request);

      return deepFreeze(parseGenerateResult(response.content, response.usage));
    },

    async audit(packet) {
      const validatedPacket = validateAuditPacket(packet);
      const request = attachModel(
        mapForAudit(validatedPacket, config.provider, config.auditConfig),
        config.providerConfig.model,
      );
      const response = await provider.call(request);

      return deepFreeze(
        parseAuditResult(response.content, validatedPacket.auditQuestions.length, response.usage),
      );
    },

    async settlement(packet) {
      const request = attachModel(
        mapForSettlement(
          validatePhaseConsequenceRequest(packet),
          config.provider,
          config.settlementConfig,
        ),
        config.providerConfig.model,
      );
      const response = await provider.call(request);

      return deepFreeze(parseSettlementResult(response.content, response.usage));
    },

    async collapse(requestInput) {
      const validatedInput = validateCollapseInput(requestInput);
      const request = attachModel(
        mapForCollapse(validatedInput, config.provider, config.collapseConfig),
        config.providerConfig.model,
      );
      const response = await provider.call(request);

      return deepFreeze(parseCollapseResult(response.content, response.usage));
    },
  };
}
