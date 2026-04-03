import { describe, expect, it, vi } from 'vitest';

import {
  buildOrchestratorRestoreInput,
  createBrowserRuntimeSessionClient,
  createBrowserGossipelogCycleRunner,
  createTrackedWorkbenchAdapter,
} from '@/app/play/runtime';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import { stateSnapshotFixture, storyPackageFixture } from '@/app/__tests__/fixtures';
import type { FinalizeRelationshipLayerInput, RecordAcceptedBeatInput } from '@/runtime-sessions/repository';
import type { PlayRuntimeSessionView } from '@/runtime-sessions/views';

function createReporter() {
  return {
    onStatusChange: vi.fn(),
    onRewriteFeedback: vi.fn(),
    onUsage: vi.fn(),
  };
}

describe('createTrackedWorkbenchAdapter', () => {
  it('preserves existing gossipelog methods on the wrapped adapter', () => {
    const gossipelogUpdate = vi.fn(async () => ({
      involvedRoleIds: [],
      invocationNoOp: true,
      edgeUpdates: [],
    }));
    const gossipelogInjection = vi.fn(async () => ({
      highlightedDeltasText: 'delta',
      stableBackgroundText: 'background',
    }));
    const adapter: LLMAdapter = {
      collapse: vi.fn(async () => ({
        alpha: 'alpha',
        beta: 'beta',
        inferenceTrace: 'trace',
      })),
      gossipelogUpdate,
      gossipelogInjection,
    };

    const trackedAdapter = createTrackedWorkbenchAdapter(
      adapter,
      storyPackageFixture.auditQuestionSet,
      createReporter(),
    );

    expect(trackedAdapter.gossipelogUpdate).toBe(gossipelogUpdate);
    expect(trackedAdapter.gossipelogInjection).toBe(gossipelogInjection);
  });

  it('injects tagged fallback gossipelog methods when they are missing', async () => {
    const adapter: LLMAdapter = {
      collapse: vi.fn(async () => ({
        alpha: 'alpha',
        beta: 'beta',
        inferenceTrace: 'trace',
      })),
    };

    const trackedAdapter = createTrackedWorkbenchAdapter(
      adapter,
      storyPackageFixture.auditQuestionSet,
      createReporter(),
    );

    expect(trackedAdapter.gossipelogUpdate).toBeDefined();
    expect(trackedAdapter.gossipelogInjection).toBeDefined();
    expect(
      (trackedAdapter.gossipelogUpdate as { __logosGossipelogFallback?: boolean })
        .__logosGossipelogFallback,
    ).toBe(true);
    expect(
      (trackedAdapter.gossipelogInjection as { __logosGossipelogFallback?: boolean })
        .__logosGossipelogFallback,
    ).toBe(true);
    await expect(trackedAdapter.gossipelogUpdate?.({} as never)).resolves.toEqual({
      involvedRoleIds: [],
      invocationNoOp: true,
      edgeUpdates: [],
    });
    await expect(trackedAdapter.gossipelogInjection?.({} as never)).resolves.toEqual({
      highlightedDeltasText: '',
      stableBackgroundText: '',
    });
  });
});

describe('createBrowserGossipelogCycleRunner', () => {
  it('posts the accepted beat and adapter config to the server bridge', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          updateRequest: {
            acceptedBeatText: 'Accepted beat text',
          },
          updateResult: {
            involvedRoleIds: [],
            invocationNoOp: true,
            edgeUpdates: [],
          },
          injectionRequest: {
            sceneCastRoleIds: [],
          },
          relationshipLayer: {
            highlightedDeltasText: 'delta',
            stableBackgroundText: 'background',
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    });
    const adapterConfig = {
      provider: 'openai-compatible' as const,
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://api.example.com/v1',
        model: 'demo-model',
      },
    };
    const runner = createBrowserGossipelogCycleRunner({
      adapterConfig,
      fetchImpl: fetchMock,
    });

    const result = await runner({
      adapter: {
        gossipelogUpdate: vi.fn(),
        gossipelogInjection: vi.fn(),
      },
      storyPackageName: 'sample-scene',
      storyPackage: storyPackageFixture,
      acceptedBeatText: 'Accepted beat text',
      roundId: 'round-1',
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'previous delta',
        stableBackgroundText: 'previous background',
      },
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/play/gossipelog', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        storyPackageName: 'sample-scene',
        adapterConfig,
        acceptedBeatText: 'Accepted beat text',
        roundId: 'round-1',
        lastStableRelationshipLayer: {
          highlightedDeltasText: 'previous delta',
          stableBackgroundText: 'previous background',
        },
      }),
    });
    expect(result.relationshipLayer).toEqual({
      highlightedDeltasText: 'delta',
      stableBackgroundText: 'background',
    });
  });
});

describe('createBrowserRuntimeSessionClient', () => {
  it('posts accepted-beat persistence commands to the runtime-session bridge route', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          activeSessionId: 'sess-1',
          activeCheckpointId: 'checkpoint-1',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    });
    const client = createBrowserRuntimeSessionClient({
      storyPackageName: 'sample-scene',
      fetchImpl: fetchMock,
    });
    const input: RecordAcceptedBeatInput = {
      packageName: 'sample-scene',
      sessionId: 'sess-1',
      checkpointId: 'checkpoint-1',
      lifecycle: 'in_progress',
      acceptedBeatOrdinal: 1,
      phaseIndex: 1,
      beatIndex: 1,
      sceneId: 'scene-sample',
      roundId: 'round-1',
      acceptedTranscript: {
        playerInput: 'Look around',
        beatText: 'You step into the room.',
      },
      stateSnapshot: stateSnapshotFixture,
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'delta',
        stableBackgroundText: 'background',
      },
    };

    const result = await client.recordAcceptedBeat(input);

    expect(fetchMock).toHaveBeenCalledWith('/api/play/packages/sample-scene/runtime-session', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        kind: 'record_accepted_beat',
        payload: input,
      }),
    });
    expect(result).toEqual({
      activeSessionId: 'sess-1',
      activeCheckpointId: 'checkpoint-1',
    });
  });

  it('throws an explicit accepted-beat persistence error when the bridge returns a 500 payload', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: 'disk write failed',
        }),
        {
          status: 500,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    });
    const client = createBrowserRuntimeSessionClient({
      storyPackageName: 'sample-scene',
      fetchImpl: fetchMock,
    });
    const input: RecordAcceptedBeatInput = {
      packageName: 'sample-scene',
      sessionId: 'sess-1',
      checkpointId: 'checkpoint-1',
      lifecycle: 'in_progress',
      acceptedBeatOrdinal: 1,
      phaseIndex: 1,
      beatIndex: 1,
      sceneId: 'scene-sample',
      roundId: 'round-1',
      acceptedTranscript: {
        playerInput: 'Look around',
        beatText: 'You step into the room.',
      },
      stateSnapshot: stateSnapshotFixture,
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'delta',
        stableBackgroundText: 'background',
      },
    };

    await expect(client.recordAcceptedBeat(input)).rejects.toThrow(
      'Failed to persist accepted beat: disk write failed',
    );
  });

  it('posts relationship-layer finalization commands and returns checkpoint pointers', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          activeSessionId: 'sess-2',
          activeCheckpointId: 'checkpoint-2',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    });
    const client = createBrowserRuntimeSessionClient({
      storyPackageName: 'sample-scene',
      fetchImpl: fetchMock,
    });
    const input: FinalizeRelationshipLayerInput = {
      packageName: 'sample-scene',
      sessionId: 'sess-2',
      checkpointId: 'checkpoint-2',
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'settled delta',
        stableBackgroundText: 'settled background',
      },
    };

    const result = await client.finalizeRelationshipLayer(input);

    expect(fetchMock).toHaveBeenCalledWith('/api/play/packages/sample-scene/runtime-session', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        kind: 'finalize_relationship_layer',
        payload: input,
      }),
    });
    expect(result).toEqual({
      activeSessionId: 'sess-2',
      activeCheckpointId: 'checkpoint-2',
    });
  });

  it('throws before fetch when accepted-beat payload packageName mismatches the configured package', async () => {
    const fetchMock = vi.fn();
    const client = createBrowserRuntimeSessionClient({
      storyPackageName: 'sample-scene',
      fetchImpl: fetchMock,
    });

    const input: RecordAcceptedBeatInput = {
      packageName: 'other-scene',
      sessionId: 'sess-1',
      checkpointId: 'checkpoint-1',
      lifecycle: 'in_progress',
      acceptedBeatOrdinal: 1,
      phaseIndex: 1,
      beatIndex: 1,
      sceneId: 'scene-sample',
      roundId: 'round-1',
      acceptedTranscript: {
        playerInput: 'Look around',
        beatText: 'You step into the room.',
      },
      stateSnapshot: stateSnapshotFixture,
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'delta',
        stableBackgroundText: 'background',
      },
    };

    await expect(client.recordAcceptedBeat(input)).rejects.toThrow(
      'Failed to persist accepted beat: Runtime session packageName mismatch: expected "sample-scene", received "other-scene".',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('buildOrchestratorRestoreInput', () => {
  it('maps the continuity view snapshot, accepted history, relationship layer, and completion flag', () => {
    const restorableView = {
      kind: 'restorable',
      activeSessionId: 'sess_restore',
      activeCheckpointId: 'chk_restore',
      beatHistory: [
        {
          beatNumber: 1,
          playerInput: 'Opening hook',
          beatText: 'The operator enters the sealed corridor.',
        },
        {
          beatNumber: 2,
          playerInput: 'Inspect the relay cabinet.',
          beatText: 'The relay clicks and the vent light turns red.',
        },
      ],
      stateSnapshot: stateSnapshotFixture,
      relationshipSummary: {
        highlightedDeltasText: 'delta restore',
        stableBackgroundText: 'background restore',
        source: 'checkpoint',
      },
      lifecycle: 'complete',
    } as const satisfies PlayRuntimeSessionView;

    expect(buildOrchestratorRestoreInput(restorableView)).toEqual({
      currentState: stateSnapshotFixture,
      acceptedHistory: [
        { role: 'user', content: 'Opening hook' },
        { role: 'assistant', content: 'The operator enters the sealed corridor.' },
        { role: 'user', content: 'Inspect the relay cabinet.' },
        { role: 'assistant', content: 'The relay clicks and the vent light turns red.' },
      ],
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'delta restore',
        stableBackgroundText: 'background restore',
      },
      sceneComplete: true,
      sessionId: 'sess_restore',
      checkpointId: 'chk_restore',
    });
  });
});
