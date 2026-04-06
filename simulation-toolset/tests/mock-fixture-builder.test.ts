import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import type {
  StorylineRepositoryFile,
  StorylineRecord,
  StorylineVariant,
} from '@/types/storyline-repository';
import type {
  RuntimeSessionsFile,
  RuntimeSession,
  RuntimeCheckpoint,
} from '@/types/runtime-sessions';
import type {
  MockKernel,
  VariantWorkspaceState,
} from '@simulation/mock-kernel';
import {
  createMockKernel,
} from '@simulation/mock-kernel';
import {
  MockFixtureBuilder,
  createMockFixtureBuilder,
  StorylineConfig,
  VariantWorkspaceConfig,
} from '@simulation/mock-fixture-builder';

/**
 * Tests for MockFixtureBuilder - in-memory fixture construction for Phase 3 storyline state.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 7.2
 *
 * MockFixtureBuilder provides in-memory fixture construction, alternative to TempPackageFixture
 * for pure mock scenarios. No file system operations.
 */

// Helper to create a minimal checkpoint
function createMinimalCheckpoint(checkpointId: string, ordinal: number): RuntimeCheckpoint {
  return {
    checkpointId,
    acceptedBeatOrdinal: ordinal,
    sceneId: 'scene_test',
    phaseIndex: 1,
    beatIndex: ordinal,
    roundId: `round_${ordinal}`,
    acceptedTranscript: {
      playerInput: `input_${ordinal}`,
      beatText: `beat_${ordinal}`,
    },
    stateSnapshot: {
      version: 1,
      beatOrdinal: ordinal,
      sceneId: 'scene_test',
      phaseIndex: 1,
      beatIndex: ordinal,
      globalClock: { currentBeatOrdinal: ordinal, currentPhaseIndex: 1, currentBeatIndex: ordinal },
      characters: {},
      flags: {},
      counters: {},
    },
    lastStableRelationshipLayer: {
      charactersById: {},
      relationships: [],
      version: 1,
    },
    createdAt: new Date().toISOString(),
  };
}

describe('MockFixtureBuilder', () => {
  let kernel: MockKernel;
  let builder: MockFixtureBuilder;

  beforeEach(() => {
    kernel = createMockKernel('test-package');
    builder = createMockFixtureBuilder(kernel);
  });

  afterEach(async () => {
    await kernel.cleanup();
  });

  // ============================================================================
  // Basic Construction
  // ============================================================================

  describe('basic construction', () => {
    it('creates fixture with empty state initially', () => {
      const state = kernel.getState();
      expect(state.storylineRepository).toBeNull();
      expect(state.variantsById).toEqual({});
      expect(state.runtimeSessions.sessionsById).toEqual({});
    });

    it('withRepository creates repository file', async () => {
      await builder.withRepository({
        activeStorylineId: 'storyline_main',
        storylines: [],
        variants: [],
      });

      const state = kernel.getState();
      expect(state.storylineRepository).not.toBeNull();
      expect(state.storylineRepository!.version).toBe(1);
    });

    it('withStoryline adds storyline to repository', async () => {
      await builder.withRepository({
        activeStorylineId: 'storyline_main',
        storylines: [],
        variants: [],
      });

      await builder.withStoryline({
        storylineId: 'storyline_main',
        name: 'Main Line',
        variantId: 'variant_main',
      });

      const state = kernel.getState();
      expect(state.storylineRepository!.storylinesById['storyline_main']).toBeDefined();
      expect(state.storylineRepository!.storylinesById['storyline_main'].name).toBe('Main Line');
    });

    it('withVariantWorkspace adds variant state', async () => {
      await builder.withVariantWorkspace({
        variantId: 'variant_main',
        hasWorldBase: true,
        hasScene: true,
        hasPhasePlans: false,
        hasRouterLexicon: false,
        hasAuditQuestions: false,
        hasControlModules: false,
      });

      const state = kernel.getState();
      expect(state.variantsById['variant_main']).toBeDefined();
      expect(state.variantsById['variant_main'].hasWorldBase).toBe(true);
      expect(state.variantsById['variant_main'].hasScene).toBe(true);
    });

    it('withSession adds session to runtimeSessions', async () => {
      await builder.withSession({
        sessionId: 'session_001',
        lifecycle: 'awaiting_start',
      });

      const state = kernel.getState();
      expect(state.runtimeSessions.sessionsById['session_001']).toBeDefined();
      expect(state.runtimeSessions.sessionsById['session_001'].lifecycle).toBe('awaiting_start');
    });

    it('withCheckpoint adds checkpoint to session', async () => {
      await builder.withSession({
        sessionId: 'session_001',
        lifecycle: 'in_progress',
      });

      await builder.withCheckpoint({
        sessionId: 'session_001',
        checkpointId: 'checkpoint_001',
        acceptedBeatOrdinal: 1,
      });

      const state = kernel.getState();
      const session = state.runtimeSessions.sessionsById['session_001'];

      expect(session.checkpointsById['checkpoint_001']).toBeDefined();
      expect(session.orderedCheckpointIds).toContain('checkpoint_001');
      expect(session.headCheckpointId).toBe('checkpoint_001');
      expect(session.activeCheckpointId).toBe('checkpoint_001');
    });
  });

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  describe('withMultipleStorylines convenience method', () => {
    it('creates multiple storylines with default variants and sessions', async () => {
      await builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);

      const state = kernel.getState();

      // Check storylines
      expect(state.storylineRepository!.storylinesById['storyline_main']).toBeDefined();
      expect(state.storylineRepository!.storylinesById['storyline_alt']).toBeDefined();

      // Check variants created for each
      expect(state.variantsById['variant_main']).toBeDefined();
      expect(state.variantsById['variant_alt']).toBeDefined();

      // Check sessions created for each
      expect(state.runtimeSessions.sessionsById).toBeDefined();
      expect(Object.keys(state.runtimeSessions.sessionsById).length).toBe(2);
    });

    it('sets activeStorylineId to first storyline', async () => {
      await builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);

      const state = kernel.getState();
      expect(state.storylineRepository!.activeStorylineId).toBe('storyline_main');
    });

    it('supports custom status (archived)', async () => {
      await builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_archived', name: 'Archived Line', status: 'archived' },
      ]);

      const state = kernel.getState();
      expect(state.storylineRepository!.storylinesById['storyline_archived'].status).toBe('archived');
    });
  });

  // ============================================================================
  // Variant Workspace Construction
  // ============================================================================

  describe('variant workspace construction', () => {
    it('withVariantWorkspace creates variant with all presence flags', async () => {
      await builder.withVariantWorkspace({
        variantId: 'variant_full',
        hasWorldBase: true,
        hasScene: true,
        hasPhasePlans: true,
        hasRouterLexicon: true,
        hasAuditQuestions: true,
        hasControlModules: true,
      });

      const state = kernel.getState();
      const variant = state.variantsById['variant_full'];

      expect(variant.hasWorldBase).toBe(true);
      expect(variant.hasScene).toBe(true);
      expect(variant.hasPhasePlans).toBe(true);
      expect(variant.hasRouterLexicon).toBe(true);
      expect(variant.hasAuditQuestions).toBe(true);
      expect(variant.hasControlModules).toBe(true);
    });

    it('withVariantWorkspace supports optional content', async () => {
      await builder.withVariantWorkspace({
        variantId: 'variant_with_content',
        hasWorldBase: true,
        hasScene: false,
        hasPhasePlans: false,
        hasRouterLexicon: false,
        hasAuditQuestions: false,
        hasControlModules: false,
        worldBase: { characters: [{ name: 'TestChar' }] },
      });

      const state = kernel.getState();
      const variant = state.variantsById['variant_with_content'];

      expect(variant.worldBase).toBeDefined();
      expect((variant.worldBase as { characters: unknown[] }).characters).toBeDefined();
    });
  });

  // ============================================================================
  // Session Construction
  // ============================================================================

  describe('session construction', () => {
    it('withSession creates session with checkpointsById', async () => {
      await builder.withSession({
        sessionId: 'session_001',
        lifecycle: 'awaiting_start',
      });

      const state = kernel.getState();
      const session = state.runtimeSessions.sessionsById['session_001'];

      expect(session.sessionId).toBe('session_001');
      expect(session.lifecycle).toBe('awaiting_start');
      expect(session.checkpointsById).toEqual({});
      expect(session.orderedCheckpointIds).toEqual([]);
      expect(session.headCheckpointId).toBeNull();
      expect(session.activeCheckpointId).toBeNull();
    });

    it('withSession sets runtimeSessions.activeSessionId', async () => {
      await builder.withSession({
        sessionId: 'session_001',
        lifecycle: 'awaiting_start',
        isActive: true,
      });

      const state = kernel.getState();
      expect(state.runtimeSessions.activeSessionId).toBe('session_001');
    });

    it('withSession supports lifecycle options', async () => {
      await builder.withSession({
        sessionId: 'session_progress',
        lifecycle: 'in_progress',
      });

      await builder.withSession({
        sessionId: 'session_complete',
        lifecycle: 'complete',
      });

      const state = kernel.getState();
      expect(state.runtimeSessions.sessionsById['session_progress'].lifecycle).toBe('in_progress');
      expect(state.runtimeSessions.sessionsById['session_complete'].lifecycle).toBe('complete');
    });
  });

  // ============================================================================
  // Checkpoint Construction
  // ============================================================================

  describe('checkpoint construction', () => {
    beforeEach(async () => {
      await builder.withSession({
        sessionId: 'session_001',
        lifecycle: 'in_progress',
      });
    });

    it('withCheckpoint creates checkpoint in session', async () => {
      await builder.withCheckpoint({
        sessionId: 'session_001',
        checkpointId: 'checkpoint_001',
        acceptedBeatOrdinal: 1,
      });

      const state = kernel.getState();
      const session = state.runtimeSessions.sessionsById['session_001'];

      expect(session.checkpointsById['checkpoint_001']).toBeDefined();
    });

    it('withCheckpoint updates orderedCheckpointIds', async () => {
      await builder.withCheckpoint({
        sessionId: 'session_001',
        checkpointId: 'checkpoint_001',
        acceptedBeatOrdinal: 1,
      });

      await builder.withCheckpoint({
        sessionId: 'session_001',
        checkpointId: 'checkpoint_002',
        acceptedBeatOrdinal: 2,
      });

      const state = kernel.getState();
      const session = state.runtimeSessions.sessionsById['session_001'];

      expect(session.orderedCheckpointIds).toEqual(['checkpoint_001', 'checkpoint_002']);
    });

    it('withCheckpoint updates headCheckpointId', async () => {
      await builder.withCheckpoint({
        sessionId: 'session_001',
        checkpointId: 'checkpoint_001',
        acceptedBeatOrdinal: 1,
      });

      await builder.withCheckpoint({
        sessionId: 'session_001',
        checkpointId: 'checkpoint_002',
        acceptedBeatOrdinal: 2,
      });

      const state = kernel.getState();
      const session = state.runtimeSessions.sessionsById['session_001'];

      expect(session.headCheckpointId).toBe('checkpoint_002');
    });

    it('withCheckpoint updates activeCheckpointId by default', async () => {
      await builder.withCheckpoint({
        sessionId: 'session_001',
        checkpointId: 'checkpoint_001',
        acceptedBeatOrdinal: 1,
      });

      const state = kernel.getState();
      const session = state.runtimeSessions.sessionsById['session_001'];

      expect(session.activeCheckpointId).toBe('checkpoint_001');
    });

    it('withCheckpoint throws if session does not exist', () => {
      expect(() =>
        builder.withCheckpoint({
          sessionId: 'nonexistent_session',
          checkpointId: 'checkpoint_001',
          acceptedBeatOrdinal: 1,
        }),
      ).toThrow();
    });
  });

  // ============================================================================
  // Full Fixture Construction
  // ============================================================================

  describe('full fixture construction', () => {
    it('buildStoryline creates complete storyline fixture', async () => {
      const fixture = await builder.buildStoryline({
        storylineId: 'storyline_main',
        name: 'Main Line',
        withCheckpoints: [1, 2, 3],
      });

      const state = kernel.getState();

      // Check repository
      expect(state.storylineRepository).not.toBeNull();
      expect(state.storylineRepository!.activeStorylineId).toBe('storyline_main');

      // Check storyline
      expect(state.storylineRepository!.storylinesById['storyline_main']).toBeDefined();
      expect(state.storylineRepository!.storylinesById['storyline_main'].name).toBe('Main Line');

      // Check variant
      expect(state.variantsById['variant_main']).toBeDefined();

      // Check session with checkpoints
      const sessionId = state.storylineRepository!.storylinesById['storyline_main'].activeSessionId;
      const session = state.runtimeSessions.sessionsById[sessionId];

      expect(session.orderedCheckpointIds.length).toBe(3);
      expect(session.headCheckpointId).not.toBeNull();
    });

    it('buildStoryline creates storyline without checkpoints', async () => {
      const fixture = await builder.buildStoryline({
        storylineId: 'storyline_empty',
        name: 'Empty Line',
      });

      const state = kernel.getState();

      const sessionId = state.storylineRepository!.storylinesById['storyline_empty'].activeSessionId;
      const session = state.runtimeSessions.sessionsById[sessionId];

      expect(session.orderedCheckpointIds.length).toBe(0);
      expect(session.headCheckpointId).toBeNull();
    });
  });

  // ============================================================================
  // Consistency
  // ============================================================================

  describe('consistency', () => {
    it('storyline references correct variant', async () => {
      await builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line', variantId: 'variant_main' },
        { storylineId: 'storyline_alt', name: 'Alt Line', variantId: 'variant_alt' },
      ]);

      const state = kernel.getState();

      expect(state.storylineRepository!.storylinesById['storyline_main'].variantId).toBe('variant_main');
      expect(state.storylineRepository!.storylinesById['storyline_alt'].variantId).toBe('variant_alt');

      // Variants should exist
      expect(state.variantsById['variant_main']).toBeDefined();
      expect(state.variantsById['variant_alt']).toBeDefined();
    });

    it('storyline references correct session', async () => {
      await builder.withSession({
        sessionId: 'session_main',
        lifecycle: 'awaiting_start',
      });

      await builder.withRepository({
        activeStorylineId: 'storyline_main',
        storylines: [
          {
            storylineId: 'storyline_main',
            name: 'Main Line',
            variantId: 'variant_main',
            activeSessionId: 'session_main',
          },
        ],
        variants: [
          { variantId: 'variant_main' },
        ],
      });

      const state = kernel.getState();

      expect(state.storylineRepository!.storylinesById['storyline_main'].activeSessionId).toBe('session_main');
      expect(state.runtimeSessions.sessionsById['session_main']).toBeDefined();
    });

    it('activeStorylineId must exist in storylinesById', async () => {
      await builder.withRepository({
        activeStorylineId: 'storyline_main',
        storylines: [
          { storylineId: 'storyline_main', name: 'Main', variantId: 'variant_main' },
        ],
        variants: [
          { variantId: 'variant_main' },
        ],
      });

      const state = kernel.getState();
      expect(state.storylineRepository!.storylinesById['storyline_main']).toBeDefined();
    });
  });

  // ============================================================================
  // Cleanup
  // ============================================================================

  describe('cleanup', () => {
    it('cleanup clears all fixture state', async () => {
      await builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
      ]);

      await builder.cleanup();

      const state = kernel.getState();
      expect(state.storylineRepository).toBeNull();
      expect(state.variantsById).toEqual({});
      expect(state.runtimeSessions.sessionsById).toEqual({});
    });

    it('cleanup resets kernel state', async () => {
      await builder.buildStoryline({
        storylineId: 'storyline_main',
        name: 'Main Line',
        withCheckpoints: [1, 2],
      });

      await builder.cleanup();

      kernel.reset();
      const state = kernel.getState();
      expect(state.packageName).toBe('test-package');
      expect(state.storylineRepository).toBeNull();
    });
  });

  // ============================================================================
  // Return Value
  // ============================================================================

  describe('return value', () => {
    it('builder methods return kernel for chaining', async () => {
      const result = await builder
        .withRepository({
          activeStorylineId: 'storyline_main',
          storylines: [],
          variants: [],
        })
        .withStoryline({
          storylineId: 'storyline_main',
          name: 'Main Line',
        });

      // Should return builder for chaining
      expect(result).toBe(builder);
    });

    it('buildStoryline returns fixture summary', async () => {
      const fixture = await builder.buildStoryline({
        storylineId: 'storyline_main',
        name: 'Main Line',
        withCheckpoints: [1, 2],
      });

      expect(fixture.storylineId).toBe('storyline_main');
      expect(fixture.name).toBe('Main Line');
      expect(fixture.variantId).toBe('variant_main');
      expect(fixture.sessionId).not.toBeNull();
      expect(fixture.checkpointCount).toBe(2);
    });
  });
});