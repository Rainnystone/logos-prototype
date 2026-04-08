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

const referenceCache = new Map<string, Promise<readonly ResolvedSidecarReference[]>>();

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
  } catch (error) {
    if (manifest.required) {
      throw new Error(
        `Required reference "${manifest.referenceId}" could not be loaded before provider execution.`,
      );
    }

    return null;
  }
}

function trimLoadedReferences(
  loadedReferences: readonly LoadedSidecarReference[],
  maxReferenceTokens: number,
): readonly ResolvedSidecarReference[] {
  const requiredReferences = loadedReferences.filter((reference) => reference.required);
  const optionalReferences = loadedReferences.filter((reference) => !reference.required);
  const requiredTokenTotal = requiredReferences.reduce(
    (total, reference) => total + reference.estimatedTokens,
    0,
  );
  let remainingTokens = maxReferenceTokens - requiredTokenTotal;

  const keptOptionalReferenceIds = new Set<string>();
  const sortedOptionalReferences = [...optionalReferences].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    return left.referenceId.localeCompare(right.referenceId);
  });

  for (const reference of sortedOptionalReferences) {
    if (remainingTokens < reference.estimatedTokens) {
      continue;
    }

    keptOptionalReferenceIds.add(reference.referenceId);
    remainingTokens -= reference.estimatedTokens;
  }

  return loadedReferences
    .filter(
      (reference) => reference.required || keptOptionalReferenceIds.has(reference.referenceId),
    )
    .map(({ priority: _priority, required: _required, ...resolvedReference }) => resolvedReference);
}

export async function resolveSidecarReferences(
  options: ResolveSidecarReferencesOptions,
): Promise<readonly ResolvedSidecarReference[]> {
  const referenceRevision =
    options.referenceRevision ?? computeReferenceRevision(options.manifests);
  const cacheKey = `${options.agentId}:${options.operationKind}:${referenceRevision}`;

  const cached = referenceCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = (async () => {
    const loadedReferences = (
      await Promise.all(options.manifests.map((manifest) => loadManifest(manifest)))
    ).filter((reference): reference is LoadedSidecarReference => reference !== null);

    return trimLoadedReferences(
      loadedReferences,
      options.maxReferenceTokens ?? DEFAULT_REFERENCE_TOKEN_BUDGET,
    );
  })();

  referenceCache.set(cacheKey, pending);

  try {
    return await pending;
  } catch (error) {
    referenceCache.delete(cacheKey);
    throw error;
  }
}
