import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigPanel } from '@/app/components/ConfigPanel';
import { createEmptyWorkbenchDiagnostics } from '@/app/play/runtime';
import { ADAPTER_CONFIG_STORAGE_KEY } from '@/app/runtime-config';

describe('ConfigPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the provider selector, API key input, and model input', () => {
    render(<ConfigPanel onSave={vi.fn()} />);

    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
    expect(screen.getByLabelText('API Key')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Model')).toBeInTheDocument();
  });

  it('includes provider preset options', () => {
    render(<ConfigPanel onSave={vi.fn()} />);

    expect(screen.getByRole('option', { name: 'Anthropic' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'MiniMax' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'OpenAI' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Custom Provider' })).toBeInTheDocument();
  });

  it('shows an editable base URL field when custom preset is selected', async () => {
    const user = userEvent.setup();
    render(<ConfigPanel onSave={vi.fn()} />);

    expect(screen.queryByLabelText('Base URL')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Provider'), 'custom');

    expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
  });

  it('stores the API key in localStorage when the configuration is saved', async () => {
    const user = userEvent.setup();
    render(<ConfigPanel onSave={vi.fn()} />);

    await user.type(screen.getByLabelText('API Key'), 'local-key');
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    expect(localStorage.getItem(ADAPTER_CONFIG_STORAGE_KEY)).toContain('local-key');
  });

  it('emits a valid AdapterConfig object on save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<ConfigPanel onSave={onSave} />);

    await user.type(screen.getByLabelText('API Key'), 'runtime-key');
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    expect(onSave).toHaveBeenCalledWith({
      provider: 'anthropic',
      providerConfig: {
        apiKey: 'runtime-key',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
      },
    });
  });

  it('renders runtime usage labels in the panel', () => {
    render(
      <ConfigPanel
        diagnostics={{
          ...createEmptyWorkbenchDiagnostics(),
          latestOperation: 'route',
          usage: {
            collapse: null,
            route: {
              promptTokens: 60,
              completionTokens: 12,
              totalTokens: 72,
            },
            generate: null,
            audit: null,
            settlement: null,
          },
        }}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText('Runtime Usage')).toBeInTheDocument();
    expect(screen.getByText(/Latest: Route/)).toBeInTheDocument();
    expect(screen.getByText('72 tokens')).toBeInTheDocument();
  });

  it('shows provider inputs alongside runtime usage', async () => {
    const user = userEvent.setup();

    render(<ConfigPanel onSave={vi.fn()} diagnostics={createEmptyWorkbenchDiagnostics()} />);

    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Runtime Config' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Provider'), 'custom');

    expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
    expect(screen.getByText('Runtime Usage')).toBeInTheDocument();
  });
});
