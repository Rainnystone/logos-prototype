import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADAPTER_CONFIG_STORAGE_KEY } from '@/app/runtime-config';
import { RuntimeConfigForm } from '@/app/components/RuntimeConfigForm';

describe('RuntimeConfigForm', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores runtime config through the shared adapter storage key', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<RuntimeConfigForm onSave={onSave} />);

    await user.type(screen.getByLabelText('API Key'), 'shared-key');
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    expect(localStorage.getItem(ADAPTER_CONFIG_STORAGE_KEY)).toContain('shared-key');
    expect(onSave).toHaveBeenCalledWith({
      provider: 'anthropic',
      providerConfig: {
        apiKey: 'shared-key',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
      },
    });
  });

  it('shows an editable base URL field only for the custom preset', async () => {
    const user = userEvent.setup();

    render(<RuntimeConfigForm onSave={vi.fn()} />);

    expect(screen.queryByLabelText('Base URL')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Provider'), 'custom');

    expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
  });

  it('switches to MiniMax preset and populates model dropdown', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<RuntimeConfigForm onSave={onSave} />);

    await user.selectOptions(screen.getByLabelText('Provider'), 'minimax');

    const modelSelect = screen.getByLabelText('Model');
    expect(modelSelect).toBeInTheDocument();
    expect(modelSelect).toHaveValue('MiniMax-M2.7');

    await user.type(screen.getByLabelText('API Key'), 'minimax-key');
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    expect(onSave).toHaveBeenCalledWith({
      provider: 'anthropic',
      providerConfig: {
        apiKey: 'minimax-key',
        baseUrl: 'https://api.minimaxi.com/anthropic',
        model: 'MiniMax-M2.7',
      },
    });
  });

  it('allows selecting a different model within a preset', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<RuntimeConfigForm onSave={onSave} />);

    await user.selectOptions(screen.getByLabelText('Provider'), 'minimax');
    await user.selectOptions(screen.getByLabelText('Model'), 'MiniMax-M2.7-highspeed');
    await user.type(screen.getByLabelText('API Key'), 'test-key');
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        providerConfig: expect.objectContaining({
          model: 'MiniMax-M2.7-highspeed',
        }),
      }),
    );
  });
});
