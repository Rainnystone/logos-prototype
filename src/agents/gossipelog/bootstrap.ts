import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import {
  createEmptyCharacterRelationshipsFile,
  inspectCharacterRelationshipsState,
  saveCharacterRelationships,
} from '@/agents/gossipelog/repository';
import { saveWeaverImportSummary } from '@/agents/weaver/repository';
import { loadRuntimeStoryPackage } from '@/engine/story-loader';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import type { WeaverBootstrapStatus, WeaverImportSummary } from '@/types';

export const GOSSIPELOG_BOOTSTRAP_PENDING_WARNING =
  'Gossipelog bootstrap pending. First Play startup will retry once.';

type RelationshipStateReadability = Awaited<
  ReturnType<typeof inspectCharacterRelationshipsState>
>;

interface BootstrapGossipelogFromWeaverSummaryInput {
  readonly storyPackageName: string;
  readonly weaverSummary: WeaverImportSummary;
  readonly adapter: Pick<LLMAdapter, 'gossipelogUpdate' | 'gossipelogInjection'>;
  readonly relationshipState?: RelationshipStateReadability;
}

interface BootstrapGossipelogFromWeaverSummaryResult {
  readonly ok: boolean;
  readonly attempted: true;
  readonly bootstrapStatus: Extract<WeaverBootstrapStatus, 'succeeded' | 'fallback_pending'>;
  readonly errorMessage?: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildUpdatedSummary(
  summary: WeaverImportSummary,
  bootstrapStatus: Extract<WeaverBootstrapStatus, 'succeeded' | 'fallback_pending'>,
): WeaverImportSummary {
  return {
    ...summary,
    bootstrapStatus,
  };
}

function toBoundedRelationshipConfidenceNote(warnings: readonly string[]): string {
  if (warnings.length === 0) {
    return 'No import warnings were recorded.';
  }

  const note = warnings
    .map((warning) => warning.trim())
    .filter((warning) => warning.length > 0)
    .slice(0, 2)
    .join(' | ');

  if (note.length <= 220) {
    return note;
  }

  return `${note.slice(0, 217).trimEnd()}...`;
}

function buildBootstrapAcceptedBeatText(summary: WeaverImportSummary): string {
  return [
    'Bootstrap relationship seed from text import.',
    `Import summary: ${summary.importSummary}`,
    `Source summary: ${summary.sourceSummary}`,
    `Relationship-confidence note: ${toBoundedRelationshipConfidenceNote(summary.warnings)}`,
  ].join('\n');
}

function createBootstrapRoundId(): string {
  return `bootstrap-${Date.now().toString(36)}`;
}

export async function bootstrapGossipelogFromWeaverSummary(
  input: BootstrapGossipelogFromWeaverSummaryInput,
): Promise<BootstrapGossipelogFromWeaverSummaryResult> {
  const relationshipState =
    input.relationshipState ??
    (await inspectCharacterRelationshipsState(input.storyPackageName));

  try {
    if (relationshipState === 'unreadable') {
      await saveCharacterRelationships(
        input.storyPackageName,
        createEmptyCharacterRelationshipsFile(input.storyPackageName),
      );
    }

    const storyPackage = await loadRuntimeStoryPackage(input.storyPackageName);

    const cycleResult = await runGossipelogCycle({
      adapter: input.adapter,
      storyPackageName: input.storyPackageName,
      storyPackage,
      acceptedBeatText: buildBootstrapAcceptedBeatText(input.weaverSummary),
      roundId: createBootstrapRoundId(),
    });

    if (cycleResult.usedFallbackSource || cycleResult.usedFallbackLayer) {
      throw new Error(
        cycleResult.usedFallbackSource
          ? `bootstrap fell back to ${cycleResult.usedFallbackSource}`
          : `bootstrap fell back to ${cycleResult.usedFallbackLayer}`,
      );
    }

    await saveWeaverImportSummary(
      input.storyPackageName,
      buildUpdatedSummary(input.weaverSummary, 'succeeded'),
    );

    return {
      ok: true,
      attempted: true,
      bootstrapStatus: 'succeeded',
    };
  } catch (error) {
    await saveWeaverImportSummary(
      input.storyPackageName,
      buildUpdatedSummary(input.weaverSummary, 'fallback_pending'),
    ).catch(() => undefined);

    return {
      ok: false,
      attempted: true,
      bootstrapStatus: 'fallback_pending',
      errorMessage: getErrorMessage(error),
    };
  }
}
