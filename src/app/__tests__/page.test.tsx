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
  it('renders the new title page with direct workbench and editor actions', async () => {
    const { default: HomePage } = await import('@/app/page');

    const element = await HomePage();
    render(element);

    expect(screen.queryByRole('heading', { name: 'LOGOS Sample Dashboard' })).not.toBeInTheDocument();
    expect(screen.getByText('LOGOS')).toBeInTheDocument();
    expect(screen.getByText('Linguistic Oriented Game Orchestration Studio')).toBeInTheDocument();
    expect(screen.getByText('prototype')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Provider Setup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Runtime Config' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play Workbench' })).toHaveAttribute(
      'href',
      '/play?storyPackage=sample-scene',
    );
    expect(screen.getByRole('link', { name: 'Narrative Editor' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=worldbase-cast',
    );
  });
});
