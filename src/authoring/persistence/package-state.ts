import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import type { AgentSurfaceItem } from '@/agents/agent-surface';
import { SAVE_SECTION_IDS } from '@/authoring/contracts';
import { resolveAuthoringPersistenceTarget } from '@/authoring/persistence/repository';
import { parseWithSchema } from '@/lib/validation';
import { loadStoryPackage } from '@/engine/story-loader';
import { resolveActiveStorylineContext } from '@/storylines/substrate';
import type { ActiveStorylineContext } from '@/storylines/substrate';
import type { StoryPackage } from '@/types';
import type { EditRuntimeContinuityView } from '@/runtime-sessions/views';
import { loadEditRuntimeContinuityView } from '@/runtime-sessions/views';

const AuthoringSectionIdSchema = z.enum(SAVE_SECTION_IDS);
const ReviewableSectionIdSchema = z.enum([
  'worldbase-cast',
  'scene-phase-authoring',
  'control-modules',
]);

const PendingSectionReviewsSchema = z
  .object({
    'worldbase-cast': z.array(ReviewableSectionIdSchema).optional(),
    'scene-phase-authoring': z.array(ReviewableSectionIdSchema).optional(),
    'control-modules': z.array(ReviewableSectionIdSchema).optional(),
  })
  .partial()
  .strict();

export const AuthoringStateSchema = z
  .object({
    hasSuccessfulSave: z.boolean(),
    lastSavedAt: z.string().optional(),
    lastSavedRequestId: z.string().optional(),
    lastEditedSection: AuthoringSectionIdSchema.optional(),
    pendingSectionReviews: PendingSectionReviewsSchema.optional(),
  })
  .strict();

export type AuthoringState = z.infer<typeof AuthoringStateSchema>;
export type AuthoringStateSource = 'initial-sample' | 'latest-saved';

export interface AuthoringStateLoadResult {
  readonly source: AuthoringStateSource;
  readonly state: StoryPackage;
  readonly agentSurfaceItems?: readonly AgentSurfaceItem[];
  readonly authoringState?: AuthoringState | null;
  readonly runtimeContinuityView?: EditRuntimeContinuityView;
}

export interface LoadAuthoringStateOptions {
  readonly includeAgentSurfaceItems?: boolean;
  readonly includeRuntimeContinuity?: boolean;
  readonly storylineContext?: ActiveStorylineContext;
}

export function resolvePackageRoot(packageName: string): string {
  return path.resolve(process.cwd(), 'src/story-packages', packageName);
}

export function resolveAuthoringStatePath(packageName: string): string {
  return path.resolve(resolvePackageRoot(packageName), 'authoring-state.json');
}

export async function readAuthoringState(packageName: string): Promise<AuthoringState | null> {
  const filePath = resolveAuthoringStatePath(packageName);

  try {
    await access(filePath);
  } catch {
    return null;
  }

  const fileContents = await readFile(filePath, 'utf8');
  return parseWithSchema(AuthoringStateSchema, JSON.parse(fileContents), 'authoringState');
}

export async function writeAuthoringState(
  packageName: string,
  state: AuthoringState,
): Promise<void> {
  const filePath = resolveAuthoringStatePath(packageName);
  const serialized = `${JSON.stringify(state, null, 2)}\n`;
  await writeFile(filePath, serialized, 'utf8');
}

export async function loadAuthoringState(
  packageName: string,
  options: LoadAuthoringStateOptions = {},
): Promise<AuthoringStateLoadResult> {
  const storylineContext =
    options.storylineContext ??
    (await resolveActiveStorylineContext(packageName, {
      forWrite: false,
    }));
  const target = resolveAuthoringPersistenceTarget(
    packageName,
    storylineContext.authoredRoot,
  );
  const [state, authoringState, runtimeContinuityView] = await Promise.all([
    loadStoryPackage(packageName, {
      authoredRootOverride: target.authoredRoot,
    }),
    readAuthoringState(packageName),
    options.includeRuntimeContinuity
      ? loadEditRuntimeContinuityView(packageName, {
          storylineContext,
        })
      : Promise.resolve(undefined),
  ]);
  let agentSurfaceItems: readonly AgentSurfaceItem[] | undefined;

  if (options.includeAgentSurfaceItems) {
    const { loadAgentSurfaceItems } = await import('@/agents/agent-surface');
    agentSurfaceItems = await loadAgentSurfaceItems(packageName);
  }

  return {
    source: authoringState?.hasSuccessfulSave ? 'latest-saved' : 'initial-sample',
    state,
    ...(options.includeAgentSurfaceItems ? { agentSurfaceItems: agentSurfaceItems ?? [] } : {}),
    authoringState,
    ...(runtimeContinuityView !== undefined ? { runtimeContinuityView } : {}),
  };
}
