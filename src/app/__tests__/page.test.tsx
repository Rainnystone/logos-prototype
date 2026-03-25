import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const readyEntry = {
  packageName: 'sample-scene',
  sceneId: 'scene-signal-room',
  sceneName: 'Signal Room',
  mainAxis: 'Track a hostile signal through a sealed campus wing.',
  endLine: 'The source is isolated and the public space returns to calm.',
  source: 'fixtures/signal-room',
  samplePurpose: 'Validate the workbench control loop.',
  phaseCount: 2,
  totalBeatCount: 8,
};

vi.mock('@/app/story-package-catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/story-package-catalog')>();

  return {
    ...actual,
    listStoryPackageCatalog: vi.fn(async () => [readyEntry]),
  };
});

describe('HomePage', () => {
  it('surfaces the editor entry from the main package selector', async () => {
    const { default: HomePage } = await import('@/app/page');

    const element = await HomePage();
    render(element);

    expect(screen.getByRole('heading', { name: 'LOGOS Sample Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Editor' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene',
    );
    expect(screen.getByRole('link', { name: 'Open Signal Room' })).toHaveAttribute(
      'href',
      '/play?storyPackage=sample-scene',
    );
  });
});
