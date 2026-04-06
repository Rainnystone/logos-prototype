/**
 * MockKernel - unified in-memory state machine for storyline simulation.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 3.2
 *
 * MockKernel provides:
 * - In-memory state management (storyline/repository/session)
 * - Record/Replay via operation trace
 * - Scripted control for testing edge cases
 */

import type { RuntimeSessionsFile } from '@/types/runtime-sessions';
import type { StorylineRepositoryFile } from '@/types/storyline-repository';
import type {
  SerializedScriptedMode,
  SerializedTraceLayer,
  SerializedOperationTrace,
  SerializedStateSnapshot,
  SerializedFlowTrace,
  SerializedVariantWorkspaceState,
} from './serialized-trace';

// ============================================================================
// Core Types (Section 3.2)
// ============================================================================

/**
 * ScriptedMode - discriminated union for scripted operation control.
 * All 8 variants supported: success, failure, error, validation_error,
 * conflict, stale_state, timeout, delayed.
 */
export type ScriptedMode =
  | { kind: 'success' }
  | { kind: 'failure'; reason: string }
  | { kind: 'error'; message: string }
  | { kind: 'validation_error'; fields: string[] }
  | { kind: 'conflict'; details: string }
  | { kind: 'stale_state'; expectedVersion: number }
  | { kind: 'timeout'; delayMs: number }
  | { kind: 'delayed'; delayMs: number };

/**
 * Operation trace layer - where the operation was executed.
 */
export type TraceLayer = 'substrate' | 'route' | 'runtime';

/**
 * Reference ID to a state snapshot.
 */
export type StateSnapshotRef = string;

/**
 * Variant workspace state snapshot.
 * Captures presence flags for each authoring section.
 */
export interface VariantWorkspaceState {
  variantId: string;
  // Presence flags for each authoring section
  hasWorldBase: boolean;
  hasScene: boolean;
  hasPhasePlans: boolean;
  hasRouterLexicon: boolean;
  hasAuditQuestions: boolean;
  hasControlModules: boolean;
  // Optional: actual content (for detailed trace)
  worldBase?: unknown;
  scene?: unknown;
  phasePlans?: unknown;
  routerLexicon?: unknown;
  auditQuestions?: unknown;
  controlModules?: unknown;
}

/**
 * Single operation execution trace entry.
 */
export interface OperationTraceEntry {
  sequenceId: number;
  timestamp: string;
  layer: TraceLayer;
  operation: string;
  input: unknown;
  output: unknown;
  stateBefore: StateSnapshotRef;
  stateAfter: StateSnapshotRef;
  mode?: ScriptedMode | undefined;
  error?: string | undefined;
}

/**
 * State snapshot with reference ID.
 */
export interface StateSnapshot {
  snapshotId: StateSnapshotRef;
  state: MockKernelState;
}

/**
 * MockKernel state snapshot.
 * Maintains storyline/repository/session state.
 */
export interface MockKernelState {
  packageName: string;
  storylineRepository: StorylineRepositoryFile | null;
  // Variant workspace states - Record for JSON serialization
  variantsById: Record<string, VariantWorkspaceState>;
  runtimeSessions: RuntimeSessionsFile;
  // Tracing
  operationLog: OperationTraceEntry[];
  stateSnapshots: StateSnapshot[];
  scriptedModeQueue: ScriptedMode[];
}

// ============================================================================
// Operation Definition
// ============================================================================

/**
 * Operation handler function type.
 */
type OperationHandler<T> = (kernel: MockKernel) => Promise<T> | T;

/**
 * Operation definition for execute().
 */
export interface MockOperation<T> {
  layer: TraceLayer;
  operation: string;
  input: unknown;
  handler: OperationHandler<T>;
}

// ============================================================================
// MockKernel Implementation
// ============================================================================

/**
 * MockKernel - unified in-memory state machine.
 */
export interface MockKernel {
  /**
   * Get current kernel state.
   */
  getState(): MockKernelState;

  /**
   * Execute an operation with automatic tracing.
   */
  execute<T>(operation: MockOperation<T>): Promise<T>;

  /**
   * Script the next operation's mode.
   */
  scriptNext(mode: ScriptedMode): void;

  /**
   * Script a sequence of modes for multiple operations.
   */
  scriptSequence(modes: ScriptedMode[]): void;

  /**
   * Get the operation trace.
   */
  getTrace(): OperationTraceEntry[];

  /**
   * Export trace as SerializedFlowTrace.
   */
  exportTrace(): SerializedFlowTrace;

  /**
   * Import a trace for replay.
   */
  importTrace(trace: SerializedFlowTrace): void;

  /**
   * Take a state snapshot.
   */
  snapshot(): StateSnapshotRef;

  /**
   * Restore to a previous snapshot.
   */
  restore(ref: StateSnapshotRef): void;

  /**
   * Reset to initial state.
   */
  reset(): void;

  /**
   * Cleanup and release resources.
   */
  cleanup(): Promise<void>;

  /**
   * Test helper: directly set state.
   * @internal - for testing only
   */
  _testSetState(state: MockKernelState): void;
}

/**
 * Create a MockKernel instance.
 */
export function createMockKernel(packageName: string): MockKernel {
  // Store original package name for reset
  const originalPackageName = packageName;

  // Initialize state
  let state: MockKernelState = {
    packageName,
    storylineRepository: null,
    variantsById: {},
    runtimeSessions: {
      version: 1,
      activeSessionId: null,
      sessionsById: {},
    },
    operationLog: [],
    stateSnapshots: [],
    scriptedModeQueue: [],
  };

  // Counter for sequence IDs
  let sequenceCounter = 0;

  // Counter for snapshot IDs
  let snapshotCounter = 0;

  /**
   * Generate a unique snapshot ID.
   */
  function generateSnapshotId(): StateSnapshotRef {
    snapshotCounter++;
    return `snap-${snapshotCounter.toString().padStart(3, '0')}`;
  }

  /**
   * Deep clone state for snapshots.
   */
  function cloneState(s: MockKernelState): MockKernelState {
    return {
      packageName: s.packageName,
      storylineRepository: s.storylineRepository
        ? JSON.parse(JSON.stringify(s.storylineRepository))
        : null,
      variantsById: JSON.parse(JSON.stringify(s.variantsById)),
      runtimeSessions: JSON.parse(JSON.stringify(s.runtimeSessions)),
      operationLog: [], // Don't clone log into snapshots
      stateSnapshots: [], // Don't clone snapshots into snapshots
      scriptedModeQueue: [], // Don't clone queue into snapshots
    };
  }

  /**
   * Create a snapshot and return its ref.
   */
  function takeSnapshot(): StateSnapshotRef {
    const ref = generateSnapshotId();
    const snapshot: StateSnapshot = {
      snapshotId: ref,
      state: cloneState(state),
    };
    state = {
      ...state,
      stateSnapshots: [...state.stateSnapshots, snapshot],
    };
    return ref;
  }

  return {
    getState(): MockKernelState {
      // Return a shallow copy to prevent external mutation
      return {
        packageName: state.packageName,
        storylineRepository: state.storylineRepository,
        variantsById: state.variantsById,
        runtimeSessions: state.runtimeSessions,
        operationLog: state.operationLog,
        stateSnapshots: state.stateSnapshots,
        scriptedModeQueue: state.scriptedModeQueue,
      };
    },

    async execute<T>(operation: MockOperation<T>): Promise<T> {
      // Check scripted mode
      const scriptedMode = state.scriptedModeQueue.shift();

      // Record state before
      const stateBefore = takeSnapshot();

      // Timestamp
      const timestamp = new Date().toISOString();

      // Increment sequence
      sequenceCounter++;
      const sequenceId = sequenceCounter;

      let output: unknown = null;
      let error: string | undefined;

      try {
        // Handle scripted modes
        if (scriptedMode) {
          switch (scriptedMode.kind) {
            case 'success':
              output = { kind: 'success' };
              break;

            case 'failure':
              error = scriptedMode.reason;
              break;

            case 'error':
              error = scriptedMode.message;
              break;

            case 'validation_error':
              output = {
                kind: 'validation_error',
                fields: scriptedMode.fields,
              };
              break;

            case 'conflict':
              error = scriptedMode.details;
              break;

            case 'stale_state':
              output = {
                kind: 'stale_state',
                expectedVersion: scriptedMode.expectedVersion,
              };
              break;

            case 'timeout':
              // Wait for the delay then fail
              await new Promise((resolve) =>
                setTimeout(resolve, scriptedMode.delayMs),
              );
              output = { kind: 'timeout', delayMs: scriptedMode.delayMs };
              break;

            case 'delayed':
              // Wait for the delay then run handler
              await new Promise((resolve) =>
                setTimeout(resolve, scriptedMode.delayMs),
              );
              output = await operation.handler(this);
              break;

            default:
              // Should never happen with TypeScript discriminated union
              throw new Error(`Unknown scripted mode kind`);
          }
        } else {
          // Normal execution
          output = await operation.handler(this);
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        output = null;
      }

      // Record state after
      const stateAfter = takeSnapshot();

      // Create trace entry
      const entry: OperationTraceEntry = {
        sequenceId,
        timestamp,
        layer: operation.layer,
        operation: operation.operation,
        input: operation.input,
        output,
        stateBefore,
        stateAfter,
        mode: scriptedMode,
        error,
      };

      // Append to operation log
      state = {
        ...state,
        operationLog: [...state.operationLog, entry],
      };

      // If there was an error, throw it (so caller can catch)
      if (error && scriptedMode?.kind !== 'timeout') {
        throw new Error(error);
      }

      return output as T;
    },

    scriptNext(mode: ScriptedMode): void {
      state = {
        ...state,
        scriptedModeQueue: [...state.scriptedModeQueue, mode],
      };
    },

    scriptSequence(modes: ScriptedMode[]): void {
      state = {
        ...state,
        scriptedModeQueue: [...state.scriptedModeQueue, ...modes],
      };
    },

    getTrace(): OperationTraceEntry[] {
      // Return a deep copy to prevent mutation
      return state.operationLog.map((entry) => ({ ...entry }));
    },

    exportTrace(): SerializedFlowTrace {
      // Convert operationLog and stateSnapshots to serialized format
      const operations: SerializedOperationTrace[] = state.operationLog.map(
        (entry) => ({
          sequenceId: entry.sequenceId,
          timestamp: entry.timestamp,
          layer: entry.layer as SerializedTraceLayer,
          operation: entry.operation,
          input: entry.input,
          output: entry.output,
          stateBefore: entry.stateBefore,
          stateAfter: entry.stateAfter,
          mode: entry.mode as SerializedScriptedMode | undefined,
          error: entry.error,
        }),
      );

      // Convert state snapshots to serialized format
      const snapshots: SerializedStateSnapshot[] = state.stateSnapshots.map(
        (snap) => ({
          snapshotId: snap.snapshotId,
          state: {
            packageName: snap.state.packageName,
            storylineRepository: snap.state.storylineRepository,
            variantsById: convertVariantStates(snap.state.variantsById),
            runtimeSessions: snap.state.runtimeSessions,
          },
        }),
      );

      return {
        schemaVersion: 1,
        flowId: 'legacy_bootstrap_flow', // Default when not in specific flow
        packageName: state.packageName,
        operations,
        snapshots,
      };
    },

    importTrace(trace: SerializedFlowTrace): void {
      // Reset state
      state = {
        packageName: trace.packageName,
        storylineRepository: null,
        variantsById: {},
        runtimeSessions: {
          version: 1,
          activeSessionId: null,
          sessionsById: {},
        },
        operationLog: [],
        stateSnapshots: [],
        scriptedModeQueue: [],
      };

      // Import snapshots
      for (const snap of trace.snapshots) {
        const snapshot: StateSnapshot = {
          snapshotId: snap.snapshotId,
          state: {
            packageName: snap.state.packageName,
            storylineRepository: snap.state.storylineRepository,
            variantsById: restoreVariantStates(snap.state.variantsById),
            runtimeSessions: snap.state.runtimeSessions,
            operationLog: [],
            stateSnapshots: [],
            scriptedModeQueue: [],
          },
        };
        state.stateSnapshots.push(snapshot);
      }

      // Import operations
      for (const op of trace.operations) {
        const entry: OperationTraceEntry = {
          sequenceId: op.sequenceId,
          timestamp: op.timestamp,
          layer: op.layer as TraceLayer,
          operation: op.operation,
          input: op.input,
          output: op.output,
          stateBefore: op.stateBefore,
          stateAfter: op.stateAfter,
          mode: op.mode as ScriptedMode | undefined,
          error: op.error,
        };
        state.operationLog.push(entry);
      }

      // Update counters
      sequenceCounter = trace.operations.length;
      snapshotCounter = trace.snapshots.length;
    },

    snapshot(): StateSnapshotRef {
      return takeSnapshot();
    },

    restore(ref: StateSnapshotRef): void {
      const snapshot = state.stateSnapshots.find(
        (s) => s.snapshotId === ref,
      );
      if (!snapshot) {
        throw new Error(`Snapshot not found: ${ref}`);
      }

      // Restore state from snapshot (but keep trace/log separate)
      state = {
        ...cloneState(snapshot.state),
        operationLog: state.operationLog,
        stateSnapshots: state.stateSnapshots,
        scriptedModeQueue: state.scriptedModeQueue,
      };
    },

    reset(): void {
      // Reset to initial state with original package name
      state = {
        packageName: originalPackageName,
        storylineRepository: null,
        variantsById: {},
        runtimeSessions: {
          version: 1,
          activeSessionId: null,
          sessionsById: {},
        },
        operationLog: [],
        stateSnapshots: [],
        scriptedModeQueue: [],
      };
      sequenceCounter = 0;
      snapshotCounter = 0;
    },

    async cleanup(): Promise<void> {
      // Clear all state
      state = {
        packageName: '',
        storylineRepository: null,
        variantsById: {},
        runtimeSessions: {
          version: 1,
          activeSessionId: null,
          sessionsById: {},
        },
        operationLog: [],
        stateSnapshots: [],
        scriptedModeQueue: [],
      };
      sequenceCounter = 0;
      snapshotCounter = 0;
    },

    _testSetState(newState: MockKernelState): void {
      state = newState;
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert VariantWorkspaceState to SerializedVariantWorkspaceState.
 */
function convertVariantStates(
  variantsById: Record<string, VariantWorkspaceState>,
): Record<string, SerializedVariantWorkspaceState> | undefined {
  if (Object.keys(variantsById).length === 0) {
    return undefined;
  }

  const result: Record<string, SerializedVariantWorkspaceState> = {};
  for (const [key, variant] of Object.entries(variantsById)) {
    result[key] = {
      variantId: variant.variantId,
      hasWorldBase: variant.hasWorldBase,
      hasScene: variant.hasScene,
      hasPhasePlans: variant.hasPhasePlans,
      hasRouterLexicon: variant.hasRouterLexicon,
      hasAuditQuestions: variant.hasAuditQuestions,
      hasControlModules: variant.hasControlModules,
      worldBase: variant.worldBase,
      scene: variant.scene,
      phasePlans: variant.phasePlans,
      routerLexicon: variant.routerLexicon,
      auditQuestions: variant.auditQuestions,
      controlModules: variant.controlModules,
    };
  }
  return result;
}

/**
 * Restore VariantWorkspaceState from SerializedVariantWorkspaceState.
 */
function restoreVariantStates(
  variantsById?: Record<string, SerializedVariantWorkspaceState>,
): Record<string, VariantWorkspaceState> {
  if (!variantsById) {
    return {};
  }

  const result: Record<string, VariantWorkspaceState> = {};
  for (const [key, variant] of Object.entries(variantsById)) {
    result[key] = {
      variantId: variant.variantId,
      hasWorldBase: variant.hasWorldBase,
      hasScene: variant.hasScene,
      hasPhasePlans: variant.hasPhasePlans,
      hasRouterLexicon: variant.hasRouterLexicon,
      hasAuditQuestions: variant.hasAuditQuestions,
      hasControlModules: variant.hasControlModules,
      worldBase: variant.worldBase,
      scene: variant.scene,
      phasePlans: variant.phasePlans,
      routerLexicon: variant.routerLexicon,
      auditQuestions: variant.auditQuestions,
      controlModules: variant.controlModules,
    };
  }
  return result;
}