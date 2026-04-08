import { resolveSidecarReferences } from '@/agents/reference-loader';
import type { ResolvedSidecarReference } from '@/agents/reference-loader';
import { weaverAgentDefinition } from '@/agents/weaver/definition';
import type {
  RunWeaverImportInput,
  RunWeaverImportResult,
} from '@/agents/weaver/contracts';
import {
  validateWeaverImportPayload,
  validateWeaverImportSummary,
} from '@/engine/schema-validator';
import type { WeaverImportRequest } from '@/engine/types/adapter-interface';

function resolveWeaverImportManifests() {
  return weaverAgentDefinition.referenceManifestsByOperation?.weaverImport ?? [];
}

function buildImportRequest(
  input: Pick<RunWeaverImportInput, 'sourceText' | 'packageNameHint'>,
  resolvedReferences: readonly ResolvedSidecarReference[],
): WeaverImportRequest {
  return {
    sourceText: input.sourceText,
    ...(input.packageNameHint ? { packageNameHint: input.packageNameHint } : {}),
    resolvedReferences,
  };
}

function buildImportSummary(
  payload: ReturnType<typeof validateWeaverImportPayload>,
): ReturnType<typeof validateWeaverImportSummary> {
  return validateWeaverImportSummary({
    schemaVersion: 1,
    sourceKind: 'text_import',
    lastRunAt: new Date().toISOString(),
    ...(payload.suggestedPackageName
      ? { suggestedPackageName: payload.suggestedPackageName }
      : {}),
    sourceSummary: payload.sourceSummary,
    importSummary: payload.importSummary,
    warnings: payload.warnings,
    unresolvedGaps: payload.unresolvedGaps,
    warningCount: payload.warnings.length,
    unresolvedGapCount: payload.unresolvedGaps.length,
    bootstrapStatus: 'pending',
  });
}

export async function runWeaverImport(
  input: RunWeaverImportInput,
): Promise<RunWeaverImportResult> {
  if (!input.adapter.weaverImport) {
    throw new Error('Weaver import adapter is required.');
  }

  const resolvedReferences = await resolveSidecarReferences({
    agentId: weaverAgentDefinition.agentId,
    operationKind: 'weaverImport',
    manifests: resolveWeaverImportManifests(),
  });
  const request = buildImportRequest(input, resolvedReferences);
  const payload = validateWeaverImportPayload(await input.adapter.weaverImport(request));

  return {
    request,
    payload,
    summary: buildImportSummary(payload),
  };
}
