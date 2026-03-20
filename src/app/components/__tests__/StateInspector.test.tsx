import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { stateSnapshotFixture } from '@/app/__tests__/fixtures';
import { StateInspector } from '@/app/components/StateInspector';

describe('StateInspector', () => {
  it('displays phase index and beat index', () => {
    render(
      <StateInspector
        state={stateSnapshotFixture}
        gradientSequence={['Low', 'Med', 'High', 'Low']}
      />,
    );

    expect(screen.getByText('Phase 2 / 2')).toBeInTheDocument();
    expect(screen.getByText('Beat 3 / 4')).toBeInTheDocument();
  });

  it('displays Alpha and Beta boundaries', () => {
    render(
      <StateInspector
        state={stateSnapshotFixture}
        gradientSequence={['Low', 'Med', 'High', 'Low']}
      />,
    );

    expect(screen.getByText(stateSnapshotFixture.sceneState.alpha)).toBeInTheDocument();
    expect(screen.getByText(stateSnapshotFixture.sceneState.beta)).toBeInTheDocument();
  });

  it('displays the current volume and router', () => {
    render(
      <StateInspector
        state={stateSnapshotFixture}
        gradientSequence={['Low', 'Med', 'High', 'Low']}
      />,
    );

    expect(screen.getByText('High')).toHaveAttribute('data-volume', 'High');
    expect(screen.getByText('Counterplay')).toBeInTheDocument();
  });

  it('renders the phase gradient as four bars', () => {
    render(
      <StateInspector
        state={stateSnapshotFixture}
        gradientSequence={['Low', 'Med', 'High', 'Low']}
      />,
    );

    expect(screen.getAllByTestId(/gradient-bar-/)).toHaveLength(4);
  });

  it('displays phase consequences', () => {
    render(
      <StateInspector
        state={stateSnapshotFixture}
        gradientSequence={['Low', 'Med', 'High', 'Low']}
      />,
    );

    expect(
      screen.getByText('The hostile signal now reacts to surveillance equipment.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('The witness remains nearby but unaware of the threat origin.'),
    ).toBeInTheDocument();
  });

  it('shows the history window when expanded', async () => {
    const user = userEvent.setup();

    render(
      <StateInspector
        state={stateSnapshotFixture}
        gradientSequence={['Low', 'Med', 'High', 'Low']}
      />,
    );

    expect(screen.queryByText('Inspect the flickering camera.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show History Window' }));

    expect(screen.getByText('Inspect the flickering camera.')).toBeInTheDocument();
    expect(screen.getByText('The lens jerks toward the hallway corner.')).toBeInTheDocument();
  });
});
