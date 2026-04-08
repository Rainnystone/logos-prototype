import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { SidecarReferenceManifest } from '@/agents/registry';

export interface ResolvedSidecarReference {
  readonly referenceId: string;
  readonly injectionLabel: string;
  readonly relativePath: string;
  readonly contents: string;
  readonly estimatedTokens: number;
}

export interface ResolveSidecarReferencesOptions {
  readonly agentId: string;
  readonly operationKind: string;
  readonly manifests: readonly SidecarReferenceManifest[];
  readonly maxReferenceTokens?: number;
  readonly referenceRevision?: string;
}

export const DEFAULT_REFERENCE_TOKEN_BUDGET = 4_000;

interface LoadedSidecarReference extends ResolvedSidecarReference {
  readonly priority: number;
  readonly required: boolean;
}

const loadedReferenceCache = new Map<string, Promise<readonly LoadedSidecarReference[]>>();

function estimateTokens(contents: string): number {
  return Math.max(1, Math.ceil(contents.length / 4));
}

function computeReferenceRevision(manifests: readonly SidecarReferenceManifest[]): string {
  return manifests
    .map((manifest) =>
      [
        manifest.referenceId,
        manifest.relativePath,
        manifest.loadPolicy,
        manifest.required ? 'required' : 'optional',
        String(manifest.priority),
      ].join(':'),
    )
    .join('|');
}

function resolveRepoRelativePath(relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error('Sidecar references must stay repo-relative static assets.');
  }

  const absolutePath = path.resolve(process.cwd(), relativePath);
  const relativeToRoot = path.relative(process.cwd(), absolutePath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('Sidecar references must stay within the repository root.');
  }

  return absolutePath;
}

async function loadManifest(
  manifest: SidecarReferenceManifest,
): Promise<LoadedSidecarReference | null> {
  try {
    const absolutePath = resolveRepoRelativePath(manifest.relativePath);
    const contents = await readFile(absolutePath, 'utf8');

    return {
      referenceId: manifest.referenceId,
      injectionLabel: manifest.injectionLabel,
      relativePath: manifest.relativePath,
      contents,
      estimatedTokens: estimateTokens(contents),
      priority: manifest.priority,
      required: manifest.required,
    };
  } catch {
    if (manifest.required) {
      throw new Error(
        `Required reference "${manifest.referenceId}" could not be loaded before provider execution.`,
      );
    }

    return null;
  }
}

function toResolvedReference(reference: LoadedSidecarReference): ResolvedSidecarReference {
  return {
    referenceId: reference.referenceId,
    injectionLabel: reference.injectionLabel,
    relativePath: reference.relativePath,
    contents: reference.contents,
    estimatedTokens: reference.estimatedTokens,
  };
}

function compareReferencePriority(
  left: Pick<LoadedSidecarReference, 'priority' | 'referenceId'>,
  right: Pick<LoadedSidecarReference, 'priority' | 'referenceId'>,
): number {
  if (right.priority !== left.priority) {
    return right.priority - left.priority;
  }

  return left.referenceId.localeCompare(right.referenceId);
}

function trimLoadedReferences(
  loadedReferences: readonly LoadedSidecarReference[],
  maxReferenceTokens: number,
): readonly ResolvedSidecarReference[] {
  const requiredReferences = loadedReferences
    .filter((reference) => reference.required)
    .sort(compareReferencePriority);
  const optionalReferences = loadedReferences
    .filter((reference) => !reference.required)
    .sort(compareReferencePriority);
  const requiredTokenTotal = requiredReferences.reduce(
    (total, reference) => total + reference.estimatedTokens,
    0,
  );
  let remainingTokens = maxReferenceTokens - requiredTokenTotal;

  const keptOptionalReferenceIds = new Set<string>();

  for (const reference of optionalReferences) {
    if (remainingTokens < reference.estimatedTokens) {
      continue;
    }

    keptOptionalReferenceIds.add(reference.referenceId);
    remainingTokens -= reference.estimatedTokens;
  }

  return [
    ...requiredReferences,
    ...optionalReferences.filter((reference) => keptOptionalReferenceIds.has(reference.referenceId)),
  ].map(toResolvedReference);
}

export async function resolveSidecarReferences(
  options: ResolveSidecarReferencesOptions,
): Promise<readonly ResolvedSidecarReference[]> {
  const referenceRevision =
    options.referenceRevision ?? computeReferenceRevision(options.manifests);
  const cacheKey = `${options.agentId}:${options.operationKind}:${referenceRevision}`;

  let cachedLoadedReferences = loadedReferenceCache.get(cacheKey);

  if (!cachedLoadedReferences) {
    cachedLoadedReferences = (async () => {
      const loadedReferences = (
        await Promise.all(options.manifests.map((manifest) => loadManifest(manifest)))
      ).filter((reference): reference is LoadedSidecarReference => reference !== null);

      return loadedReferences;
    })();

    loadedReferenceCache.set(cacheKey, cachedLoadedReferences);
  }

  try {
    const loadedReferences = await cachedLoadedReferences;
    return trimLoadedReferences(
      loadedReferences,
      options.maxReferenceTokens ?? DEFAULT_REFERENCE_TOKEN_BUDGET,
    );
  } catch (error) {
    loadedReferenceCache.delete(cacheKey);
    throw error;
  }
}
