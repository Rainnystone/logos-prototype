import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { ControlModulesSection } from '@/app/edit/sections/ControlModulesSection';
import { createControlModulesDraft } from '@/authoring/sections/control-modules';

describe('ControlModulesSection', () => {
  it('renders the module stack, active editor, and auditor controls', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onReset = vi.fn();
    const onChange = vi.fn();
    const draft = createControlModulesDraft(storyPackageFixture);

    render(
      <ControlModulesSection
        packageName="sample-scene"
        phaseIds={storyPackageFixture.phasePlans.map((phase) => phase.phaseId)}
        value={draft}
        onChange={onChange}
        onSubmit={onSubmit}
        onReset={onReset}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Control Modules' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Control stack column' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Module editor column' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Light Cone Collapse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Boundary Guidance' })).toBeInTheDocument();
    expect(screen.getByText('故事/光锥边界应如何划定')).toBeInTheDocument();
    expect(screen.getByText('故事/光锥边界会随着玩家行为如何逐步收拢')).toBeInTheDocument();
    expect(screen.getByText('Phase 结束后系统结算玩家因果状态的规则')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Auditor Question Set' }));

    expect(screen.getByRole('button', { name: 'Add Question' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Audit question list' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Question' }));
    expect(onChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save Section' }));
    await user.click(screen.getByRole('button', { name: 'Reset Section' }));

    expect(onSubmit).toHaveBeenCalledWith('auditor-question-set');
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
