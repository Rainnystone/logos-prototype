import { describe, expect, it, vi, beforeEach } from 'vitest';

const createStoryPackageScaffold = vi.fn();

vi.mock('@/story-packages/scaffold', () => ({
  createStoryPackageScaffold,
}));

describe('POST /api/authoring/packages', () => {
  beforeEach(() => {
    createStoryPackageScaffold.mockReset();
  });

  it('creates a package and returns the new package selection payload', async () => {
    createStoryPackageScaffold.mockResolvedValueOnce({
      packageName: 'xin-gushi-bao',
      activeStorylineId: 'storyline_main',
      createdAt: '2026-04-07T10:00:00.000Z',
    });

    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({ displayName: '新故事包' }),
      }),
    );

    expect(createStoryPackageScaffold).toHaveBeenCalledWith({
      displayName: '新故事包',
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      packageName: expect.any(String),
      activeStorylineId: 'storyline_main',
      createdAt: expect.any(String),
    });
  });

  it('maps invalid display names to 400 responses', async () => {
    createStoryPackageScaffold.mockRejectedValueOnce(new Error('Package name is reserved.'));

    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'CON' }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it('maps duplicate package names to 409 responses', async () => {
    createStoryPackageScaffold.mockRejectedValueOnce(
      new Error('Package "new-story-package" already exists.'),
    );

    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({ displayName: '新故事包' }),
      }),
    );

    expect(response.status).toBe(409);
  });

  it('maps scaffold validation failures to a bounded 500 response', async () => {
    createStoryPackageScaffold.mockRejectedValueOnce(
      new Error('Scaffold validation failed: storyline repository consistency violation.'),
    );

    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({ displayName: '新故事包' }),
      }),
    );

    expect(response.status).toBe(500);
  });

  it('maps package root write failures to a bounded 500 response', async () => {
    createStoryPackageScaffold.mockRejectedValueOnce(
      new Error('Could not create package root under src/story-packages.'),
    );

    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({ displayName: '新故事包' }),
      }),
    );

    expect(response.status).toBe(500);
  });
});
