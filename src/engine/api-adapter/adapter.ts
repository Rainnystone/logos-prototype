import { z } from 'zod';

import { deepFreeze } from '@/lib/deep-freeze';
import { parseWithSchema } from '@/lib/validation';
import {
  parseAuditResult,
  parseCollapseResult,
  parseGenerateResult,
  parseGossipelogInjectionResult,
  parseGossipelogUpdateResult,
  parseWeaverImportResult,
  parseRouteResult,
  parseSettlementResult,
} from '@/engine/api-adapter/response-parsers';
import {
  mapForAudit,
  mapForCollapse,
  mapForGenerate,
  mapForGossipelogInjection,
  mapForGossipelogUpdate,
  mapForRoute,
  mapForSettlement,
  mapForWeaverImport,
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
  WeaverImportRequest,
} from '@/engine/types/adapter-interface';
import {
  CharacterProfileSchema,
  CharacterRelationshipsFileSchema,
} from '@/types';

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

const GossipelogSceneCastFramingSchema = z
  .object({
    sceneId: z.string(),
    castRoleIds: z.array(z.string()),
  })
  .strict();

const GossipelogUpdateRequestSchema = z
  .object({
    acceptedBeatText: z.string(),
    roundId: z.string(),
    sceneCastRoleIds: z.array(z.string()),
    sceneCastFraming: GossipelogSceneCastFramingSchema,
    candidateRoles: z.array(CharacterProfileSchema),
    roleDefinitions: z.array(CharacterProfileSchema),
    relationshipSubgraph: CharacterRelationshipsFileSchema,
  })
  .strict();

const GossipelogInjectionRequestSchema = z
  .object({
    sceneCastRoleIds: z.array(z.string()),
    sceneCastFraming: GossipelogSceneCastFramingSchema,
    roleDefinitions: z.array(CharacterProfileSchema),
    relationshipSubgraph: CharacterRelationshipsFileSchema,
  })
  .strict();

const WeaverResolvedReferenceSchema = z
  .object({
    referenceId: z.string(),
    injectionLabel: z.string(),
    relativePath: z.string(),
    contents: z.string(),
    estimatedTokens: z.number().int().positive(),
  })
  .strict();

const WeaverImportRequestSchema = z
  .object({
    sourceText: z.string().trim().min(1),
    packageNameHint: z.string().trim().min(1).optional(),
    resolvedReferences: z.array(WeaverResolvedReferenceSchema),
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

function validateGossipelogUpdateInput(request: unknown) {
  return parseWithSchema(GossipelogUpdateRequestSchema, request, 'gossipelogUpdateRequest');
}

function validateGossipelogInjectionInput(request: unknown) {
  return parseWithSchema(
    GossipelogInjectionRequestSchema,
    request,
    'gossipelogInjectionRequest',
  );
}

function validateWeaverImportInput(request: unknown): WeaverImportRequest {
  return parseWithSchema(WeaverImportRequestSchema, request, 'weaverImportRequest');
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

    async gossipelogUpdate(requestInput) {
      const request = attachModel(
        mapForGossipelogUpdate(
          validateGossipelogUpdateInput(requestInput),
          config.provider,
          config.gossipelogUpdateConfig,
        ),
        config.providerConfig.model,
      );
      const response = await provider.call(request);

      return deepFreeze(parseGossipelogUpdateResult(response.content, response.usage));
    },

    async gossipelogInjection(requestInput) {
      const request = attachModel(
        mapForGossipelogInjection(
          validateGossipelogInjectionInput(requestInput),
          config.provider,
          config.gossipelogInjectionConfig,
        ),
        config.providerConfig.model,
      );
      const response = await provider.call(request);

      return deepFreeze(parseGossipelogInjectionResult(response.content, response.usage));
    },

    async weaverImport(requestInput) {
      const request = attachModel(
        mapForWeaverImport(
          validateWeaverImportInput(requestInput),
          config.provider,
          config.weaverImportConfig,
        ),
        config.providerConfig.model,
      );
      const response = await provider.call(request);

      return deepFreeze(parseWeaverImportResult(response.content, response.usage));
    },
  };
}
