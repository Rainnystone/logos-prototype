import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { parseWithSchema } from '@/lib/validation';
import type { SectionId } from '@/authoring/contracts';

const authoringSectionIds = [
  'worldbase-cast',
  'scene-phase-authoring',
  'control-modules',
  'package-wiring-validation',
] as const satisfies readonly SectionId[];

const AuthoringSectionIdSchema = z.enum(authoringSectionIds);

export const AuthoringStateSchema = z
  .object({
    hasSuccessfulSave: z.boolean(),
    lastSavedAt: z.string().optional(),
    lastSavedRequestId: z.string().optional(),
    lastEditedSection: AuthoringSectionIdSchema.optional(),
  })
  .strict();

export type AuthoringState = z.infer<typeof AuthoringStateSchema>;

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
