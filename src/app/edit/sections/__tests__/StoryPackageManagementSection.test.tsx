import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StoryPackageManagementSection } from '@/app/edit/sections/StoryPackageManagementSection';
import {
  workspaceViewFixture,
  workspaceViewWithoutHeadFixture,
} from '@/app/edit/sections/__tests__/story-package-management.fixtures';

describe('StoryPackageManagementSection', () => {
  it('renders a two-column package selector plus storyline workspace layout', () => {
    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    expect(screen.getByLabelText('Story package selector')).toBeInTheDocument();
    expect(screen.getByLabelText('Storyline workspace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'sample-scene' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('renders the package headline plus storyline status, provenance, and head summary', () => {
    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    expect(screen.getByRole('heading', { name: 'sample-scene' })).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('来源：从 Beat 2 分出')).toBeInTheDocument();
    expect(screen.getByText('当前头部：Beat 3')).toBeInTheDocument();
    expect(screen.getByText('头部摘要：Beat 3 · Nagi reaches the roof and spots the signal')).toBeInTheDocument();
  });

  it('renders package switching as bounded navigation instead of client-side repository parsing', () => {
    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    expect(screen.getByRole('link', { name: 'alt-scene' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=alt-scene&section=story-package-management',
    );
  });

  it('marks the active package copy as an inverted block for higher contrast', () => {
    render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

    expect(screen.getByRole('link', { name: 'sample-scene' }).closest('.story-package-selector__card')).toHaveClass(
      'story-package-selector__card--active',
    );
    expect(
      screen.getByText('Sample Scene').closest('.story-package-selector__card-copy'),
    ).toHaveClass('story-package-selector__card-copy--active');
  });

  it('keeps the workspace structure visible when a storyline has no head checkpoint', () => {
    render(
      <StoryPackageManagementSection
        packageName="sample-scene"
        view={workspaceViewWithoutHeadFixture}
      />,
    );

    expect(screen.getByLabelText('Story package selector')).toBeInTheDocument();
    expect(screen.getByLabelText('Storyline workspace')).toBeInTheDocument();
    expect(screen.getByText('Main Line')).toBeInTheDocument();
  });
});
