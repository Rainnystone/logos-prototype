import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

import {
  MockKernel,
  MockKernelState,
  OperationTraceEntry,
  ScriptedMode,
  VariantWorkspaceState,
  createMockKernel,
} from '@simulation/mock-kernel';
import {
  RuntimeSessionsFileSchema,
} from '@/types/runtime-sessions';
import {
  StorylineRepositoryFileSchema,
} from '@/types/storyline-repository';

/**
 * Tests for MockKernel - the unified in-memory state machine.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 3.2
 */

// Helper to create minimal runtime sessions
function createEmptyRuntimeSessions(): RuntimeSessionsFile {
  return {
    version: 1,
    activeSessionId: null,
    sessionsById: {},
  };
}

type RuntimeSessionsFile = z.infer<typeof RuntimeSessionsFileSchema>;
type StorylineRepositoryFile = z.infer<typeof StorylineRepositoryFileSchema>;

describe('MockKernel', () => {
  let kernel: MockKernel;

  beforeEach(() => {
    kernel = createMockKernel('test-package');
  });

  afterEach(async () => {
    await kernel.cleanup();
  });

  // ============================================================================
  // Initialization
  // ============================================================================

  describe('initialization', () => {
    it('initializes with package name', () => {
      const state = kernel.getState();
      expect(state.packageName).toBe('test-package');
    });

    it('initializes with null storylineRepository (legacy mode)', () => {
      const state = kernel.getState();
      expect(state.storylineRepository).toBeNull();
    });

    it('initializes with empty runtime sessions', () => {
      const state = kernel.getState();
      expect(state.runtimeSessions.version).toBe(1);
      expect(state.runtimeSessions.activeSessionId).toBeNull();
      expect(state.runtimeSessions.sessionsById).toEqual({});
    });

    it('initializes with empty variantsById', () => {
      const state = kernel.getState();
      expect(state.variantsById).toEqual({});
    });

    it('initializes with empty operationLog', () => {
      const trace = kernel.getTrace();
      expect(trace).toEqual([]);
    });

    it('initializes with empty stateSnapshots', () => {
      const state = kernel.getState();
      expect(state.stateSnapshots).toEqual([]);
    });

    it('initializes with empty scriptedModeQueue', () => {
      const state = kernel.getState();
      expect(state.scriptedModeQueue).toEqual([]);
    });
  });

  // ============================================================================
  // snapshot / restore
  // ============================================================================

  describe('snapshot and restore', () => {
    it('snapshot() returns a StateSnapshotRef', () => {
      const ref = kernel.snapshot();
      expect(typeof ref).toBe('string');
      expect(ref.startsWith('snap-')).toBe(true);
    });

    it('snapshot() captures current state', () => {
      // First snapshot for initial state
      const initialRef = kernel.snapshot();

      // Modify state and take another snapshot
      kernel._testSetState({
        packageName: 'modified-package',
        storylineRepository: null,
        runtimeSessions: createEmptyRuntimeSessions(),
        variantsById: {},
        operationLog: [],
        stateSnapshots: kernel.getState().stateSnapshots, // Preserve existing snapshots
        scriptedModeQueue: [],
      });

      const ref = kernel.snapshot();
      const state = kernel.getState();

      // Now we have 2 snapshots (initial + modified)
      expect(state.stateSnapshots.length).toBe(2);
      const snapshot = state.stateSnapshots.find(s => s.snapshotId === ref);
      expect(snapshot).toBeDefined();
      expect(snapshot!.state.packageName).toBe('modified-package');
    });

    it('restore() reverts to captured state', () => {
      // Take initial snapshot
      const initialRef = kernel.snapshot();

      // Modify state but preserve snapshots
      const currentState = kernel.getState();
      kernel._testSetState({
        packageName: 'modified-package',
        storylineRepository: null,
        runtimeSessions: createEmptyRuntimeSessions(),
        variantsById: {},
        operationLog: [],
        stateSnapshots: currentState.stateSnapshots, // Preserve snapshots
        scriptedModeQueue: [],
      });

      // Verify modification
      expect(kernel.getState().packageName).toBe('modified-package');

      // Restore
      kernel.restore(initialRef);

      // Verify restored to original package name
      expect(kernel.getState().packageName).toBe('test-package');
    });

    it('restore() throws for invalid snapshot ref', () => {
      expect(() => kernel.restore('invalid-snap-ref')).toThrow();
    });

    it('multiple snapshots work correctly', () => {
      // Snapshot at initial state
      const ref1 = kernel.snapshot();
      expect(kernel.getState().packageName).toBe('test-package');

      // Modify and snapshot
      kernel._testSetState({
        packageName: 'state-1',
        storylineRepository: null,
        runtimeSessions: createEmptyRuntimeSessions(),
        variantsById: {},
        operationLog: [],
        stateSnapshots: kernel.getState().stateSnapshots,
        scriptedModeQueue: [],
      });
      const ref2 = kernel.snapshot();

      // Modify and snapshot again
      kernel._testSetState({
        packageName: 'state-2',
        storylineRepository: null,
        runtimeSessions: createEmptyRuntimeSessions(),
        variantsById: {},
        operationLog: [],
        stateSnapshots: kernel.getState().stateSnapshots,
        scriptedModeQueue: [],
      });
      const ref3 = kernel.snapshot();

      // Restore to initial
      kernel.restore(ref1);
      expect(kernel.getState().packageName).toBe('test-package');

      // Restore to state-1
      kernel.restore(ref2);
      expect(kernel.getState().packageName).toBe('state-1');

      // Restore to state-2
      kernel.restore(ref3);
      expect(kernel.getState().packageName).toBe('state-2');
    });
  });

  // ============================================================================
  // execute() state logging
  // ============================================================================

  describe('execute()', () => {
    it('execute() records stateBefore and stateAfter snapshots', async () => {
      await kernel.execute({
        layer: 'substrate',
        operation: 'test_operation',
        input: { foo: 'bar' },
        handler: async () => ({ result: 'success' }),
      });

      const trace = kernel.getTrace();
      expect(trace.length).toBe(1);

      const entry = trace[0]!;
      expect(entry.sequenceId).toBe(1);
      expect(entry.layer).toBe('substrate');
      expect(entry.operation).toBe('test_operation');
      expect(entry.input).toEqual({ foo: 'bar' });
      expect(entry.output).toEqual({ result: 'success' });
      expect(entry.stateBefore).toBeDefined();
      expect(entry.stateAfter).toBeDefined();
      expect(entry.error).toBeUndefined();
    });

    it('execute() increments sequenceId for each operation', async () => {
      await kernel.execute({
        layer: 'substrate',
        operation: 'op1',
        input: {},
        handler: async () => ({ result: 1 }),
      });

      await kernel.execute({
        layer: 'substrate',
        operation: 'op2',
        input: {},
        handler: async () => ({ result: 2 }),
      });

      await kernel.execute({
        layer: 'route',
        operation: 'op3',
        input: {},
        handler: async () => ({ result: 3 }),
      });

      const trace = kernel.getTrace();
      expect(trace.length).toBe(3);
      expect(trace[0]!.sequenceId).toBe(1);
      expect(trace[1]!.sequenceId).toBe(2);
      expect(trace[2]!.sequenceId).toBe(3);
    });

    it('execute() captures error in trace', async () => {
      // Execute should throw but still record trace
      try {
        await kernel.execute({
          layer: 'substrate',
          operation: 'failing_op',
          input: {},
          handler: async () => {
            throw new Error('Operation failed');
          },
        });
      } catch (e) {
        // Expected to throw
        expect((e as Error).message).toBe('Operation failed');
      }

      const trace = kernel.getTrace();
      expect(trace.length).toBe(1);

      const entry = trace[0]!;
      expect(entry.error).toBe('Operation failed');
      expect(entry.output).toBeNull();
    });

    it('execute() records correct layer values', async () => {
      await kernel.execute({
        layer: 'substrate',
        operation: 'substrate_op',
        input: {},
        handler: async () => ({ layer: 'substrate' }),
      });

      await kernel.execute({
        layer: 'route',
        operation: 'route_op',
        input: {},
        handler: async () => ({ layer: 'route' }),
      });

      await kernel.execute({
        layer: 'runtime',
        operation: 'runtime_op',
        input: {},
        handler: async () => ({ layer: 'runtime' }),
      });

      const trace = kernel.getTrace();
      expect(trace[0]!.layer).toBe('substrate');
      expect(trace[1]!.layer).toBe('route');
      expect(trace[2]!.layer).toBe('runtime');
    });

    it('execute() allows handler to modify state', async () => {
      await kernel.execute({
        layer: 'substrate',
        operation: 'modify_state',
        input: {},
        handler: async (kernel) => {
          const currentState = kernel.getState();
          kernel._testSetState({
            packageName: 'modified',
            storylineRepository: null,
            runtimeSessions: createEmptyRuntimeSessions(),
            variantsById: {},
            operationLog: currentState.operationLog,
            stateSnapshots: currentState.stateSnapshots,
            scriptedModeQueue: currentState.scriptedModeQueue,
          });
          return { modified: true };
        },
      });

      const state = kernel.getState();
      expect(state.packageName).toBe('modified');
    });
  });

  // ============================================================================
  // scriptNext() and scriptSequence()
  // ============================================================================

  describe('scriptNext()', () => {
    it('scriptNext(success) makes next execute succeed', async () => {
      kernel.scriptNext({ kind: 'success' });

      await kernel.execute({
        layer: 'substrate',
        operation: 'scripted_op',
        input: { test: true },
        handler: async () => {
          throw new Error('Handler should not be called');
        },
      });

      const trace = kernel.getTrace();
      expect(trace.length).toBe(1);
      expect(trace[0]!.mode).toEqual({ kind: 'success' });
      expect(trace[0]!.output).toEqual({ kind: 'success' });
    });

    it('scriptNext(failure) makes next execute fail', async () => {
      kernel.scriptNext({ kind: 'failure', reason: 'Simulated failure' });

      try {
        await kernel.execute({
          layer: 'substrate',
          operation: 'scripted_failure',
          input: {},
          handler: async () => ({ shouldNotReach: true }),
        });
      } catch (e) {
        expect((e as Error).message).toBe('Simulated failure');
      }

      const trace = kernel.getTrace();
      expect(trace.length).toBe(1);
      expect(trace[0]!.mode).toEqual({ kind: 'failure', reason: 'Simulated failure' });
      expect(trace[0]!.error).toBe('Simulated failure');
    });

    it('scriptNext(error) throws error', async () => {
      kernel.scriptNext({ kind: 'error', message: 'Simulated error' });

      try {
        await kernel.execute({
          layer: 'substrate',
          operation: 'scripted_error',
          input: {},
          handler: async () => ({ shouldNotReach: true }),
        });
      } catch (e) {
        expect((e as Error).message).toBe('Simulated error');
      }

      const trace = kernel.getTrace();
      expect(trace.length).toBe(1);
      expect(trace[0]!.mode).toEqual({ kind: 'error', message: 'Simulated error' });
      expect(trace[0]!.error).toBe('Simulated error');
    });

    it('scriptNext(validation_error) provides fields', async () => {
      kernel.scriptNext({
        kind: 'validation_error',
        fields: ['field1', 'field2'],
      });

      await kernel.execute({
        layer: 'substrate',
        operation: 'scripted_validation',
        input: {},
        handler: async () => ({ shouldNotReach: true }),
      });

      const trace = kernel.getTrace();
      expect(trace.length).toBe(1);
      expect(trace[0]!.mode).toEqual({
        kind: 'validation_error',
        fields: ['field1', 'field2'],
      });
      expect(trace[0]!.output).toEqual({
        kind: 'validation_error',
        fields: ['field1', 'field2'],
      });
    });

    it('scriptNext(conflict) provides details', async () => {
      kernel.scriptNext({
        kind: 'conflict',
        details: 'State conflict detected',
      });

      try {
        await kernel.execute({
          layer: 'substrate',
          operation: 'scripted_conflict',
          input: {},
          handler: async () => ({ shouldNotReach: true }),
        });
      } catch (e) {
        expect((e as Error).message).toBe('State conflict detected');
      }

      const trace = kernel.getTrace();
      expect(trace.length).toBe(1);
      expect(trace[0]!.mode).toEqual({
        kind: 'conflict',
        details: 'State conflict detected',
      });
      expect(trace[0]!.error).toBe('State conflict detected');
    });

    it('scriptNext(stale_state) provides expectedVersion', async () => {
      kernel.scriptNext({
        kind: 'stale_state',
        expectedVersion: 5,
      });

      await kernel.execute({
        layer: 'substrate',
        operation: 'scripted_stale',
        input: {},
        handler: async () => ({ shouldNotReach: true }),
      });

      const trace = kernel.getTrace();
      expect(trace.length).toBe(1);
      expect(trace[0]!.mode).toEqual({
        kind: 'stale_state',
        expectedVersion: 5,
      });
      expect(trace[0]!.output).toEqual({
        kind: 'stale_state',
        expectedVersion: 5,
      });
    });

    it('scriptNext(timeout) adds delay', async () => {
      kernel.scriptNext({ kind: 'timeout', delayMs: 100 });

      const start = Date.now();
      await kernel.execute({
        layer: 'substrate',
        operation: 'scripted_timeout',
        input: {},
        handler: async () => ({ shouldNotReach: true }),
      });
      const elapsed = Date.now() - start;

      // Should have delayed at least close to 100ms
      expect(elapsed).toBeGreaterThanOrEqual(50);

      const trace = kernel.getTrace();
      expect(trace[0]!.mode).toEqual({ kind: 'timeout', delayMs: 100 });
      // Timeout does NOT throw - it succeeds with timeout output
      expect(trace[0]!.error).toBeUndefined();
    });

    it('scriptNext(delayed) delays but succeeds', async () => {
      kernel.scriptNext({ kind: 'delayed', delayMs: 50 });

      const start = Date.now();
      await kernel.execute({
        layer: 'substrate',
        operation: 'scripted_delayed',
        input: {},
        handler: async () => ({ result: 'success' }),
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40);

      const trace = kernel.getTrace();
      expect(trace[0]!.mode).toEqual({ kind: 'delayed', delayMs: 50 });
      expect(trace[0]!.output).toEqual({ result: 'success' });
    });

    it('scriptNext() is consumed after one execute()', async () => {
      kernel.scriptNext({ kind: 'success' });

      await kernel.execute({
        layer: 'substrate',
        operation: 'scripted_op',
        input: {},
        handler: async () => ({ handler: 'result' }),
      });

      await kernel.execute({
        layer: 'substrate',
        operation: 'normal_op',
        input: {},
        handler: async () => ({ handler: 'called' }),
      });

      const trace = kernel.getTrace();
      expect(trace[0]!.mode).toEqual({ kind: 'success' });
      expect(trace[1]!.mode).toBeUndefined();
      expect(trace[1]!.output).toEqual({ handler: 'called' });
    });
  });

  describe('scriptSequence()', () => {
    it('scriptSequence() queues multiple modes', async () => {
      kernel.scriptSequence([
        { kind: 'success' },
        { kind: 'failure', reason: 'reason-2' },
        { kind: 'error', message: 'error-3' },
      ]);

      await kernel.execute({
        layer: 'substrate',
        operation: 'op1',
        input: {},
        handler: async () => ({ h: 1 }),
      });

      try {
        await kernel.execute({
          layer: 'substrate',
          operation: 'op2',
          input: {},
          handler: async () => ({ h: 2 }),
        });
      } catch (e) {
        expect((e as Error).message).toBe('reason-2');
      }

      try {
        await kernel.execute({
          layer: 'substrate',
          operation: 'op3',
          input: {},
          handler: async () => ({ h: 3 }),
        });
      } catch (e) {
        expect((e as Error).message).toBe('error-3');
      }

      const trace = kernel.getTrace();
      expect(trace.length).toBe(3);
      expect(trace[0]!.mode).toEqual({ kind: 'success' });
      expect(trace[1]!.mode).toEqual({ kind: 'failure', reason: 'reason-2' });
      expect(trace[2]!.mode).toEqual({ kind: 'error', message: 'error-3' });
    });

    it('scriptSequence() continues normal after queue exhausted', async () => {
      kernel.scriptSequence([
        { kind: 'success' },
        { kind: 'success' },
      ]);

      await kernel.execute({
        layer: 'substrate',
        operation: 'op1',
        input: {},
        handler: async () => ({ h: 1 }),
      });

      await kernel.execute({
        layer: 'substrate',
        operation: 'op2',
        input: {},
        handler: async () => ({ h: 2 }),
      });

      await kernel.execute({
        layer: 'substrate',
        operation: 'op3',
        input: {},
        handler: async () => ({ actual: 'handler' }),
      });

      const trace = kernel.getTrace();
      expect(trace[0]!.mode).toEqual({ kind: 'success' });
      expect(trace[1]!.mode).toEqual({ kind: 'success' });
      expect(trace[2]!.mode).toBeUndefined();
      expect(trace[2]!.output).toEqual({ actual: 'handler' });
    });

    it('scriptNext() and scriptSequence() work together', async () => {
      kernel.scriptNext({ kind: 'error', message: 'first' });
      kernel.scriptSequence([
        { kind: 'success' },
        { kind: 'failure', reason: 'third' },
      ]);

      try {
        await kernel.execute({
          layer: 'substrate',
          operation: 'op1',
          input: {},
          handler: async () => ({ h: 1 }),
        });
      } catch (e) {
        expect((e as Error).message).toBe('first');
      }

      await kernel.execute({
        layer: 'substrate',
        operation: 'op2',
        input: {},
        handler: async () => ({ h: 2 }),
      });

      try {
        await kernel.execute({
          layer: 'substrate',
          operation: 'op3',
          input: {},
          handler: async () => ({ h: 3 }),
        });
      } catch (e) {
        expect((e as Error).message).toBe('third');
      }

      const trace = kernel.getTrace();
      expect(trace.length).toBe(3);
      expect(trace[0]!.mode).toEqual({ kind: 'error', message: 'first' });
      expect(trace[1]!.mode).toEqual({ kind: 'success' });
      expect(trace[2]!.mode).toEqual({ kind: 'failure', reason: 'third' });
    });
  });

  // ============================================================================
  // getTrace() / exportTrace()
  // ============================================================================

  describe('getTrace()', () => {
    it('returns ordered OperationTraceEntry list', async () => {
      await kernel.execute({
        layer: 'substrate',
        operation: 'op1',
        input: { a: 1 },
        handler: async () => ({ r: 1 }),
      });

      await kernel.execute({
        layer: 'route',
        operation: 'op2',
        input: { b: 2 },
        handler: async () => ({ r: 2 }),
      });

      const trace = kernel.getTrace();

      expect(trace.length).toBe(2);
      expect(trace[0]!.sequenceId).toBeLessThan(trace[1]!.sequenceId);
      expect(trace[0]!.operation).toBe('op1');
      expect(trace[1]!.operation).toBe('op2');
    });

    it('returns immutable copy (no mutation)', async () => {
      await kernel.execute({
        layer: 'substrate',
        operation: 'op',
        input: {},
        handler: async () => ({ r: 1 }),
      });

      const trace1 = kernel.getTrace();
      trace1[0]!.operation = 'mutated';

      const trace2 = kernel.getTrace();
      expect(trace2[0]!.operation).toBe('op');
    });
  });

  describe('exportTrace()', () => {
    it('exports trace in SerializedFlowTrace format', async () => {
      await kernel.execute({
        layer: 'substrate',
        operation: 'test_op',
        input: { x: 1 },
        handler: async () => ({ y: 2 }),
      });

      const exported = kernel.exportTrace();

      expect(exported.schemaVersion).toBe(1);
      expect(exported.flowId).toBe('legacy_bootstrap_flow');
      expect(exported.packageName).toBe('test-package');
      expect(exported.operations.length).toBe(1);
      expect(exported.snapshots.length).toBeGreaterThan(0);
    });

    it('exports can be JSON serialized', async () => {
      await kernel.execute({
        layer: 'substrate',
        operation: 'test_op',
        input: { x: 1 },
        handler: async () => ({ y: 2 }),
      });

      const exported = kernel.exportTrace();
      const json = JSON.stringify(exported);

      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.packageName).toBe('test-package');
    });

    it('exports include all snapshots referenced in operations', async () => {
      await kernel.execute({
        layer: 'substrate',
        operation: 'op1',
        input: {},
        handler: async () => ({ r: 1 }),
      });

      await kernel.execute({
        layer: 'substrate',
        operation: 'op2',
        input: {},
        handler: async () => ({ r: 2 }),
      });

      const exported = kernel.exportTrace();

      const snapshotRefs = new Set<string>();
      for (const op of exported.operations) {
        snapshotRefs.add(op.stateBefore);
        snapshotRefs.add(op.stateAfter);
      }

      const exportedSnapshotIds = new Set(exported.snapshots.map(s => s.snapshotId));

      for (const ref of snapshotRefs) {
        expect(exportedSnapshotIds.has(ref)).toBe(true);
      }
    });
  });

  // ============================================================================
  // reset() and cleanup()
  // ============================================================================

  describe('reset()', () => {
    it('reset() clears all state and trace', async () => {
      await kernel.execute({
        layer: 'substrate',
        operation: 'op1',
        input: {},
        handler: async () => ({ r: 1 }),
      });

      await kernel.execute({
        layer: 'substrate',
        operation: 'op2',
        input: {},
        handler: async () => ({ r: 2 }),
      });

      kernel.snapshot();

      expect(kernel.getTrace().length).toBe(2);
      expect(kernel.getState().stateSnapshots.length).toBeGreaterThan(0);

      kernel.reset();

      expect(kernel.getTrace().length).toBe(0);
      expect(kernel.getState().stateSnapshots.length).toBe(0);
      expect(kernel.getState().packageName).toBe('test-package');
      expect(kernel.getState().storylineRepository).toBeNull();
    });

    it('reset() clears scripted mode queue', async () => {
      kernel.scriptSequence([
        { kind: 'success' },
        { kind: 'error', message: 'err' },
      ]);

      kernel.reset();

      await kernel.execute({
        layer: 'substrate',
        operation: 'test',
        input: {},
        handler: async () => ({ normal: true }),
      });

      const trace = kernel.getTrace();
      expect(trace[0]!.mode).toBeUndefined();
      expect(trace[0]!.output).toEqual({ normal: true });
    });

    it('reset() re-initializes with original package name', async () => {
      // Modify state but keep snapshots to test that reset clears them
      kernel._testSetState({
        packageName: 'modified-package',
        storylineRepository: null,
        runtimeSessions: createEmptyRuntimeSessions(),
        variantsById: {},
        operationLog: [],
        stateSnapshots: kernel.getState().stateSnapshots,
        scriptedModeQueue: [],
      });

      kernel.reset();

      expect(kernel.getState().packageName).toBe('test-package');
    });
  });

  describe('cleanup()', () => {
    it('cleanup() clears state and releases resources', async () => {
      await kernel.execute({
        layer: 'substrate',
        operation: 'op',
        input: {},
        handler: async () => ({ r: 1 }),
      });

      await kernel.cleanup();

      const state = kernel.getState();
      expect(state.packageName).toBe('');
      expect(state.storylineRepository).toBeNull();
      expect(kernel.getTrace().length).toBe(0);
    });

    it('cleanup() is idempotent', async () => {
      await kernel.cleanup();
      await kernel.cleanup();
    });
  });

  // ============================================================================
  // VariantWorkspaceState
  // ============================================================================

  describe('VariantWorkspaceState', () => {
    it('variantsById uses Record<string, VariantWorkspaceState>', async () => {
      const variantState: VariantWorkspaceState = {
        variantId: 'variant-test',
        hasWorldBase: true,
        hasScene: false,
        hasPhasePlans: false,
        hasRouterLexicon: false,
        hasAuditQuestions: false,
        hasControlModules: false,
      };

      await kernel.execute({
        layer: 'substrate',
        operation: 'add_variant',
        input: { variantId: 'variant-test' },
        handler: async (k) => {
          const state = k.getState();
          const newState = {
            ...state,
            variantsById: { ...state.variantsById, 'variant-test': variantState },
          };
          k._testSetState(newState);
          return { added: true };
        },
      });

      const state = kernel.getState();
      expect(state.variantsById['variant-test']).toEqual(variantState);
    });
  });
});