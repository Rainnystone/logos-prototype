import { describe, expect, it } from 'vitest';

import {
  listBuiltInScenarioManifestEntries,
  getScenarioManifestEntry,
  listBuiltInStorylineFlowManifestEntries,
  getStorylineFlowManifestEntry,
  type StorylineFlowId,
} from '@simulation/scenario-manifest';

/**
 * Tests for scenario-manifest with storyline flow labels.
 *
 * Task 5: scenario-manifest should expose the new storyline flow labels.
 */

describe('scenario-manifest', () => {
  describe('built-in scenarios', () => {
    it('lists all built-in scenario entries', () => {
      const entries = listBuiltInScenarioManifestEntries();

      expect(entries.length).toBeGreaterThan(0);
      expect(entries.find((e) => e.scenarioId === 'happy-path')).toBeDefined();
    });

    it('gets specific scenario entry by ID', () => {
      const entry = getScenarioManifestEntry('happy-path');

      expect(entry).toBeDefined();
      expect(entry?.title).toBe('Happy Path');
      expect(entry?.tags).toContain('authoring');
    });

    it('returns undefined for unknown scenario ID', () => {
      const entry = getScenarioManifestEntry('nonexistent-scenario');

      expect(entry).toBeUndefined();
    });
  });

  describe('storyline flow labels', () => {
    it('lists all built-in storyline flow entries', () => {
      const entries = listBuiltInStorylineFlowManifestEntries();

      expect(entries.length).toBe(6);

      // Check all flow IDs are present
      const flowIds = entries.map((e) => e.flowId);
      expect(flowIds).toContain('create_from_source_and_continue');
      expect(flowIds).toContain('branch_from_checkpoint_flow');
      expect(flowIds).toContain('switch_and_continue');
      expect(flowIds).toContain('rename_and_verify');
      expect(flowIds).toContain('legacy_bootstrap_flow');
      expect(flowIds).toContain('full_storyline_runtime_flow');
    });

    it('gets specific storyline flow entry by ID', () => {
      const entry = getStorylineFlowManifestEntry('create_from_source_and_continue');

      expect(entry).toBeDefined();
      expect(entry?.title).toBe('Create from Source and Continue');
      expect(entry?.description).toContain('Create a new storyline');
      expect(entry?.tags).toContain('storyline');
      expect(entry?.tags).toContain('create');
    });

    it('returns undefined for unknown flow ID', () => {
      const entry = getStorylineFlowManifestEntry('unknown_flow' as StorylineFlowId);

      expect(entry).toBeUndefined();
    });

    it('each flow entry has required fields', () => {
      const entries = listBuiltInStorylineFlowManifestEntries();

      for (const entry of entries) {
        expect(entry.flowId).toBeDefined();
        expect(entry.title).toBeDefined();
        expect(entry.description).toBeDefined();
        expect(entry.tags).toBeDefined();
        expect(entry.tags.length).toBeGreaterThan(0);
      }
    });

    it('flow IDs match SerializedE2EFlowId schema values', () => {
      const expectedFlowIds: StorylineFlowId[] = [
        'create_from_source_and_continue',
        'branch_from_checkpoint_flow',
        'switch_and_continue',
        'rename_and_verify',
        'legacy_bootstrap_flow',
        'full_storyline_runtime_flow',
      ];

      const entries = listBuiltInStorylineFlowManifestEntries();
      const actualFlowIds = entries.map((e) => e.flowId);

      expect(actualFlowIds.sort()).toEqual(expectedFlowIds.sort());
    });
  });
});