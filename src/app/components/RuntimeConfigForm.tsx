'use client';

import { useEffect, useState, type ReactNode } from 'react';

import {
  buildAdapterConfig,
  detectPresetFromConfig,
  getPresetById,
  loadAdapterConfig,
  OPERATION_MODES,
  OPERATION_MODE_LABELS,
  PROVIDER_PRESETS,
  saveAdapterConfig,
  type ModeOverrides,
  type OperationMode,
  type PresetId,
} from '@/app/runtime-config';
import { DEFAULT_MODE_CONFIGS } from '@/engine/api-adapter/schema-mapper';
import type { AdapterConfig } from '@/engine/api-adapter/providers/provider-interface';

interface RuntimeConfigFormProps {
  readonly initialConfig?: AdapterConfig | null;
  readonly onSave: (config: AdapterConfig) => void;
  readonly actionSlot?: ReactNode;
}

interface ModeFieldState {
  readonly temperature: string;
  readonly maxOutputTokens: string;
}

interface RuntimeConfigFormState {
  readonly presetId: PresetId;
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
  readonly modeOverrides: Record<OperationMode, ModeFieldState>;
}

const MODE_CONFIG_KEYS: Record<OperationMode, keyof AdapterConfig> = {
  route: 'routeConfig',
  generate: 'generateConfig',
  audit: 'auditConfig',
  settlement: 'settlementConfig',
  collapse: 'collapseConfig',
};

function buildInitialModeOverrides(
  config: AdapterConfig | null | undefined,
): Record<OperationMode, ModeFieldState> {
  const result = {} as Record<OperationMode, ModeFieldState>;

  for (const mode of OPERATION_MODES) {
    const defaults = DEFAULT_MODE_CONFIGS[mode];
    const override = config?.[MODE_CONFIG_KEYS[mode]] as
      | { temperature?: number; maxOutputTokens?: number }
      | undefined;

    result[mode] = {
      temperature: String(override?.temperature ?? defaults.temperature),
      maxOutputTokens: String(override?.maxOutputTokens ?? defaults.maxOutputTokens),
    };
  }

  return result;
}

function getInitialFormState(config: AdapterConfig | null | undefined): RuntimeConfigFormState {
  if (config) {
    const presetId = detectPresetFromConfig(config);
    return {
      presetId,
      apiKey: config.providerConfig.apiKey,
      model: config.providerConfig.model,
      baseUrl: config.providerConfig.baseUrl,
      modeOverrides: buildInitialModeOverrides(config),
    };
  }

  const defaultPreset = PROVIDER_PRESETS[0]!;
  return {
    presetId: defaultPreset.id,
    apiKey: '',
    model: defaultPreset.defaultModel,
    baseUrl: defaultPreset.baseUrl,
    modeOverrides: buildInitialModeOverrides(null),
  };
}

function collectModeOverrides(
  modeFields: Record<OperationMode, ModeFieldState>,
): ModeOverrides {
  const overrides: Record<string, { temperature?: number; maxOutputTokens?: number }> = {};

  for (const mode of OPERATION_MODES) {
    const defaults = DEFAULT_MODE_CONFIGS[mode];
    const temp = parseFloat(modeFields[mode].temperature);
    const maxTokens = parseInt(modeFields[mode].maxOutputTokens, 10);
    const entry: { temperature?: number; maxOutputTokens?: number } = {};

    if (!isNaN(temp) && temp !== defaults.temperature) {
      entry.temperature = temp;
    }
    if (!isNaN(maxTokens) && maxTokens !== defaults.maxOutputTokens) {
      entry.maxOutputTokens = maxTokens;
    }

    if (Object.keys(entry).length > 0) {
      overrides[mode] = entry;
    }
  }

  return overrides;
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
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  function updateModeField(mode: OperationMode, field: keyof ModeFieldState, value: string) {
    setStatusMessage(null);
    setFormState((currentState) => ({
      ...currentState,
      modeOverrides: {
        ...currentState.modeOverrides,
        [mode]: {
          ...currentState.modeOverrides[mode],
          [field]: value,
        },
      },
    }));
  }

  function handleSave() {
    const modeOverrides = collectModeOverrides(formState.modeOverrides);

    const config = buildAdapterConfig(
      activePreset.providerType,
      formState.apiKey.trim(),
      formState.model.trim(),
      formState.baseUrl.trim(),
      Object.keys(modeOverrides).length > 0 ? modeOverrides : undefined,
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

  const smallInputClass =
    'w-full px-2 py-1 border border-black rounded-none bg-white focus:ring-1 focus:ring-[#00ff00] focus:outline-none font-mono text-xs';

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
            <p className="px-3 py-2 border-2 border-black/30 rounded-none bg-[#f5f5f5] font-mono text-xs text-black/60 truncate" title={activePreset.baseUrl}>
              {activePreset.baseUrl}
            </p>
          </div>
        )}
      </div>

      <div className="mb-4">
        <button
          type="button"
          className="text-xs font-medium text-black/60 uppercase tracking-wider hover:text-black transition-colors"
          onClick={() => setShowAdvanced((current) => !current)}
          aria-label="Toggle advanced parameters"
        >
          {showAdvanced ? '- Hide' : '+ Show'} Advanced Parameters
        </button>
        {showAdvanced ? (
          <div className="mt-3 border-2 border-black/20 rounded-none bg-[#f5f5f5] p-3">
            <p className="text-[10px] uppercase tracking-widest text-black/50 mb-3">Per-Operation Overrides</p>
            <div className="grid gap-2">
              <div className="grid grid-cols-[1fr_5rem_6rem] gap-2 text-[10px] uppercase tracking-wider text-black/50 px-1">
                <span>Mode</span>
                <span>Temp</span>
                <span>Max Tokens</span>
              </div>
              {OPERATION_MODES.map((mode) => (
                <div
                  key={mode}
                  className="grid grid-cols-[1fr_5rem_6rem] gap-2 items-center"
                >
                  <span className="text-xs font-medium text-black uppercase px-1">
                    {OPERATION_MODE_LABELS[mode]}
                  </span>
                  <input
                    className={smallInputClass}
                    aria-label={`${OPERATION_MODE_LABELS[mode]} temperature`}
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formState.modeOverrides[mode].temperature}
                    onChange={(event) => updateModeField(mode, 'temperature', event.currentTarget.value)}
                  />
                  <input
                    className={smallInputClass}
                    aria-label={`${OPERATION_MODE_LABELS[mode]} max tokens`}
                    type="number"
                    step="256"
                    min="256"
                    value={formState.modeOverrides[mode].maxOutputTokens}
                    onChange={(event) => updateModeField(mode, 'maxOutputTokens', event.currentTarget.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
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
