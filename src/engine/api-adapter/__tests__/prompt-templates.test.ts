import { describe, expect, it } from 'vitest';

import { buildGenerateSystemPrompt } from '@/engine/api-adapter/prompt-templates';
import { mapForGenerate } from '@/engine/api-adapter/schema-mapper';
import { samplePromptObject } from '@/engine/api-adapter/__tests__/fixtures';

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
  });
});
