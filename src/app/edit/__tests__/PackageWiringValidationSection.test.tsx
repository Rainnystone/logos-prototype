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
          warnings: ['作者状态标记写入失败。'],
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

    expect(screen.getByRole('region', { name: '整体状态' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '当前详情' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '控制台' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '控制模块 保存出现警告' })).toBeInTheDocument();
    expect(screen.getAllByText('1 个警告需要跟进。').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /控制模块 保存出现警告/i })).toBeInTheDocument();
    expect(screen.getAllByText(/作者状态标记写入失败/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /重新检查/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /整包重新加载 healthy/i }));
    expect(screen.getByRole('heading', { name: '整包重新加载' })).toBeInTheDocument();
  });
});
