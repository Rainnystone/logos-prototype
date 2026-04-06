import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TitleLandingSurface } from '@/app/components/TitleLandingSurface';

vi.mock('@/app/components/RuntimeConfigForm', () => ({
  RuntimeConfigForm: ({ actionSlot }: { actionSlot?: ReactNode }) => (
    <div>
      <button type="button">Save Runtime Config</button>
      {actionSlot}
    </div>
  ),
}));

describe('TitleLandingSurface', () => {
  it('renders the approved title composition and package-aware actions', () => {
    render(<TitleLandingSurface packageName="sample-scene" />);

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
      '/edit?storyPackage=sample-scene&section=story-package-management',
    );
  });

  it('shows a quiet fallback when no loadable package is available', () => {
    render(<TitleLandingSurface packageName={null} />);

    expect(screen.getByText('No loadable story package is available.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Play Workbench' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Narrative Editor' })).not.toBeInTheDocument();
  });
});
