import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { FixtureReferencePanel } from '@/app/components/FixtureReferencePanel';

describe('FixtureReferencePanel', () => {
  it('renders sample source, world base, and router reference data', () => {
    render(
      <FixtureReferencePanel storyPackage={storyPackageFixture} storyPackageName="sample-scene" />,
    );

    expect(screen.getByText('fixtures/signal-room')).toBeInTheDocument();
    expect(screen.getByText('Validate the workbench control loop.')).toBeInTheDocument();
    expect(screen.getByText(storyPackageFixture.worldBase.mainCharacters)).toBeInTheDocument();
    expect(screen.getByText(storyPackageFixture.worldBase.npcCharacters)).toBeInTheDocument();
    expect(screen.getByText(storyPackageFixture.worldBase.locationPatch)).toBeInTheDocument();
    expect(
      screen.getByText('Observe, test, and close distance without exposure.'),
    ).toBeInTheDocument();
    expect(screen.getByText('observe, probe, approach, withdraw')).toBeInTheDocument();
  });
});
