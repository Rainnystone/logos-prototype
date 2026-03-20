import {
  buildAuditSystemPrompt,
  buildAuditUserPrompt,
  buildCollapseSystemPrompt,
  buildCollapseUserPrompt,
  buildGenerateFinalUserMessage,
  buildGenerateSystemPrompt,
  buildRouteSystemPrompt,
  buildRouteUserPrompt,
  buildSettlementSystemPrompt,
  buildSettlementUserPrompt,
} from '@/engine/api-adapter/prompt-templates';
import type {
  ModeConfig,
  ProviderRequest,
  ProviderResponseFormat,
  ProviderType,
} from '@/engine/api-adapter/providers/provider-interface';
import type { CollapseInput, RouteRequest } from '@/engine/types/adapter-interface';
import type { AuditPacket, PhaseConsequenceRequest, PromptObject } from '@/types';

const MODE_DEFAULTS = {
  route: {
    temperature: 0.2,
    maxOutputTokens: 4096,
  },
  generate: {
    temperature: 1,
    maxOutputTokens: 36864,
  },
  audit: {
    temperature: 0.3,
    maxOutputTokens: 512,
  },
  settlement: {
    temperature: 0.1,
    maxOutputTokens: 8192,
  },
  collapse: {
    temperature: 0.5,
    maxOutputTokens: 36864,
  },
} as const;

export const DEFAULT_MODE_CONFIGS = MODE_DEFAULTS;

const ROUTE_RESPONSE_FORMAT: ProviderResponseFormat = {
  type: 'json_schema',
  name: 'logos_route_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['routerName', 'inferenceTrace'],
    properties: {
      routerName: {
        type: 'string',
      },
      inferenceTrace: {
        type: 'string',
      },
    },
  },
};

const GENERATE_RESPONSE_FORMAT: ProviderResponseFormat = {
  type: 'json_schema',
  name: 'logos_generate_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['beatText', 'options'],
    properties: {
      beatText: {
        type: 'string',
      },
      options: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: {
          type: 'string',
        },
      },
    },
  },
};

const AUDIT_RESPONSE_FORMAT: ProviderResponseFormat = {
  type: 'json_schema',
  name: 'logos_audit_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['answers'],
    properties: {
      answers: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'boolean',
        },
      },
    },
  },
};

const SETTLEMENT_RESPONSE_FORMAT: ProviderResponseFormat = {
  type: 'json_schema',
  name: 'logos_phase_consequence_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['phaseConsequences', 'settlementTrace'],
    properties: {
      phaseConsequences: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'string',
        },
      },
      settlementTrace: {
        type: 'string',
      },
    },
  },
};

const COLLAPSE_RESPONSE_FORMAT: ProviderResponseFormat = {
  type: 'json_schema',
  name: 'logos_collapse_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['alpha', 'beta', 'inferenceTrace'],
    properties: {
      alpha: {
        type: 'string',
      },
      beta: {
        type: 'string',
      },
      inferenceTrace: {
        type: 'string',
      },
    },
  },
};

function resolveModeConfig(
  mode: keyof typeof MODE_DEFAULTS,
  override?: ModeConfig,
): Pick<ProviderRequest, 'temperature' | 'maxOutputTokens'> {
  return {
    temperature: override?.temperature ?? MODE_DEFAULTS[mode].temperature,
    maxOutputTokens: override?.maxOutputTokens ?? MODE_DEFAULTS[mode].maxOutputTokens,
  };
}

export function mapForGenerate(
  prompt: PromptObject,
  _provider: ProviderType,
  override?: ModeConfig,
): ProviderRequest {
  return {
    system: buildGenerateSystemPrompt(prompt),
    messages: [
      ...prompt.history.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
      {
        role: 'user',
        content: buildGenerateFinalUserMessage(prompt),
      },
    ],
    responseFormat: GENERATE_RESPONSE_FORMAT,
    ...resolveModeConfig('generate', override),
  };
}

export function mapForRoute(
  request: RouteRequest,
  _provider: ProviderType,
  override?: ModeConfig,
): ProviderRequest {
  return {
    system: buildRouteSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildRouteUserPrompt(request),
      },
    ],
    responseFormat: ROUTE_RESPONSE_FORMAT,
    ...resolveModeConfig('route', override),
  };
}

export function mapForAudit(
  packet: AuditPacket,
  _provider: ProviderType,
  override?: ModeConfig,
): ProviderRequest {
  return {
    system: buildAuditSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildAuditUserPrompt(packet),
      },
    ],
    responseFormat: AUDIT_RESPONSE_FORMAT,
    ...resolveModeConfig('audit', override),
  };
}

export function mapForSettlement(
  packet: PhaseConsequenceRequest,
  _provider: ProviderType,
  override?: ModeConfig,
): ProviderRequest {
  return {
    system: buildSettlementSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildSettlementUserPrompt(packet),
      },
    ],
    responseFormat: SETTLEMENT_RESPONSE_FORMAT,
    ...resolveModeConfig('settlement', override),
  };
}

export function mapForCollapse(
  packet: CollapseInput,
  _provider: ProviderType,
  override?: ModeConfig,
): ProviderRequest {
  return {
    system: buildCollapseSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildCollapseUserPrompt(packet),
      },
    ],
    responseFormat: COLLAPSE_RESPONSE_FORMAT,
    ...resolveModeConfig('collapse', override),
  };
}
