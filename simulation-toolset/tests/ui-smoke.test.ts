import { afterEach, describe, expect, it, vi } from 'vitest';

import { runEditWorkbenchUiSmoke, runPlayWorkbenchUiSmoke } from '@simulation/ui-smoke';

describe('ui smoke', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('drives the edit workbench through the shared save route path', async () => {
    const result = await runEditWorkbenchUiSmoke('sample-scene');

    expect(result.requestUrl).toBe(
      `/api/authoring/packages/${result.packageName}/sections/worldbase-cast`,
    );
    expect(result.requestMethod).toBe('PATCH');
    expect(result.requestSource).toBe('page');
    expect(result.requestId).toMatch(/^worldbase-cast-/);
  });

  it('starts the play workbench round and triggers the sidecar hook', async () => {
    const result = await runPlayWorkbenchUiSmoke('sample-scene');

    expect(result.packageName).toMatch(/^\.tmp-simulation-/);
    expect(result.gossipelogCallCount).toBe(1);
    expect(result.roundId).toBeTruthy();
    expect(result.acceptedBeatText.length).toBeGreaterThan(0);
    expect(result.openingHookConsumed).toBe(true);
  });
});
