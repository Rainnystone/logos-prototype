'use client';

import { useEffect, useState, type ReactNode } from 'react';

import {
  buildAdapterConfig,
  getDefaultBaseUrl,
  loadAdapterConfig,
  saveAdapterConfig,
} from '@/app/runtime-config';
import type {
  AdapterConfig,
  ProviderType,
} from '@/engine/api-adapter/providers/provider-interface';

interface RuntimeConfigFormProps {
  readonly initialConfig?: AdapterConfig | null;
  readonly onSave: (config: AdapterConfig) => void;
  readonly actionSlot?: ReactNode;
}

interface RuntimeConfigFormState {
  readonly provider: ProviderType;
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
}

function getInitialFormState(config: AdapterConfig | null | undefined): RuntimeConfigFormState {
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

export function RuntimeConfigForm({
  initialConfig = null,
  onSave,
  actionSlot,
}: RuntimeConfigFormProps) {
  const [formState, setFormState] = useState<RuntimeConfigFormState>(() =>
    getInitialFormState(initialConfig),
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setFormState(getInitialFormState(initialConfig));
      return;
    }

    const storedConfig = loadAdapterConfig();
    setFormState(getInitialFormState(storedConfig));
  }, [initialConfig]);

  function updateField<Key extends keyof RuntimeConfigFormState>(
    key: Key,
    value: RuntimeConfigFormState[Key],
  ) {
    setStatusMessage(null);
    setFormState((currentState) => ({
      ...currentState,
      [key]: value,
    }));
  }

  function handleProviderChange(provider: ProviderType) {
    setStatusMessage(null);
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

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-slate-400 focus:outline-none font-sans';

  return (
    <>
      <div className="grid gap-3 mb-4">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Provider</span>
          <select
            className={inputClass}
            aria-label="Provider"
            value={formState.provider}
            onChange={(event) => handleProviderChange(event.currentTarget.value as ProviderType)}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai-compatible">OpenAI Compatible</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">API Key</span>
          <input
            className={inputClass}
            aria-label="API Key"
            type="password"
            value={formState.apiKey}
            onChange={(event) => updateField('apiKey', event.currentTarget.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Model</span>
          <input
            className={inputClass}
            aria-label="Model"
            type="text"
            value={formState.model}
            onChange={(event) => updateField('model', event.currentTarget.value)}
          />
        </label>
        {formState.provider === 'openai-compatible' ? (
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Base URL</span>
            <input
              className={inputClass}
              aria-label="Base URL"
              type="url"
              value={formState.baseUrl}
              onChange={(event) => updateField('baseUrl', event.currentTarget.value)}
            />
          </label>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          onClick={handleSave}
          disabled={isSaveDisabled}
        >
          Save Runtime Config
        </button>
        {actionSlot}
        {statusMessage ? <p className="text-sm text-emerald-600 font-medium">{statusMessage}</p> : null}
      </div>
    </>
  );
}
