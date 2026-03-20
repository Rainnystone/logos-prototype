import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlayerInput } from '@/app/components/PlayerInput';

const options = ['Option A', 'Option B', 'Option C', 'Option D'] as const;

describe('PlayerInput', () => {
  it('displays four option buttons when options are provided', () => {
    render(<PlayerInput options={options} isLoading={false} onSubmit={vi.fn()} />);

    for (const option of options) {
      expect(screen.getByRole('button', { name: option })).toBeInTheDocument();
    }
  });

  it('submits the selected option text', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<PlayerInput options={options} isLoading={false} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Option B' }));

    expect(onSubmit).toHaveBeenCalledWith('Option B');
  });

  it('renders the free text input field', () => {
    render(<PlayerInput options={options} isLoading={false} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Free text action')).toBeInTheDocument();
  });

  it('submits free text input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<PlayerInput options={options} isLoading={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Free text action'), 'Step through the service door.');
    await user.click(screen.getByRole('button', { name: 'Submit Action' }));

    expect(onSubmit).toHaveBeenCalledWith('Step through the service door.');
  });

  it('disables inputs while the workbench is generating', () => {
    render(<PlayerInput options={options} isLoading={true} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Option A' })).toBeDisabled();
    expect(screen.getByLabelText('Free text action')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit Action' })).toBeDisabled();
  });
});
