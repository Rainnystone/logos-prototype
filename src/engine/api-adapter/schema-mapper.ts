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

const GOSSIPELOG_MEMORY_ENTRY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'phaseId',
    'beatIndex',
    'roundId',
    'functionalRole',
    'mindsetTags',
    'summary',
    'triggerEvent',
    'reasoning',
    'causalAction',
  ],
  properties: {
    phaseId: { type: ['string', 'null'] },
    beatIndex: { type: ['integer', 'null'] },
    roundId: { type: 'string' },
    functionalRole: { type: ['string', 'null'] },
    mindsetTags: {
      type: 'array',
      items: { type: 'string' },
    },
    summary: { type: 'string' },
    triggerEvent: { type: 'string' },
    reasoning: { type: 'string' },
    causalAction: { type: 'string' },
  },
} as const;

const GOSSIPELOG_MEMORY_UPDATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sourceRoleId', 'targetRoleId', 'shouldCreateEdge', 'nextCurrentRelation'],
  properties: {
    sourceRoleId: { type: 'string' },
    targetRoleId: { type: 'string' },
    shouldCreateEdge: { type: 'boolean' },
    nextCurrentRelation: GOSSIPELOG_MEMORY_ENTRY_SCHEMA,
  },
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
        required: ['involvedRoleIds', 'invocationNoOp', 'memoryUpdates'],
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
          memoryUpdates: {
            type: 'array',
            maxItems: 0,
            items: GOSSIPELOG_MEMORY_UPDATE_SCHEMA,
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['involvedRoleIds', 'invocationNoOp', 'memoryUpdates'],
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
          memoryUpdates: {
            type: 'array',
            minItems: 1,
            items: GOSSIPELOG_MEMORY_UPDATE_SCHEMA,
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

const WEAVER_NAMED_ENTRY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['displayName'],
  properties: {
    displayName: {
      type: 'string',
      minLength: 1,
      description: 'Display name for the extracted character seed.',
    },
    roleSummary: {
      type: 'string',
      minLength: 1,
      description: 'Short role summary for the extracted character seed.',
    },
  },
} as const;

const WEAVER_NPC_ENTRY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['displayName'],
  properties: {
    displayName: {
      type: 'string',
      minLength: 1,
      description: 'Display name for the extracted NPC seed.',
    },
    summary: {
      type: 'string',
      minLength: 1,
      description: 'Short summary for the extracted NPC seed.',
    },
    roleSummary: {
      type: 'string',
      minLength: 1,
      description: 'Short role summary for the extracted NPC seed.',
    },
  },
} as const;

const WEAVER_LOCATION_ENTRY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['displayName'],
  properties: {
    displayName: {
      type: 'string',
      minLength: 1,
      description: 'Display name for the extracted location seed.',
    },
    summary: {
      type: 'string',
      minLength: 1,
      description: 'Short summary for the extracted location seed.',
    },
  },
} as const;

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
        minLength: 1,
      },
      sourceSummary: {
        type: 'string',
        minLength: 1,
      },
      importSummary: {
        type: 'string',
        minLength: 1,
      },
      openingHook: {
        type: 'string',
        minLength: 1,
      },
      worldBase: {
        type: 'object',
        additionalProperties: false,
        properties: {
          settingSummary: {
            type: 'string',
            minLength: 1,
            description: 'Brief setting summary extracted from the source text.',
          },
          worldRules: {
            type: 'string',
            minLength: 1,
            description: 'World rules or operating logic extracted from the source text.',
          },
          toneBaseline: {
            type: 'string',
            minLength: 1,
            description: 'Tone baseline extracted from the source text.',
          },
          locationPatch: {
            type: 'string',
            minLength: 1,
            description: 'Location context extracted from the source text.',
          },
          npcCharactersSummary: {
            type: 'string',
            minLength: 1,
            description: 'NPC summary extracted from the source text.',
          },
        },
      },
      hero: WEAVER_NAMED_ENTRY_SCHEMA,
      coreCast: {
        type: 'array',
        items: WEAVER_NAMED_ENTRY_SCHEMA,
      },
      antagonists: {
        type: 'array',
        items: WEAVER_NAMED_ENTRY_SCHEMA,
      },
      npcCharacters: {
        type: 'array',
        items: WEAVER_NPC_ENTRY_SCHEMA,
      },
      locations: {
        type: 'array',
        items: WEAVER_LOCATION_ENTRY_SCHEMA,
      },
      warnings: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
        },
      },
      unresolvedGaps: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
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
