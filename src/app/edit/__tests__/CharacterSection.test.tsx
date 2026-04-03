import { useState } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CharacterSection } from '@/app/edit/sections/CharacterSection';
import type { WorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';
import type { EditRuntimeContinuityView } from '@/runtime-sessions/views';

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
  coreCast: [
    {
      draftId: 'core-1',
      characterId: 'chr_core001',
      name: 'Touka',
      identityRole: 'Ordinary-life anchor',
      lightNovelTrait: 'Soft contrast',
      gender: 'Female',
      personality: 'Gentle',
      age: '16',
      occupation: 'Student',
      characterSummary: 'Holds the ordinary layer in place.',
      capabilityBoundary: '',
      behaviorBoundary: 'Stays outside direct danger.',
      oocRedLine: 'Never notices the anomaly.',
      clothing: 'School uniform',
      propsWeapon: '',
    },
  ],
  antagonists: [
    {
      draftId: 'ant-1',
      characterId: 'chr_ant001',
      name: 'Retsu',
      identityRole: 'Signal-born threat',
      lightNovelTrait: 'Showman',
      gender: 'Male',
      personality: 'Chaotic',
      age: '18',
      occupation: 'Streamer',
      characterSummary: 'Turns attention into pressure.',
      capabilityBoundary: 'Needs attention to trigger.',
      behaviorBoundary: 'Always performs.',
      oocRedLine: 'Cannot become quiet.',
      clothing: 'Stream jacket',
      propsWeapon: 'Phone rig',
      fatalWeakness: 'Attention drop',
    },
  ],
  supportingCast: 'Support One：Keeps watch in the hall.',
  locations: [],
  locationPool: 'Signal room',
};

function renderControlledSection(initialValue: WorldBaseCastDraft = draftValue) {
  const onSubmit = vi.fn();
  const onReset = vi.fn();
  let latestValue = initialValue;

  function Harness() {
    const [value, setValue] = useState(initialValue);
    latestValue = value;

    return (
      <CharacterSection
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

describe('CharacterSection', () => {
  it('renders a no-active-continuity relationship state when no continuity view is provided', () => {
    render(
      <CharacterSection
        packageName="sample-scene"
        value={draftValue}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText('主角')).toBeInTheDocument();
    expect(screen.getByText('核心角色')).toBeInTheDocument();
    expect(screen.getByText('反派')).toBeInTheDocument();
    expect(screen.getByText('关系区')).toBeInTheDocument();
    expect(screen.getByText('当前没有进行中的 Runtime 连续性会话。')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders continuity-backed relationship status when an active session exists', () => {
    const runtimeContinuityView: EditRuntimeContinuityView = {
      kind: 'active',
      activeSession: {
        sessionId: 'sess_02',
        lifecycle: 'in_progress',
        activeCheckpointId: 'chk_11',
        acceptedBeatCount: 4,
        relationshipStatus: {
          highlightedDeltasText: 'Nagi now trusts Touka after the corridor breach.',
          stableBackgroundText: 'Nagi and Touka hold a guarded alliance.',
          source: 'session',
        },
      },
    };

    render(
      <CharacterSection
        packageName="sample-scene"
        value={draftValue}
        runtimeContinuityView={runtimeContinuityView}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText('当前活跃会话：sess_02')).toBeInTheDocument();
    expect(screen.getByText('已接收 Beat：4')).toBeInTheDocument();
    expect(screen.getByText('关系变化：Nagi now trusts Touka after the corridor breach.')).toBeInTheDocument();
    expect(screen.getByText('关系基线：Nagi and Touka hold a guarded alliance.')).toBeInTheDocument();
  });

  it('renders an unavailable state when runtime continuity cannot be read', () => {
    const runtimeContinuityView: EditRuntimeContinuityView = {
      kind: 'unavailable',
      activeSession: null,
      reason: 'Runtime continuity is unavailable for "sample-scene": invalid runtime file.',
    };

    render(
      <CharacterSection
        packageName="sample-scene"
        value={draftValue}
        runtimeContinuityView={runtimeContinuityView}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText('Runtime 连续性暂不可用。')).toBeInTheDocument();
    expect(
      screen.getByText('Runtime continuity is unavailable for "sample-scene": invalid runtime file.'),
    ).toBeInTheDocument();
  });

  it('falls back to hero after deleting a selected antagonist', async () => {
    const user = userEvent.setup();
    const { getValue } = renderControlledSection();

    await user.click(screen.getByRole('button', { name: /Retsu/ }));
    expect(screen.getByRole('textbox', { name: '角色名' })).toHaveValue('Retsu');
    expect(screen.getByRole('textbox', { name: '致命弱点' })).toHaveValue('Attention drop');

    await user.click(screen.getByRole('button', { name: '删除' }));

    expect(getValue().antagonists).toHaveLength(0);
    expect(screen.getByRole('textbox', { name: '角色名' })).toHaveValue('Nagi');
    expect(screen.queryByRole('textbox', { name: '致命弱点' })).not.toBeInTheDocument();
  });
});
