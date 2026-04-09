import { describe, expect, it } from 'vitest';

import {
  buildGenerateSystemPrompt,
  buildWeaverImportUserPrompt,
} from '@/engine/api-adapter/prompt-templates';
import { mapForGenerate } from '@/engine/api-adapter/schema-mapper';
import {
  samplePromptObject,
  sampleWeaverImportRequest,
} from '@/engine/api-adapter/__tests__/fixtures';

describe('prompt templates', () => {
  describe('generate system prompt', () => {
    it('renders the dynamic relationship layer after the world base section', () => {
      const systemPrompt = buildGenerateSystemPrompt(samplePromptObject);
      const worldBaseIndex = systemPrompt.indexOf('[World Base]');
      const relationshipIndex = systemPrompt.indexOf('[Dynamic Relationship Layer]');

      expect(relationshipIndex).toBeGreaterThan(worldBaseIndex);
      expect(systemPrompt).toContain(
        `Highlighted deltas: ${samplePromptObject.relationshipLayer?.highlightedDeltasText ?? 'none'}`,
      );
      expect(systemPrompt).toContain(
        `Stable background: ${samplePromptObject.relationshipLayer?.stableBackgroundText ?? 'none'}`,
      );
    });

    it('keeps history as message entries while the relationship layer stays in the system prompt', () => {
      const request = mapForGenerate(samplePromptObject, 'openai-compatible');
      const systemPrompt = request.system ?? '';
      const messageContent = request.messages.map((entry) => entry.content).join('\n');

      expect(request.messages.slice(0, samplePromptObject.history.length)).toEqual(
        samplePromptObject.history,
      );
      expect(systemPrompt).toContain('[Dynamic Relationship Layer]');
      expect(messageContent).not.toContain('[Dynamic Relationship Layer]');
      expect(messageContent).not.toContain('Highlighted deltas:');
      expect(messageContent).not.toContain('Stable background:');
    });

    it('omits the location section line when no explicit scene locations are present', () => {
      const systemPrompt = buildGenerateSystemPrompt({
        ...samplePromptObject,
        worldBase: {
          ...samplePromptObject.worldBase,
          locationPatch: '',
        },
      });

      expect(systemPrompt).not.toContain('Location patch:');
    });
  });

  describe('weaver import user prompt', () => {
    it('locks the fuller bounded extraction contract instead of sparse fallback guidance', () => {
      const prompt = buildWeaverImportUserPrompt(sampleWeaverImportRequest);

      expect(prompt).toContain('attempt the fullest bounded extraction the text can support');
      expect(prompt).toContain('minimal shapes are fallback floors, not the preferred target');
      expect(prompt).toContain('worldBase is a lightweight seed object');
      expect(prompt).toContain('suggestedPackageName is only a display-name suggestion');
      expect(prompt).toContain(
        'persisted scene openingHook still comes from the original source text',
      );
      expect(prompt).toContain(
        'npcCharacters[]: displayName required; summary and roleSummary optional',
      );
      expect(prompt).not.toContain('Keep uncertainty bounded via warnings and unresolved gaps.');
    });
  });
});
