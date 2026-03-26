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
    <div className="font-mono">
      <div className="mb-4">
        <RuntimeConfigForm initialConfig={initialConfig} onSave={onSave} />
      </div>

      <section className="pt-3 border-t border-black/20">
        <div className="mb-3">
          <h3 className="text-xs font-bold text-black uppercase">Runtime Usage</h3>
          <p className="text-[10px] text-black/50">
            {diagnostics?.latestOperation
              ? `Latest: ${formatOperationLabel(diagnostics.latestOperation)}`
              : 'Awaiting first call.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DIAGNOSTIC_ORDER.map((operation) => {
            const usage = diagnostics?.usage[operation] ?? null;

            return (
              <article key={operation} className="p-2 border border-black/30 rounded-none bg-[#f5f5f5] flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-wider text-black/50">{formatOperationLabel(operation)}</span>
                <strong className="text-xs text-black">{formatUsageHeadline(usage)}</strong>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
