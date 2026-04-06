import {
  resolveAuthoringPersistenceTarget,
  type AuthoringPersistenceTarget,
} from '@/authoring/persistence/repository';
import { loadStoryPackage } from '@/engine/story-loader';
import { resolveActiveStorylineContext } from '@/storylines/substrate';
import type { StoryPackage } from '@/types';

export interface ReloadStoryPackageOptions {
  readonly forWrite?: boolean;
  readonly target?: AuthoringPersistenceTarget;
}

export async function reloadStoryPackage(
  packageName: string,
  options: ReloadStoryPackageOptions = {},
): Promise<StoryPackage> {
  const target =
    options.target ??
    resolveAuthoringPersistenceTarget(
      packageName,
      (
        await resolveActiveStorylineContext(packageName, {
          forWrite: options.forWrite ?? false,
        })
      ).authoredRoot,
    );

  return loadStoryPackage(packageName, {
    authoredRootOverride: target.authoredRoot,
  });
}
