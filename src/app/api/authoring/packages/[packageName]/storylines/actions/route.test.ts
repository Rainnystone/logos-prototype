import { afterEach, describe, expect, it, vi } from 'vitest';
import * as storylineManagementTypes from '@/types/storyline-management';
import { RuntimeStoryPackageNotFoundError } from '@/runtime-sessions/repository';

const mocks = vi.hoisted(() => {
  const resolveActiveStorylineContext = vi.fn(async () => ({
    packageName: 'sample-scene',
    repository: {
      version: 1,
      activeStorylineId: 'storyline_main',
      storylinesById: {
        storyline_main: {
          storylineId: 'storyline_main',
          name: 'Main Line',
          status: 'active',
          sourceCheckpointId: null,
          headCheckpointId: 'chk_02',
          variantId: 'variant_main',
          activeSessionId: 'sess_main',
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
        },
        storyline_alt: {
          storylineId: 'storyline_alt',
          name: 'Alt Line',
          status: 'active',
          sourceCheckpointId: 'chk_01',
          headCheckpointId: 'chk_01',
          variantId: 'variant_alt',
          activeSessionId: 'sess_alt',
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
        },
      },
      variantsById: {
        variant_main: {
          variantId: 'variant_main',
          workspaceRoot: 'variants/variant_main',
          createdFromStorylineId: null,
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
        },
        variant_alt: {
          variantId: 'variant_alt',
          workspaceRoot: 'variants/variant_alt',
          createdFromStorylineId: 'storyline_main',
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
        },
      },
    },
    storyline: {
      storylineId: 'storyline_main',
      headCheckpointId: 'chk_02',
      variantId: 'variant_main',
      activeSessionId: 'sess_main',
    },
    variant: {
      variantId: 'variant_main',
      workspaceRoot: 'variants/variant_main',
    },
    session: {
      sessionId: 'sess_main',
      lifecycle: 'in_progress',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
      headCheckpointId: 'chk_02',
      activeCheckpointId: 'chk_02',
      orderedCheckpointIds: ['chk_01', 'chk_02'],
      checkpointsById: {
        chk_01: {
          checkpointId: 'chk_01',
          acceptedBeatOrdinal: 1,
          sceneId: 'scene_opening',
          phaseIndex: 1,
          beatIndex: 1,
          roundId: 'round_01',
          acceptedTranscript: {
            playerInput: 'input-1',
            beatText: 'beat-1',
          },
          stateSnapshot: {},
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'delta-1',
            stableBackgroundText: 'background-1',
          },
          createdAt: '2026-04-06T00:00:00.000Z',
        },
        chk_02: {
          checkpointId: 'chk_02',
          acceptedBeatOrdinal: 2,
          sceneId: 'scene_opening',
          phaseIndex: 1,
          beatIndex: 2,
          roundId: 'round_02',
          acceptedTranscript: {
            playerInput: 'input-2',
            beatText: 'beat-2',
          },
          stateSnapshot: {},
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'delta-2',
            stableBackgroundText: 'background-2',
          },
          createdAt: '2026-04-06T00:00:00.000Z',
        },
      },
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'delta-main',
        stableBackgroundText: 'background-main',
      },
    },
    runtimeFile: {
      version: 1,
      activeSessionId: 'sess_main',
      sessionsById: {
        sess_main: {
          sessionId: 'sess_main',
          lifecycle: 'in_progress',
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
          headCheckpointId: 'chk_02',
          activeCheckpointId: 'chk_02',
          orderedCheckpointIds: ['chk_01', 'chk_02'],
          checkpointsById: {
            chk_01: {
              checkpointId: 'chk_01',
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_opening',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_01',
              acceptedTranscript: {
                playerInput: 'input-1',
                beatText: 'beat-1',
              },
              stateSnapshot: {},
              lastStableRelationshipLayer: {
                highlightedDeltasText: 'delta-1',
                stableBackgroundText: 'background-1',
              },
              createdAt: '2026-04-06T00:00:00.000Z',
            },
            chk_02: {
              checkpointId: 'chk_02',
              acceptedBeatOrdinal: 2,
              sceneId: 'scene_opening',
              phaseIndex: 1,
              beatIndex: 2,
              roundId: 'round_02',
              acceptedTranscript: {
                playerInput: 'input-2',
                beatText: 'beat-2',
              },
              stateSnapshot: {},
              lastStableRelationshipLayer: {
                highlightedDeltasText: 'delta-2',
                stableBackgroundText: 'background-2',
              },
              createdAt: '2026-04-06T00:00:00.000Z',
            },
          },
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'delta-main',
            stableBackgroundText: 'background-main',
          },
        },
        sess_alt: {
          sessionId: 'sess_alt',
          lifecycle: 'in_progress',
          createdAt: '2026-04-06T00:10:00.000Z',
          updatedAt: '2026-04-06T00:10:00.000Z',
          headCheckpointId: 'chk_01',
          activeCheckpointId: 'chk_01',
          orderedCheckpointIds: ['chk_01'],
          checkpointsById: {
            chk_01: {
              checkpointId: 'chk_01',
              acceptedBeatOrdinal: 1,
              sceneId: 'scene_opening',
              phaseIndex: 1,
              beatIndex: 1,
              roundId: 'round_01',
              acceptedTranscript: {
                playerInput: 'input-1',
                beatText: 'beat-1',
              },
              stateSnapshot: {},
              lastStableRelationshipLayer: {
                highlightedDeltasText: 'delta-1',
                stableBackgroundText: 'background-1',
              },
              createdAt: '2026-04-06T00:00:00.000Z',
            },
          },
          lastStableRelationshipLayer: {
            highlightedDeltasText: 'delta-alt',
            stableBackgroundText: 'background-alt',
          },
        },
      },
    },
  }));

  const updateStorylineDisplayName = vi.fn(async () => ({
    repository: {
      version: 1,
      activeStorylineId: 'storyline_main',
      storylinesById: {
        storyline_main: {
          storylineId: 'storyline_main',
          name: 'Side Route',
          status: 'active',
          sourceCheckpointId: null,
          headCheckpointId: 'chk_02',
          variantId: 'variant_main',
          activeSessionId: 'sess_main',
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:10:00.000Z',
        },
      },
      variantsById: {
        variant_main: {
          variantId: 'variant_main',
          workspaceRoot: 'variants/variant_main',
          createdFromStorylineId: null,
          createdAt: '2026-04-06T00:00:00.000Z',
          updatedAt: '2026-04-06T00:00:00.000Z',
        },
      },
    },
    storyline: {
      storylineId: 'storyline_main',
      name: 'Side Route',
      status: 'active',
      sourceCheckpointId: null,
      headCheckpointId: 'chk_02',
      variantId: 'variant_main',
      activeSessionId: 'sess_main',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:10:00.000Z',
    },
    variant: {
      variantId: 'variant_main',
      workspaceRoot: 'variants/variant_main',
      createdFromStorylineId: null,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
    session: {
      sessionId: 'sess_main',
      lifecycle: 'in_progress',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
      headCheckpointId: 'chk_02',
      activeCheckpointId: 'chk_02',
      orderedCheckpointIds: ['chk_01', 'chk_02'],
      checkpointsById: {},
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'delta-main',
        stableBackgroundText: 'background-main',
      },
    },
    authoredRoot: 'variants/variant_main',
  }));

  const createStorylineFromSource = vi.fn(async () => ({
    repository: {
      version: 1,
      activeStorylineId: 'storyline_created',
      storylinesById: {},
      variantsById: {},
    },
    storyline: {
      storylineId: 'storyline_created',
      name: '故事线 2',
      status: 'active',
      sourceCheckpointId: 'chk_02',
      headCheckpointId: 'chk_02',
      variantId: 'variant_created',
      activeSessionId: 'sess_created',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
    variant: {
      variantId: 'variant_created',
      workspaceRoot: 'variants/variant_created',
      createdFromStorylineId: 'storyline_main',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
    session: {
      sessionId: 'sess_created',
      lifecycle: 'in_progress',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
      headCheckpointId: 'chk_02',
      activeCheckpointId: 'chk_02',
      orderedCheckpointIds: ['chk_02'],
      checkpointsById: {},
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'delta-created',
        stableBackgroundText: 'background-created',
      },
    },
    authoredRoot: 'variants/variant_created',
  }));

  const branchStorylineFromCheckpoint = vi.fn(async () => ({
    repository: {
      version: 1,
      activeStorylineId: 'storyline_branched',
      storylinesById: {},
      variantsById: {},
    },
    storyline: {
      storylineId: 'storyline_branched',
      name: '从 Beat 2 分出',
      status: 'active',
      sourceCheckpointId: 'chk_02',
      headCheckpointId: 'chk_02',
      variantId: 'variant_branched',
      activeSessionId: 'sess_branched',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
    variant: {
      variantId: 'variant_branched',
      workspaceRoot: 'variants/variant_branched',
      createdFromStorylineId: 'storyline_main',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
    session: {
      sessionId: 'sess_branched',
      lifecycle: 'in_progress',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
      headCheckpointId: 'chk_02',
      activeCheckpointId: 'chk_02',
      orderedCheckpointIds: ['chk_02'],
      checkpointsById: {},
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'delta-branched',
        stableBackgroundText: 'background-branched',
      },
    },
    authoredRoot: 'variants/variant_branched',
  }));

  const switchActiveStoryline = vi.fn(async () => ({
    repository: {
      version: 1,
      activeStorylineId: 'storyline_alt',
      storylinesById: {},
      variantsById: {},
    },
    storyline: {
      storylineId: 'storyline_alt',
      name: 'Alt Line',
      status: 'active',
      sourceCheckpointId: 'chk_01',
      headCheckpointId: 'chk_01',
      variantId: 'variant_alt',
      activeSessionId: 'sess_alt',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
    variant: {
      variantId: 'variant_alt',
      workspaceRoot: 'variants/variant_alt',
      createdFromStorylineId: 'storyline_main',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
    session: {
      sessionId: 'sess_alt',
      lifecycle: 'in_progress',
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
      headCheckpointId: 'chk_01',
      activeCheckpointId: 'chk_01',
      orderedCheckpointIds: ['chk_01'],
      checkpointsById: {},
      lastStableRelationshipLayer: {
        highlightedDeltasText: 'delta-alt',
        stableBackgroundText: 'background-alt',
      },
    },
    authoredRoot: 'variants/variant_alt',
  }));

  return {
    resolveActiveStorylineContext,
    updateStorylineDisplayName,
    createStorylineFromSource,
    branchStorylineFromCheckpoint,
    switchActiveStoryline,
  };
});

vi.mock('@/storylines/substrate', () => ({
  resolveActiveStorylineContext: mocks.resolveActiveStorylineContext,
  updateStorylineDisplayName: mocks.updateStorylineDisplayName,
  createStorylineFromSource: mocks.createStorylineFromSource,
  branchStorylineFromCheckpoint: mocks.branchStorylineFromCheckpoint,
  switchActiveStoryline: mocks.switchActiveStoryline,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST storyline actions route', () => {
  it('exposes a shared storyline action schema with the four supported actions', () => {
    expect(storylineManagementTypes.StorylineActionSchema).toBeDefined();

    expect(
      storylineManagementTypes.StorylineActionSchema.safeParse({
        kind: 'rename_display_name',
        storylineId: 'storyline_main',
        nextDisplayName: 'Side Route',
      }).success,
    ).toBe(true);
    expect(
      storylineManagementTypes.StorylineActionSchema.safeParse({
        kind: 'create_from_source',
        sourceStorylineId: 'storyline_main',
      }).success,
    ).toBe(true);
    expect(
      storylineManagementTypes.StorylineActionSchema.safeParse({
        kind: 'branch_from_checkpoint',
        sourceStorylineId: 'storyline_main',
        checkpointId: 'chk_02',
      }).success,
    ).toBe(true);
    expect(
      storylineManagementTypes.StorylineActionSchema.safeParse({
        kind: 'switch_active_storyline',
        storylineId: 'storyline_alt',
      }).success,
    ).toBe(true);
  });

  it('returns 400 when rename_display_name rejects an empty display name', async () => {
    mocks.updateStorylineDisplayName.mockRejectedValueOnce(
      new Error('Storyline display name cannot be empty.'),
    );

    const { POST } = await import(
      '@/app/api/authoring/packages/[packageName]/storylines/actions/route'
    );

    const response = await POST(
      new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'rename_display_name',
          storylineId: 'storyline_main',
          nextDisplayName: '   ',
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when branch_from_checkpoint rejects an unreachable checkpoint', async () => {
    mocks.branchStorylineFromCheckpoint.mockRejectedValueOnce(
      new Error(
        'Cannot branch storyline from checkpoint "chk_alt_only" because it is not reachable from source storyline "storyline_main".',
      ),
    );

    const { POST } = await import(
      '@/app/api/authoring/packages/[packageName]/storylines/actions/route'
    );

    const response = await POST(
      new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'branch_from_checkpoint',
          sourceStorylineId: 'storyline_main',
          checkpointId: 'chk_alt_only',
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(response.status).toBe(400);
  });

  it('returns 404 when the requested story package does not exist', async () => {
    mocks.resolveActiveStorylineContext.mockRejectedValueOnce(
      new RuntimeStoryPackageNotFoundError('missing-scene'),
    );

    const { POST } = await import(
      '@/app/api/authoring/packages/[packageName]/storylines/actions/route'
    );

    const response = await POST(
      new Request('http://localhost/api/authoring/packages/missing-scene/storylines/actions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'create_from_source',
          sourceStorylineId: 'storyline_main',
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'missing-scene',
        }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Story package "missing-scene" was not found.',
    });
  });

  it('returns 400 when create_from_source rejects a source storyline with null headCheckpointId', async () => {
    mocks.createStorylineFromSource.mockRejectedValueOnce(
      new Error(
        'Cannot create storyline from source "storyline_main" because source headCheckpointId is null.',
      ),
    );

    const { POST } = await import(
      '@/app/api/authoring/packages/[packageName]/storylines/actions/route'
    );

    const response = await POST(
      new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'create_from_source',
          sourceStorylineId: 'storyline_main',
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        'Cannot create storyline from source "storyline_main" because source headCheckpointId is null.',
    });
  });

  it('dispatches rename_display_name through the metadata-only seam', async () => {
    const { POST } = await import(
      '@/app/api/authoring/packages/[packageName]/storylines/actions/route'
    );

    const response = await POST(
      new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'rename_display_name',
          storylineId: 'storyline_main',
          nextDisplayName: '  Side Route  ',
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(mocks.updateStorylineDisplayName).toHaveBeenCalledWith({
      packageName: 'sample-scene',
      storylineId: 'storyline_main',
      nextDisplayName: 'Side Route',
    });
    expect(response.status).toBe(200);
  });

  it('dispatches create_from_source through the action route and switches to the created storyline', async () => {
    const { POST } = await import(
      '@/app/api/authoring/packages/[packageName]/storylines/actions/route'
    );

    const response = await POST(
      new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'create_from_source',
          sourceStorylineId: 'storyline_main',
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(mocks.createStorylineFromSource).toHaveBeenCalledWith(
      expect.objectContaining({
        packageName: 'sample-scene',
        sourceStorylineId: 'storyline_main',
        name: expect.stringMatching(/故事线/i),
      }),
    );
    expect(mocks.switchActiveStoryline).toHaveBeenCalledWith('sample-scene', 'storyline_created');
    expect(response.status).toBe(200);
  });

  it('dispatches branch_from_checkpoint through the action route and switches to the branched storyline', async () => {
    mocks.branchStorylineFromCheckpoint.mockReset();
    mocks.branchStorylineFromCheckpoint.mockImplementation(async () => ({
      repository: {
        version: 1,
        activeStorylineId: 'storyline_branched',
        storylinesById: {},
        variantsById: {},
      },
      storyline: {
        storylineId: 'storyline_branched',
        name: '从 Beat 2 分出',
        status: 'active',
        sourceCheckpointId: 'chk_02',
        headCheckpointId: 'chk_02',
        variantId: 'variant_branched',
        activeSessionId: 'sess_branched',
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      variant: {
        variantId: 'variant_branched',
        workspaceRoot: 'variants/variant_branched',
        createdFromStorylineId: 'storyline_main',
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      session: {
        sessionId: 'sess_branched',
        lifecycle: 'in_progress',
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
        headCheckpointId: 'chk_02',
        activeCheckpointId: 'chk_02',
        orderedCheckpointIds: ['chk_02'],
        checkpointsById: {},
        lastStableRelationshipLayer: {
          highlightedDeltasText: 'delta-branched',
          stableBackgroundText: 'background-branched',
        },
      },
      authoredRoot: 'variants/variant_branched',
    }));

    const { POST } = await import(
      '@/app/api/authoring/packages/[packageName]/storylines/actions/route'
    );

    const response = await POST(
      new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'branch_from_checkpoint',
          sourceStorylineId: 'storyline_main',
          checkpointId: 'chk_02',
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(mocks.branchStorylineFromCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        packageName: 'sample-scene',
        sourceStorylineId: 'storyline_main',
        checkpointId: 'chk_02',
        name: expect.stringMatching(/Beat 2|故事线/i),
      }),
    );
    expect(mocks.switchActiveStoryline).toHaveBeenCalledWith('sample-scene', 'storyline_branched');
    expect(response.status).toBe(200);
  });

  it('dispatches switch_active_storyline through the action route', async () => {
    const { POST } = await import(
      '@/app/api/authoring/packages/[packageName]/storylines/actions/route'
    );

    const response = await POST(
      new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'switch_active_storyline',
          storylineId: 'storyline_alt',
        }),
      }),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    expect(mocks.switchActiveStoryline).toHaveBeenCalledWith('sample-scene', 'storyline_alt');
    expect(response.status).toBe(200);
  });
});
