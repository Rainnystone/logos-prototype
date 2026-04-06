import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import type {
  StorylineRepositoryFile,
  StorylineRecord,
} from '@/types/storyline-repository';
import type {
  RuntimeSessionsFile,
  RuntimeSession,
  RuntimeCheckpoint,
} from '@/types/runtime-sessions';
import type {
  StateSnapshot,
  RelationshipLayer,
} from '@/types';
import type {
  MockKernel,
} from '@simulation/mock-kernel';
import {
  createMockKernel,
} from '@simulation/mock-kernel';
import {
  SubstrateMock,
  createSubstrateMock,
} from '@simulation/substrate-mock';
import {
  StorylineObserver,
  StorylineObservation,
  CheckpointRailObservation,
  SessionObservation,
  createStorylineObserver,
} from '@simulation/storyline-observer';
import {
  createMockFixtureBuilder,
} from '@simulation/mock-fixture-builder';

/**
 * Tests for StorylineObserver - bounded storyline state observation.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 7.2
 *
 * Key requirement: StorylineObserver provides bounded observation without raw repository leakage.
 * Observers should return derived view data, not raw repository objects.
 */

// Helper to create a default state snapshot
function createDefaultStateSnapshot(ordinal: number): StateSnapshot {
  return {
    sceneState: {
      sceneId: 'scene_test',
      currentPhaseIndex: 1,
      currentBeatIndexInPhase: ordinal,
      mainAxis: 'test-axis',
      endLine: 'test-end',
      alpha: 'test-alpha',
      beta: 'test-beta',
    },
    roundState: {
      phaseGoal: 'test-goal',
      currentVolume: 'Med',
      currentRouter: 'test-router',
      verbLexicon: ['observe'],
      historyWindow: [],
    },
    generationState: {
      directorNoteSummary: 'test summary',
      promptObject: {},
      currentBeatText: `beat_${ordinal}`,
      currentOptions: [],
    },
    evaluationState: {
      auditAnswers: [],
      blockingFailures: [],
      retryCount: 0,
      rewriteFeedback: null,
    },
  };
}

// Helper to create a default relationship layer
function createDefaultRelationshipLayer(): RelationshipLayer {
  return {
    highlightedDeltasText: '',
    stableBackgroundText: '',
  };
}

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
    stateSnapshot: createDefaultStateSnapshot(ordinal),
    lastStableRelationshipLayer: createDefaultRelationshipLayer(),
    createdAt: new Date().toISOString(),
  };
}

describe('StorylineObserver', () => {
  let kernel: MockKernel;
  let substrate: SubstrateMock;
  let observer: StorylineObserver;

  beforeEach(async () => {
    kernel = createMockKernel('test-package');
    substrate = createSubstrateMock(kernel);
    observer = createStorylineObserver(kernel);

    // Bootstrap with default storyline
    await substrate.resolveActiveStorylineContext({
      packageName: 'test-package',
      forWrite: true,
    });
  });

  afterEach(async () => {
    await kernel.cleanup();
  });

  // ============================================================================
  // observeActiveStoryline
  // ============================================================================

  describe('observeActiveStoryline', () => {
    it('returns bounded observation for active storyline', async () => {
      const observation = await observer.observeActiveStoryline();

      expect(observation.storylineId).toBe('storyline_main');
      expect(observation.name).toBe('Main Line');
      expect(observation.status).toBe('active');
      expect(observation.variantId).toBe('variant_main');
    });

    it('returns headCheckpointId from active storyline', async () => {
      const observation = await observer.observeActiveStoryline();
      // Initially null after bootstrap
      expect(observation.headCheckpointId).toBeNull();
    });

    it('returns activeSessionId from active storyline', async () => {
      const observation = await observer.observeActiveStoryline();
      expect(observation.activeSessionId).not.toBeNull();
    });

    it('throws if repository is null', async () => {
      kernel.reset();

      await expect(observer.observeActiveStoryline()).rejects.toThrow();
    });

    it('does NOT expose raw repository object', async () => {
      const observation = await observer.observeActiveStoryline();

      // Observation should be a derived view, not the raw repository
      expect(observation).not.toHaveProperty('repository');
      expect(observation).not.toHaveProperty('sourceCheckpointId');
      // Should not have createdAt/updatedAt (internal fields)
      expect(observation).not.toHaveProperty('createdAt');
      expect(observation).not.toHaveProperty('updatedAt');
    });
  });

  // ============================================================================
  // observeStorylineById
  // ============================================================================

  describe('observeStorylineById', () => {
    beforeEach(async () => {
      // Add a second storyline
      const builder = createMockFixtureBuilder(kernel);
      await builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);
    });

    it('returns bounded observation for specific storyline', async () => {
      const observation = await observer.observeStorylineById('storyline_alt');

      expect(observation.storylineId).toBe('storyline_alt');
      expect(observation.name).toBe('Alternate Line');
    });

    it('throws if storyline does not exist', async () => {
      await expect(observer.observeStorylineById('nonexistent')).rejects.toThrow();
    });

    it('does NOT expose raw repository object', async () => {
      const observation = await observer.observeStorylineById('storyline_alt');

      expect(observation).not.toHaveProperty('repository');
      expect(observation).not.toHaveProperty('createdAt');
      expect(observation).not.toHaveProperty('updatedAt');
    });
  });

  // ============================================================================
  // observeAllStorylines
  // ============================================================================

  describe('observeAllStorylines', () => {
    beforeEach(async () => {
      const builder = createMockFixtureBuilder(kernel);
      await builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
        { storylineId: 'storyline_archived', name: 'Archived Line', status: 'archived' },
      ]);
    });

    it('returns bounded observations for all storylines', async () => {
      const observations = await observer.observeAllStorylines();

      expect(observations.length).toBe(3);
      expect(observations.map((o) => o.storylineId)).toContain('storyline_main');
      expect(observations.map((o) => o.storylineId)).toContain('storyline_alt');
      expect(observations.map((o) => o.storylineId)).toContain('storyline_archived');
    });

    it('returns active storyline indicator', async () => {
      const observations = await observer.observeAllStorylines();

      const main = observations.find((o) => o.storylineId === 'storyline_main');
      expect(main!.isActive).toBe(true);

      const alt = observations.find((o) => o.storylineId === 'storyline_alt');
      expect(alt!.isActive).toBe(false);
    });

    it('does NOT expose raw repository object', async () => {
      const observations = await observer.observeAllStorylines();

      for (const obs of observations) {
        expect(obs).not.toHaveProperty('repository');
        expect(obs).not.toHaveProperty('createdAt');
        expect(obs).not.toHaveProperty('updatedAt');
      }
    });
  });

  // ============================================================================
  // observeCheckpointRail
  // ============================================================================

  describe('observeCheckpointRail', () => {
    beforeEach(async () => {
      // Add checkpoints to the session
      const state = kernel.getState();
      const sessionId = state.storylineRepository!.storylinesById['storyline_main']!.activeSessionId;

      const checkpoints: RuntimeCheckpoint[] = [
        createMinimalCheckpoint('checkpoint_1', 1),
        createMinimalCheckpoint('checkpoint_2', 2),
        createMinimalCheckpoint('checkpoint_3', 3),
      ];

      const session = state.runtimeSessions.sessionsById[sessionId]!;

      kernel._testSetState({
        ...state,
        runtimeSessions: {
          ...state.runtimeSessions,
          sessionsById: {
            ...state.runtimeSessions.sessionsById,
            [sessionId]: {
              ...session,
              orderedCheckpointIds: ['checkpoint_1', 'checkpoint_2', 'checkpoint_3'],
              checkpointsById: {
                checkpoint_1: checkpoints[0]!,
                checkpoint_2: checkpoints[1]!,
                checkpoint_3: checkpoints[2]!,
              },
              headCheckpointId: 'checkpoint_3',
              activeCheckpointId: 'checkpoint_3',
            },
          },
        },
        storylineRepository: {
          ...state.storylineRepository!,
          storylinesById: {
            ...state.storylineRepository!.storylinesById,
            storyline_main: {
              ...state.storylineRepository!.storylinesById['storyline_main']!,
              headCheckpointId: 'checkpoint_3',
            },
          },
        },
      });
    });

    it('returns bounded checkpoint rail observation', async () => {
      const rail = await observer.observeCheckpointRail('storyline_main');

      expect(rail.checkpointIds.length).toBe(3);
      expect(rail.checkpointIds).toEqual(['checkpoint_1', 'checkpoint_2', 'checkpoint_3']);
    });

    it('returns head checkpoint indicator', async () => {
      const rail = await observer.observeCheckpointRail('storyline_main');

      expect(rail.headCheckpointId).toBe('checkpoint_3');
    });

    it('returns beat ordinals for each checkpoint', async () => {
      const rail = await observer.observeCheckpointRail('storyline_main');

      expect(rail.beatOrdinals).toEqual([1, 2, 3]);
    });

    it('returns empty rail for storyline with no checkpoints', async () => {
      // Create a new storyline with no checkpoints
      const builder = createMockFixtureBuilder(kernel);
      await builder.withStoryline({
        storylineId: 'storyline_empty',
        name: 'Empty Line',
      });

      const rail = await observer.observeCheckpointRail('storyline_empty');

      expect(rail.checkpointIds.length).toBe(0);
      expect(rail.headCheckpointId).toBeNull();
    });

    it('does NOT expose raw checkpoint objects', async () => {
      const rail = await observer.observeCheckpointRail('storyline_main');

      // Should not expose full checkpoint data
      expect(rail).not.toHaveProperty('checkpointsById');
      expect(rail).not.toHaveProperty('checkpoints');
      // Should not expose stateSnapshot
      expect(rail).not.toHaveProperty('stateSnapshots');
    });

    it('throws if storyline does not exist', async () => {
      await expect(observer.observeCheckpointRail('nonexistent')).rejects.toThrow();
    });
  });

  // ============================================================================
  // observeSession
  // ============================================================================

  describe('observeSession', () => {
    beforeEach(async () => {
      // Add checkpoints
      const state = kernel.getState();
      const sessionId = state.storylineRepository!.storylinesById['storyline_main']!.activeSessionId;

      const checkpoints: RuntimeCheckpoint[] = [
        createMinimalCheckpoint('checkpoint_1', 1),
        createMinimalCheckpoint('checkpoint_2', 2),
      ];

      const session = state.runtimeSessions.sessionsById[sessionId]!;

      kernel._testSetState({
        ...state,
        runtimeSessions: {
          ...state.runtimeSessions,
          sessionsById: {
            ...state.runtimeSessions.sessionsById,
            [sessionId]: {
              ...session,
              orderedCheckpointIds: ['checkpoint_1', 'checkpoint_2'],
              checkpointsById: {
                checkpoint_1: checkpoints[0]!,
                checkpoint_2: checkpoints[1]!,
              },
              headCheckpointId: 'checkpoint_2',
              activeCheckpointId: 'checkpoint_2',
              lifecycle: 'in_progress',
            },
          },
        },
      });
    });

    it('returns bounded session observation for storyline', async () => {
      const observation = await observer.observeSession('storyline_main');

      expect(observation.sessionId).not.toBeNull();
      expect(observation.lifecycle).toBe('in_progress');
      expect(observation.checkpointCount).toBe(2);
    });

    it('returns session lifecycle', async () => {
      const observation = await observer.observeSession('storyline_main');

      expect(observation.lifecycle).toBe('in_progress');
    });

    it('returns checkpoint count', async () => {
      const observation = await observer.observeSession('storyline_main');

      expect(observation.checkpointCount).toBe(2);
    });

    it('returns headCheckpointId', async () => {
      const observation = await observer.observeSession('storyline_main');

      expect(observation.headCheckpointId).toBe('checkpoint_2');
    });

    it('returns activeCheckpointId', async () => {
      const observation = await observer.observeSession('storyline_main');

      expect(observation.activeCheckpointId).toBe('checkpoint_2');
    });

    it('throws if storyline does not exist', async () => {
      await expect(observer.observeSession('nonexistent')).rejects.toThrow();
    });

    it('throws if storyline has no active session', async () => {
      // Create storyline without session
      const state = kernel.getState();
      const timestamp = new Date().toISOString();

      kernel._testSetState({
        ...state,
        storylineRepository: {
          ...state.storylineRepository!,
          storylinesById: {
            ...state.storylineRepository!.storylinesById,
            storyline_no_session: {
              storylineId: 'storyline_no_session',
              name: 'No Session',
              status: 'active',
              sourceCheckpointId: null,
              headCheckpointId: null,
              variantId: 'variant_main',
              activeSessionId: '', // Empty/invalid
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          },
        },
      });

      await expect(observer.observeSession('storyline_no_session')).rejects.toThrow();
    });

    it('does NOT expose raw session object', async () => {
      const observation = await observer.observeSession('storyline_main');

      expect(observation).not.toHaveProperty('session');
      expect(observation).not.toHaveProperty('checkpointsById');
      expect(observation).not.toHaveProperty('orderedCheckpointIds');
      expect(observation).not.toHaveProperty('createdAt');
      expect(observation).not.toHaveProperty('updatedAt');
    });
  });

  // ============================================================================
  // verifyStateAssertion
  // ============================================================================

  describe('verifyStateAssertion', () => {
    beforeEach(async () => {
      const builder = createMockFixtureBuilder(kernel);
      await builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);
    });

    it('verifies storyline_count assertion', async () => {
      const result = observer.verifyStateAssertion({
        kind: 'storyline_count',
        expected: 2,
      });

      expect(result).toBe(true);
    });

    it('verifies active_storyline assertion', async () => {
      const result = observer.verifyStateAssertion({
        kind: 'active_storyline',
        expected: 'storyline_main',
      });

      expect(result).toBe(true);
    });

    it('verifies variant_exists assertion', async () => {
      const result = observer.verifyStateAssertion({
        kind: 'variant_exists',
        expected: 'variant_main',
      });

      expect(result).toBe(true);
    });

    it('verifies session_bound assertion', async () => {
      const observation = await observer.observeActiveStoryline();
      const result = observer.verifyStateAssertion({
        kind: 'session_bound',
        expected: { storylineId: 'storyline_main', sessionId: observation.activeSessionId },
      });

      expect(result).toBe(true);
    });

    it('returns false for failed assertion', async () => {
      const result = observer.verifyStateAssertion({
        kind: 'storyline_count',
        expected: 10, // Wrong count
      });

      expect(result).toBe(false);
    });

    // Note: Unknown assertion kinds are prevented by TypeScript's type system
  });

  // ============================================================================
  // Boundary Tests - No Raw Repository Leakage
  // ============================================================================

  describe('boundary: no raw repository leakage', () => {
    it('all observation methods return bounded data only', async () => {
      const builder = createMockFixtureBuilder(kernel);
      await builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);

      // Get all possible observations
      const active = await observer.observeActiveStoryline();
      const all = await observer.observeAllStorylines();
      const rail = await observer.observeCheckpointRail('storyline_main');
      const session = await observer.observeSession('storyline_main');

      // Check that none expose raw repository
      const rawFields = ['repository', 'createdAt', 'updatedAt', 'checkpointsById', 'sessionsById'];

      for (const obs of [active, ...all, rail, session]) {
        for (const field of rawFields) {
          expect(obs).not.toHaveProperty(field);
        }
      }
    });
  });
});