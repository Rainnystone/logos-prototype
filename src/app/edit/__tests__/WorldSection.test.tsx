import { useState } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WorldSection } from '@/app/edit/sections/WorldSection';
import type { WorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';

const draftValue: WorldBaseCastDraft = {
  worldBaseSetting: 'A sealed school wing hides the signal source.',
  worldRules: 'No open magic. Every move must remain physical.',
  toneBaseline: 'Cold pressure with clipped light-novel pacing.',
  hero: {
    draftId: 'hero-1',
    characterId: 'chr_hero001',
    name: 'Nagi',
    identityRole: 'Lead breaker',
    lightNovelTrait: 'Silent pressure',
    gender: 'Female',
    personality: 'Cold',
    age: '17',
    occupation: 'Student',
    characterSummary: 'Moves toward the threat.',
    capabilityBoundary: 'No magic.',
    behaviorBoundary: 'Never leaves the trace.',
    oocRedLine: 'No speeches.',
    clothing: 'Uniform',
    propsWeapon: 'Ceramic blade',
  },
  coreCast: [],
  antagonists: [],
  supportingCast: 'Support One：Keeps watch in the hall.',
  locations: [
    {
      draftId: 'loc-1',
      locationId: 'loc_a1b2c3',
      name: 'Signal Room',
      description: 'A narrow relay room behind the sealed corridor.',
      environmentAppearance: 'Old relays, hanging wires, and pale blue light.',
      atmosphereDescription: 'Tense, humming, and close.',
      humanContextDescription: 'Only operators and maintenance staff come here.',
    },
    {
      draftId: 'loc-2',
      locationId: 'loc_d4e5f6',
      name: 'Roof Walk',
      description: 'An exposed bridge above the school yard.',
      environmentAppearance: 'Wet railings and cracked warning paint.',
      atmosphereDescription: 'Wide, isolating, and wind-cut.',
      humanContextDescription: 'Students avoid it after dusk.',
    },
  ],
  locationPool: 'Signal room\nRoof walk',
};

function renderControlledSection(initialValue: WorldBaseCastDraft = draftValue) {
  const onSubmit = vi.fn();
  const onReset = vi.fn();
  let latestValue = initialValue;

  function Harness() {
    const [value, setValue] = useState(initialValue);
    latestValue = value;

    return (
      <WorldSection
        packageName="sample-scene"
        value={value}
        onChange={(nextValue) => {
          latestValue = nextValue;
          setValue(nextValue);
        }}
        onSubmit={onSubmit}
        onReset={onReset}
      />
    );
  }

  render(<Harness />);

  return {
    onSubmit,
    onReset,
    getValue: () => latestValue,
  };
}

describe('WorldSection', () => {
  it('renders world rules, tone baseline, and structured location detail fields', () => {
    render(
      <WorldSection
        packageName="sample-scene"
        value={draftValue}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox', { name: '世界规则 / 禁忌 / 异常性质' })).toHaveValue(
      'No open magic. Every move must remain physical.',
    );
    expect(screen.getByRole('textbox', { name: '文风基线' })).toHaveValue(
      'Cold pressure with clipped light-novel pacing.',
    );
    expect(screen.getByRole('textbox', { name: '普通配角' })).toHaveValue(
      'Support One：Keeps watch in the hall.',
    );
    expect(screen.getByRole('button', { name: /Signal Room/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '地点名称' })).toHaveValue('Signal Room');
    expect(screen.getByRole('textbox', { name: '地点说明' })).toHaveValue(
      'A narrow relay room behind the sealed corridor.',
    );
    expect(screen.getByRole('textbox', { name: '环境外观描述' })).toHaveValue(
      'Old relays, hanging wires, and pale blue light.',
    );
    expect(screen.getByRole('textbox', { name: '氛围描述' })).toHaveValue('Tense, humming, and close.');
    expect(screen.getByRole('textbox', { name: '人文描述' })).toHaveValue(
      'Only operators and maintenance staff come here.',
    );
  });

  it('deletes the current location from the world rail', async () => {
    const user = userEvent.setup();
    const { getValue } = renderControlledSection();

    await user.click(screen.getByRole('button', { name: /Roof Walk/ }));
    expect(screen.getByRole('textbox', { name: '地点名称' })).toHaveValue('Roof Walk');

    await user.click(screen.getByRole('button', { name: '删除当前地点' }));

    expect(getValue().locations.map((location) => location.locationId)).toEqual(['loc_a1b2c3']);
    expect(screen.queryByRole('button', { name: /Roof Walk/ })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '地点名称' })).toHaveValue('Signal Room');
  });

  it('adds a location from the empty state and writes back its fields', async () => {
    const user = userEvent.setup();
    const { getValue } = renderControlledSection({
      ...draftValue,
      locations: [],
      locationPool: '',
    });

    expect(screen.getByText('还没有地点。先新增一个地点，再在右侧补完整明细。')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '新增地点' })[0]!);

    const nameInput = screen.getByRole('textbox', { name: '地点名称' });
    expect(nameInput).toHaveValue('');

    await user.type(nameInput, 'Control room');

    expect(screen.getByRole('textbox', { name: '地点名称' })).toHaveValue('Control room');
    expect(getValue().locations).toHaveLength(1);
    expect(getValue().locations[0]?.name).toBe('Control room');
  });
});
