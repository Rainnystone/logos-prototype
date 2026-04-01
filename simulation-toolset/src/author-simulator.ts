import { saveSectionDraft } from '@/authoring/persistence/bridge';
import {
  createWorldBaseCastDraft,
  type WorldBaseCastDraft,
  type WorldBaseCharacterDraft,
} from '@/authoring/sections/worldbase-cast';
import { loadStoryPackage } from '@/engine/story-loader';
import type { SaveResult, SaveSource } from '@/authoring/contracts';
import type { StoryPackage } from '@/types';

import { createTempStoryPackage } from '@simulation/temp-package';

type WorldBaseCharacterPatch = Partial<WorldBaseCharacterDraft>;
type WorldBaseCastPatch = Partial<Omit<WorldBaseCastDraft, 'hero' | 'coreCast' | 'antagonists'>> & {
  readonly hero?: WorldBaseCharacterPatch;
  readonly coreCast?: readonly WorldBaseCharacterDraft[];
  readonly antagonists?: readonly WorldBaseCharacterDraft[];
};

type AuthorTrace = {
  readonly requestId: string;
  readonly sectionId: 'worldbase-cast';
  readonly resultKind: SaveResult['kind'];
  readonly changedFiles: readonly string[];
};

type AuthorSaveResult = {
  readonly saveResult: SaveResult;
  readonly trace: AuthorTrace;
  readonly reloadedStoryPackage: StoryPackage;
};

export type AuthorSimulator = {
  readonly packageName: string;
  saveWorldBaseCast(patch: WorldBaseCastPatch): Promise<AuthorSaveResult>;
  cleanup(): Promise<void>;
};

function buildRequestId(): string {
  return `simulation-author-${Math.random().toString(16).slice(2)}`;
}

function applyWorldBaseCastPatch(
  draft: WorldBaseCastDraft,
  patch: WorldBaseCastPatch,
): WorldBaseCastDraft {
  return {
    ...draft,
    ...patch,
    hero: patch.hero ? { ...draft.hero, ...patch.hero } : draft.hero,
    coreCast: patch.coreCast ?? draft.coreCast,
    antagonists: patch.antagonists ?? draft.antagonists,
  };
}

function extractChangedFiles(saveResult: SaveResult): readonly string[] {
  if (saveResult.kind === 'save_applied' || saveResult.kind === 'save_applied_with_warnings') {
    return saveResult.runtimeImpactSummary.changedFiles;
  }

  return [];
}

async function extractReloadedStoryPackage(saveResult: SaveResult): Promise<StoryPackage> {
  if (saveResult.kind === 'save_applied' || saveResult.kind === 'save_applied_with_warnings') {
    return saveResult.reloadedSectionState;
  }

  return loadStoryPackage(saveResult.packageName);
}

export async function createAuthorSimulator(
  sourcePackageName: string,
  source: SaveSource = 'page',
): Promise<AuthorSimulator> {
  const fixture = await createTempStoryPackage(sourcePackageName);

  return {
    packageName: fixture.packageName,
    cleanup() {
      return fixture.cleanup();
    },
    async saveWorldBaseCast(patch) {
      const storyPackage = await loadStoryPackage(fixture.packageName);
      const requestId = buildRequestId();
      const draft = createWorldBaseCastDraft(storyPackage.worldBase);
      const uiFields: Record<string, unknown> = {
        ...applyWorldBaseCastPatch(draft, patch),
      };
      const saveResult = await saveSectionDraft({
        requestId,
        packageName: fixture.packageName,
        sectionId: 'worldbase-cast',
        source,
        payload: {
          uiFields,
        },
      });
      const reloadedStoryPackage = await extractReloadedStoryPackage(saveResult);

      return {
        saveResult,
        trace: {
          requestId,
          sectionId: 'worldbase-cast',
          resultKind: saveResult.kind,
          changedFiles: extractChangedFiles(saveResult),
        },
        reloadedStoryPackage,
      };
    },
  };
}
