/**
 * SubstrateMock - storyline substrate layer operations over MockKernel.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 4.1-4.4
 *
 * SubstrateMock wraps MockKernel to provide storyline-specific operations:
 * - resolve active storyline context
 * - create storyline from source
 * - branch storyline from checkpoint
 * - switch active storyline
 * - update storyline display name
 * - ensure storyline aware active session
 * - execute storyline runtime session commands
 */

import type { MockKernel } from './mock-kernel';
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
  RelationshipLayer,
  StateSnapshot,
} from '@/types';

// ============================================================================
// Public Types
// ============================================================================

export interface ResolveActiveStorylineContextOptions {
  readonly packageName: string;
  readonly forWrite: boolean;
}

export interface ActiveStorylineContext {
  readonly packageName: string;
  readonly repository: StorylineRepositoryFile | null;
  readonly storyline: {
    readonly storylineId: string;
    readonly headCheckpointId: string | null;
    readonly variantId: string;
    readonly activeSessionId: string;
  };
  readonly variant: {
    readonly variantId: string;
    readonly workspaceRoot: string;
  };
  readonly session: RuntimeSession | null;
  readonly runtimeFile: RuntimeSessionsFile;
  readonly authoredRoot: string;
  readonly isLegacyImplicit: boolean;
}

export interface StorylineMutationResult {
  readonly repository: StorylineRepositoryFile;
  readonly storyline: StorylineRecord;
  readonly variant: StorylineVariant;
  readonly session: RuntimeSession;
  readonly authoredRoot: string;
}

export interface CreateStorylineFromSourceInput {
  readonly packageName: string;
  readonly sourceStorylineId: string;
  readonly name: string;
}

export interface BranchStorylineFromCheckpointInput {
  readonly packageName: string;
  readonly sourceStorylineId: string;
  readonly checkpointId: string;
  readonly name: string;
}

export interface SwitchActiveStorylineInput {
  readonly packageName: string;
  readonly storylineId: string;
}

export interface UpdateStorylineDisplayNameInput {
  readonly packageName: string;
  readonly storylineId: string;
  readonly nextDisplayName: string;
}

export interface EnsureStorylineAwareActiveSessionInput {
  readonly packageName: string;
}

// Runtime session command types
export type RuntimeSessionCommand =
  | { kind: 'ensure_active_session' }
  | {
      kind: 'record_accepted_beat';
      payload: {
        acceptedBeatOrdinal: number;
        sceneId: string;
        phaseIndex: number;
        beatIndex: number;
        roundId: string;
        acceptedTranscript: {
          playerInput: string;
          beatText: string;
        };
        stateSnapshot: StateSnapshot;
      };
    }
  | {
      kind: 'finalize_relationship_layer';
      payload: {
        sessionId: string;
        checkpointId: string;
        relationshipLayer: RelationshipLayer;
      };
    }
  | { kind: 'reset_workbench' };

export interface RuntimeSessionCommandResult {
  readonly activeSessionId: string;
  readonly activeCheckpointId?: string | null;
}

export interface ExecuteStorylineRuntimeSessionCommandInput {
  readonly packageName: string;
  readonly command: RuntimeSessionCommand;
}

// ============================================================================
// SubstrateMock Interface
// ============================================================================

export interface SubstrateMock {
  /**
   * Get the underlying MockKernel.
   */
  getKernel(): MockKernel;

  /**
   * Resolve the active storyline context.
   * If repository is null and forWrite=true, bootstraps default storyline.
   */
  resolveActiveStorylineContext(
    options: ResolveActiveStorylineContextOptions,
  ): Promise<ActiveStorylineContext>;

  /**
   * Switch to a different storyline.
   */
  switchActiveStoryline(
    input: SwitchActiveStorylineInput,
  ): Promise<StorylineMutationResult>;

  /**
   * Create a new storyline from an existing source storyline.
   */
  createStorylineFromSource(
    input: CreateStorylineFromSourceInput,
  ): Promise<StorylineMutationResult>;

  /**
   * Branch a storyline from a specific checkpoint.
   */
  branchStorylineFromCheckpoint(
    input: BranchStorylineFromCheckpointInput,
  ): Promise<StorylineMutationResult>;

  /**
   * Update a storyline's display name.
   */
  updateStorylineDisplayName(
    input: UpdateStorylineDisplayNameInput,
  ): Promise<StorylineMutationResult>;

  /**
   * Ensure an active session exists for the storyline-aware context.
   */
  ensureStorylineAwareActiveSession(
    input: EnsureStorylineAwareActiveSessionInput,
  ): Promise<StorylineMutationResult>;

  /**
   * Execute a runtime session command.
   */
  executeStorylineRuntimeSessionCommand(
    input: ExecuteStorylineRuntimeSessionCommandInput,
  ): Promise<RuntimeSessionCommandResult>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STORYLINE_ID = 'storyline_main';
const DEFAULT_VARIANT_ID = 'variant_main';
const DEFAULT_STORYLINE_NAME = 'Main Line';

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

function createMinimalSession(sessionId: string, timestamp: string): RuntimeSession {
  return {
    sessionId,
    lifecycle: 'awaiting_start',
    createdAt: timestamp,
    updatedAt: timestamp,
    headCheckpointId: null,
    activeCheckpointId: null,
    orderedCheckpointIds: [],
    checkpointsById: {},
    lastStableRelationshipLayer: createDefaultRelationshipLayer(),
  };
}

function resolveSessionHeadCheckpointId(session: RuntimeSession): string | null {
  return session.activeCheckpointId ?? session.headCheckpointId;
}

// ============================================================================
// Implementation
// ============================================================================

export function createSubstrateMock(kernel: MockKernel): SubstrateMock {
  const substrate = {
    getKernel(): MockKernel {
      return kernel;
    },

    async resolveActiveStorylineContext(
      options: ResolveActiveStorylineContextOptions,
    ): Promise<ActiveStorylineContext> {
      return kernel.execute({
        layer: 'substrate',
        operation: 'resolve_active_storyline_context',
        input: options,
        handler: async () => {
          const state = kernel.getState();
          const packageName = options.packageName;

          // If repository exists, return explicit context
          if (state.storylineRepository) {
            const repository = state.storylineRepository;
            const activeStoryline = repository.storylinesById[repository.activeStorylineId];
            if (!activeStoryline) {
              throw new Error(
                `Storyline structural mismatch: activeStorylineId "${repository.activeStorylineId}" does not resolve.`,
              );
            }
            const variant = repository.variantsById[activeStoryline.variantId];
            if (!variant) {
              throw new Error(
                `Storyline structural mismatch: variantId "${activeStoryline.variantId}" does not resolve.`,
              );
            }
            const session = state.runtimeSessions.sessionsById[activeStoryline.activeSessionId];

            if (!session) {
              throw new Error(
                `Storyline structural mismatch: activeSessionId "${activeStoryline.activeSessionId}" does not resolve.`,
              );
            }

            return {
              packageName,
              repository,
              storyline: {
                storylineId: activeStoryline.storylineId,
                headCheckpointId: activeStoryline.headCheckpointId,
                variantId: activeStoryline.variantId,
                activeSessionId: activeStoryline.activeSessionId,
              },
              variant: {
                variantId: variant.variantId,
                workspaceRoot: variant.workspaceRoot,
              },
              session,
              runtimeFile: state.runtimeSessions,
              authoredRoot: `variants/${variant.variantId}`,
              isLegacyImplicit: false,
            };
          }

          // Legacy implicit context
          if (options.forWrite) {
            // Bootstrap default storyline
            const timestamp = kernel.clock.now();
            const sessionId = generateId('session');
            const session = createMinimalSession(sessionId, timestamp);

            const storyline: StorylineRecord = {
              storylineId: DEFAULT_STORYLINE_ID,
              name: DEFAULT_STORYLINE_NAME,
              status: 'active',
              sourceCheckpointId: null,
              headCheckpointId: null,
              variantId: DEFAULT_VARIANT_ID,
              activeSessionId: sessionId,
              createdAt: timestamp,
              updatedAt: timestamp,
            };

            const variant: StorylineVariant = {
              variantId: DEFAULT_VARIANT_ID,
              workspaceRoot: `variants/${DEFAULT_VARIANT_ID}`,
              createdFromStorylineId: null,
              createdAt: timestamp,
              updatedAt: timestamp,
            };

            const repository: StorylineRepositoryFile = {
              version: 1,
              activeStorylineId: DEFAULT_STORYLINE_ID,
              storylinesById: {
                [DEFAULT_STORYLINE_ID]: storyline,
              },
              variantsById: {
                [DEFAULT_VARIANT_ID]: variant,
              },
            };

            // Update kernel state
            kernel._testSetState({
              ...state,
              storylineRepository: repository,
              variantsById: {
                [DEFAULT_VARIANT_ID]: {
                  variantId: DEFAULT_VARIANT_ID,
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
                  [sessionId]: session,
                },
              },
            });

            return {
              packageName,
              repository,
              storyline: {
                storylineId: storyline.storylineId,
                headCheckpointId: storyline.headCheckpointId,
                variantId: storyline.variantId,
                activeSessionId: storyline.activeSessionId,
              },
              variant: {
                variantId: variant.variantId,
                workspaceRoot: variant.workspaceRoot,
              },
              session,
              runtimeFile: kernel.getState().runtimeSessions,
              authoredRoot: `variants/${variant.variantId}`,
              isLegacyImplicit: false,
            };
          }

          // Return legacy implicit context (no repository)
          const runtimeFile = state.runtimeSessions;
          const activeSession = runtimeFile.activeSessionId
            ? runtimeFile.sessionsById[runtimeFile.activeSessionId] ?? null
            : null;

          return {
            packageName,
            repository: null,
            storyline: {
              storylineId: DEFAULT_STORYLINE_ID,
              headCheckpointId: activeSession ? resolveSessionHeadCheckpointId(activeSession) : null,
              variantId: DEFAULT_VARIANT_ID,
              activeSessionId: activeSession?.sessionId ?? '',
            },
            variant: {
              variantId: DEFAULT_VARIANT_ID,
              workspaceRoot: '.',
            },
            session: activeSession,
            runtimeFile,
            authoredRoot: '.',
            isLegacyImplicit: true,
          };
        },
      });
    },

    async switchActiveStoryline(
      input: SwitchActiveStorylineInput,
    ): Promise<StorylineMutationResult> {
      return kernel.execute({
        layer: 'substrate',
        operation: 'switch_active_storyline',
        input,
        handler: async () => {
          const state = kernel.getState();

          if (!state.storylineRepository) {
            throw new Error('Cannot switch storyline: repository does not exist.');
          }

          const targetStoryline = state.storylineRepository.storylinesById[input.storylineId];
          if (!targetStoryline) {
            throw new Error(`Storyline "${input.storylineId}" does not exist.`);
          }

          const variant = state.storylineRepository.variantsById[targetStoryline.variantId];
          if (!variant) {
            throw new Error(
              `Storyline structural mismatch: variantId "${targetStoryline.variantId}" does not resolve.`,
            );
          }
          const session = state.runtimeSessions.sessionsById[targetStoryline.activeSessionId];

          if (!session) {
            throw new Error(
              `Storyline structural mismatch: activeSessionId "${targetStoryline.activeSessionId}" does not resolve.`,
            );
          }

          const timestamp = kernel.clock.now();
          const updatedStoryline: StorylineRecord = {
            ...targetStoryline,
            headCheckpointId: resolveSessionHeadCheckpointId(session),
            updatedAt: timestamp,
          };

          const newRepository: StorylineRepositoryFile = {
            ...state.storylineRepository,
            activeStorylineId: updatedStoryline.storylineId,
            storylinesById: {
              ...state.storylineRepository.storylinesById,
              [updatedStoryline.storylineId]: updatedStoryline,
            },
          };

          // Update kernel state
          kernel._testSetState({
            ...state,
            storylineRepository: newRepository,
            runtimeSessions: {
              ...state.runtimeSessions,
              activeSessionId: updatedStoryline.activeSessionId,
            },
          });

          return {
            repository: newRepository,
            storyline: updatedStoryline,
            variant,
            session,
            authoredRoot: `variants/${variant.variantId}`,
          };
        },
      });
    },

    async createStorylineFromSource(
      input: CreateStorylineFromSourceInput,
    ): Promise<StorylineMutationResult> {
      return kernel.execute({
        layer: 'substrate',
        operation: 'create_storyline_from_source',
        input,
        handler: async () => {
          const state = kernel.getState();

          if (!state.storylineRepository) {
            throw new Error('Cannot create storyline: repository does not exist.');
          }

          const sourceStoryline = state.storylineRepository.storylinesById[input.sourceStorylineId];
          if (!sourceStoryline) {
            throw new Error(`Source storyline "${input.sourceStorylineId}" does not exist.`);
          }

          if (!sourceStoryline.headCheckpointId) {
            throw new Error(
              `Cannot create storyline from source "${input.sourceStorylineId}" because source headCheckpointId is null.`,
            );
          }

          // Branch from head checkpoint
          return substrate.branchStorylineFromCheckpoint({
            packageName: input.packageName,
            sourceStorylineId: input.sourceStorylineId,
            checkpointId: sourceStoryline.headCheckpointId,
            name: input.name,
          });
        },
      });
    },

    async branchStorylineFromCheckpoint(
      input: BranchStorylineFromCheckpointInput,
    ): Promise<StorylineMutationResult> {
      return kernel.execute({
        layer: 'substrate',
        operation: 'branch_storyline_from_checkpoint',
        input,
        handler: async () => {
          const state = kernel.getState();

          if (!state.storylineRepository) {
            throw new Error('Cannot branch storyline: repository does not exist.');
          }

          const sourceStoryline = state.storylineRepository.storylinesById[input.sourceStorylineId];
          if (!sourceStoryline) {
            throw new Error(`Source storyline "${input.sourceStorylineId}" does not exist.`);
          }

          // Verify checkpoint belongs to source storyline's session
          const sourceSession = state.runtimeSessions.sessionsById[sourceStoryline.activeSessionId];
          if (!sourceSession || !sourceSession.checkpointsById[input.checkpointId]) {
            throw new Error(
              `Cannot branch storyline from checkpoint "${input.checkpointId}" because it is not reachable from source storyline "${input.sourceStorylineId}".`,
            );
          }

          const sourceVariant = state.storylineRepository.variantsById[sourceStoryline.variantId];
          if (!sourceVariant) {
            throw new Error(
              `Storyline structural mismatch: variantId "${sourceStoryline.variantId}" does not resolve.`,
            );
          }

          // Generate new IDs
          const storylineId = generateId('storyline');
          const variantId = generateId('variant');
          const sessionId = generateId('session');
          const timestamp = kernel.clock.now();

          // Copy checkpoint to new session
          const sourceCheckpoint = sourceSession.checkpointsById[input.checkpointId];
          if (!sourceCheckpoint) {
            throw new Error(
              `Cannot branch storyline from checkpoint "${input.checkpointId}" because it is not reachable from source storyline "${input.sourceStorylineId}".`,
            );
          }

          // Create new session starting from checkpoint
          const newSession: RuntimeSession = {
            sessionId,
            lifecycle: 'awaiting_start',
            createdAt: timestamp,
            updatedAt: timestamp,
            headCheckpointId: input.checkpointId,
            activeCheckpointId: input.checkpointId,
            orderedCheckpointIds: [input.checkpointId],
            checkpointsById: {
              [input.checkpointId]: sourceCheckpoint,
            },
            lastStableRelationshipLayer: sourceCheckpoint.lastStableRelationshipLayer,
          };

          // Create new storyline
          const newStoryline: StorylineRecord = {
            storylineId,
            name: input.name,
            status: 'active',
            sourceCheckpointId: input.checkpointId,
            headCheckpointId: input.checkpointId,
            variantId,
            activeSessionId: sessionId,
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          // Create new variant (copy source variant)
          const newVariant: StorylineVariant = {
            variantId,
            workspaceRoot: `variants/${variantId}`,
            createdFromStorylineId: sourceStoryline.storylineId,
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          // Copy variant workspace state
          const sourceVariantState = state.variantsById[sourceVariant.variantId] ?? {
            hasWorldBase: false,
            hasScene: false,
            hasPhasePlans: false,
            hasRouterLexicon: false,
            hasAuditQuestions: false,
            hasControlModules: false,
          };

          // Update repository
          const newRepository: StorylineRepositoryFile = {
            ...state.storylineRepository,
            storylinesById: {
              ...state.storylineRepository.storylinesById,
              [storylineId]: newStoryline,
            },
            variantsById: {
              ...state.storylineRepository.variantsById,
              [variantId]: newVariant,
            },
          };

          // Update kernel state
          kernel._testSetState({
            ...state,
            storylineRepository: newRepository,
            variantsById: {
              ...state.variantsById,
              [variantId]: {
                variantId,
                hasWorldBase: sourceVariantState.hasWorldBase,
                hasScene: sourceVariantState.hasScene,
                hasPhasePlans: sourceVariantState.hasPhasePlans,
                hasRouterLexicon: sourceVariantState.hasRouterLexicon,
                hasAuditQuestions: sourceVariantState.hasAuditQuestions,
                hasControlModules: sourceVariantState.hasControlModules,
              },
            },
            runtimeSessions: {
              ...state.runtimeSessions,
              sessionsById: {
                ...state.runtimeSessions.sessionsById,
                [sessionId]: newSession,
              },
            },
          });

          return {
            repository: newRepository,
            storyline: newStoryline,
            variant: newVariant,
            session: newSession,
            authoredRoot: `variants/${variantId}`,
          };
        },
      });
    },

    async updateStorylineDisplayName(
      input: UpdateStorylineDisplayNameInput,
    ): Promise<StorylineMutationResult> {
      return kernel.execute({
        layer: 'substrate',
        operation: 'update_storyline_display_name',
        input,
        handler: async () => {
          const state = kernel.getState();

          if (!state.storylineRepository) {
            throw new Error('Cannot update storyline: repository does not exist.');
          }

          const storyline = state.storylineRepository.storylinesById[input.storylineId];
          if (!storyline) {
            throw new Error(`Storyline "${input.storylineId}" does not exist.`);
          }

          const normalizedDisplayName = input.nextDisplayName.trim();
          if (normalizedDisplayName.length === 0) {
            throw new Error('Storyline display name cannot be empty.');
          }

          // If name unchanged, return current state
          if (normalizedDisplayName === storyline.name.trim()) {
            const variant = state.storylineRepository.variantsById[storyline.variantId];
            if (!variant) {
              throw new Error(
                `Storyline structural mismatch: variantId "${storyline.variantId}" does not resolve.`,
              );
            }
            const session = state.runtimeSessions.sessionsById[storyline.activeSessionId];

            return {
              repository: state.storylineRepository,
              storyline,
              variant,
              session: session!,
              authoredRoot: `variants/${variant.variantId}`,
            };
          }

          // Update storyline
          const timestamp = kernel.clock.now();
          const updatedStoryline: StorylineRecord = {
            ...storyline,
            name: normalizedDisplayName,
            updatedAt: timestamp,
          };

          const newRepository: StorylineRepositoryFile = {
            ...state.storylineRepository,
            storylinesById: {
              ...state.storylineRepository.storylinesById,
              [updatedStoryline.storylineId]: updatedStoryline,
            },
          };

          // Update kernel state
          kernel._testSetState({
            ...state,
            storylineRepository: newRepository,
          });

          const variant = newRepository.variantsById[updatedStoryline.variantId];
          if (!variant) {
            throw new Error(
              `Storyline structural mismatch: variantId "${updatedStoryline.variantId}" does not resolve.`,
            );
          }
          const session = state.runtimeSessions.sessionsById[updatedStoryline.activeSessionId];

          return {
            repository: newRepository,
            storyline: updatedStoryline,
            variant,
            session: session!,
            authoredRoot: `variants/${variant.variantId}`,
          };
        },
      });
    },

    async ensureStorylineAwareActiveSession(
      input: EnsureStorylineAwareActiveSessionInput,
    ): Promise<StorylineMutationResult> {
      return kernel.execute({
        layer: 'substrate',
        operation: 'ensure_storyline_aware_active_session',
        input,
        handler: async () => {
          const state = kernel.getState();

          if (!state.storylineRepository) {
            throw new Error(
              'Cannot ensure storyline-aware session: repository does not exist. Call resolveActiveStorylineContext with forWrite=true first.',
            );
          }

          const activeStoryline = state.storylineRepository.storylinesById[
            state.storylineRepository.activeStorylineId
          ];
          if (!activeStoryline) {
            throw new Error(
              `Storyline structural mismatch: activeStorylineId "${state.storylineRepository.activeStorylineId}" does not resolve.`,
            );
          }
          const variant = state.storylineRepository.variantsById[activeStoryline.variantId];
          if (!variant) {
            throw new Error(
              `Storyline structural mismatch: variantId "${activeStoryline.variantId}" does not resolve.`,
            );
          }
          const session = state.runtimeSessions.sessionsById[activeStoryline.activeSessionId];

          if (!session) {
            throw new Error(
              `Storyline structural mismatch: activeSessionId "${activeStoryline.activeSessionId}" does not resolve.`,
            );
          }

          return {
            repository: state.storylineRepository,
            storyline: activeStoryline,
            variant,
            session,
            authoredRoot: `variants/${variant.variantId}`,
          };
        },
      });
    },

    async executeStorylineRuntimeSessionCommand(
      input: ExecuteStorylineRuntimeSessionCommandInput,
    ): Promise<RuntimeSessionCommandResult> {
      return kernel.execute({
        layer: 'substrate',
        operation: 'execute_storyline_runtime_session_command',
        input,
        handler: async () => {
          const state = kernel.getState();

          if (!state.storylineRepository) {
            throw new Error('Cannot execute runtime session command: repository does not exist.');
          }

          const activeStoryline = state.storylineRepository.storylinesById[
            state.storylineRepository.activeStorylineId
          ];
          if (!activeStoryline) {
            throw new Error(
              `Storyline structural mismatch: activeStorylineId "${state.storylineRepository.activeStorylineId}" does not resolve.`,
            );
          }

          switch (input.command.kind) {
            case 'ensure_active_session': {
              const session = state.runtimeSessions.sessionsById[activeStoryline.activeSessionId];
              if (!session) {
                throw new Error(
                  `Storyline structural mismatch: activeSessionId "${activeStoryline.activeSessionId}" does not resolve.`,
                );
              }

              return {
                activeSessionId: session.sessionId,
              };
            }

            case 'record_accepted_beat': {
              const session = state.runtimeSessions.sessionsById[activeStoryline.activeSessionId];
              if (!session) {
                throw new Error(
                  `Storyline structural mismatch: activeSessionId "${activeStoryline.activeSessionId}" does not resolve.`,
                );
              }

              const checkpointId = generateId('checkpoint');
              const timestamp = kernel.clock.now();
              const ordinal = input.command.payload.acceptedBeatOrdinal;

              const checkpoint: RuntimeCheckpoint = {
                checkpointId,
                acceptedBeatOrdinal: ordinal,
                sceneId: input.command.payload.sceneId,
                phaseIndex: input.command.payload.phaseIndex,
                beatIndex: input.command.payload.beatIndex,
                roundId: input.command.payload.roundId,
                acceptedTranscript: input.command.payload.acceptedTranscript,
                stateSnapshot: input.command.payload.stateSnapshot,
                lastStableRelationshipLayer: session.lastStableRelationshipLayer,
                createdAt: timestamp,
              };

              // Update session
              const updatedSession: RuntimeSession = {
                ...session,
                lifecycle: 'in_progress',
                updatedAt: timestamp,
                headCheckpointId: checkpointId,
                activeCheckpointId: checkpointId,
                orderedCheckpointIds: [...session.orderedCheckpointIds, checkpointId],
                checkpointsById: {
                  ...session.checkpointsById,
                  [checkpointId]: checkpoint,
                },
              };

              // Update storyline
              const updatedStoryline: StorylineRecord = {
                ...activeStoryline,
                headCheckpointId: checkpointId,
                updatedAt: timestamp,
              };

              // Update repository
              const newRepository: StorylineRepositoryFile = {
                ...state.storylineRepository,
                storylinesById: {
                  ...state.storylineRepository.storylinesById,
                  [updatedStoryline.storylineId]: updatedStoryline,
                },
              };

              // Update kernel state
              kernel._testSetState({
                ...state,
                storylineRepository: newRepository,
                runtimeSessions: {
                  ...state.runtimeSessions,
                  sessionsById: {
                    ...state.runtimeSessions.sessionsById,
                    [session.sessionId]: updatedSession,
                  },
                },
              });

              return {
                activeSessionId: session.sessionId,
                activeCheckpointId: checkpointId,
              };
            }

            case 'finalize_relationship_layer': {
              const session = state.runtimeSessions.sessionsById[activeStoryline.activeSessionId];

              if (input.command.payload.sessionId !== activeStoryline.activeSessionId) {
                throw new Error(
                  'Cannot finalize relationship layer for a session outside the active storyline binding.',
                );
              }

              if (!session || !session.checkpointsById[input.command.payload.checkpointId]) {
                throw new Error(
                  `Cannot finalize relationship layer for checkpoint "${input.command.payload.checkpointId}" because it is not part of the active storyline session.`,
                );
              }

              // Update checkpoint with new relationship layer
              const checkpoint = session.checkpointsById[input.command.payload.checkpointId]!;
              const updatedCheckpoint: RuntimeCheckpoint = {
                ...checkpoint,
                lastStableRelationshipLayer: input.command.payload.relationshipLayer,
              };

              const updatedSession: RuntimeSession = {
                ...session,
                checkpointsById: {
                  ...session.checkpointsById,
                  [input.command.payload.checkpointId]: updatedCheckpoint,
                },
                lastStableRelationshipLayer: input.command.payload.relationshipLayer,
              };

              // Update kernel state
              kernel._testSetState({
                ...state,
                runtimeSessions: {
                  ...state.runtimeSessions,
                  sessionsById: {
                    ...state.runtimeSessions.sessionsById,
                    [session.sessionId]: updatedSession,
                  },
                },
              });

              return {
                activeSessionId: session.sessionId,
                activeCheckpointId: input.command.payload.checkpointId,
              };
            }

            case 'reset_workbench': {
              const oldSession = state.runtimeSessions.sessionsById[activeStoryline.activeSessionId];
              const newSessionId = generateId('session');
              const timestamp = kernel.clock.now();
              const newSession = createMinimalSession(newSessionId, timestamp);

              // Update storyline
              const updatedStoryline: StorylineRecord = {
                ...activeStoryline,
                activeSessionId: newSessionId,
                headCheckpointId: null,
                updatedAt: timestamp,
              };

              // Update repository
              const newRepository: StorylineRepositoryFile = {
                ...state.storylineRepository,
                storylinesById: {
                  ...state.storylineRepository.storylinesById,
                  [updatedStoryline.storylineId]: updatedStoryline,
                },
              };

              // Build new sessions map (preserve old session)
              const sessionsById = { ...state.runtimeSessions.sessionsById };
              if (oldSession) {
                sessionsById[oldSession.sessionId] = oldSession;
              }
              sessionsById[newSessionId] = newSession;

              // Update kernel state
              kernel._testSetState({
                ...state,
                storylineRepository: newRepository,
                runtimeSessions: {
                  ...state.runtimeSessions,
                  activeSessionId: newSessionId,
                  sessionsById,
                },
              });

              return {
                activeSessionId: newSessionId,
              };
            }

            default: {
              throw new Error(`Unsupported runtime session command: ${(input.command as { kind: string }).kind}`);
            }
          }
        },
      });
    },
  };

  return substrate;
}