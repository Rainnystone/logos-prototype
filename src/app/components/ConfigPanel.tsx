'use client';

import { useEffect, useState } from 'react';

import { buildAdapterConfig, getDefaultBaseUrl, saveAdapterConfig } from '@/app/runtime-config';
import type {
  AdapterConfig,
  ProviderType,
} from '@/engine/api-adapter/providers/provider-interface';

interface ConfigPanelProps {
  readonly initialConfig?: AdapterConfig | null;
  readonly onSave: (config: AdapterConfig) => void;
}

interface ConfigFormState {
  readonly provider: ProviderType;
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
}

function getInitialFormState(config: AdapterConfig | null | undefined): ConfigFormState {
  if (config) {
    return {
      provider: config.provider,
      apiKey: config.providerConfig.apiKey,
      model: config.providerConfig.model,
      baseUrl: config.providerConfig.baseUrl,
    };
  }

  return {
    provider: 'anthropic',
    apiKey: '',
    model: '',
    baseUrl: getDefaultBaseUrl('anthropic'),
  };
}

export function ConfigPanel({ initialConfig = null, onSave }: ConfigPanelProps) {
  const [formState, setFormState] = useState<ConfigFormState>(() =>
    getInitialFormState(initialConfig),
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormState(getInitialFormState(initialConfig));
  }, [initialConfig]);

  function updateField<Key extends keyof ConfigFormState>(key: Key, value: ConfigFormState[Key]) {
    setFormState((currentState) => ({
      ...currentState,
      [key]: value,
    }));
  }

  function handleProviderChange(provider: ProviderType) {
    setFormState((currentState) => ({
      ...currentState,
      provider,
      baseUrl:
        currentState.baseUrl === getDefaultBaseUrl(currentState.provider) ||
        currentState.baseUrl.trim().length === 0
          ? getDefaultBaseUrl(provider)
          : currentState.baseUrl,
    }));
  }

  function handleSave() {
    const config = buildAdapterConfig(
      formState.provider,
      formState.apiKey.trim(),
      formState.model.trim(),
      formState.baseUrl.trim(),
    );

    saveAdapterConfig(config);
    onSave(config);
    setStatusMessage('Runtime config saved locally.');
  }

  const isSaveDisabled =
    formState.apiKey.trim().length === 0 ||
    formState.model.trim().length === 0 ||
    (formState.provider === 'openai-compatible' && formState.baseUrl.trim().length === 0);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Runtime Config</p>
          <h2>Provider Setup</h2>
        </div>
        <p className="panel-note">Stored in localStorage only.</p>
      </div>
      <div className="form-grid">
        <label className="form-field">
          <span>Provider</span>
          <select
            aria-label="Provider"
            value={formState.provider}
            onChange={(event) => handleProviderChange(event.currentTarget.value as ProviderType)}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai-compatible">OpenAI Compatible</option>
          </select>
        </label>
        <label className="form-field">
          <span>API Key</span>
          <input
            aria-label="API Key"
            type="password"
            value={formState.apiKey}
            onChange={(event) => updateField('apiKey', event.currentTarget.value)}
          />
        </label>
        <label className="form-field">
          <span>Model</span>
          <input
            aria-label="Model"
            type="text"
            value={formState.model}
            onChange={(event) => updateField('model', event.currentTarget.value)}
          />
        </label>
        {formState.provider === 'openai-compatible' ? (
          <label className="form-field">
            <span>Base URL</span>
            <input
              aria-label="Base URL"
              type="url"
              value={formState.baseUrl}
              onChange={(event) => updateField('baseUrl', event.currentTarget.value)}
            />
          </label>
        ) : null}
      </div>
      <div className="panel-actions">
        <button type="button" onClick={handleSave} disabled={isSaveDisabled}>
          Save Runtime Config
        </button>
        {statusMessage ? <p className="panel-note">{statusMessage}</p> : null}
      </div>
    </section>
  );
}
