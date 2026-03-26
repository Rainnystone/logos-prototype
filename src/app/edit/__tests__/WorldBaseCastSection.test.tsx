import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WorldBaseCastSection } from '@/app/edit/sections/WorldBaseCastSection';
import type { WorldBaseCastDraft } from '@/authoring/sections/worldbase-cast';

const draftValue: WorldBaseCastDraft = {
  worldBaseSetting: 'World base',
  worldRules: 'No open magic',
  toneBaseline: 'Cold pressure',
  hero: {
    draftId: 'hero-1',
    name: 'Hero One',
    identityRole: 'Lead breaker',
    lightNovelTrait: 'Silent pressure',
    gender: 'Female',
    personality: 'Cold',
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
  it('renders world blocks plus character rails and a detailed editor', async () => {
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

    expect(screen.getByRole('region', { name: 'WorldBase workspace' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Character editor column' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'WorldBase & Cast' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'World Base Setting' })).toHaveValue('World base');
    expect(screen.getByRole('button', { name: /Hero One/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Core One/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Villain One/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Core One/ }));
    expect(screen.getByRole('heading', { name: 'Core One' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Character Name' })).toHaveValue('Core One');

    await user.clear(screen.getByRole('textbox', { name: 'Character Name' }));
    await user.type(screen.getByRole('textbox', { name: 'Character Name' }), 'Core Two');

    expect(onChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Add Core Cast Character' }));
    await user.click(screen.getByRole('button', { name: 'Add Antagonist Character' }));

    await user.click(screen.getByRole('button', { name: 'Save Section' }));
    await user.click(screen.getByRole('button', { name: 'Reset Section' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
