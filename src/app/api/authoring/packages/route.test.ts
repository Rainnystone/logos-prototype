import { beforeEach, describe, expect, it, vi } from 'vitest';

const createStoryPackageScaffold = vi.fn();

vi.mock('@/story-packages/scaffold', () => ({
  createStoryPackageScaffold,
}));

import {
  StoryPackageScaffoldConflictError,
  StoryPackageScaffoldInputError,
  StoryPackageScaffoldValidationError,
  StoryPackageScaffoldWriteError,
} from '@/story-packages/scaffold-errors';

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
      warnings: [],
    });
  });

  it('creates a package when mode blank is provided explicitly', async () => {
    createStoryPackageScaffold.mockResolvedValueOnce({
      packageName: 'mode-blank-package',
      activeStorylineId: 'storyline_main',
      createdAt: '2026-04-08T10:00:00.000Z',
    });

    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({ mode: 'blank', displayName: '显式空白包' }),
      }),
    );

    expect(createStoryPackageScaffold).toHaveBeenCalledWith({
      displayName: '显式空白包',
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      packageName: 'mode-blank-package',
      activeStorylineId: 'storyline_main',
      createdAt: expect.any(String),
      warnings: [],
    });
  });

  it('returns a bounded 400 response for invalid JSON without calling scaffold', async () => {
    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: '{"displayName":',
      }),
    );

    expect(createStoryPackageScaffold).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid package creation payload.',
    });
  });

  it('returns a bounded 400 response for missing displayName without calling scaffold', async () => {
    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );

    expect(createStoryPackageScaffold).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid package creation payload.',
    });
  });

  it('returns a bounded 400 response for text_import without a valid adapter config', async () => {
    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'text_import',
          sourceText: '一段导入文本。',
        }),
      }),
    );

    expect(createStoryPackageScaffold).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Text import requires a valid adapter config.',
    });
  });

  it('returns the controlled not-implemented 400 when text_import includes a valid adapter config', async () => {
    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'text_import',
          sourceText: '一段导入文本。',
          adapterConfig: {
            provider: 'openai-compatible',
            providerConfig: {
              apiKey: 'test-key',
              baseUrl: 'https://api.example.com/v1',
              model: 'demo-model',
            },
          },
        }),
      }),
    );

    expect(createStoryPackageScaffold).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Text import is not implemented yet.',
    });
  });

  it('maps invalid display names to 400 responses', async () => {
    createStoryPackageScaffold.mockRejectedValueOnce(
      new StoryPackageScaffoldInputError('Story package display name is invalid.'),
    );

    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'CON' }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid story package display name.',
    });
  });

  it('maps duplicate package names to 409 responses', async () => {
    createStoryPackageScaffold.mockRejectedValueOnce(
      new StoryPackageScaffoldConflictError('Package "new-story-package" already exists.'),
    );

    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({ displayName: '新故事包' }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Story package already exists.',
    });
  });

  it('maps scaffold validation failures to a bounded 500 response', async () => {
    createStoryPackageScaffold.mockRejectedValueOnce(
      new StoryPackageScaffoldValidationError(
        'Staged repository mismatch: runtime activeSessionId does not mirror storyline_main.',
      ),
    );

    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({ displayName: '新故事包' }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Failed to validate story package scaffold.',
    });
  });

  it('maps package root write failures to a bounded 500 response', async () => {
    createStoryPackageScaffold.mockRejectedValueOnce(
      new StoryPackageScaffoldWriteError('Could not create package root under src/story-packages.'),
    );

    const { POST } = await import('@/app/api/authoring/packages/route');

    const response = await POST(
      new Request('http://localhost/api/authoring/packages', {
        method: 'POST',
        body: JSON.stringify({ displayName: '新故事包' }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Failed to create story package root.',
    });
  });
});
