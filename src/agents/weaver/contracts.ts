import type { LLMAdapter, WeaverImportRequest } from '@/engine/types/adapter-interface';
import type { WeaverImportPayload, WeaverImportSummary } from '@/types';

export interface RunWeaverImportInput {
  readonly adapter: Pick<LLMAdapter, 'weaverImport'>;
  readonly sourceText: string;
  readonly packageNameHint?: string;
}

export interface RunWeaverImportResult {
  readonly request: WeaverImportRequest;
  readonly payload: WeaverImportPayload;
  readonly summary: WeaverImportSummary;
}

export type WeaverImportRunner = (
  input: RunWeaverImportInput,
) => Promise<RunWeaverImportResult>;
