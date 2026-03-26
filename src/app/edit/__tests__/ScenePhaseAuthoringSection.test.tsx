import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ScenePhaseAuthoringSection } from '@/app/edit/sections/ScenePhaseAuthoringSection';
import { createScenePhaseAuthoringDraft } from '@/authoring/sections/scene-phase-authoring';
import { storyPackageFixture } from '@/app/__tests__/fixtures';

describe('ScenePhaseAuthoringSection', () => {
  it('renders the scene block, phase rail, and selected phase editor controls', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onReset = vi.fn();
    const onChange = vi.fn();
    const draft = createScenePhaseAuthoringDraft(storyPackageFixture);

    render(
      <ScenePhaseAuthoringSection
        packageName="sample-scene"
        value={draft}
        routerOptions={['Investigation', 'Counterplay']}
        helperPanel={<div>Helper marker</div>}
        onChange={onChange}
        onSubmit={onSubmit}
        onReset={onReset}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Scene & Phase Authoring' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Scene Name' })).toHaveValue('Signal Room');
    expect(screen.getByRole('button', { name: 'Signal Trace' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Gradient Type' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Phase rail slider' })).toBeInTheDocument();

    const detailColumn = screen.getByLabelText('Scene Phase Detail Column');
    expect(within(detailColumn).getByText('Helper marker')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Counterplay Lock' }));
    expect(screen.getByRole('textbox', { name: 'Phase Goal' })).toHaveValue(
      'Contain the hostile response.',
    );

    await user.click(screen.getByRole('button', { name: 'Save Section' }));
    await user.click(screen.getByRole('button', { name: 'Reset Section' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
