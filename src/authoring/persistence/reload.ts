import { loadStoryPackage } from '@/engine/story-loader';
import type { StoryPackage } from '@/types';

export async function reloadStoryPackage(packageName: string): Promise<StoryPackage> {
  return loadStoryPackage(packageName);
}
