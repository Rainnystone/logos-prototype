import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { EditWorkbench } from '@/app/edit/EditWorkbench';

describe('EditWorkbench', () => {
  it('renders the initial editor shell with package context and section navigation', () => {
    render(
      <EditWorkbench
        packageName="sample-scene"
        activeSection="control-modules"
        initialState={{
          source: 'latest-saved',
          state: storyPackageFixture,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'LOGOS Authoring Editor' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Control Modules' })).toHaveAttribute(
      'href',
      '/edit?storyPackage=sample-scene&section=control-modules',
    );
    expect(screen.getByRole('link', { name: 'Open Scene' })).toHaveAttribute(
      'href',
      '/play?storyPackage=sample-scene',
    );
    expect(screen.getByRole('link', { name: 'Back to Sample Dashboard' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByText('Package Wiring Validation')).toBeInTheDocument();
  });
});
