import type { WorldBase } from '@/types';

export interface WorldBaseCastDraft {
  readonly mainCharacters: string;
  readonly npcCharacters: string;
  readonly locationPatch: string;
}

function normalizeBlock(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function stripListMarker(value: string): string {
  return value.replace(/^[\s*-•]+/, '');
}

function renderSupportingCastEntry(line: string): string | null {
  const cleanedLine = stripListMarker(line).trim();

  if (!cleanedLine) {
    return null;
  }

  const match = cleanedLine.match(/^([^：:]+)[：:]\s*(.+)$/);
  if (!match) {
    return null;
  }

  const name = match[1]?.trim();
  const description = match[2]?.trim();

  if (!name || !description) {
    return null;
  }

  return `${name}：${description}`;
}

export function renderSupportingCast(input: string): string {
  const normalized = normalizeBlock(input);

  if (!normalized) {
    return '';
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const renderedEntries: string[] = [];

  for (const line of lines) {
    const renderedEntry = renderSupportingCastEntry(line);
    if (!renderedEntry) {
      return normalized;
    }

    renderedEntries.push(renderedEntry);
  }

  return renderedEntries.join('\n');
}

export function renderWorldBase(
  currentWorldBase: WorldBase,
  draft: Partial<WorldBaseCastDraft>,
): WorldBase {
  const nextMainCharacters = draft.mainCharacters ?? currentWorldBase.mainCharacters;
  const nextNpcCharacters = draft.npcCharacters ?? currentWorldBase.npcCharacters;
  const nextLocationPatch = draft.locationPatch ?? currentWorldBase.locationPatch;

  return {
    ...currentWorldBase,
    mainCharacters: normalizeBlock(nextMainCharacters),
    npcCharacters: renderSupportingCast(nextNpcCharacters),
    locationPatch: normalizeBlock(nextLocationPatch),
  };
}
