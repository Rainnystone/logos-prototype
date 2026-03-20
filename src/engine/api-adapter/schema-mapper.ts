import {
  buildAuditSystemPrompt,
  buildAuditUserPrompt,
  buildCollapseSystemPrompt,
  buildCollapseUserPrompt,
  buildGenerateFinalUserMessage,
  buildGenerateSystemPrompt,
  buildSettlementSystemPrompt,
  buildSettlementUserPrompt,
} from '@/engine/api-adapter/prompt-templates';
import type {
  ModeConfig,
  ProviderRequest,
  ProviderType,
} from '@/engine/api-adapter/providers/provider-interface';
import type { CollapseInput } from '@/engine/types/adapter-interface';
import type { AuditPacket, PhaseConsequenceRequest, PromptObject } from '@/types';

const MODE_DEFAULTS = {
  generate: {
    temperature: 0.8,
    maxOutputTokens: 2048,
  },
  audit: {
    temperature: 0.3,
    maxOutputTokens: 512,
  },
  settlement: {
    temperature: 0.2,
    maxOutputTokens: 768,
  },
  collapse: {
    temperature: 0.5,
    maxOutputTokens: 1024,
  },
} as const;

export const DEFAULT_MODE_CONFIGS = MODE_DEFAULTS;

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
    ...resolveModeConfig('generate', override),
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
    ...resolveModeConfig('collapse', override),
  };
}
