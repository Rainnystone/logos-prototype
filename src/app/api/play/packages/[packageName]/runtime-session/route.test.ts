import { describe, expect, it, vi } from 'vitest';

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

vi.mock('@/runtime-sessions/repository', () => ({
  ensureActiveSession,
  recordAcceptedBeat,
  finalizeRelationshipLayer,
  resetWorkbench,
}));

describe('POST runtime-session route', () => {
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
});
