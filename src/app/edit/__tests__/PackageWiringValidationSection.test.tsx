import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { buildPackageDiagnostics } from '@/authoring/sections/package-diagnostics';
import { PackageWiringValidationSection } from '@/app/edit/sections/PackageWiringValidationSection';

describe('PackageWiringValidationSection', () => {
  it('renders package-wide health with unresolved issue details', () => {
    const diagnostics = buildPackageDiagnostics({
      packageName: 'sample-scene',
      source: 'latest-saved',
      storyPackage: storyPackageFixture,
      recentSaveResults: [
        {
          kind: 'save_applied_with_warnings',
          requestId: 'request-warning',
          packageName: 'sample-scene',
          sectionId: 'control-modules',
          showLocally: true,
          showInGlobalDiagnostics: true,
          reloadedSectionState: storyPackageFixture,
          runtimeImpactSummary: {
            changedFiles: ['control-modules.yaml'],
          },
          warnings: ['Authoring status marker write failed.'],
        },
      ],
    });

    const onRefresh = vi.fn();

    render(
      <PackageWiringValidationSection
        packageName="sample-scene"
        diagnostics={diagnostics}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByRole('region', { name: 'Package overview column' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Selected diagnostics detail' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Package Wiring & Validation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Control Modules save returned warnings' })).toBeInTheDocument();
    expect(screen.getAllByText('1 warning requires follow-up.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Control Modules save returned warnings/i })).toBeInTheDocument();
    expect(screen.getAllByText('Authoring status marker write failed.').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Re-check/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Package Reload healthy/i }));
    expect(screen.getByRole('heading', { name: 'Package Reload' })).toBeInTheDocument();
  });
});
