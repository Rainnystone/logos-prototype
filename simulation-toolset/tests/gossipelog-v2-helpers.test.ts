import { describe, expect, it } from 'vitest';
import {
  createNoOpUpdateResult,
  createAppliedUpdateResult,
  createMemoryUpdate,
  createEmptyV2RelationshipFile,
  createV2Edge,
  stripStorylineSubstrate,
} from '@simulation/gossipelog-v2-helpers';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

describe('gossipelog-v2-helpers', () => {
  describe('createNoOpUpdateResult', () => {
    it('returns a valid v2 no-op result', () => {
      const result = createNoOpUpdateResult();
      expect(result.invocationNoOp).toBe(true);
      expect(result.memoryUpdates).toEqual([]);
      expect(result.involvedRoleIds).toEqual([]);
    });

    it('accepts overrides', () => {
      const result = createNoOpUpdateResult({ involvedRoleIds: ['char_001'] });
      expect(result.involvedRoleIds).toEqual(['char_001']);
    });
  });

  describe('createAppliedUpdateResult', () => {
    it('returns a valid v2 applied result with memory updates', () => {
      const mu = createMemoryUpdate({
        sourceRoleId: 'char_001',
        targetRoleId: 'char_002',
        phaseId: 'phase-01',
        beatIndex: 0,
        roundId: 'round-001',
      });
      const result = createAppliedUpdateResult([mu]);
      expect(result.invocationNoOp).toBe(false);
      expect(result.memoryUpdates).toHaveLength(1);
      expect(result.memoryUpdates[0].sourceRoleId).toBe('char_001');
      expect(result.memoryUpdates[0].shouldCreateEdge).toBe(false);
      expect(result.memoryUpdates[0].nextCurrentRelation.phaseId).toBe('phase-01');
      expect(result.memoryUpdates[0].nextCurrentRelation.beatIndex).toBe(0);
      expect(result.memoryUpdates[0].nextCurrentRelation.roundId).toBe('round-001');
    });
  });

  describe('createMemoryUpdate', () => {
    it('creates a memory update with sensible defaults', () => {
      const mu = createMemoryUpdate({
        sourceRoleId: 'a',
        targetRoleId: 'b',
        phaseId: 'p1',
        beatIndex: 1,
        roundId: 'r1',
      });
      expect(mu.sourceRoleId).toBe('a');
      expect(mu.targetRoleId).toBe('b');
      expect(mu.shouldCreateEdge).toBe(false);
      expect(mu.nextCurrentRelation.functionalRole).toBeDefined();
      expect(mu.nextCurrentRelation.mindsetTags).toBeDefined();
      expect(mu.nextCurrentRelation.summary).toBeDefined();
      expect(mu.nextCurrentRelation.triggerEvent).toBeDefined();
      expect(mu.nextCurrentRelation.reasoning).toBeDefined();
      expect(mu.nextCurrentRelation.causalAction).toBeDefined();
    });

    it('allows overriding entry fields', () => {
      const mu = createMemoryUpdate({
        sourceRoleId: 'a',
        targetRoleId: 'b',
        phaseId: 'p1',
        beatIndex: 0,
        roundId: 'r1',
        overrides: { functionalRole: '利益盟友', mindsetTags: ['信任', '依赖'] },
      });
      expect(mu.nextCurrentRelation.functionalRole).toBe('利益盟友');
      expect(mu.nextCurrentRelation.mindsetTags).toEqual(['信任', '依赖']);
    });

    it('supports shouldCreateEdge', () => {
      const mu = createMemoryUpdate({
        sourceRoleId: 'a',
        targetRoleId: 'b',
        phaseId: 'p1',
        beatIndex: 0,
        roundId: 'r1',
        shouldCreateEdge: true,
      });
      expect(mu.shouldCreateEdge).toBe(true);
    });
  });

  describe('createEmptyV2RelationshipFile', () => {
    it('returns a v2 file with no edges', () => {
      const file = createEmptyV2RelationshipFile();
      expect(file.meta.schemaVersion).toBe(2);
      expect(file.edges).toEqual({});
    });
  });

  describe('createV2Edge', () => {
    it('creates a v2 edge with one history entry', () => {
      const edge = createV2Edge('char_001', 'char_002', {
        phaseId: 'p1',
        beatIndex: 0,
        roundId: 'r1',
      });
      expect(edge.sourceRoleId).toBe('char_001');
      expect(edge.targetRoleId).toBe('char_002');
      expect(edge.history).toHaveLength(1);
      expect(edge.currentRelation).toEqual(edge.history[0]);
    });
  });

  describe('stripStorylineSubstrate', () => {
    it('removes storyline-repository.json and variants/ from package', async () => {
      const tmpDir = path.join(process.cwd(), 'src/story-packages', `.tmp-test-strip-${Date.now()}`);
      await mkdir(tmpDir, { recursive: true });
      await writeFile(path.join(tmpDir, 'storyline-repository.json'), '{}');
      await mkdir(path.join(tmpDir, 'variants', 'variant_main'), { recursive: true });

      await stripStorylineSubstrate(tmpDir);

      const fs = await import('node:fs/promises');
      await expect(fs.access(path.join(tmpDir, 'storyline-repository.json'))).rejects.toThrow();
      await expect(fs.access(path.join(tmpDir, 'variants'))).rejects.toThrow();
      await rm(tmpDir, { recursive: true, force: true });
    });
  });
});
