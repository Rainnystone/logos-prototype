import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScenePhaseAuthoringSection } from '@/app/edit/sections/ScenePhaseAuthoringSection';
import {
  createScenePhaseAuthoringDraft,
  type ScenePhaseAuthoringDraft,
} from '@/authoring/sections/scene-phase-authoring';
import { storyPackageFixture } from '@/app/__tests__/fixtures';

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  });
}

describe('ScenePhaseAuthoringSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the scene block, phase rail, and selected phase editor controls in Chinese', async () => {
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
    setWindowWidth(1440);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect(
      this: HTMLElement,
    ) {
      if (this.getAttribute('aria-label') === '当前阶段编辑区') {
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
        sceneCastLibrary={storyPackageFixture.worldBase}
        routerOptions={['Investigation', 'Counterplay']}
        onChange={onChange}
        onSubmit={onSubmit}
        onReset={onReset}
      />,
    );
    window.dispatchEvent(new Event('resize'));

    expect(screen.getByRole('heading', { name: '场景与阶段' })).toBeInTheDocument();
    expect(screen.queryByText('Helper marker')).not.toBeInTheDocument();
    const phaseRailSection = screen.getByRole('region', { name: 'Phase 轨道区' });
    const sceneFrameSection = screen.getByRole('region', { name: '场景框架区' });
    const workspaceSection = screen.getByRole('region', { name: '场景与阶段工作区' });
    const detailSection = screen.getByRole('region', { name: '当前阶段编辑区' });
    const sceneFrameViewport = sceneFrameSection.parentElement;
    const selectedPhaseCard = within(phaseRailSection).getByRole('button', { name: 'Signal Trace' });
    const secondaryPhaseCard = within(phaseRailSection).getByRole('button', { name: 'Counterplay Lock' });

    expect(workspaceSection).toBeInTheDocument();
    expect(phaseRailSection.className).toContain('border-2');
    expect(phaseRailSection.className).toContain('border-black');
    expect(phaseRailSection.className).toContain('bg-white');
    expect(workspaceSection.className).toContain('items-stretch');
    expect(workspaceSection.className).toContain('xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]');
    expect(sceneFrameViewport?.className).toContain('xl:min-h-[calc(100vh-16rem)]');
    expect(sceneFrameViewport?.className).toContain('xl:overflow-y-auto');
    await waitFor(() => {
      expect(sceneFrameViewport).toHaveStyle({ height: '880px' });
    });
    expect(sceneFrameSection.className).toContain('min-h-full');
    expect(screen.getByRole('textbox', { name: '场景名' })).toHaveValue('Signal Room');
    expect(screen.getByRole('textbox', { name: '起点' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '主轴' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '示例用途' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '场景阵容' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByText('已选 2 个非主角角色。')).toBeInTheDocument();
    expect(screen.queryByText(storyPackageFixture.worldBase.hero.name)).not.toBeInTheDocument();
    expect(within(phaseRailSection).getByRole('button', { name: 'Signal Trace' })).toBeInTheDocument();
    expect(selectedPhaseCard.className).toContain('bg-black');
    expect(selectedPhaseCard.className).toContain('shadow-brutal');
    expect(secondaryPhaseCard.className).toContain('bg-white');
    expect(within(selectedPhaseCard).getByText('PHASE 1')).toBeInTheDocument();
    expect(within(secondaryPhaseCard).getByText('PHASE 2')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Gradient 类型' })).toBeInTheDocument();
    expect(within(phaseRailSection).getByRole('slider', { name: '轨道滑块' })).toBeInTheDocument();
    expect(within(sceneFrameSection).queryByRole('slider', { name: '轨道滑块' })).not.toBeInTheDocument();
    expect(phaseRailSection.compareDocumentPosition(sceneFrameSection)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(within(sceneFrameSection).queryByText('Derived Main Axis')).not.toBeInTheDocument();
    expect(within(selectedPhaseCard).getByText('Router 提示')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Router 提示' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Phase 名' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Phase 终点' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '备注' })).toBeInTheDocument();
    expect(within(detailSection).getByText('Gradient 类型')).toBeInTheDocument();
    expect(within(detailSection).getByText('Router 提示')).toBeInTheDocument();
    expect(within(detailSection).getByText('Beat 数')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Counterplay Lock' }));
    expect(screen.getByRole('textbox', { name: 'Phase 目标' })).toHaveValue(
      'Contain the hostile response.',
    );

    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存本页' }));
    await user.click(screen.getByRole('button', { name: '重置本页' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('lets the workspace stack naturally on narrower widths without forcing a matched height', () => {
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
      if (this.getAttribute('aria-label') === '当前阶段编辑区') {
        return DOMRect.fromRect({ width: 420, height: 880 });
      }

      return DOMRect.fromRect({ width: 420, height: 320 });
    });

    setWindowWidth(1180);

    const draft = createScenePhaseAuthoringDraft(storyPackageFixture);

    render(
      <ScenePhaseAuthoringSection
        packageName="sample-scene"
        value={draft}
        sceneCastLibrary={storyPackageFixture.worldBase}
        routerOptions={['Investigation', 'Counterplay']}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    window.dispatchEvent(new Event('resize'));

    const workspaceSection = screen.getByRole('region', { name: '场景与阶段工作区' });
    const sceneFrameSection = screen.getByRole('region', { name: '场景框架区' });
    const sceneFrameViewport = sceneFrameSection.parentElement;

    expect(workspaceSection.className).not.toContain('max-w-[88rem]');
    expect(sceneFrameViewport?.className).toContain('xl:min-h-[calc(100vh-16rem)]');
    expect(sceneFrameViewport?.className).toContain('xl:overflow-y-auto');
    expect(sceneFrameViewport).not.toHaveStyle({ height: '880px' });
  });

  it('shows Chinese empty-state and router fallback copy when the draft is sparse', () => {
    const draft = createScenePhaseAuthoringDraft(storyPackageFixture);
    const firstPhaseWithoutRouter =
      draft.phasePlans.length > 0
        ? (() => {
            const { routerHint, ...phase } = draft.phasePlans[0]!;
            void routerHint;
            return phase;
          })()
        : null;
    const sparseDraft = {
      ...draft,
      phasePlans: firstPhaseWithoutRouter ? [firstPhaseWithoutRouter] : draft.phasePlans,
    };

    render(
      <ScenePhaseAuthoringSection
        packageName="sample-scene"
        value={sparseDraft}
        sceneCastLibrary={storyPackageFixture.worldBase}
        routerOptions={[]}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '场景与阶段' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Signal Trace' })).toBeInTheDocument();
    expect(screen.getByText('当前没有 Router')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增 Phase' })).toBeInTheDocument();
  });

  it('shows the empty Phase message when no phases are available', () => {
    const draft = createScenePhaseAuthoringDraft(storyPackageFixture);

    render(
      <ScenePhaseAuthoringSection
        packageName="sample-scene"
        value={{
          ...draft,
          phasePlans: [],
        }}
        sceneCastLibrary={storyPackageFixture.worldBase}
        routerOptions={[]}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '场景与阶段' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '当前没有 Phase' })).toBeInTheDocument();
    expect(screen.getByText('当前没有 Phase')).toBeInTheDocument();
    expect(screen.getByText('新增一个 Phase 开始编辑。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增 Phase' })).toBeInTheDocument();
  });

  it('updates the scene cast draft through onChange when switching back to default inheritance', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const draft = createScenePhaseAuthoringDraft(storyPackageFixture);

    function PageHarness() {
      const [value, setValue] = useState<ScenePhaseAuthoringDraft>(() => ({
        ...draft,
        sceneSpec: {
          ...draft.sceneSpec,
          castMode: 'unset' as const,
        },
      }));

      return (
        <ScenePhaseAuthoringSection
          packageName="sample-scene"
          value={value}
          sceneCastLibrary={storyPackageFixture.worldBase}
          routerOptions={[]}
          onChange={(nextValue) => {
            onChange(nextValue);
            setValue(nextValue);
          }}
          onSubmit={vi.fn()}
          onReset={vi.fn()}
        />
      );
    }

    render(
      <PageHarness />,
    );

    expect(screen.getByText('沿用默认阵容，未显式选择。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '移除 Touka Miyashita' })).not.toBeInTheDocument();

    await user.click(screen.getByText('Scene Cast'));
    await user.click(screen.getByRole('button', { name: '选择 核心角色 Touka Miyashita' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sceneSpec: expect.objectContaining({
          castMode: 'explicit',
          cast: [storyPackageFixture.worldBase.coreCast[0]!.characterId],
        }),
      }),
    );
    expect(screen.getByText('已选 1 个非主角角色。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移除 Touka Miyashita' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '使用默认继承' }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sceneSpec: expect.objectContaining({
          castMode: 'unset',
        }),
      }),
    );
    expect(
      onChange.mock.calls.some(
        ([nextValue]) =>
          typeof nextValue === 'object' &&
          nextValue !== null &&
          'sceneSpec' in nextValue &&
          (nextValue as { sceneSpec: { castMode: string; cast?: readonly string[] } }).sceneSpec
            .castMode === 'unset' &&
          !('cast' in (nextValue as { sceneSpec: { castMode: string; cast?: readonly string[] } }).sceneSpec),
      ),
    ).toBe(true);
    expect(screen.getByText('沿用默认阵容，未显式选择。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '移除 Touka Miyashita' })).not.toBeInTheDocument();
  });
});
