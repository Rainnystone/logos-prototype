import { loadStoryPackage } from '@/engine/story-loader';

let sampleScenePromise: ReturnType<typeof loadStoryPackage> | null = null;

export async function loadSampleSceneStoryPackage() {
  if (!sampleScenePromise) {
    sampleScenePromise = loadStoryPackage('sample-scene');
  }

  return sampleScenePromise;
}
