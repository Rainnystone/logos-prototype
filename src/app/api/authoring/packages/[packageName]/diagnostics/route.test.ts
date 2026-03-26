import { describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';

const loadAuthoringState = vi.fn(async () => ({
  source: 'latest-saved' as const,
  state: storyPackageFixture,
}));

vi.mock('@/authoring/persistence/package-state', () => ({
  loadAuthoringState,
}));

describe('GET diagnostics route', () => {
  it('returns diagnostics for the requested package', async () => {
    const { GET } = await import(
      '@/app/api/authoring/packages/[packageName]/diagnostics/route'
    );

    const response = await GET(
      new Request('http://localhost/api/authoring/packages/sample-scene/diagnostics'),
      {
        params: Promise.resolve({
          packageName: 'sample-scene',
        }),
      },
    );

    const payload = (await response.json()) as {
      readonly overallStatusView?: {
        readonly status: string;
      };
      readonly packageName?: string;
    };

    expect(loadAuthoringState).toHaveBeenCalledWith('sample-scene');
    expect(response.status).toBe(200);
    expect(payload.packageName).toBe('sample-scene');
    expect(payload.overallStatusView?.status).toBe('healthy');
  });
});
