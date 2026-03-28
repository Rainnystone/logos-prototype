import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorldBaseCastSection } from '@/app/edit/sections/WorldBaseCastSection';
import type { WorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';

const draftValue: WorldBaseCastDraft = {
  worldBaseSetting: 'World base',
  worldRules: 'No open magic',
  toneBaseline: 'Cold pressure',
  hero: {
    draftId: 'hero-1',
    name: '',
    identityRole: 'Lead breaker',
    lightNovelTrait: 'Silent pressure',
    gender: '',
    personality: '',
    age: '17',
    occupation: 'Student',
    characterSummary: 'Moves straight at the threat.',
    capabilityBoundary: 'No magic.',
    behaviorBoundary: 'Never stops the trace.',
    oocRedLine: 'No speeches.',
    clothing: 'Uniform',
    propsWeapon: 'Ceramic blade',
  },
  coreCast: [
    {
      draftId: 'core-1',
      name: 'Core One',
      identityRole: 'Anchor',
      lightNovelTrait: 'Soft contrast',
      gender: 'Female',
      personality: 'Gentle',
      age: '17',
      occupation: 'Student',
      characterSummary: 'Keeps the ordinary layer intact.',
      capabilityBoundary: '',
      behaviorBoundary: 'Stays out of direct danger.',
      oocRedLine: 'Never notices the anomaly.',
      clothing: '',
      propsWeapon: '',
    },
  ],
  antagonists: [
    {
      draftId: 'antagonist-1',
      name: 'Villain One',
      identityRole: 'Threat',
      lightNovelTrait: 'Showman',
      gender: 'Male',
      personality: 'Chaotic',
      age: '19',
      occupation: 'Streamer',
      characterSummary: 'Turns attention into pressure.',
      capabilityBoundary: 'Needs attention to trigger.',
      behaviorBoundary: 'Always performs.',
      oocRedLine: 'Cannot become quiet.',
      clothing: '',
      propsWeapon: '',
      fatalWeakness: 'Attention drop',
    },
  ],
  supportingCast: 'Support One：Steady witness',
  locationPool: 'Signal room',
};

describe('WorldBaseCastSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders world blocks plus character rails and a detailed editor', async () => {
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
      if (this.getAttribute('aria-label') === 'Character editor column') {
        return DOMRect.fromRect({ width: 420, height: 960 });
      }

      return DOMRect.fromRect({ width: 420, height: 320 });
    });

    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onReset = vi.fn();
    const onChange = vi.fn();

    render(
      <WorldBaseCastSection
        packageName="sample-scene"
        value={draftValue}
        onChange={onChange}
        onSubmit={onSubmit}
        onReset={onReset}
      />,
    );

    const workspaceRegion = screen.getByRole('region', { name: 'WorldBase workspace' });
    expect(workspaceRegion).toBeInTheDocument();
    expect(workspaceRegion.parentElement?.className).toContain('items-stretch');
    expect(workspaceRegion.className).toContain('min-h-[calc(100vh-16rem)]');
    expect(workspaceRegion.className).toContain('overflow-y-auto');
    await waitFor(() => {
      expect(workspaceRegion).toHaveStyle({ height: '960px' });
    });
    expect(screen.getByRole('heading', { name: '世界文本块' }).closest('section')?.className).not.toContain(
      'min-h-full',
    );
    expect(screen.getByRole('region', { name: 'Character editor column' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '世界与角色' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '世界基础设定' })).toHaveValue('World base');
    expect(screen.getByRole('button', { name: /未命名角色/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Core One/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Villain One/ })).toBeInTheDocument();
    expect(screen.getByText('世界基础')).toBeInTheDocument();
    expect(screen.getByText('世界规则 / 禁忌 / 异常性质')).toBeInTheDocument();
    expect(screen.getByText('文风基线')).toBeInTheDocument();
    expect(screen.getByText('主角')).toBeInTheDocument();
    expect(screen.getByText('核心角色')).toBeInTheDocument();
    expect(screen.getByText('反派')).toBeInTheDocument();
    expect(screen.getByText('杂项块')).toBeInTheDocument();
    expect(screen.getByText('当前角色')).toBeInTheDocument();
    expect(screen.getByText('当前条目')).toBeInTheDocument();
    expect(screen.getByText('完整卡片')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Core One/ }));
    expect(screen.getByRole('heading', { name: 'Core One' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '角色名' })).toHaveValue('Core One');

    await user.clear(screen.getByRole('textbox', { name: '角色名' }));
    await user.type(screen.getByRole('textbox', { name: '角色名' }), 'Core Two');

    expect(onChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '新增核心角色' }));
    await user.click(screen.getByRole('button', { name: '新增反派' }));

    await user.click(screen.getByRole('button', { name: '保存本页' }));
    await user.click(screen.getByRole('button', { name: '重置本页' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('shows Chinese fallbacks when the hero card is missing name and traits', async () => {
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
      if (this.getAttribute('aria-label') === 'Character editor column') {
        return DOMRect.fromRect({ width: 420, height: 960 });
      }

      return DOMRect.fromRect({ width: 420, height: 320 });
    });

    render(
      <WorldBaseCastSection
        packageName="sample-scene"
        value={draftValue}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '未命名角色' })).toBeInTheDocument();
    expect(screen.getByText('性别 / 性格')).toBeInTheDocument();
  });
});
