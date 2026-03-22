'use client';

import { useEffect, useState } from 'react';

import type { WorkbenchDiagnostics, WorkbenchOperation } from '@/app/play/runtime';
import { buildAdapterConfig, getDefaultBaseUrl, saveAdapterConfig } from '@/app/runtime-config';
import type {
  AdapterConfig,
  ProviderType,
} from '@/engine/api-adapter/providers/provider-interface';
import type { UsageInfo } from '@/types';

interface ConfigPanelProps {
  readonly initialConfig?: AdapterConfig | null;
  readonly onSave: (config: AdapterConfig) => void;
  readonly diagnostics?: WorkbenchDiagnostics | undefined;
}

interface ConfigFormState {
  readonly provider: ProviderType;
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
}

const DIAGNOSTIC_ORDER: readonly WorkbenchOperation[] = [
  'collapse',
  'route',
  'generate',
  'audit',
  'settlement',
];

function formatOperationLabel(operation: WorkbenchOperation) {
  return operation.charAt(0).toUpperCase() + operation.slice(1);
}

function formatUsageHeadline(usage: UsageInfo | null) {
  if (!usage) {
    return 'Not reported';
  }

  if (usage.totalTokens !== undefined) {
    return `${usage.totalTokens} tokens`;
  }

  const derivedTotal = (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0);

  return derivedTotal > 0 ? `${derivedTotal} tokens` : 'Not reported';
}

function formatUsageBreakdown(usage: UsageInfo | null) {
  if (!usage) {
    return 'Prompt -, Completion -';
  }

  return `Prompt ${usage.promptTokens ?? '-'}, Completion ${usage.completionTokens ?? '-'}`;
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

export function ConfigPanel({
  initialConfig = null,
  onSave,
  diagnostics,
}: ConfigPanelProps) {
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

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-slate-400 focus:outline-none font-sans";

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 font-sans">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-slate-500 mb-1">Runtime Config</p>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Provider Setup</h2>
        </div>
        <p className="text-xs text-slate-400">Stored in localStorage only.</p>
      </div>
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
      <div className="flex items-center justify-between mb-6">
        <button 
          className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          type="button" 
          onClick={handleSave} 
          disabled={isSaveDisabled}
        >
          Save Runtime Config
        </button>
        {statusMessage ? <p className="text-sm text-emerald-600 font-medium">{statusMessage}</p> : null}
      </div>

      <section className="pt-4 border-t border-slate-100">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-800">Runtime Usage</h3>
          <p className="text-xs text-slate-500">
            {diagnostics?.latestOperation
              ? `Latest observed call: ${formatOperationLabel(diagnostics.latestOperation)}`
              : 'Awaiting first adapter call.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {DIAGNOSTIC_ORDER.map((operation) => {
            const usage = diagnostics?.usage[operation] ?? null;

            return (
              <article key={operation} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{formatOperationLabel(operation)}</span>
                <strong className="text-sm text-slate-800">{formatUsageHeadline(usage)}</strong>
                <p className="text-xs text-slate-400">{formatUsageBreakdown(usage)}</p>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
