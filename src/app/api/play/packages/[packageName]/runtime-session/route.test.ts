import { beforeEach, describe, expect, it, vi } from 'vitest';

import { stateSnapshotFixture } from '@/app/__tests__/fixtures';

const ensureActiveSession = vi.fn(async () => ({
  sessionId: 'sess-ensure',
}));
const recordAcceptedBeat = vi.fn(async () => ({
  session: {
    sessionId: 'sess-record',
  },
  checkpoint: {
    checkpointId: 'checkpoint-record',
  },
}));
const finalizeRelationshipLayer = vi.fn(async () => undefined);
const resetWorkbench = vi.fn(async () => ({
  sessionId: 'sess-reset',
}));
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
  ensureActiveSession,
  recordAcceptedBeat,
  finalizeRelationshipLayer,
  resetWorkbench,
  RuntimeStoryPackageNotFoundError,
  RuntimeSessionConflictError,
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

    expect(resetWorkbench).toHaveBeenCalledWith('sample-scene');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activeSessionId: expect.any(String),
    });
  });

  it('returns non-2xx with an explicit error payload when reset_workbench persistence fails', async () => {
    resetWorkbench.mockRejectedValueOnce(new Error('disk write failed'));
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
      error: 'disk write failed',
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

    expect(recordAcceptedBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        packageName: 'sample-scene',
        sessionId: 'sess-record',
        checkpointId: 'checkpoint-record',
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

    expect(finalizeRelationshipLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        packageName: 'sample-scene',
        sessionId: 'sess-finalize',
        checkpointId: 'checkpoint-finalize',
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activeSessionId: 'sess-finalize',
      activeCheckpointId: 'checkpoint-finalize',
    });
  });

  it('returns a non-500 conflict status for inactive-session persistence conflicts', async () => {
    recordAcceptedBeat.mockRejectedValueOnce(
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

  it('returns a safe non-500 missing-package error without local path leakage', async () => {
    ensureActiveSession.mockRejectedValueOnce(new RuntimeStoryPackageNotFoundError('missing-pack'));
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

    expect(recordAcceptedBeat).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        'Runtime session payload packageName mismatch: expected "sample-scene", received "other-scene".',
    });
  });
});
