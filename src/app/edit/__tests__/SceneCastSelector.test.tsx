import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import {
  SceneCastSelector,
  type SceneCastSelectionValue,
} from '@/app/edit/sections/SceneCastSelector';

function SceneCastSelectorHarness({
  initialCastMode,
  initialCast,
}: {
  readonly initialCastMode: 'unset' | 'explicit';
  readonly initialCast?: readonly string[];
}) {
  const [value, setValue] = useState<SceneCastSelectionValue>({
    castMode: initialCastMode,
    ...(initialCast ? { cast: [...initialCast] } : {}),
  });

  return (
    <SceneCastSelector
      value={value}
      sceneCastLibrary={storyPackageFixture.worldBase}
      onChange={setValue}
    />
  );
}

describe('SceneCastSelector', () => {
  it('starts collapsed and keeps the summary visible for legacy unset drafts', () => {
    render(<SceneCastSelectorHarness initialCastMode="unset" />);

    expect(screen.getByRole('button', { name: '场景阵容' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByText('沿用默认阵容，未显式选择。')).toBeInTheDocument();
    expect(screen.queryByText('核心角色')).not.toBeInTheDocument();
    expect(screen.queryByText('反派')).not.toBeInTheDocument();
  });

  it('round-trips from unset to explicit selection and back to unset while clearing cast', async () => {
    const user = userEvent.setup();
    const changes: SceneCastSelectionValue[] = [];

    function RecordingHarness() {
      const [value, setValue] = useState<SceneCastSelectionValue>({ castMode: 'unset' });

      return (
        <SceneCastSelector
          value={value}
          sceneCastLibrary={storyPackageFixture.worldBase}
          onChange={(nextValue) => {
            changes.push(nextValue);
            setValue(nextValue);
          }}
        />
      );
    }

    render(<RecordingHarness />);

    await user.click(screen.getByText('Scene Cast'));
    await user.click(screen.getByRole('button', { name: '选择 核心角色 Touka Miyashita' }));

    expect(changes.at(-1)).toMatchObject({
      castMode: 'explicit',
      cast: [storyPackageFixture.worldBase.coreCast[0]!.characterId],
    });

    await user.click(screen.getByRole('button', { name: '使用默认继承' }));

    expect(changes.at(-1)).toEqual({ castMode: 'unset' });
    expect(screen.getByText('沿用默认阵容，未显式选择。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '移除 Touka Miyashita' })).not.toBeInTheDocument();
  });

  it('shows explicit empty copy when the draft has no selected cast ids', () => {
    render(<SceneCastSelectorHarness initialCastMode="explicit" initialCast={[]} />);

    expect(screen.getByRole('button', { name: '场景阵容' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByText('已明确为空阵容。')).toBeInTheDocument();
    expect(screen.queryByText('核心角色')).not.toBeInTheDocument();
  });

  it('shows selected chips, expands the pool, and lets chips remove characters immediately', async () => {
    const user = userEvent.setup();

    render(
      <SceneCastSelectorHarness
        initialCastMode="explicit"
        initialCast={[
          storyPackageFixture.worldBase.coreCast[0]!.characterId,
          storyPackageFixture.worldBase.antagonists[0]!.characterId,
        ]}
      />,
    );

    expect(screen.getByText('已选 2 个非主角角色。')).toBeInTheDocument();
    expect(screen.getByText(storyPackageFixture.worldBase.coreCast[0]!.name)).toBeInTheDocument();
    expect(
      screen.getByText(storyPackageFixture.worldBase.antagonists[0]!.name),
    ).toBeInTheDocument();

    await user.click(screen.getByText('Scene Cast'));

    expect(screen.getByRole('button', { name: '场景阵容' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: '选择 核心角色 Touka Miyashita' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择 反派 Retsu Haitani' })).toBeInTheDocument();
    expect(
      screen.queryByText('主角由世界基础阵容隐含，不在这里单独选择。'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '移除 Touka Miyashita' }));

    expect(screen.getByText('已选 1 个非主角角色。')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '移除 Touka Miyashita' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '选择 核心角色 Touka Miyashita' }));

    expect(screen.getByText('已选 2 个非主角角色。')).toBeInTheDocument();
  });

  it('shows stale ids as disabled warnings and never renders the hero as selectable', async () => {
    const user = userEvent.setup();

    render(
      <SceneCastSelectorHarness
        initialCastMode="explicit"
        initialCast={[
          storyPackageFixture.worldBase.coreCast[0]!.characterId,
          'chr_missing',
        ]}
      />,
    );

    expect(screen.getByText('有 1 个旧编号不在当前角色库中。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '失效编号 chr_missing' })).toBeDisabled();
    expect(screen.queryByText(storyPackageFixture.worldBase.hero.name)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '场景阵容' }));

    expect(screen.getByRole('button', { name: '选择 核心角色 Touka Miyashita' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择 反派 Retsu Haitani' })).toBeInTheDocument();

    const warningBlock = screen.getByRole('region', { name: '场景阵容警告' });
    expect(within(warningBlock).getByText('这些编号不在当前角色库中。')).toBeInTheDocument();
  });
});
