/**
 * StorylineObserver - bounded storyline state observation.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 4.4
 *
 * StorylineObserver provides read-only projection helpers for storyline state.
 * Key requirement: bounded observation without raw repository leakage.
 * Observers return derived view data, not raw repository objects.
 */

import type { MockKernel } from './mock-kernel';
import type {
  StorylineRepositoryFile,
  StorylineRecord,
} from '@/types/storyline-repository';
import type {
  RuntimeSession,
  RuntimeCheckpoint,
} from '@/types/runtime-sessions';

// ============================================================================
// Public Types
// ============================================================================

/**
 * Bounded storyline observation.
 * Exposes only derived view data, not raw repository fields.
 */
export interface StorylineObservation {
  readonly storylineId: string;
  readonly name: string;
  readonly status: string;
  readonly variantId: string;
  readonly activeSessionId: string;
  readonly headCheckpointId: string | null;
  readonly isActive: boolean;
}

/**
 * Bounded checkpoint rail observation.
 * Exposes checkpoint IDs and ordinals, not full checkpoint objects.
 */
export interface CheckpointRailObservation {
  readonly storylineId: string;
  readonly checkpointIds: readonly string[];
  readonly beatOrdinals: readonly number[];
  readonly headCheckpointId: string | null;
}

/**
 * Bounded session observation.
 * Exposes session metadata, not full session object.
 */
export interface SessionObservation {
  readonly sessionId: string;
  readonly lifecycle: 'awaiting_start' | 'in_progress' | 'complete';
  readonly checkpointCount: number;
  readonly headCheckpointId: string | null;
  readonly activeCheckpointId: string | null;
}

/**
 * State assertion for verification.
 */
export type StateAssertion =
  | { kind: 'storyline_count'; expected: number }
  | { kind: 'active_storyline'; expected: string }
  | { kind: 'checkpoint_count'; expected: number }
  | { kind: 'variant_exists'; expected: string }
  | { kind: 'session_bound'; expected: { storylineId: string; sessionId: string } };

/**
 * State summary for quick overview.
 */
export interface StateSummary {
  readonly storylineCount: number;
  readonly variantCount: number;
  readonly sessionCount: number;
  readonly activeStorylineId: string | null;
  readonly activeSessionId: string | null;
}

// ============================================================================
// StorylineObserver Interface
// ============================================================================

export interface StorylineObserver {
  /**
   * Get the underlying MockKernel.
   */
  getKernel(): MockKernel;

  /**
   * Observe the active storyline.
   * Returns bounded observation without raw repository leakage.
   */
  observeActiveStoryline(): Promise<StorylineObservation>;

  /**
   * Observe a specific storyline by ID.
   */
  observeStorylineById(storylineId: string): Promise<StorylineObservation>;

  /**
   * Observe all storylines.
   */
  observeAllStorylines(): Promise<readonly StorylineObservation[]>;

  /**
   * Observe the checkpoint rail for a storyline.
   */
  observeCheckpointRail(storylineId: string): Promise<CheckpointRailObservation>;

  /**
   * Observe the session bound to a storyline.
   */
  observeSession(storylineId: string): Promise<SessionObservation>;

  /**
   * Verify a state assertion.
   */
  verifyStateAssertion(assertion: StateAssertion): boolean;

  /**
   * Get a quick state summary.
   */
  getSummary(): StateSummary;
}

// ============================================================================
// Helper Functions
// ============================================================================

function toStorylineObservation(
  storyline: StorylineRecord,
  isActive: boolean,
): StorylineObservation {
  return {
    storylineId: storyline.storylineId,
    name: storyline.name,
    status: storyline.status,
    variantId: storyline.variantId,
    activeSessionId: storyline.activeSessionId,
    headCheckpointId: storyline.headCheckpointId,
    isActive,
  };
}

function getActiveSessionForStoryline(
  storyline: StorylineRecord,
  sessionsById: Record<string, RuntimeSession>,
): RuntimeSession | null {
  return sessionsById[storyline.activeSessionId] ?? null;
}

// ============================================================================
// Implementation
// ============================================================================

export function createStorylineObserver(kernel: MockKernel): StorylineObserver {
  return {
    getKernel(): MockKernel {
      return kernel;
    },

    async observeActiveStoryline(): Promise<StorylineObservation> {
      const state = kernel.getState();

      if (!state.storylineRepository) {
        throw new Error('Cannot observe storyline: repository does not exist.');
      }

      const repository = state.storylineRepository;
      const activeStoryline = repository.storylinesById[repository.activeStorylineId];

      if (!activeStoryline) {
        throw new Error(
          `Storyline structural mismatch: activeStorylineId "${repository.activeStorylineId}" does not resolve.`,
        );
      }

      return toStorylineObservation(activeStoryline, true);
    },

    async observeStorylineById(storylineId: string): Promise<StorylineObservation> {
      const state = kernel.getState();

      if (!state.storylineRepository) {
        throw new Error('Cannot observe storyline: repository does not exist.');
      }

      const storyline = state.storylineRepository.storylinesById[storylineId];
      if (!storyline) {
        throw new Error(`Storyline "${storylineId}" does not exist.`);
      }

      const isActive = state.storylineRepository.activeStorylineId === storylineId;
      return toStorylineObservation(storyline, isActive);
    },

    async observeAllStorylines(): Promise<readonly StorylineObservation[]> {
      const state = kernel.getState();

      if (!state.storylineRepository) {
        throw new Error('Cannot observe storylines: repository does not exist.');
      }

      const repository = state.storylineRepository;
      const activeStorylineId = repository.activeStorylineId;

      return Object.values(repository.storylinesById).map((storyline) =>
        toStorylineObservation(storyline, storyline.storylineId === activeStorylineId),
      );
    },

    async observeCheckpointRail(storylineId: string): Promise<CheckpointRailObservation> {
      const state = kernel.getState();

      if (!state.storylineRepository) {
        throw new Error('Cannot observe checkpoint rail: repository does not exist.');
      }

      const storyline = state.storylineRepository.storylinesById[storylineId];
      if (!storyline) {
        throw new Error(`Storyline "${storylineId}" does not exist.`);
      }

      const session = getActiveSessionForStoryline(storyline, state.runtimeSessions.sessionsById);
      if (!session) {
        return {
          storylineId,
          checkpointIds: [],
          beatOrdinals: [],
          headCheckpointId: null,
        };
      }

      const checkpointIds = session.orderedCheckpointIds;
      const beatOrdinals = checkpointIds.map(
        (id) => session.checkpointsById[id]?.acceptedBeatOrdinal ?? 0,
      );

      return {
        storylineId,
        checkpointIds,
        beatOrdinals,
        headCheckpointId: storyline.headCheckpointId,
      };
    },

    async observeSession(storylineId: string): Promise<SessionObservation> {
      const state = kernel.getState();

      if (!state.storylineRepository) {
        throw new Error('Cannot observe session: repository does not exist.');
      }

      const storyline = state.storylineRepository.storylinesById[storylineId];
      if (!storyline) {
        throw new Error(`Storyline "${storylineId}" does not exist.`);
      }

      const session = getActiveSessionForStoryline(storyline, state.runtimeSessions.sessionsById);
      if (!session) {
        throw new Error(
          `Storyline "${storylineId}" has no valid active session.`,
        );
      }

      return {
        sessionId: session.sessionId,
        lifecycle: session.lifecycle,
        checkpointCount: session.orderedCheckpointIds.length,
        headCheckpointId: session.headCheckpointId,
        activeCheckpointId: session.activeCheckpointId,
      };
    },

    verifyStateAssertion(assertion: StateAssertion): boolean {
      const state = kernel.getState();

      switch (assertion.kind) {
        case 'storyline_count': {
          if (!state.storylineRepository) return assertion.expected === 0;
          return Object.keys(state.storylineRepository.storylinesById).length === assertion.expected;
        }

        case 'active_storyline': {
          if (!state.storylineRepository) return false;
          return state.storylineRepository.activeStorylineId === assertion.expected;
        }

        case 'checkpoint_count': {
          // This expects the storylineId to be encoded somehow
          // For simplicity, we count total checkpoints across all sessions
          let total = 0;
          for (const session of Object.values(state.runtimeSessions.sessionsById)) {
            total += session.orderedCheckpointIds.length;
          }
          return total === assertion.expected;
        }

        case 'variant_exists': {
          return !!state.variantsById[assertion.expected];
        }

        case 'session_bound': {
          if (!state.storylineRepository) return false;
          const storyline = state.storylineRepository.storylinesById[assertion.expected.storylineId];
          if (!storyline) return false;
          return storyline.activeSessionId === assertion.expected.sessionId;
        }

        default: {
          return false;
        }
      }
    },

    getSummary(): StateSummary {
      const state = kernel.getState();

      const storylineCount = state.storylineRepository
        ? Object.keys(state.storylineRepository.storylinesById).length
        : 0;

      const variantCount = Object.keys(state.variantsById).length;
      const sessionCount = Object.keys(state.runtimeSessions.sessionsById).length;

      return {
        storylineCount,
        variantCount,
        sessionCount,
        activeStorylineId: state.storylineRepository?.activeStorylineId ?? null,
        activeSessionId: state.runtimeSessions.activeSessionId,
      };
    },
  };
}