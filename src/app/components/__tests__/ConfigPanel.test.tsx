import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigPanel } from '@/app/components/ConfigPanel';
import { createEmptyWorkbenchDiagnostics } from '@/app/play/runtime';

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

  it('includes anthropic and openai-compatible provider options', () => {
    render(<ConfigPanel onSave={vi.fn()} />);

    const provider = screen.getByLabelText('Provider');
    expect(screen.getByRole('option', { name: 'Anthropic' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'OpenAI Compatible' })).toBeInTheDocument();
    expect(provider).toBeInTheDocument();
  });

  it('shows the base URL field when openai-compatible is selected', async () => {
    const user = userEvent.setup();
    render(<ConfigPanel onSave={vi.fn()} />);

    expect(screen.queryByLabelText('Base URL')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Provider'), 'openai-compatible');

    expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
  });

  it('stores the API key in localStorage when the configuration is saved', async () => {
    const user = userEvent.setup();
    render(<ConfigPanel onSave={vi.fn()} />);

    await user.type(screen.getByLabelText('API Key'), 'local-key');
    await user.type(screen.getByLabelText('Model'), 'claude-test');
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    expect(localStorage.getItem('logos-adapter-config')).toContain('local-key');
  });

  it('emits a valid AdapterConfig object on save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<ConfigPanel onSave={onSave} />);

    await user.type(screen.getByLabelText('API Key'), 'runtime-key');
    await user.type(screen.getByLabelText('Model'), 'claude-workbench');
    await user.click(screen.getByRole('button', { name: 'Save Runtime Config' }));

    expect(onSave).toHaveBeenCalledWith({
      provider: 'anthropic',
      providerConfig: {
        apiKey: 'runtime-key',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-workbench',
      },
    });
  });

  it('renders runtime usage in the same panel as runtime config', () => {
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

    expect(screen.getByRole('heading', { name: 'Runtime Usage' })).toBeInTheDocument();
    expect(screen.getByText('Latest observed call: Route')).toBeInTheDocument();
    expect(screen.getByText('72 tokens')).toBeInTheDocument();
    expect(screen.getAllByText('Not reported').length).toBeGreaterThan(0);
  });
});
