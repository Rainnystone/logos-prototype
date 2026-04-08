/**
 * MockFixtureBuilder - in-memory fixture construction for Phase 3 storyline state.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 7.2
 *
 * MockFixtureBuilder provides in-memory fixture construction, alternative to TempPackageFixture
 * for pure mock scenarios. No file system operations.
 */

import type { MockKernel, VariantWorkspaceState } from './mock-kernel';
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
import type { RelationshipLayer, StateSnapshot } from '@/types';

// ============================================================================
// Public Types
// ============================================================================

export interface StorylineConfig {
  readonly storylineId: string;
  readonly name: string;
  readonly variantId?: string;
  readonly status?: string;
  readonly sourceCheckpointId?: string | null;
  readonly headCheckpointId?: string | null;
  readonly activeSessionId?: string;
}

export interface VariantWorkspaceConfig {
  readonly variantId: string;
  readonly hasWorldBase?: boolean;
  readonly hasScene?: boolean;
  readonly hasPhasePlans?: boolean;
  readonly hasRouterLexicon?: boolean;
  readonly hasAuditQuestions?: boolean;
  readonly hasControlModules?: boolean;
  // Optional content
  readonly worldBase?: unknown;
  readonly scene?: unknown;
  readonly phasePlans?: unknown;
  readonly routerLexicon?: unknown;
  readonly auditQuestions?: unknown;
  readonly controlModules?: unknown;
}

export interface RepositoryConfig {
  readonly activeStorylineId: string;
  readonly storylines: readonly StorylineConfig[];
  readonly variants: readonly { variantId: string }[];
}

export interface SessionConfig {
  readonly sessionId: string;
  readonly lifecycle?: 'awaiting_start' | 'in_progress' | 'complete';
  readonly isActive?: boolean;
}

export interface CheckpointConfig {
  readonly sessionId: string;
  readonly checkpointId: string;
  readonly acceptedBeatOrdinal: number;
  readonly sceneId?: string;
  readonly phaseIndex?: number;
  readonly beatIndex?: number;
  readonly roundId?: string;
  readonly playerInput?: string;
  readonly beatText?: string;
}

export interface BuildStorylineInput {
  readonly storylineId: string;
  readonly name: string;
  readonly variantId?: string;
  readonly withCheckpoints?: readonly number[];
}

export interface BuildStorylineResult {
  readonly storylineId: string;
  readonly name: string;
  readonly variantId: string;
  readonly sessionId: string;
  readonly checkpointCount: number;
}

// ============================================================================
// MockFixtureBuilder Interface
// ============================================================================

export interface MockFixtureBuilder {
  /**
   * Get the underlying MockKernel.
   */
  getKernel(): MockKernel;

  /**
   * Create or update repository file.
   */
  withRepository(config: RepositoryConfig): MockFixtureBuilder;

  /**
   * Add a storyline to the repository.
   */
  withStoryline(config: StorylineConfig): MockFixtureBuilder;

  /**
   * Add a variant workspace state.
   */
  withVariantWorkspace(config: VariantWorkspaceConfig): MockFixtureBuilder;

  /**
   * Add a session to runtimeSessions.
   */
  withSession(config: SessionConfig): MockFixtureBuilder;

  /**
   * Add a checkpoint to a session.
   */
  withCheckpoint(config: CheckpointConfig): MockFixtureBuilder;

  /**
   * Convenience: Create multiple storylines with default variants and sessions.
   */
  withMultipleStorylines(
    configs: readonly (StorylineConfig & { variantId?: string })[],
  ): MockFixtureBuilder;

  /**
   * Build a complete storyline fixture in one call.
   */
  buildStoryline(input: BuildStorylineInput): BuildStorylineResult;

  /**
   * Clear all fixture state.
   */
  cleanup(): void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultRelationshipLayer(): RelationshipLayer {
  return {
    highlightedDeltasText: '',
    stableBackgroundText: '',
  };
}

function createDefaultStateSnapshot(ordinal: number): StateSnapshot {
  return {
    sceneState: {
      sceneId: 'scene_default',
      currentPhaseIndex: 1,
      currentBeatIndexInPhase: ordinal,
      mainAxis: '',
      endLine: '',
      alpha: '',
      beta: '',
    },
    roundState: {
      phaseGoal: '',
      currentVolume: 'Med',
      currentRouter: '',
      verbLexicon: [],
      historyWindow: [],
    },
    generationState: {
      directorNoteSummary: '',
      promptObject: {},
      currentBeatText: null,
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

function createMinimalSession(sessionId: string, timestamp: string, lifecycle: RuntimeSession['lifecycle'] = 'awaiting_start'): RuntimeSession {
  return {
    sessionId,
    lifecycle,
    createdAt: timestamp,
    updatedAt: timestamp,
    headCheckpointId: null,
    activeCheckpointId: null,
    orderedCheckpointIds: [],
    checkpointsById: {},
    lastStableRelationshipLayer: createDefaultRelationshipLayer(),
  };
}

function createMinimalCheckpoint(
  checkpointId: string,
  ordinal: number,
  timestamp: string,
  config?: Partial<CheckpointConfig>,
): RuntimeCheckpoint {
  return {
    checkpointId,
    acceptedBeatOrdinal: ordinal,
    sceneId: config?.sceneId ?? 'scene_default',
    phaseIndex: config?.phaseIndex ?? 1,
    beatIndex: config?.beatIndex ?? ordinal,
    roundId: config?.roundId ?? `round_${ordinal}`,
    acceptedTranscript: {
      playerInput: config?.playerInput ?? `input_${ordinal}`,
      beatText: config?.beatText ?? `beat_${ordinal}`,
    },
    stateSnapshot: createDefaultStateSnapshot(ordinal),
    lastStableRelationshipLayer: createDefaultRelationshipLayer(),
    createdAt: timestamp,
  };
}

// ============================================================================
// Implementation
// ============================================================================

export function createMockFixtureBuilder(kernel: MockKernel): MockFixtureBuilder {
  const builder: MockFixtureBuilder = {
    getKernel(): MockKernel {
      return kernel;
    },

    withRepository(config: RepositoryConfig): MockFixtureBuilder {
      const state = kernel.getState();
      const timestamp = kernel.clock.now();

      const storylinesById: Record<string, StorylineRecord> = {};
      const variantsById: Record<string, StorylineVariant> = {};

      for (const variantConfig of config.variants) {
        variantsById[variantConfig.variantId] = {
          variantId: variantConfig.variantId,
          workspaceRoot: `variants/${variantConfig.variantId}`,
          createdFromStorylineId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      }

      for (const storylineConfig of config.storylines) {
        storylinesById[storylineConfig.storylineId] = {
          storylineId: storylineConfig.storylineId,
          name: storylineConfig.name,
          status: storylineConfig.status ?? 'active',
          sourceCheckpointId: storylineConfig.sourceCheckpointId ?? null,
          headCheckpointId: storylineConfig.headCheckpointId ?? null,
          variantId: storylineConfig.variantId ?? 'variant_main',
          activeSessionId: storylineConfig.activeSessionId ?? '',
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      }

      const repository: StorylineRepositoryFile = {
        version: 1,
        activeStorylineId: config.activeStorylineId,
        storylinesById,
        variantsById,
      };

      kernel._testSetState({
        ...state,
        storylineRepository: repository,
      });

      return builder;
    },

    withStoryline(config: StorylineConfig): MockFixtureBuilder {
      const state = kernel.getState();
      const timestamp = kernel.clock.now();

      if (!state.storylineRepository) {
        // Create minimal repository
        builder.withRepository({
          activeStorylineId: config.storylineId,
          storylines: [config],
          variants: [{ variantId: config.variantId ?? 'variant_main' }],
        });
        return builder;
      }

      const storyline: StorylineRecord = {
        storylineId: config.storylineId,
        name: config.name,
        status: config.status ?? 'active',
        sourceCheckpointId: config.sourceCheckpointId ?? null,
        headCheckpointId: config.headCheckpointId ?? null,
        variantId: config.variantId ?? 'variant_main',
        activeSessionId: config.activeSessionId ?? '',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Check if variant exists, if not create it
      const variantId = config.variantId ?? 'variant_main';
      let variantsById = state.storylineRepository.variantsById;
      if (!variantsById[variantId]) {
        variantsById = {
          ...variantsById,
          [variantId]: {
            variantId,
            workspaceRoot: `variants/${variantId}`,
            createdFromStorylineId: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        };
      }

      kernel._testSetState({
        ...state,
        storylineRepository: {
          ...state.storylineRepository,
          storylinesById: {
            ...state.storylineRepository.storylinesById,
            [storyline.storylineId]: storyline,
          },
          variantsById,
        },
      });

      return builder;
    },

    withVariantWorkspace(config: VariantWorkspaceConfig): MockFixtureBuilder {
      const state = kernel.getState();

      const variantState: VariantWorkspaceState = {
        variantId: config.variantId,
        hasWorldBase: config.hasWorldBase ?? false,
        hasScene: config.hasScene ?? false,
        hasPhasePlans: config.hasPhasePlans ?? false,
        hasRouterLexicon: config.hasRouterLexicon ?? false,
        hasAuditQuestions: config.hasAuditQuestions ?? false,
        hasControlModules: config.hasControlModules ?? false,
        worldBase: config.worldBase,
        scene: config.scene,
        phasePlans: config.phasePlans,
        routerLexicon: config.routerLexicon,
        auditQuestions: config.auditQuestions,
        controlModules: config.controlModules,
      };

      kernel._testSetState({
        ...state,
        variantsById: {
          ...state.variantsById,
          [config.variantId]: variantState,
        },
      });

      return builder;
    },

    withSession(config: SessionConfig): MockFixtureBuilder {
      const state = kernel.getState();
      const timestamp = kernel.clock.now();
      const session = createMinimalSession(config.sessionId, timestamp, config.lifecycle);

      kernel._testSetState({
        ...state,
        runtimeSessions: {
          ...state.runtimeSessions,
          activeSessionId: config.isActive ? config.sessionId : state.runtimeSessions.activeSessionId,
          sessionsById: {
            ...state.runtimeSessions.sessionsById,
            [config.sessionId]: session,
          },
        },
      });

      return builder;
    },

    withCheckpoint(config: CheckpointConfig): MockFixtureBuilder {
      const state = kernel.getState();
      const session = state.runtimeSessions.sessionsById[config.sessionId];

      if (!session) {
        throw new Error(`Session "${config.sessionId}" does not exist.`);
      }

      const timestamp = kernel.clock.now();
      const checkpoint = createMinimalCheckpoint(
        config.checkpointId,
        config.acceptedBeatOrdinal,
        timestamp,
        config,
      );

      const updatedSession: RuntimeSession = {
        ...session,
        orderedCheckpointIds: [...session.orderedCheckpointIds, config.checkpointId],
        checkpointsById: {
          ...session.checkpointsById,
          [config.checkpointId]: checkpoint,
        },
        headCheckpointId: config.checkpointId,
        activeCheckpointId: config.checkpointId,
      };

      kernel._testSetState({
        ...state,
        runtimeSessions: {
          ...state.runtimeSessions,
          sessionsById: {
            ...state.runtimeSessions.sessionsById,
            [config.sessionId]: updatedSession,
          },
        },
      });

      return builder;
    },

    withMultipleStorylines(
      configs: readonly (StorylineConfig & { variantId?: string })[],
    ): MockFixtureBuilder {
      const state = kernel.getState();
      const timestamp = kernel.clock.now();

      const storylinesById: Record<string, StorylineRecord> = {};
      const variantsById: Record<string, StorylineVariant> = {};
      const newVariantsState: Record<string, VariantWorkspaceState> = { ...state.variantsById };
      const sessionsById: Record<string, RuntimeSession> = { ...state.runtimeSessions.sessionsById };

      let activeSessionId: string | null = null;

      for (const config of configs) {
        const variantId = config.variantId ?? `variant_${config.storylineId.replace('storyline_', '')}`;
        const sessionId = generateId('session');
        const session = createMinimalSession(sessionId, timestamp);

        // Create variant
        variantsById[variantId] = {
          variantId,
          workspaceRoot: `variants/${variantId}`,
          createdFromStorylineId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        // Create variant workspace state
        newVariantsState[variantId] = {
          variantId,
          hasWorldBase: false,
          hasScene: false,
          hasPhasePlans: false,
          hasRouterLexicon: false,
          hasAuditQuestions: false,
          hasControlModules: false,
        };

        // Create session
        sessionsById[sessionId] = session;

        // Create storyline
        storylinesById[config.storylineId] = {
          storylineId: config.storylineId,
          name: config.name,
          status: config.status ?? 'active',
          sourceCheckpointId: config.sourceCheckpointId ?? null,
          headCheckpointId: config.headCheckpointId ?? null,
          variantId,
          activeSessionId: sessionId,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        // First session is active
        if (!activeSessionId) {
          activeSessionId = sessionId;
        }
      }

      const repository: StorylineRepositoryFile = {
        version: 1,
        activeStorylineId: configs[0]?.storylineId ?? 'storyline_main',
        storylinesById,
        variantsById,
      };

      kernel._testSetState({
        ...state,
        storylineRepository: repository,
        variantsById: newVariantsState,
        runtimeSessions: {
          version: 1,
          activeSessionId,
          sessionsById,
        },
      });

      return builder;
    },

    buildStoryline(input: BuildStorylineInput): BuildStorylineResult {
      const state = kernel.getState();
      const timestamp = kernel.clock.now();

      const variantId = input.variantId ?? 'variant_main';
      const sessionId = generateId('session');
      const session = createMinimalSession(sessionId, timestamp);

      const checkpoints = input.withCheckpoints ?? [];
      let headCheckpointId: string | null = null;

      // Add checkpoints to session
      for (const ordinal of checkpoints) {
        const checkpointId = generateId('checkpoint');
        const checkpoint = createMinimalCheckpoint(checkpointId, ordinal, timestamp);
        session.orderedCheckpointIds.push(checkpointId);
        session.checkpointsById[checkpointId] = checkpoint;
        headCheckpointId = checkpointId;
      }

      if (headCheckpointId) {
        session.headCheckpointId = headCheckpointId;
        session.activeCheckpointId = headCheckpointId;
      }

      // Create storyline
      const storyline: StorylineRecord = {
        storylineId: input.storylineId,
        name: input.name,
        status: 'active',
        sourceCheckpointId: null,
        headCheckpointId,
        variantId,
        activeSessionId: sessionId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Create variant
      const variant: StorylineVariant = {
        variantId,
        workspaceRoot: `variants/${variantId}`,
        createdFromStorylineId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Build repository
      const repository: StorylineRepositoryFile = {
        version: 1,
        activeStorylineId: input.storylineId,
        storylinesById: {
          [input.storylineId]: storyline,
        },
        variantsById: {
          [variantId]: variant,
        },
      };

      // Update kernel state
      kernel._testSetState({
        ...state,
        storylineRepository: repository,
        variantsById: {
          ...state.variantsById,
          [variantId]: {
            variantId,
            hasWorldBase: false,
            hasScene: false,
            hasPhasePlans: false,
            hasRouterLexicon: false,
            hasAuditQuestions: false,
            hasControlModules: false,
          },
        },
        runtimeSessions: {
          version: 1,
          activeSessionId: sessionId,
          sessionsById: {
            ...state.runtimeSessions.sessionsById,
            [sessionId]: session,
          },
        },
      });

      return {
        storylineId: input.storylineId,
        name: input.name,
        variantId,
        sessionId,
        checkpointCount: checkpoints.length,
      };
    },

    cleanup(): void {
      const state = kernel.getState();
      kernel._testSetState({
        ...state,
        storylineRepository: null,
        variantsById: {},
        runtimeSessions: {
          version: 1,
          activeSessionId: null,
          sessionsById: {},
        },
      });
    },
  };

  return builder;
}