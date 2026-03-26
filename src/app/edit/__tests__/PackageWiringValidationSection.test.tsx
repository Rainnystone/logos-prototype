import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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

    render(
      <PackageWiringValidationSection
        packageName="sample-scene"
        diagnostics={diagnostics}
        onRefresh={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Package Wiring & Validation' })).toBeInTheDocument();
    expect(screen.getAllByText('1 warning requires follow-up.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Control Modules save returned warnings/i })).toBeInTheDocument();
    expect(screen.getAllByText('Authoring status marker write failed.').length).toBeGreaterThan(0);
  });
});
