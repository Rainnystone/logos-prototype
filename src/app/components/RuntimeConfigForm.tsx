'use client';

import { useEffect, useState, type ReactNode } from 'react';

import {
  buildAdapterConfig,
  detectPresetFromConfig,
  getPresetById,
  loadAdapterConfig,
  PROVIDER_PRESETS,
  saveAdapterConfig,
  type PresetId,
} from '@/app/runtime-config';
import type { AdapterConfig } from '@/engine/api-adapter/providers/provider-interface';

interface RuntimeConfigFormProps {
  readonly initialConfig?: AdapterConfig | null;
  readonly onSave: (config: AdapterConfig) => void;
  readonly actionSlot?: ReactNode;
}

interface RuntimeConfigFormState {
  readonly presetId: PresetId;
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
}

function getInitialFormState(config: AdapterConfig | null | undefined): RuntimeConfigFormState {
  if (config) {
    const presetId = detectPresetFromConfig(config);
    return {
      presetId,
      apiKey: config.providerConfig.apiKey,
      model: config.providerConfig.model,
      baseUrl: config.providerConfig.baseUrl,
    };
  }

  const defaultPreset = PROVIDER_PRESETS[0]!;
  return {
    presetId: defaultPreset.id,
    apiKey: '',
    model: defaultPreset.defaultModel,
    baseUrl: defaultPreset.baseUrl,
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

  const activePreset = getPresetById(formState.presetId);
  const isCustom = formState.presetId === 'custom';

  function handlePresetChange(nextPresetId: PresetId) {
    setStatusMessage(null);
    const preset = getPresetById(nextPresetId);
    setFormState((currentState) => ({
      ...currentState,
      presetId: nextPresetId,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel || currentState.model,
    }));
  }

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

  function handleSave() {
    const config = buildAdapterConfig(
      activePreset.providerType,
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
    (isCustom && formState.baseUrl.trim().length === 0);

  const inputClass =
    'w-full px-3 py-2 border-2 border-black rounded-none bg-white focus:ring-2 focus:ring-[#00ff00] focus:outline-none font-mono';

  return (
    <>
      <div className="grid gap-3 mb-4">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-black uppercase">Provider</span>
          <select
            className={inputClass}
            aria-label="Provider"
            value={formState.presetId}
            onChange={(event) => handlePresetChange(event.currentTarget.value as PresetId)}
          >
            {PROVIDER_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-black uppercase">API Key</span>
          <input
            className={inputClass}
            aria-label="API Key"
            type="password"
            value={formState.apiKey}
            onChange={(event) => updateField('apiKey', event.currentTarget.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-black uppercase">Model</span>
          {activePreset.models.length > 0 ? (
            <select
              className={inputClass}
              aria-label="Model"
              value={formState.model}
              onChange={(event) => updateField('model', event.currentTarget.value)}
            >
              {activePreset.models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={inputClass}
              aria-label="Model"
              type="text"
              value={formState.model}
              onChange={(event) => updateField('model', event.currentTarget.value)}
            />
          )}
        </label>
        {isCustom ? (
          <label className="grid gap-1">
            <span className="text-sm font-medium text-black uppercase">Base URL</span>
            <input
              className={inputClass}
              aria-label="Base URL"
              type="url"
              value={formState.baseUrl}
              onChange={(event) => updateField('baseUrl', event.currentTarget.value)}
            />
          </label>
        ) : (
          <div className="grid gap-1">
            <span className="text-sm font-medium text-black uppercase">Base URL</span>
            <p className="px-3 py-2 border-2 border-black/30 rounded-none bg-[#f5f5f5] font-mono text-sm text-black/60">
              {activePreset.baseUrl}
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="bg-[#00ff00] hover:bg-[#00cc00] text-black font-bold px-4 py-2 rounded-none border-2 border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm"
          type="button"
          onClick={handleSave}
          disabled={isSaveDisabled}
        >
          Save Runtime Config
        </button>
        {actionSlot}
        {statusMessage ? <p className="text-sm text-[#00ff00] font-medium">{statusMessage}</p> : null}
      </div>
    </>
  );
}
