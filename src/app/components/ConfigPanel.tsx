'use client';

import { RuntimeConfigForm } from '@/app/components/RuntimeConfigForm';
import type { WorkbenchDiagnostics, WorkbenchOperation } from '@/app/play/runtime';
import type { AdapterConfig } from '@/engine/api-adapter/providers/provider-interface';
import type { UsageInfo } from '@/types';

interface ConfigPanelProps {
  readonly initialConfig?: AdapterConfig | null;
  readonly onSave: (config: AdapterConfig) => void;
  readonly diagnostics?: WorkbenchDiagnostics | undefined;
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

export function ConfigPanel({
  initialConfig = null,
  onSave,
  diagnostics,
}: ConfigPanelProps) {
  return (
    <section className="bg-white border-2 border-black rounded-none shadow-brutal p-5 font-mono">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-black/50 mb-1">Runtime Config</p>
          <h2 className="text-lg font-bold text-black tracking-tight uppercase">Provider Setup</h2>
        </div>
        <p className="text-xs text-black/40">Stored in localStorage only.</p>
      </div>
      <div className="mb-6">
        <RuntimeConfigForm initialConfig={initialConfig} onSave={onSave} />
      </div>

      <section className="pt-4 border-t-2 border-black">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-black uppercase">Runtime Usage</h3>
          <p className="text-xs text-black/50">
            {diagnostics?.latestOperation
              ? `Latest observed call: ${formatOperationLabel(diagnostics.latestOperation)}`
              : 'Awaiting first adapter call.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {DIAGNOSTIC_ORDER.map((operation) => {
            const usage = diagnostics?.usage[operation] ?? null;

            return (
              <article key={operation} className="p-3 border-2 border-black rounded-none bg-[#f5f5f5] flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-black/50">{formatOperationLabel(operation)}</span>
                <strong className="text-sm text-black">{formatUsageHeadline(usage)}</strong>
                <p className="text-xs text-black/40">{formatUsageBreakdown(usage)}</p>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
