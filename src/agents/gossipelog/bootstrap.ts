import { readFile, writeFile } from 'node:fs/promises';

import { runGossipelogCycle } from '@/agents/gossipelog/agent';
import {
  createEmptyCharacterRelationshipsFile,
  inspectCharacterRelationshipsState,
  resolveCharacterRelationshipsPath,
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
  readonly authoredRootOverride?: string;
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

function createBootstrapRoundId(): string {
  return `bootstrap-${Date.now().toString(36)}`;
}

export async function bootstrapGossipelogFromWeaverSummary(
  input: BootstrapGossipelogFromWeaverSummaryInput,
): Promise<BootstrapGossipelogFromWeaverSummaryResult> {
  const relationshipState =
    input.relationshipState ??
    (await inspectCharacterRelationshipsState(input.storyPackageName));
  const relationshipPath = resolveCharacterRelationshipsPath(input.storyPackageName);
  let unreadableSnapshot: string | null = null;
  let shouldRollbackUnreadableSnapshot = false;

  try {
    const loadOptions =
      input.authoredRootOverride === undefined
        ? undefined
        : { authoredRootOverride: input.authoredRootOverride };
    const storyPackage = await loadRuntimeStoryPackage(input.storyPackageName, loadOptions);
    const bootstrapPhaseId = storyPackage.phasePlans[0]?.phaseId;

    if (!bootstrapPhaseId) {
      throw new Error('Gossipelog bootstrap requires at least one phase plan anchor.');
    }

    const openingHook = storyPackage.sceneSpec.openingHook?.trim();
    const acceptedBeatText = [
      openingHook && openingHook.length > 0
        ? openingHook
        : 'Bootstrap relationship seed from text import.',
      `Relationship-confidence note: ${toBoundedRelationshipConfidenceNote(input.weaverSummary.warnings)}`,
    ].join('\n\n');

    if (relationshipState === 'unreadable') {
      unreadableSnapshot = await readFile(relationshipPath, 'utf8');
      shouldRollbackUnreadableSnapshot = true;
      await saveCharacterRelationships(
        input.storyPackageName,
        createEmptyCharacterRelationshipsFile(input.storyPackageName),
      );
    }

    const cycleResult = await runGossipelogCycle({
      adapter: input.adapter,
      storyPackageName: input.storyPackageName,
      storyPackage,
      acceptedBeatText,
      roundId: createBootstrapRoundId(),
      phaseId: bootstrapPhaseId,
      beatIndex: 0,
    });

    if (cycleResult.usedFallbackSource) {
      throw new Error(
        `bootstrap fell back to ${cycleResult.usedFallbackSource}`,
      );
    }

    shouldRollbackUnreadableSnapshot = false;

    if (cycleResult.usedFallbackLayer) {
      throw new Error(`bootstrap fell back to ${cycleResult.usedFallbackLayer}`);
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
    if (unreadableSnapshot !== null && shouldRollbackUnreadableSnapshot) {
      await writeFile(relationshipPath, unreadableSnapshot, 'utf8').catch(() => undefined);
    }

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
