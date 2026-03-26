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
    await user.type(screen.getByLabelText('Model'), 'shared-model');
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    expect(localStorage.getItem(ADAPTER_CONFIG_STORAGE_KEY)).toContain('shared-key');
    expect(onSave).toHaveBeenCalledWith({
      provider: 'anthropic',
      providerConfig: {
        apiKey: 'shared-key',
        baseUrl: 'https://api.anthropic.com',
        model: 'shared-model',
      },
    });
  });

  it('shows the base URL field when openai-compatible is selected', async () => {
    const user = userEvent.setup();

    render(<RuntimeConfigForm onSave={vi.fn()} />);

    expect(screen.queryByLabelText('Base URL')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Provider'), 'openai-compatible');

    expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
  });
});
