import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import type { MockKernel } from '@simulation/mock-kernel';
import { createMockKernel } from '@simulation/mock-kernel';
import { createSubstrateMock } from '@simulation/substrate-mock';
import { createMockFixtureBuilder } from '@simulation/mock-fixture-builder';
import { RouteMock, createRouteMock } from '@simulation/route-mock';
import type { StateSnapshot, RelationshipLayer } from '@/types';

/**
 * Tests for RouteMock - HTTP API layer simulation.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 5
 */

// Helper to create a default state snapshot
function createDefaultStateSnapshot(): StateSnapshot {
  return {
    sceneState: {
      sceneId: 'scene_001',
      currentPhaseIndex: 1,
      currentBeatIndexInPhase: 1,
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
      currentBeatText: 'test beat',
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

// Helper to create a mock request
function createMockRequest(body: unknown): Request {
  return new Request('http://localhost/api/authoring/packages/test-package/storylines/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Helper to parse JSON response
async function getResponseJson(response: Response): Promise<unknown> {
  return response.json();
}

describe('RouteMock', () => {
  let kernel: MockKernel;
  let route: RouteMock;

  beforeEach(() => {
    kernel = createMockKernel('test-package');
    route = createRouteMock(kernel);
  });

  afterEach(async () => {
    await kernel.cleanup();
  });

  // ============================================================================
  // Initialization
  // ============================================================================

  describe('initialization', () => {
    it('binds to MockKernel', () => {
      expect(route.getKernel()).toBe(kernel);
    });

    it('can rebind to different kernel', () => {
      const newKernel = createMockKernel('other-package');
      route.bindKernel(newKernel);
      expect(route.getKernel()).toBe(newKernel);
    });
  });

  // ============================================================================
  // switch_active_storyline
  // ============================================================================

  describe('switch_active_storyline', () => {
    beforeEach(async () => {
      const builder = createMockFixtureBuilder(kernel);
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);
    });

    it('switches to target storyline and returns JSON response', async () => {
      const request = createMockRequest({
        kind: 'switch_active_storyline',
        storylineId: 'storyline_alt',
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(200);
      const data = await getResponseJson(response) as { kind: string; activeStorylineId: string };
      expect(data.kind).toBe('switch_active_storyline');
      expect(data.activeStorylineId).toBe('storyline_alt');
    });

    it('returns 400 for non-existent storyline', async () => {
      const request = createMockRequest({
        kind: 'switch_active_storyline',
        storylineId: 'nonexistent',
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(400);
    });

    it('records route-level trace entry', async () => {
      const request = createMockRequest({
        kind: 'switch_active_storyline',
        storylineId: 'storyline_alt',
      });

      await route.postAction(request);

      const trace = route.getRouteTrace();
      expect(trace.length).toBeGreaterThan(0);
      expect(trace.some(e => e.layer === 'route')).toBe(true);
    });
  });

  // ============================================================================
  // create_from_source
  // ============================================================================

  describe('create_from_source', () => {
    beforeEach(async () => {
      const substrate = createSubstrateMock(kernel);
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      // Add a checkpoint so we can create from source
      await substrate.executeStorylineRuntimeSessionCommand({
        packageName: 'test-package',
        command: {
          kind: 'record_accepted_beat',
          payload: {
            acceptedBeatOrdinal: 1,
            sceneId: 'scene_001',
            phaseIndex: 1,
            beatIndex: 1,
            roundId: 'round_001',
            acceptedTranscript: {
              playerInput: 'test',
              beatText: 'test beat',
            },
            stateSnapshot: createDefaultStateSnapshot(),
          },
        },
      });
    });

    it('creates new storyline from source and switches to it', async () => {
      const request = createMockRequest({
        kind: 'create_from_source',
        sourceStorylineId: 'storyline_main',
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(200);
      const data = await getResponseJson(response) as { kind: string; activeStorylineId: string };
      expect(data.kind).toBe('create_from_source');
      expect(data.activeStorylineId).not.toBe('storyline_main');
    });

    it('returns 400 for non-existent source storyline', async () => {
      const request = createMockRequest({
        kind: 'create_from_source',
        sourceStorylineId: 'nonexistent',
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(400);
    });

    it('records route-level trace entry', async () => {
      const request = createMockRequest({
        kind: 'create_from_source',
        sourceStorylineId: 'storyline_main',
      });

      await route.postAction(request);

      const trace = route.getRouteTrace();
      expect(trace.length).toBeGreaterThan(0);
      expect(trace.some(e => e.layer === 'route')).toBe(true);
    });
  });

  // ============================================================================
  // branch_from_checkpoint
  // ============================================================================

  describe('branch_from_checkpoint', () => {
    let checkpointId: string;

    beforeEach(async () => {
      const substrate = createSubstrateMock(kernel);
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      // Create a checkpoint
      const result = await substrate.executeStorylineRuntimeSessionCommand({
        packageName: 'test-package',
        command: {
          kind: 'record_accepted_beat',
          payload: {
            acceptedBeatOrdinal: 1,
            sceneId: 'scene_001',
            phaseIndex: 1,
            beatIndex: 1,
            roundId: 'round_001',
            acceptedTranscript: {
              playerInput: 'test',
              beatText: 'test beat',
            },
            stateSnapshot: createDefaultStateSnapshot(),
          },
        },
      });

      checkpointId = result.activeCheckpointId!;
    });

    it('branches from checkpoint and switches to new storyline', async () => {
      const request = createMockRequest({
        kind: 'branch_from_checkpoint',
        sourceStorylineId: 'storyline_main',
        checkpointId: checkpointId,
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(200);
      const data = await getResponseJson(response) as { kind: string; activeStorylineId: string };
      expect(data.kind).toBe('branch_from_checkpoint');
      expect(data.activeStorylineId).not.toBe('storyline_main');
    });

    it('returns 400 for non-existent checkpoint', async () => {
      const request = createMockRequest({
        kind: 'branch_from_checkpoint',
        sourceStorylineId: 'storyline_main',
        checkpointId: 'nonexistent_checkpoint',
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 for non-existent source storyline', async () => {
      const request = createMockRequest({
        kind: 'branch_from_checkpoint',
        sourceStorylineId: 'nonexistent',
        checkpointId: checkpointId,
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(400);
    });

    it('records route-level trace entry', async () => {
      const request = createMockRequest({
        kind: 'branch_from_checkpoint',
        sourceStorylineId: 'storyline_main',
        checkpointId: checkpointId,
      });

      await route.postAction(request);

      const trace = route.getRouteTrace();
      expect(trace.length).toBeGreaterThan(0);
      expect(trace.some(e => e.layer === 'route')).toBe(true);
    });
  });

  // ============================================================================
  // rename_display_name
  // ============================================================================

  describe('rename_display_name', () => {
    beforeEach(async () => {
      const substrate = createSubstrateMock(kernel);
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });
    });

    it('renames storyline and returns updated info', async () => {
      const request = createMockRequest({
        kind: 'rename_display_name',
        storylineId: 'storyline_main',
        nextDisplayName: 'New Name',
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(200);
      const data = await getResponseJson(response) as {
        kind: string;
        storylineId: string;
        displayName: string;
      };
      expect(data.kind).toBe('rename_display_name');
      expect(data.storylineId).toBe('storyline_main');
      expect(data.displayName).toBe('New Name');
    });

    it('returns 400 for empty display name', async () => {
      const request = createMockRequest({
        kind: 'rename_display_name',
        storylineId: 'storyline_main',
        nextDisplayName: '',
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 for non-existent storyline', async () => {
      const request = createMockRequest({
        kind: 'rename_display_name',
        storylineId: 'nonexistent',
        nextDisplayName: 'New Name',
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(400);
    });

    it('records route-level trace entry', async () => {
      const request = createMockRequest({
        kind: 'rename_display_name',
        storylineId: 'storyline_main',
        nextDisplayName: 'New Name',
      });

      await route.postAction(request);

      const trace = route.getRouteTrace();
      expect(trace.length).toBeGreaterThan(0);
      expect(trace.some(e => e.layer === 'route')).toBe(true);
    });
  });

  // ============================================================================
  // Request Validation
  // ============================================================================

  describe('request validation', () => {
    it('returns 400 for invalid JSON body', async () => {
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid action kind', async () => {
      const request = createMockRequest({
        kind: 'invalid_action',
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 for missing required fields', async () => {
      const request = createMockRequest({
        kind: 'switch_active_storyline',
        // Missing storylineId
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // Scripted Mode
  // ============================================================================

  describe('scripted mode', () => {
    it('scriptNext propagates from kernel to route', async () => {
      const builder = createMockFixtureBuilder(kernel);
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
      ]);

      kernel.scriptNext({ kind: 'error', message: 'Test error' });

      const request = createMockRequest({
        kind: 'switch_active_storyline',
        storylineId: 'storyline_main',
      });

      const response = await route.postAction(request);

      expect(response.status).toBe(500);
    });

    it('scriptNext(success) records success in trace', async () => {
      const builder = createMockFixtureBuilder(kernel);
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
      ]);

      kernel.scriptNext({ kind: 'success' });

      const request = createMockRequest({
        kind: 'switch_active_storyline',
        storylineId: 'storyline_main',
      });

      await route.postAction(request);

      // Scripted success records { kind: 'success' } in trace
      const trace = kernel.getTrace();
      expect(trace.length).toBeGreaterThan(0);
      expect(trace[0]!.mode).toEqual({ kind: 'success' });
      expect(trace[0]!.output).toEqual({ kind: 'success' });
    });
  });

  // ============================================================================
  // Trace Access
  // ============================================================================

  describe('getRouteTrace()', () => {
    it('returns only route-level trace entries', async () => {
      const builder = createMockFixtureBuilder(kernel);
      builder.withMultipleStorylines([
        { storylineId: 'storyline_main', name: 'Main Line' },
        { storylineId: 'storyline_alt', name: 'Alternate Line' },
      ]);

      const request = createMockRequest({
        kind: 'switch_active_storyline',
        storylineId: 'storyline_alt',
      });

      await route.postAction(request);

      const trace = route.getRouteTrace();
      // Should have at least one route entry
      expect(trace.length).toBeGreaterThan(0);

      // All entries should be route-level
      for (const entry of trace) {
        expect(entry.layer).toBe('route');
      }
    });

    it('captures multiple route operations', async () => {
      const substrate = createSubstrateMock(kernel);
      await substrate.resolveActiveStorylineContext({
        packageName: 'test-package',
        forWrite: true,
      });

      // Rename
      await route.postAction(createMockRequest({
        kind: 'rename_display_name',
        storylineId: 'storyline_main',
        nextDisplayName: 'New Name',
      }));

      // Switch to same (idempotent)
      await route.postAction(createMockRequest({
        kind: 'switch_active_storyline',
        storylineId: 'storyline_main',
      }));

      const trace = route.getRouteTrace();
      expect(trace.length).toBeGreaterThanOrEqual(2);
    });
  });
});