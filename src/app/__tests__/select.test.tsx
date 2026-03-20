import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { StoryPackageCatalogEntry } from '@/app/story-package-catalog';
import { StoryPackageSelector } from '@/app/components/StoryPackageSelector';

const readyEntry: StoryPackageCatalogEntry = {
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

describe('StoryPackageSelector', () => {
  it('renders the available story packages with scene overview details', () => {
    render(<StoryPackageSelector packages={[readyEntry]} />);

    expect(screen.getByRole('heading', { name: readyEntry.sceneName })).toBeInTheDocument();
    expect(screen.getByText(readyEntry.mainAxis)).toBeInTheDocument();
    expect(screen.getByText(readyEntry.endLine)).toBeInTheDocument();
    expect(screen.getByText('2 phases')).toBeInTheDocument();
    expect(screen.getByText('8 beats')).toBeInTheDocument();
  });

  it('links the selected package to the play workbench', () => {
    render(<StoryPackageSelector packages={[readyEntry]} />);

    expect(screen.getByRole('link', { name: `Open ${readyEntry.sceneName}` })).toHaveAttribute(
      'href',
      '/play?storyPackage=sample-scene',
    );
  });

  it('shows an error state when a story package fails to load', () => {
    render(
      <StoryPackageSelector
        packages={[
          {
            packageName: 'broken-scene',
            error: 'Failed to load story package "broken-scene".',
          },
        ]}
      />,
    );

    expect(screen.getByText('broken-scene')).toBeInTheDocument();
    expect(screen.getByText('Failed to load story package "broken-scene".')).toBeInTheDocument();
  });
});
