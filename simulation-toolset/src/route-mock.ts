/**
 * RouteMock - HTTP API layer simulation for storyline actions.
 *
 * Reference: simulation-toolset/docs/2026-04-06-phase3-storyline-mock-design.md Section 5
 *
 * RouteMock provides:
 * - HTTP request/response simulation for storyline actions
 * - Route-level tracing (wraps substrate operations)
 * - Scripted control inherited from MockKernel
 */

import type { MockKernel, OperationTraceEntry, ScriptedMode } from './mock-kernel';
import { createSubstrateMock } from './substrate-mock';
import { StorylineActionSchema } from '@/types/storyline-management';

// ============================================================================
// Public Types
// ============================================================================

/**
 * Route trace entry - captures HTTP layer operation.
 */
export interface RouteTraceEntry {
  sequenceId: number;
  timestamp: string;
  layer: 'route';
  operation: string;
  input: unknown;
  output: unknown;
  error?: string;
}

/**
 * Route operation kinds.
 */
export type RouteOperationKind =
  | 'switch_active_storyline'
  | 'create_from_source'
  | 'branch_from_checkpoint'
  | 'rename_display_name';

// ============================================================================
// RouteMock Interface
// ============================================================================

export interface RouteMock {
  /**
   * Get the underlying MockKernel.
   */
  getKernel(): MockKernel;

  /**
   * Bind to a MockKernel instance.
   */
  bindKernel(kernel: MockKernel): void;

  /**
   * Execute route operation via POST request simulation.
   */
  postAction(request: Request): Promise<Response>;

  /**
   * Script the next operation's mode.
   */
  scriptNext(mode: ScriptedMode): void;

  /**
   * Get route-level trace entries.
   */
  getRouteTrace(): RouteTraceEntry[];

  /**
   * Reset route state.
   */
  reset(): void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a JSON response.
 */
function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create an error response.
 */
function errorResponse(message: string, status: number = 500): Response {
  return jsonResponse({ error: message }, status);
}

/**
 * Map error to HTTP status code.
 */
function mapErrorToStatus(error: unknown): number {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes('does not exist') ||
      message.includes('does not resolve') ||
      message.includes('cannot be empty') ||
      message.includes('cannot create storyline from source') ||
      message.includes('headcheckpointid is null') ||
      message.includes('cannot branch storyline from checkpoint') ||
      message.includes('not reachable from source storyline')
    ) {
      return 400;
    }
  }

  return 500;
}

// ============================================================================
// Implementation
// ============================================================================

export function createRouteMock(initialKernel: MockKernel): RouteMock {
  // Mutable kernel reference for bindKernel
  let kernel = initialKernel;
  let routeSequenceCounter = 0;
  const routeTrace: RouteTraceEntry[] = [];

  /**
   * Record a route-level trace entry.
   */
  function recordRouteTrace(
    operation: string,
    input: unknown,
    output: unknown,
    error?: string,
  ): void {
    routeSequenceCounter++;
    const entry: RouteTraceEntry = {
      sequenceId: routeSequenceCounter,
      timestamp: new Date().toISOString(),
      layer: 'route',
      operation,
      input,
      output,
    };
    if (error !== undefined) {
      entry.error = error;
    }
    routeTrace.push(entry);
  }

  return {
    getKernel(): MockKernel {
      return kernel;
    },

    bindKernel(newKernel: MockKernel): void {
      kernel = newKernel;
    },

    async postAction(request: Request): Promise<Response> {
      // Parse request body
      let body: unknown;
      try {
        body = await request.json().catch(() => ({}));
      } catch {
        recordRouteTrace('parse_request', {}, null, 'Invalid JSON body');
        return errorResponse('Invalid JSON body.', 400);
      }

      // Validate action schema
      const parsed = StorylineActionSchema.safeParse(body);
      if (!parsed.success) {
        recordRouteTrace('validate_request', body, null, 'Invalid storyline action payload');
        return errorResponse('Invalid storyline action payload.', 400);
      }

      const action = parsed.data;
      const substrate = createSubstrateMock(kernel);

      try {
        switch (action.kind) {
          case 'switch_active_storyline': {
            const result = await substrate.switchActiveStoryline({
              packageName: kernel.getState().packageName,
              storylineId: action.storylineId,
            });

            const response = {
              kind: action.kind,
              activeStorylineId: result.storyline.storylineId,
            };

            recordRouteTrace(action.kind, action, response);
            return jsonResponse(response, 200);
          }

          case 'create_from_source': {
            // Resolve context first
            const context = await substrate.resolveActiveStorylineContext({
              packageName: kernel.getState().packageName,
              forWrite: true,
            });

            if (!context.repository || !context.runtimeFile) {
              throw new Error('Storyline actions require explicit repository and runtime context.');
            }

            const sourceStoryline = context.repository.storylinesById[action.sourceStorylineId];
            if (!sourceStoryline) {
              throw new Error(`Storyline "${action.sourceStorylineId}" does not exist.`);
            }

            // Build display name
            const storylineCount = Object.keys(context.repository.storylinesById).length;
            const displayName = `故事线 ${storylineCount + 1}`;

            // Create from source
            const created = await substrate.createStorylineFromSource({
              packageName: kernel.getState().packageName,
              sourceStorylineId: action.sourceStorylineId,
              name: displayName,
            });

            // Switch to new storyline
            const switched = await substrate.switchActiveStoryline({
              packageName: kernel.getState().packageName,
              storylineId: created.storyline.storylineId,
            });

            const response = {
              kind: action.kind,
              activeStorylineId: switched.storyline.storylineId,
            };

            recordRouteTrace(action.kind, action, response);
            return jsonResponse(response, 200);
          }

          case 'branch_from_checkpoint': {
            // Resolve context first
            const context = await substrate.resolveActiveStorylineContext({
              packageName: kernel.getState().packageName,
              forWrite: true,
            });

            if (!context.repository || !context.runtimeFile) {
              throw new Error('Storyline actions require explicit repository and runtime context.');
            }

            // Build display name
            const storylineCount = Object.keys(context.repository.storylinesById).length;
            const sourceStoryline = context.repository.storylinesById[action.sourceStorylineId];

            if (!sourceStoryline) {
              throw new Error(`Storyline "${action.sourceStorylineId}" does not exist.`);
            }

            const session = context.runtimeFile.sessionsById[sourceStoryline.activeSessionId];
            const checkpoint = session?.checkpointsById[action.checkpointId];

            const displayName = checkpoint
              ? `故事线 ${storylineCount + 1} · 从 Beat ${checkpoint.acceptedBeatOrdinal} 分出`
              : `故事线 ${storylineCount + 1}`;

            // Branch from checkpoint
            const branched = await substrate.branchStorylineFromCheckpoint({
              packageName: kernel.getState().packageName,
              sourceStorylineId: action.sourceStorylineId,
              checkpointId: action.checkpointId,
              name: displayName,
            });

            // Switch to new storyline
            const switched = await substrate.switchActiveStoryline({
              packageName: kernel.getState().packageName,
              storylineId: branched.storyline.storylineId,
            });

            const response = {
              kind: action.kind,
              activeStorylineId: switched.storyline.storylineId,
            };

            recordRouteTrace(action.kind, action, response);
            return jsonResponse(response, 200);
          }

          case 'rename_display_name': {
            const result = await substrate.updateStorylineDisplayName({
              packageName: kernel.getState().packageName,
              storylineId: action.storylineId,
              nextDisplayName: action.nextDisplayName.trim(),
            });

            const response = {
              kind: action.kind,
              storylineId: result.storyline.storylineId,
              displayName: result.storyline.name,
              updatedAt: result.storyline.updatedAt,
            };

            recordRouteTrace(action.kind, action, response);
            return jsonResponse(response, 200);
          }

          default: {
            // TypeScript exhaustiveness check
            const _exhaustive: never = action;
            return errorResponse(`Unknown action kind`, 400);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to process storyline action.';
        const status = mapErrorToStatus(error);

        recordRouteTrace(action.kind, action, null, message);
        return errorResponse(message, status);
      }
    },

    scriptNext(mode: ScriptedMode): void {
      kernel.scriptNext(mode);
    },

    getRouteTrace(): RouteTraceEntry[] {
      // Return a copy to prevent mutation
      return [...routeTrace];
    },

    reset(): void {
      routeSequenceCounter = 0;
      routeTrace.length = 0;
    },
  };
}