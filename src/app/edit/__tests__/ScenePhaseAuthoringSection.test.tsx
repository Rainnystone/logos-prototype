import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScenePhaseAuthoringSection } from '@/app/edit/sections/ScenePhaseAuthoringSection';
import { createScenePhaseAuthoringDraft } from '@/authoring/sections/scene-phase-authoring';
import { storyPackageFixture } from '@/app/__tests__/fixtures';

describe('ScenePhaseAuthoringSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the scene block, phase rail, and selected phase editor controls', async () => {
    class ResizeObserverMock {
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element) {
        this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }

      disconnect() {}
      unobserve() {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect(
      this: HTMLElement,
    ) {
      if (this.getAttribute('aria-label') === 'Scene Phase Detail Column') {
        return DOMRect.fromRect({ width: 420, height: 880 });
      }

      return DOMRect.fromRect({ width: 420, height: 320 });
    });

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
        onChange={onChange}
        onSubmit={onSubmit}
        onReset={onReset}
      />,
    );

    expect(screen.getByRole('heading', { name: 'SCENE & PHASE' })).toBeInTheDocument();
    expect(screen.queryByText('Helper marker')).not.toBeInTheDocument();
    const phaseRailSection = screen.getByRole('region', { name: 'Phase rail section' });
    const sceneFrameSection = screen.getByRole('region', { name: 'Scene frame section' });
    const workspaceSection = screen.getByRole('region', { name: 'Scene phase workspace' });
    const sceneFrameViewport = sceneFrameSection.parentElement;
    const selectedPhaseCard = within(phaseRailSection).getByRole('button', { name: 'Signal Trace' });
    const secondaryPhaseCard = within(phaseRailSection).getByRole('button', { name: 'Counterplay Lock' });

    expect(workspaceSection).toBeInTheDocument();
    expect(phaseRailSection.className).toContain('max-w-[88rem]');
    expect(phaseRailSection.className).toContain('border-2');
    expect(phaseRailSection.className).toContain('border-black');
    expect(phaseRailSection.className).toContain('bg-white');
    expect(workspaceSection.className).toContain('max-w-[88rem]');
    expect(workspaceSection.className).toContain('items-stretch');
    expect(sceneFrameViewport?.className).toContain('min-h-[calc(100vh-21rem)]');
    expect(sceneFrameViewport?.className).toContain('overflow-y-auto');
    await waitFor(() => {
      expect(sceneFrameViewport).toHaveStyle({ height: '880px' });
    });
    expect(sceneFrameSection.className).toContain('min-h-full');
    expect(screen.getByRole('textbox', { name: 'Scene Name' })).toHaveValue('Signal Room');
    expect(within(phaseRailSection).getByRole('button', { name: 'Signal Trace' })).toBeInTheDocument();
    expect(selectedPhaseCard.className).toContain('bg-black');
    expect(selectedPhaseCard.className).toContain('shadow-brutal');
    expect(secondaryPhaseCard.className).toContain('bg-white');
    expect(within(selectedPhaseCard).getByText('PHASE 1')).toBeInTheDocument();
    expect(within(secondaryPhaseCard).getByText('PHASE 2')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Gradient Type' })).toBeInTheDocument();
    expect(within(phaseRailSection).getByRole('slider', { name: 'Phase rail slider' })).toBeInTheDocument();
    expect(within(sceneFrameSection).queryByRole('slider', { name: 'Phase rail slider' })).not.toBeInTheDocument();
    expect(phaseRailSection.compareDocumentPosition(sceneFrameSection)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

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
