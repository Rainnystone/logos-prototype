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

      <section className="inspector-section">
        <div className="section-toggle">
          <h3>Runtime Usage</h3>
          <p className="panel-note">
            {diagnostics?.latestOperation
              ? `Latest observed call: ${formatOperationLabel(diagnostics.latestOperation)}`
              : 'Awaiting first adapter call.'}
          </p>
        </div>
        <div className="usage-grid">
          {DIAGNOSTIC_ORDER.map((operation) => {
            const usage = diagnostics?.usage[operation] ?? null;

            return (
              <article key={operation} className="usage-card">
                <span className="metric-label">{formatOperationLabel(operation)}</span>
                <strong>{formatUsageHeadline(usage)}</strong>
                <p className="panel-note">{formatUsageBreakdown(usage)}</p>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
