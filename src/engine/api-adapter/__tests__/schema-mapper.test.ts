import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MODE_CONFIGS,
  mapForAudit,
  mapForCollapse,
  mapForGenerate,
  mapForGossipelogInjection,
  mapForGossipelogUpdate,
  mapForRoute,
  mapForSettlement,
  mapForWeaverImport,
} from '@/engine/api-adapter/schema-mapper';
import {
  sampleGossipelogInjectionRequest,
  sampleGossipelogUpdateRequest,
  sampleAuditPacket,
  sampleCollapseRequest,
  sampleInitialCollapseRequest,
  samplePromptObject,
  sampleRouteRequest,
  sampleRewritePromptObject,
  sampleSettlementRequest,
  sampleStructuredWorldBase,
  sampleWeaverImportRequest,
} from '@/engine/api-adapter/__tests__/fixtures';

describe('schema mapper', () => {
  describe('route', () => {
    it('maps RouteRequest into a router-selection prompt with context, history, and router catalog', () => {
      const request = mapForRoute(sampleRouteRequest, 'openai-compatible');
      const userMessage = request.messages[0]?.content ?? '';

      expect(request.system).toContain('narrative router');
      expect(userMessage).toContain(sampleRouteRequest.context.phaseGoal);
      expect(userMessage).toContain(sampleRouteRequest.context.currentVolume);
      expect(userMessage).toContain(sampleRouteRequest.historyWindow[0]?.content ?? '');
      expect(userMessage).toContain(sampleRouteRequest.availableRouters[1]?.routerName ?? '');
      expect(userMessage).toContain(
        sampleRouteRequest.availableRouters[1]?.verbLexicon.join(', ') ?? '',
      );
    });

    it('uses the route default temperature and token limit', () => {
      const request = mapForRoute(sampleRouteRequest, 'anthropic');

      expect(request.temperature).toBe(DEFAULT_MODE_CONFIGS.route.temperature);
      expect(request.maxOutputTokens).toBe(DEFAULT_MODE_CONFIGS.route.maxOutputTokens);
    });

    it('attaches a structured response schema for route outputs', () => {
      const request = mapForRoute(sampleRouteRequest, 'openai-compatible');

      expect(request.responseFormat).toMatchObject({
        type: 'json_schema',
        name: 'logos_route_result',
      });
    });
  });

  describe('generate', () => {
    it('maps PromptObject into a ProviderRequest with world base and narrative in system', () => {
      const request = mapForGenerate(samplePromptObject, 'openai-compatible');
      const systemPrompt = request.system ?? '';

      expect(request.system).toContain('You are LOGOS, a controlled interactive fiction storyteller.');
      expect(request.system).toContain(
        'Act with narrative initiative inside the supplied boundaries and make full use of the provided story resources.',
      );
      expect(samplePromptObject.worldBase.mainCharacters).toContain('## Hero');
      expect(samplePromptObject.worldBase.mainCharacters).toContain('Name: Hero One');
      expect(systemPrompt).toMatch(/severely violates/i);
      expect(systemPrompt).toMatch(/internal impulse|inner thought|self-directed complaint/i);
      expect(systemPrompt).toMatch(/must not execute|cannot become.*real action/i);
      expect(systemPrompt.indexOf('severely violates')).toBeLessThan(
        systemPrompt.indexOf('[World Base]'),
      );
      expect(systemPrompt).toContain(sampleStructuredWorldBase.hero.name);
      expect(systemPrompt).toContain(samplePromptObject.worldBase.npcCharacters);
      expect(systemPrompt).toContain(samplePromptObject.worldBase.locationPatch);
      expect(systemPrompt).toContain(samplePromptObject.narrative.mainAxis);
      expect(systemPrompt).toContain(samplePromptObject.narrative.endLine);
      expect(systemPrompt).toContain(samplePromptObject.narrative.phaseGoal);
      expect(systemPrompt).toContain(samplePromptObject.narrative.alpha);
      expect(systemPrompt).toContain(samplePromptObject.narrative.beta);
      expect(systemPrompt).toMatch(/multiple readable paragraphs|natural paragraph breaks/i);
      expect(systemPrompt).toMatch(/hard failure|unacceptable/i);
      expect(systemPrompt).toMatch(/prefer more paragraph breaks|shorter paragraphs/i);
    });

    it('preserves history order and appends director note as the final user message', () => {
      const request = mapForGenerate(samplePromptObject, 'openai-compatible');
      const finalMessage = request.messages.at(-1)?.content ?? '';

      expect(request.messages.slice(0, samplePromptObject.history.length)).toEqual(
        samplePromptObject.history,
      );
      expect(request.messages.at(-1)?.role).toBe('user');
      expect(finalMessage).toContain(`Active router: ${samplePromptObject.directorNote.router}`);
      expect(finalMessage).toContain(
        `Active verb lexicon: ${samplePromptObject.directorNote.verbLexicon.join(', ')}`,
      );
      expect(finalMessage).toContain(
        'Option route discipline: keep all 4 options inside the active router',
      );
      expect(finalMessage).toContain(`Volume: ${samplePromptObject.directorNote.volume}`);
      expect(finalMessage).toContain(samplePromptObject.directorNote.beatConstraints);
      expect(finalMessage).toContain(samplePromptObject.directorNote.optionConstraints);
      expect(finalMessage).toContain('[Director Note - Highest Priority]');
    });

    it('includes generationControl data on the rewrite path', () => {
      const request = mapForGenerate(sampleRewritePromptObject, 'anthropic');
      const finalMessage = request.messages.at(-1)?.content ?? '';

      expect(finalMessage).toContain('Audit Corrections - Immediate Repair Targets');
      expect(finalMessage).toContain(
        String(sampleRewritePromptObject.generationControl?.retryCount),
      );
      expect(finalMessage).toContain(
        sampleRewritePromptObject.generationControl?.rewriteFeedback ?? '',
      );
      expect(finalMessage).toContain(
        sampleRewritePromptObject.generationControl?.previousDraft?.beatText ?? '',
      );
      expect(finalMessage).toContain(
        sampleRewritePromptObject.generationControl?.previousDraft?.options[0] ?? '',
      );
    });

    it('uses the generate default temperature and token limit', () => {
      const request = mapForGenerate(samplePromptObject, 'anthropic');

      expect(request.temperature).toBe(DEFAULT_MODE_CONFIGS.generate.temperature);
      expect(request.maxOutputTokens).toBe(DEFAULT_MODE_CONFIGS.generate.maxOutputTokens);
    });

    it('attaches a structured response schema for the generate result', () => {
      const request = mapForGenerate(samplePromptObject, 'openai-compatible');

      expect(request.responseFormat).toMatchObject({
        type: 'json_schema',
        name: 'logos_generate_result',
      });
    });
  });

  describe('audit', () => {
    it('maps AuditPacket into an audit prompt with generated beat, options, and questions', () => {
      const request = mapForAudit(sampleAuditPacket, 'openai-compatible');
      const userMessage = request.messages[0]?.content ?? '';

      expect(request.system).toContain('answers');
      expect(userMessage).toContain(sampleAuditPacket.generatedContent.beatText);
      expect(userMessage).toContain(sampleAuditPacket.generatedContent.options[0]);
      expect(userMessage).toContain(sampleAuditPacket.auditQuestions[0]);
      expect(userMessage).not.toContain('[Preceding Beats]');
    });

    it('uses the audit default temperature and token limit', () => {
      const request = mapForAudit(sampleAuditPacket, 'anthropic');

      expect(request.temperature).toBe(DEFAULT_MODE_CONFIGS.audit.temperature);
      expect(request.maxOutputTokens).toBe(DEFAULT_MODE_CONFIGS.audit.maxOutputTokens);
    });

    it('attaches a structured response schema for audit answers', () => {
      const request = mapForAudit(sampleAuditPacket, 'openai-compatible');

      expect(request.responseFormat).toMatchObject({
        type: 'json_schema',
        name: 'logos_audit_result',
      });
    });

    it('keeps the audit payload intact without rendering any preceding-beat section', () => {
      const request = mapForAudit(sampleAuditPacket, 'openai-compatible');

      expect(request.messages[0]?.content).not.toContain('No preceding beats.');
      expect(request.messages[0]?.content).toContain(sampleAuditPacket.generatedContent.beatText);
    });
  });

  describe('settlement', () => {
    it('maps PhaseConsequenceRequest into a chronological settlement prompt', () => {
      const request = mapForSettlement(sampleSettlementRequest, 'openai-compatible');
      const userMessage = request.messages[0]?.content ?? '';

      expect(request.system).toContain('phaseConsequences');
      expect(userMessage).toContain(sampleSettlementRequest.context.mainAxis);
      expect(userMessage).toContain(sampleSettlementRequest.context.endLine);
      expect(userMessage).toContain(sampleSettlementRequest.context.phaseGoal);
      expect(
        userMessage.indexOf(sampleSettlementRequest.phaseTranscript[0]?.content ?? ''),
      ).toBeLessThan(
        userMessage.indexOf(sampleSettlementRequest.phaseTranscript[1]?.content ?? ''),
      );
    });

    it('uses the settlement default temperature and token limit', () => {
      const request = mapForSettlement(sampleSettlementRequest, 'anthropic');

      expect(request.temperature).toBe(DEFAULT_MODE_CONFIGS.settlement.temperature);
      expect(request.maxOutputTokens).toBe(DEFAULT_MODE_CONFIGS.settlement.maxOutputTokens);
    });

    it('attaches a structured response schema for settlement outputs', () => {
      const request = mapForSettlement(sampleSettlementRequest, 'openai-compatible');

      expect(request.responseFormat).toMatchObject({
        type: 'json_schema',
        name: 'logos_phase_consequence_result',
      });
    });
  });

  describe('collapse', () => {
    it('maps CollapseRequest into a boundary re-inference prompt', () => {
      const request = mapForCollapse(sampleCollapseRequest, 'openai-compatible');
      const userMessage = request.messages[0]?.content ?? '';

      expect(request.system).toContain('alpha');
      expect(request.system).toContain('beta');
      expect(userMessage).toContain(sampleCollapseRequest.context.mainAxis);
      expect(userMessage).toContain(sampleCollapseRequest.context.endLine);
      expect(userMessage).toContain(sampleCollapseRequest.context.currentAlpha);
      expect(userMessage).toContain(sampleCollapseRequest.context.currentBeta);
      expect(userMessage).toContain(sampleCollapseRequest.phaseConsequences[0]);
    });

    it('supports the initial-collapse path without prior boundaries or consequences', () => {
      const request = mapForCollapse(sampleInitialCollapseRequest, 'anthropic');
      const userMessage = request.messages[0]?.content ?? '';

      expect(userMessage).toContain(sampleInitialCollapseRequest.context.mainAxis);
      expect(userMessage).toContain(sampleInitialCollapseRequest.context.endLine);
      expect(userMessage).not.toContain('current-alpha');
    });

    it('uses the collapse default temperature and token limit', () => {
      const request = mapForCollapse(sampleCollapseRequest, 'anthropic');

      expect(request.temperature).toBe(DEFAULT_MODE_CONFIGS.collapse.temperature);
      expect(request.maxOutputTokens).toBe(DEFAULT_MODE_CONFIGS.collapse.maxOutputTokens);
    });

    it('attaches a structured response schema for collapse outputs', () => {
      const request = mapForCollapse(sampleCollapseRequest, 'openai-compatible');

      expect(request.responseFormat).toMatchObject({
        type: 'json_schema',
        name: 'logos_collapse_result',
      });
    });
  });

  describe('gossipelog', () => {
    it('maps the relationship-update skill request to a strict JSON schema response', () => {
      const request = mapForGossipelogUpdate(sampleGossipelogUpdateRequest, 'openai-compatible');

      expect(request.responseFormat).toMatchObject({
        type: 'json_schema',
        name: 'logos_gossipelog_update_result',
      });
    });

    it('uses the gossipelog update default temperature and token limit', () => {
      const request = mapForGossipelogUpdate(sampleGossipelogUpdateRequest, 'openai-compatible');

      expect(request.temperature).toBe(DEFAULT_MODE_CONFIGS.gossipelogUpdate.temperature);
      expect(request.maxOutputTokens).toBe(DEFAULT_MODE_CONFIGS.gossipelogUpdate.maxOutputTokens);
    });

    it('honors gossipelog update override config values', () => {
      const request = mapForGossipelogUpdate(sampleGossipelogUpdateRequest, 'openai-compatible', {
        temperature: 0.77,
        maxOutputTokens: 1234,
      });

      expect(request.temperature).toBe(0.77);
      expect(request.maxOutputTokens).toBe(1234);
    });

    it('maps the relationship-injection skill request to a strict JSON schema response', () => {
      const request = mapForGossipelogInjection(
        sampleGossipelogInjectionRequest,
        'openai-compatible',
      );

      expect(request.responseFormat).toMatchObject({
        type: 'json_schema',
        name: 'logos_gossipelog_injection_result',
      });
    });

    it('uses the gossipelog injection default temperature and token limit', () => {
      const request = mapForGossipelogInjection(
        sampleGossipelogInjectionRequest,
        'openai-compatible',
      );

      expect(request.temperature).toBe(DEFAULT_MODE_CONFIGS.gossipelogInjection.temperature);
      expect(request.maxOutputTokens).toBe(
        DEFAULT_MODE_CONFIGS.gossipelogInjection.maxOutputTokens,
      );
    });

    it('honors gossipelog injection override config values', () => {
      const request = mapForGossipelogInjection(
        sampleGossipelogInjectionRequest,
        'openai-compatible',
        {
          temperature: 0.45,
          maxOutputTokens: 2222,
        },
      );

      expect(request.temperature).toBe(0.45);
      expect(request.maxOutputTokens).toBe(2222);
    });
  });

  describe('weaver import', () => {
    it('projects the provider response schema onto the shared inner contract', () => {
      const request = mapForWeaverImport(sampleWeaverImportRequest, 'openai-compatible');
      const responseSchema = request.responseFormat?.schema;

      expect(responseSchema?.properties.worldBase).toMatchObject({
        type: 'object',
        additionalProperties: false,
      });
      expect(responseSchema?.properties.sourceSummary.minLength).toBe(1);
      expect(responseSchema?.properties.importSummary.minLength).toBe(1);
      expect(responseSchema?.properties.openingHook.minLength).toBe(1);
      expect(responseSchema?.properties.hero.required).toContain('displayName');
      expect(responseSchema?.properties.hero.additionalProperties).toBe(false);
      expect(responseSchema?.properties.hero.properties.displayName.minLength).toBe(1);
      expect(responseSchema?.properties.coreCast.items.properties.displayName.type).toBe('string');
      expect(responseSchema?.properties.coreCast.items.additionalProperties).toBe(false);
      expect(responseSchema?.properties.coreCast.items.properties.displayName.minLength).toBe(1);
      expect(responseSchema?.properties.antagonists.items.required).toContain('displayName');
      expect(responseSchema?.properties.antagonists.items.additionalProperties).toBe(false);
      expect(responseSchema?.properties.npcCharacters.items.required).toContain('displayName');
      expect(responseSchema?.properties.npcCharacters.items.additionalProperties).toBe(false);
      expect(responseSchema?.properties.locations.items.required).toContain('displayName');
      expect(responseSchema?.properties.locations.items.additionalProperties).toBe(false);
      expect(responseSchema?.properties.worldBase.properties.settingSummary.minLength).toBe(1);
      expect(responseSchema?.properties.worldBase.properties.worldRules.minLength).toBe(1);
      expect(responseSchema?.properties.worldBase.properties.toneBaseline.minLength).toBe(1);
      expect(responseSchema?.properties.worldBase.properties.locationPatch.minLength).toBe(1);
      expect(responseSchema?.properties.worldBase.properties.npcCharactersSummary.minLength).toBe(1);
    });
  });
});
