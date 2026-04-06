import { z } from 'zod';

import {
  StorylineRepositoryFileSchema,
  StorylineRecordSchema,
  StorylineVariantSchema,
} from '@/types/storyline-repository';
import {
  RuntimeSessionsFileSchema,
  RuntimeSessionSchema,
  RuntimeCheckpointSchema,
} from '@/types/runtime-sessions';

/**
 * Serialized trace contracts for MockKernel record/replay.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 3.2
 */

export const SERIALIZED_TRACE_SCHEMA_VERSION = 1;

// ============================================================================
// ScriptedMode - Control mode for scripted operations
// ============================================================================

export const SerializedScriptedModeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('success') }),
  z.object({ kind: z.literal('failure'), reason: z.string() }),
  z.object({ kind: z.literal('error'), message: z.string() }),
  z.object({ kind: z.literal('validation_error'), fields: z.array(z.string()) }),
  z.object({ kind: z.literal('conflict'), details: z.string() }),
  z.object({ kind: z.literal('stale_state'), expectedVersion: z.number().int().positive() }),
  z.object({ kind: z.literal('timeout'), delayMs: z.number().int().positive() }),
  z.object({ kind: z.literal('delayed'), delayMs: z.number().int().positive() }),
]);

export type SerializedScriptedMode = z.infer<typeof SerializedScriptedModeSchema>;

// ============================================================================
// Layer - Operation execution layer
// ============================================================================

export const SerializedTraceLayerSchema = z.enum(['substrate', 'route', 'runtime']);

export type SerializedTraceLayer = z.infer<typeof SerializedTraceLayerSchema>;

// ============================================================================
// StateSnapshotRef - Reference ID to a state snapshot
// ============================================================================

export const StateSnapshotRefSchema = z.string();

export type StateSnapshotRef = z.infer<typeof StateSnapshotRefSchema>;

// ============================================================================
// OperationTraceEntry - Single operation execution trace
// ============================================================================

export const SerializedOperationTraceSchema = z.object({
  sequenceId: z.number().int().positive(),
  timestamp: z.string(),
  layer: SerializedTraceLayerSchema,
  operation: z.string(),
  input: z.unknown(),
  output: z.unknown(),
  stateBefore: StateSnapshotRefSchema,
  stateAfter: StateSnapshotRefSchema,
  mode: SerializedScriptedModeSchema.optional(),
  error: z.string().optional(),
});

export type SerializedOperationTrace = z.infer<typeof SerializedOperationTraceSchema>;

// ============================================================================
// MockKernelState - Snapshot of kernel state (for serialization)
// ============================================================================

/**
 * Variant workspace state snapshot for serialization.
 * Captures the variant-level authoring data without circular references.
 */
export const SerializedVariantWorkspaceStateSchema = z.object({
  variantId: z.string(),
  // Presence flags for each authoring section
  hasWorldBase: z.boolean(),
  hasScene: z.boolean(),
  hasPhasePlans: z.boolean(),
  hasRouterLexicon: z.boolean(),
  hasAuditQuestions: z.boolean(),
  hasControlModules: z.boolean(),
  // Optional: actual content (for detailed trace)
  worldBase: z.unknown().optional(),
  scene: z.unknown().optional(),
  phasePlans: z.unknown().optional(),
  routerLexicon: z.unknown().optional(),
  auditQuestions: z.unknown().optional(),
  controlModules: z.unknown().optional(),
});

export type SerializedVariantWorkspaceState = z.infer<typeof SerializedVariantWorkspaceStateSchema>;

/**
 * MockKernel state snapshot for serialization.
 * Captures storyline/repository/session state without circular trace references.
 */
export const SerializedMockKernelStateSchema = z.object({
  packageName: z.string(),
  storylineRepository: StorylineRepositoryFileSchema.nullable(),
  // Simplified variant states (presence flags + optional content)
  variantsById: z.record(z.string(), SerializedVariantWorkspaceStateSchema).optional(),
  runtimeSessions: RuntimeSessionsFileSchema,
});

export type SerializedMockKernelState = z.infer<typeof SerializedMockKernelStateSchema>;

// ============================================================================
// StateSnapshot - Snapshot with reference ID
// ============================================================================

export const SerializedStateSnapshotSchema = z.object({
  snapshotId: z.string(),
  state: SerializedMockKernelStateSchema,
});

export type SerializedStateSnapshot = z.infer<typeof SerializedStateSnapshotSchema>;

// ============================================================================
// E2E Flow ID - Flow identifier enum
// ============================================================================

export const SerializedE2EFlowIdSchema = z.enum([
  'create_from_source_and_continue',
  'branch_from_checkpoint_flow',
  'switch_and_continue',
  'rename_and_verify',
  'legacy_bootstrap_flow',
  'full_storyline_runtime_flow',
]);

export type SerializedE2EFlowId = z.infer<typeof SerializedE2EFlowIdSchema>;

// ============================================================================
// FlowTrace - Complete flow execution trace
// ============================================================================

export const SerializedFlowTraceSchema = z.object({
  schemaVersion: z.number().int().positive(),
  flowId: SerializedE2EFlowIdSchema,
  packageName: z.string(),
  operations: z.array(SerializedOperationTraceSchema),
  snapshots: z.array(SerializedStateSnapshotSchema),
});

export type SerializedFlowTrace = z.infer<typeof SerializedFlowTraceSchema>;

// ============================================================================
// Re-export product types for convenience
// ============================================================================

// These are already defined in product types, but we re-export for simulation consumers
export type StorylineRepositoryFile = z.infer<typeof StorylineRepositoryFileSchema>;
export type StorylineRecord = z.infer<typeof StorylineRecordSchema>;
export type StorylineVariant = z.infer<typeof StorylineVariantSchema>;
export type RuntimeSessionsFile = z.infer<typeof RuntimeSessionsFileSchema>;
export type RuntimeSession = z.infer<typeof RuntimeSessionSchema>;
export type RuntimeCheckpoint = z.infer<typeof RuntimeCheckpointSchema>;