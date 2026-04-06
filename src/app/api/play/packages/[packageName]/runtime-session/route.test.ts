import { beforeEach, describe, expect, it, vi } from 'vitest';

import { stateSnapshotFixture } from '@/app/__tests__/fixtures';

const executeStorylineRuntimeSessionCommand = vi.fn(
  async (_packageName: string, command: { kind: string }) => {
    if (command.kind === 'record_accepted_beat') {
      return {
        activeSessionId: 'sess-record',
        activeCheckpointId: 'checkpoint-record',
      };
    }

    if (command.kind === 'finalize_relationship_layer') {
      return {
        activeSessionId: 'sess-finalize',
        activeCheckpointId: 'checkpoint-finalize',
      };
    }

    if (command.kind === 'reset_workbench') {
      return {
        activeSessionId: 'sess-reset',
      };
    }

    return {
      activeSessionId: 'sess-ensure',
    };
  },
);
class RuntimeStoryPackageNotFoundError extends Error {
  constructor(packageName: string) {
    super(`Story package "${packageName}" was not found.`);
    this.name = 'RuntimeStoryPackageNotFoundError';
  }
}
class RuntimeSessionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeSessionConflictError';
  }
}

vi.mock('@/runtime-sessions/repository', () => ({
  RuntimeStoryPackageNotFoundError,
  RuntimeSessionConflictError,
}));

vi.mock('@/storylines/substrate', () => ({
  executeStorylineRuntimeSessionCommand,
}));

describe('POST runtime-session route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a new active session id when reset_workbench is requested', async () => {
    const { POST } = await import('@/app/api/play/packages/[packageName]/runtime-session/route');

    const response = await POST(
      new Request('http://localhost/api/play/packages/sample-scene/runtime-session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'reset_workbench',
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(executeStorylineRuntimeSessionCommand).toHaveBeenCalledWith('sample-scene', {
      kind: 'reset_workbench',
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activeSessionId: expect.any(String),
    });
  });

  it('returns non-2xx with an explicit error payload when reset_workbench persistence fails', async () => {
    executeStorylineRuntimeSessionCommand.mockRejectedValueOnce(
      new Error(
        'Failed to load runtime sessions for "sample-scene" from /tmp/sample-scene/runtime-sessions.json: disk write failed',
      ),
    );
    const { POST } = await import('@/app/api/play/packages/[packageName]/runtime-session/route');

    const response = await POST(
      new Request('http://localhost/api/play/packages/sample-scene/runtime-session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'reset_workbench',
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to process runtime session command.',
    });
  });

  it('persists accepted beats through the repository bridge', async () => {
    const { POST } = await import('@/app/api/play/packages/[packageName]/runtime-session/route');

    const response = await POST(
      new Request('http://localhost/api/play/packages/sample-scene/runtime-session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'record_accepted_beat',
          payload: {
            packageName: 'sample-scene',
            sessionId: 'sess-record',
            checkpointId: 'checkpoint-record',
            lifecycle: 'in_progress',
            acceptedBeatOrdinal: 1,
            phaseIndex: 1,
            beatIndex: 1,
            sceneId: 'scene-signal-room',
            roundId: 'round-1',
            acceptedTranscript: {
              playerInput: 'Inspect the panel',
              beatText: 'The panel hums with unstable current.',
            },
            stateSnapshot: stateSnapshotFixture,
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'delta',
              stableBackgroundText: 'background',
            },
          },
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(executeStorylineRuntimeSessionCommand).toHaveBeenCalledWith(
      'sample-scene',
      expect.objectContaining({
        kind: 'record_accepted_beat',
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activeSessionId: 'sess-record',
      activeCheckpointId: 'checkpoint-record',
    });
  });

  it('finalizes relationship-layer persistence through the repository bridge', async () => {
    const { POST } = await import('@/app/api/play/packages/[packageName]/runtime-session/route');

    const response = await POST(
      new Request('http://localhost/api/play/packages/sample-scene/runtime-session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'finalize_relationship_layer',
          payload: {
            packageName: 'sample-scene',
            sessionId: 'sess-finalize',
            checkpointId: 'checkpoint-finalize',
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'settled delta',
              stableBackgroundText: 'settled background',
            },
          },
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(executeStorylineRuntimeSessionCommand).toHaveBeenCalledWith(
      'sample-scene',
      expect.objectContaining({
        kind: 'finalize_relationship_layer',
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activeSessionId: 'sess-finalize',
      activeCheckpointId: 'checkpoint-finalize',
    });
  });

  it('returns a non-500 conflict status for inactive-session persistence conflicts', async () => {
    executeStorylineRuntimeSessionCommand.mockRejectedValueOnce(
      new RuntimeSessionConflictError('Cannot record accepted beat for inactive session.'),
    );
    const { POST } = await import('@/app/api/play/packages/[packageName]/runtime-session/route');

    const response = await POST(
      new Request('http://localhost/api/play/packages/sample-scene/runtime-session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'record_accepted_beat',
          payload: {
            packageName: 'sample-scene',
            sessionId: 'sess-record',
            checkpointId: 'checkpoint-record',
            lifecycle: 'in_progress',
            acceptedBeatOrdinal: 1,
            phaseIndex: 1,
            beatIndex: 1,
            sceneId: 'scene-signal-room',
            roundId: 'round-1',
            acceptedTranscript: {
              playerInput: 'Inspect the panel',
              beatText: 'The panel hums with unstable current.',
            },
            stateSnapshot: stateSnapshotFixture,
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'delta',
              stableBackgroundText: 'background',
            },
          },
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Cannot record accepted beat for inactive session.',
    });
  });

  it('returns conflict without leaking internals when duplicate checkpoint ids are rejected', async () => {
    executeStorylineRuntimeSessionCommand.mockRejectedValueOnce(
      new RuntimeSessionConflictError(
        'Checkpoint "checkpoint-record" already exists for active session "sess-record".',
      ),
    );
    const { POST } = await import('@/app/api/play/packages/[packageName]/runtime-session/route');

    const response = await POST(
      new Request('http://localhost/api/play/packages/sample-scene/runtime-session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'record_accepted_beat',
          payload: {
            packageName: 'sample-scene',
            sessionId: 'sess-record',
            checkpointId: 'checkpoint-record',
            lifecycle: 'in_progress',
            acceptedBeatOrdinal: 1,
            phaseIndex: 1,
            beatIndex: 1,
            sceneId: 'scene-signal-room',
            roundId: 'round-1',
            acceptedTranscript: {
              playerInput: 'Inspect the panel',
              beatText: 'The panel hums with unstable current.',
            },
            stateSnapshot: stateSnapshotFixture,
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'delta',
              stableBackgroundText: 'background',
            },
          },
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Checkpoint "checkpoint-record" already exists for active session "sess-record".',
    });
  });

  it('returns a safe non-500 missing-package error without local path leakage', async () => {
    executeStorylineRuntimeSessionCommand.mockRejectedValueOnce(
      new RuntimeStoryPackageNotFoundError('missing-pack'),
    );
    const { POST } = await import('@/app/api/play/packages/[packageName]/runtime-session/route');

    const response = await POST(
      new Request('http://localhost/api/play/packages/missing-pack/runtime-session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'ensure_active_session',
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'missing-pack',
        }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Story package "missing-pack" was not found.',
    });
  });

  it('returns 400 when payload packageName mismatches the route packageName', async () => {
    const { POST } = await import('@/app/api/play/packages/[packageName]/runtime-session/route');

    const response = await POST(
      new Request('http://localhost/api/play/packages/sample-scene/runtime-session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'record_accepted_beat',
          payload: {
            packageName: 'other-scene',
            sessionId: 'sess-record',
            checkpointId: 'checkpoint-record',
            lifecycle: 'in_progress',
            acceptedBeatOrdinal: 1,
            phaseIndex: 1,
            beatIndex: 1,
            sceneId: 'scene-signal-room',
            roundId: 'round-1',
            acceptedTranscript: {
              playerInput: 'Inspect the panel',
              beatText: 'The panel hums with unstable current.',
            },
            stateSnapshot: stateSnapshotFixture,
            lastStableRelationshipLayer: {
              highlightedDeltasText: 'delta',
              stableBackgroundText: 'background',
            },
          },
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(executeStorylineRuntimeSessionCommand).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        'Runtime session payload packageName mismatch: expected "sample-scene", received "other-scene".',
    });
  });
});
