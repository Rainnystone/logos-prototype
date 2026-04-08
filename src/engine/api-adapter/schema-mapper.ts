import {
  buildAuditSystemPrompt,
  buildAuditUserPrompt,
  buildCollapseSystemPrompt,
  buildCollapseUserPrompt,
  buildGenerateFinalUserMessage,
  buildGenerateSystemPrompt,
  buildGossipelogInjectionSystemPrompt,
  buildGossipelogInjectionUserPrompt,
  buildGossipelogUpdateSystemPrompt,
  buildGossipelogUpdateUserPrompt,
  buildRouteSystemPrompt,
  buildRouteUserPrompt,
  buildSettlementSystemPrompt,
  buildSettlementUserPrompt,
  buildWeaverImportSystemPrompt,
  buildWeaverImportUserPrompt,
} from '@/engine/api-adapter/prompt-templates';
import type {
  ModeConfig,
  ProviderRequest,
  ProviderResponseFormat,
  ProviderType,
} from '@/engine/api-adapter/providers/provider-interface';
import type {
  CollapseInput,
  GossipelogInjectionRequest,
  GossipelogUpdateRequest,
  RouteRequest,
  WeaverImportRequest,
} from '@/engine/types/adapter-interface';
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
    maxOutputTokens: 4096,
  },
  settlement: {
    temperature: 0.1,
    maxOutputTokens: 8192,
  },
  collapse: {
    temperature: 0.5,
    maxOutputTokens: 36864,
  },
  gossipelogUpdate: {
    temperature: 0.3,
    maxOutputTokens: 8192,
  },
  gossipelogInjection: {
    temperature: 0.2,
    maxOutputTokens: 4096,
  },
  weaverImport: {
    temperature: 0.2,
    maxOutputTokens: 16384,
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

const GOSSIPELOG_EDGE_UPDATE_SCHEMA = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['sourceRoleId', 'targetRoleId', 'mode'],
      properties: {
        sourceRoleId: { type: 'string' },
        targetRoleId: { type: 'string' },
        mode: { type: 'string', enum: ['noop'] },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['sourceRoleId', 'targetRoleId', 'mode', 'replaceBaseline', 'recentDelta'],
      properties: {
        sourceRoleId: { type: 'string' },
        targetRoleId: { type: 'string' },
        mode: { type: 'string', enum: ['delta'] },
        replaceBaseline: { type: 'boolean', enum: [false] },
        recentDelta: {
          type: 'object',
          additionalProperties: false,
          required: ['state', 'sourceRound'],
          properties: {
            state: { type: 'string' },
            sourceRound: { type: 'string' },
          },
        },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: [
        'sourceRoleId',
        'targetRoleId',
        'mode',
        'replaceBaseline',
        'baseline',
        'recentDelta',
      ],
      properties: {
        sourceRoleId: { type: 'string' },
        targetRoleId: { type: 'string' },
        mode: { type: 'string', enum: ['delta'] },
        replaceBaseline: { type: 'boolean', enum: [true] },
        baseline: {
          type: 'object',
          additionalProperties: false,
          required: ['state', 'lastAbsorbedRound'],
          properties: {
            state: { type: 'string' },
            lastAbsorbedRound: { type: 'string' },
          },
        },
        recentDelta: {
          type: 'object',
          additionalProperties: false,
          required: ['state', 'sourceRound'],
          properties: {
            state: { type: 'string' },
            sourceRound: { type: 'string' },
          },
        },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['sourceRoleId', 'targetRoleId', 'mode', 'replaceBaseline', 'baseline', 'recentDelta'],
      properties: {
        sourceRoleId: { type: 'string' },
        targetRoleId: { type: 'string' },
        mode: { type: 'string', enum: ['new_edge'] },
        replaceBaseline: { type: 'boolean', enum: [false] },
        baseline: {
          type: 'object',
          additionalProperties: false,
          required: ['state', 'lastAbsorbedRound'],
          properties: {
            state: { type: 'string' },
            lastAbsorbedRound: { type: 'string' },
          },
        },
        recentDelta: {
          type: 'object',
          additionalProperties: false,
          required: ['state', 'sourceRound'],
          properties: {
            state: { type: 'string' },
            sourceRound: { type: 'string' },
          },
        },
      },
    },
  ],
} as const;

const GOSSIPELOG_UPDATE_RESPONSE_FORMAT: ProviderResponseFormat = {
  type: 'json_schema',
  name: 'logos_gossipelog_update_result',
  strict: true,
  schema: {
    oneOf: [
      {
        type: 'object',
        additionalProperties: false,
        required: ['involvedRoleIds', 'invocationNoOp', 'edgeUpdates'],
        properties: {
          involvedRoleIds: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          invocationNoOp: {
            type: 'boolean',
            enum: [true],
          },
          edgeUpdates: {
            type: 'array',
            maxItems: 0,
            items: GOSSIPELOG_EDGE_UPDATE_SCHEMA,
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['involvedRoleIds', 'invocationNoOp', 'edgeUpdates'],
        properties: {
          involvedRoleIds: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          invocationNoOp: {
            type: 'boolean',
            enum: [false],
          },
          edgeUpdates: {
            type: 'array',
            minItems: 1,
            items: GOSSIPELOG_EDGE_UPDATE_SCHEMA,
          },
        },
      },
    ],
  },
};

const GOSSIPELOG_INJECTION_RESPONSE_FORMAT: ProviderResponseFormat = {
  type: 'json_schema',
  name: 'logos_gossipelog_injection_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['highlightedDeltasText', 'stableBackgroundText'],
    properties: {
      highlightedDeltasText: {
        type: 'string',
      },
      stableBackgroundText: {
        type: 'string',
      },
    },
  },
};

const WEAVER_IMPORT_RESPONSE_FORMAT: ProviderResponseFormat = {
  type: 'json_schema',
  name: 'logos_weaver_import_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'sourceSummary',
      'importSummary',
      'openingHook',
      'worldBase',
      'coreCast',
      'antagonists',
      'npcCharacters',
      'locations',
      'warnings',
      'unresolvedGaps',
    ],
    properties: {
      suggestedPackageName: {
        type: 'string',
      },
      sourceSummary: {
        type: 'string',
      },
      importSummary: {
        type: 'string',
      },
      openingHook: {
        type: 'string',
      },
      worldBase: {
        type: 'object',
        additionalProperties: true,
      },
      hero: {
        type: 'object',
        additionalProperties: true,
      },
      coreCast: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
      antagonists: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
      npcCharacters: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
      locations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
      warnings: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      unresolvedGaps: {
        type: 'array',
        items: {
          type: 'string',
        },
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

export function mapForGossipelogUpdate(
  request: GossipelogUpdateRequest,
  _provider: ProviderType,
  override?: ModeConfig,
): ProviderRequest {
  return {
    system: buildGossipelogUpdateSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildGossipelogUpdateUserPrompt(request),
      },
    ],
    responseFormat: GOSSIPELOG_UPDATE_RESPONSE_FORMAT,
    ...resolveModeConfig('gossipelogUpdate', override),
  };
}

export function mapForGossipelogInjection(
  request: GossipelogInjectionRequest,
  _provider: ProviderType,
  override?: ModeConfig,
): ProviderRequest {
  return {
    system: buildGossipelogInjectionSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildGossipelogInjectionUserPrompt(request),
      },
    ],
    responseFormat: GOSSIPELOG_INJECTION_RESPONSE_FORMAT,
    ...resolveModeConfig('gossipelogInjection', override),
  };
}

export function mapForWeaverImport(
  request: WeaverImportRequest,
  _provider: ProviderType,
  override?: ModeConfig,
): ProviderRequest {
  return {
    system: buildWeaverImportSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildWeaverImportUserPrompt(request),
      },
    ],
    responseFormat: WEAVER_IMPORT_RESPONSE_FORMAT,
    ...resolveModeConfig('weaverImport', override),
  };
}
