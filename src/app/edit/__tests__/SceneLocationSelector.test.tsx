import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { SceneLocationSelector } from '@/app/edit/sections/SceneLocationSelector';
import type { Location } from '@/types';

const locationFixture: readonly Location[] = [
  {
    locationId: 'loc_a1b2c3',
    name: 'Signal Room',
    description: 'A sealed signal room hidden behind the public corridor.',
    environmentAppearance: 'Old relays and dim fluorescent light.',
    atmosphereDescription: 'Compressed heat and low electrical hum.',
    humanContextDescription: 'Operators only, no public traffic.',
  },
  {
    locationId: 'loc_d4e5f6',
    name: 'Service Corridor',
    description: 'A maintenance lane connecting the sealed wing.',
    environmentAppearance: 'Concrete walls and exposed vents.',
    atmosphereDescription: 'Quiet, narrow, watchful.',
    humanContextDescription: 'Used by staff during off hours.',
  },
];

function SceneLocationSelectorHarness({
  initialLocationIds,
}: {
  readonly initialLocationIds?: readonly string[];
}) {
  const [value, setValue] = useState<readonly string[] | undefined>(
    initialLocationIds ? [...initialLocationIds] : undefined,
  );

  return (
    <SceneLocationSelector
      sceneLocations={locationFixture}
      value={value}
      onChange={setValue}
    />
  );
}

describe('SceneLocationSelector', () => {
  it('starts collapsed and keeps the empty summary visible when no locations are selected', () => {
    render(<SceneLocationSelectorHarness />);

    expect(screen.getByRole('button', { name: '场景地点' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByText('当前场景未指定地点。')).toBeInTheDocument();
    expect(screen.queryByText('地点库')).not.toBeInTheDocument();
  });

  it('shows selected chips, expands the pool, and lets chips remove locations immediately', async () => {
    const user = userEvent.setup();

    render(<SceneLocationSelectorHarness initialLocationIds={['loc_a1b2c3', 'loc_d4e5f6']} />);

    expect(screen.getByText('已选 2 个地点。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移除 Signal Room' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移除 Service Corridor' })).toBeInTheDocument();

    await user.click(screen.getByText('Scene Location'));

    expect(screen.getByRole('button', { name: '场景地点' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: '选择地点 Signal Room' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择地点 Service Corridor' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '移除 Signal Room' }));

    expect(screen.getByText('已选 1 个地点。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '移除 Signal Room' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '选择地点 Signal Room' }));

    expect(screen.getByText('已选 2 个地点。')).toBeInTheDocument();
  });

  it('lets the author clear stale location ids in one step', async () => {
    const user = userEvent.setup();

    render(<SceneLocationSelectorHarness initialLocationIds={['loc_a1b2c3', 'loc_deadbe']} />);

    expect(screen.getByText('有 1 个旧编号不在当前地点库中。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '失效地点编号 loc_deadbe' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '清空显式地点' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '清空显式地点' }));

    expect(screen.getByText('当前场景未指定地点。')).toBeInTheDocument();
    expect(screen.queryByText('有 1 个旧编号不在当前地点库中。')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '失效地点编号 loc_deadbe' })).not.toBeInTheDocument();
  });
});
