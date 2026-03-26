import { describe, expect, it, vi } from 'vitest';

const runCoordinatorSave = vi.fn(async () => ({
  saveResult: {
    kind: 'save_blocked' as const,
    requestId: 'coordinator-route',
    packageName: 'sample-scene',
    sectionId: 'worldbase-cast' as const,
    showLocally: true,
    showInGlobalDiagnostics: false,
    blockingIssues: ['Main characters are required.'],
  },
  coordinatorSummary: 'The page helper kept the request local and could not repair the blocking issue.',
  usedRepair: false,
}));

vi.mock('@/authoring/coordinator/coordinator', () => ({
  runCoordinatorSave,
}));

describe('POST coordinator route', () => {
  it('forwards the invocation and preserves the save-result status code', async () => {
    const { POST } = await import('@/app/api/authoring/packages/[packageName]/coordinator/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages/sample-scene/coordinator', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          requestId: 'coordinator-route',
          activeSection: 'worldbase-cast',
          actorInput: {
            source: 'form',
            uiFields: {
              mainCharacters: 'Main cast',
              npcCharacters: 'Supporting cast',
              locationPatch: 'Location patch',
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

    expect(runCoordinatorSave).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'coordinator-route',
        packageName: 'sample-scene',
        activeSection: 'worldbase-cast',
      }),
    );
    expect(response.status).toBe(400);
  });
});
