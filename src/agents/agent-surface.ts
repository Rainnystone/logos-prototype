import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { type AgentDefinition, listSidecarAgentDefinitions } from '@/agents/registry';
import { resolvePackageRoot } from '@/authoring/persistence/package-state';

export type AgentStatePresence = 'present' | 'missing' | 'unreadable';

export interface AgentLatestStateSummary {
  readonly statePresence: AgentStatePresence;
  readonly lastUpdatedAt?: string;
  readonly statusLine: string;
}

export interface AgentSurfaceItem {
  readonly agentId: string;
  readonly displayName: string;
  readonly responsibilitySummary: string;
  readonly skillIds: readonly string[];
  readonly packageConfigPath: string;
  readonly packageStatePath: string;
  readonly latestStateSummary: AgentLatestStateSummary;
}

interface AgentConfigEnabled {
  readonly kind: 'enabled';
}

interface AgentConfigInactive {
  readonly kind: 'inactive';
}

interface AgentConfigUnreadable {
  readonly kind: 'unreadable';
  readonly statusLine: string;
}

type AgentConfigState = AgentConfigEnabled | AgentConfigInactive | AgentConfigUnreadable;

const RAW_STATE_TOKENS = ['relationshipsbysource', 'targets:', 'sourceroleid', 'targetroleid', 'meta:'];
const RAW_STATE_ID_PATTERN = /\b(?:chr|loc|node|edge|phase|beat|scene)_[a-z0-9_-]+\b/i;
const RAW_STATE_SHAPE_PATTERN = /\b(?:nodes?|edges?|children|parent|graphroot)\s*:/i;
const MAX_STATUS_LINE_LENGTH = 240;

function resolvePackageStatePath(packageName: string, relativeStatePath: string): string {
  return path.resolve(resolvePackageRoot(packageName), relativeStatePath);
}

function resolvePackageConfigPath(packageName: string, relativeConfigPath: string): string {
  return path.resolve(resolvePackageRoot(packageName), relativeConfigPath);
}

function looksLikeStructuredDump(statusLine: string): boolean {
  const loweredStatusLine = statusLine.toLowerCase();
  if (RAW_STATE_TOKENS.some((token) => loweredStatusLine.includes(token))) {
    return true;
  }

  if (RAW_STATE_ID_PATTERN.test(statusLine)) {
    return true;
  }

  if (RAW_STATE_SHAPE_PATTERN.test(statusLine)) {
    return true;
  }

  if (/[\r\n]/.test(statusLine)) {
    return true;
  }

  const hasStructurePunctuation = /[{}\[\]]/.test(statusLine);
  const keyValueLikeSegments = statusLine.match(/[a-z0-9_-]+\s*:/gi)?.length ?? 0;

  return hasStructurePunctuation && keyValueLikeSegments >= 2;
}

function toBoundedStatusLine(statusLine: string): string {
  if (statusLine.length > MAX_STATUS_LINE_LENGTH || looksLikeStructuredDump(statusLine)) {
    return 'State summary is intentionally bounded for this read-only surface.';
  }

  return statusLine;
}

async function loadConfigState(
  packageName: string,
  agentDefinition: AgentDefinition,
): Promise<AgentConfigState> {
  const configPath = resolvePackageConfigPath(packageName, agentDefinition.packageConfigPath);
  let rawConfig: string;

  try {
    rawConfig = await readFile(configPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { kind: 'inactive' };
    }

    return {
      kind: 'unreadable',
      statusLine: 'Config file exists but could not be inspected safely.',
    };
  }

  let parsedConfig: unknown;
  try {
    parsedConfig = YAML.parse(rawConfig) as unknown;
  } catch {
    return {
      kind: 'unreadable',
      statusLine: 'Config file exists but could not be parsed into a bounded summary.',
    };
  }

  if (
    !parsedConfig ||
    typeof parsedConfig !== 'object' ||
    Array.isArray(parsedConfig) ||
    typeof (parsedConfig as { enabled?: unknown }).enabled !== 'boolean'
  ) {
    return {
      kind: 'unreadable',
      statusLine: 'Config file exists but is not in a safe bounded shape.',
    };
  }

  const configObject = parsedConfig as { enabled: boolean; agentId?: unknown };
  if (
    typeof configObject.agentId === 'string' &&
    configObject.agentId !== agentDefinition.agentId
  ) {
    return {
      kind: 'unreadable',
      statusLine: 'Config file exists but agent identity does not match this sidecar surface.',
    };
  }

  if (!configObject.enabled) {
    return { kind: 'inactive' };
  }

  return { kind: 'enabled' };
}

async function summarizeLatestState(
  packageName: string,
  agentDefinition: AgentDefinition,
): Promise<AgentLatestStateSummary> {
  const statePath = resolvePackageStatePath(packageName, agentDefinition.packageStatePath);

  let lastUpdatedAt: string | undefined;
  try {
    const fileStats = await stat(statePath);
    lastUpdatedAt = fileStats.mtime.toISOString();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        statePresence: 'missing',
        statusLine: toBoundedStatusLine(
          'State file is missing. No persisted sidecar state is available yet.',
        ),
      };
    }

    return {
      statePresence: 'unreadable',
      statusLine: toBoundedStatusLine('State file exists but could not be inspected safely.'),
    };
  }

  try {
    const rawState = await readFile(statePath, 'utf8');
    const statusLine = agentDefinition.summarizeState
      ? agentDefinition.summarizeState(rawState)
      : 'State file is present and readable.';

    return {
      statePresence: 'present',
      lastUpdatedAt,
      statusLine: toBoundedStatusLine(statusLine),
    };
  } catch {
    return {
      statePresence: 'unreadable',
      lastUpdatedAt,
      statusLine: toBoundedStatusLine(
        'State file exists but could not be parsed into a bounded summary.',
      ),
    };
  }
}

export async function loadAgentSurfaceItems(packageName: string): Promise<readonly AgentSurfaceItem[]> {
  const sidecarAgentDefinitions = listSidecarAgentDefinitions();
  const activationResults = (
    await Promise.all(
      sidecarAgentDefinitions.map(async (definition) => ({
        definition,
        configState: await loadConfigState(packageName, definition),
      })),
    )
  );

  const surfaceItems: Array<AgentSurfaceItem | null> = await Promise.all(
    activationResults.map(async ({ definition, configState }) => {
      if (configState.kind === 'inactive') {
        return null;
      }

      if (configState.kind === 'unreadable') {
        return {
          agentId: definition.agentId,
          displayName: definition.displayName,
          responsibilitySummary: definition.responsibilitySummary,
          skillIds: definition.skillIds,
          packageConfigPath: definition.packageConfigPath,
          packageStatePath: definition.packageStatePath,
          latestStateSummary: {
            statePresence: 'unreadable' as const,
            statusLine: toBoundedStatusLine(configState.statusLine),
          },
        };
      }

      return {
        agentId: definition.agentId,
        displayName: definition.displayName,
        responsibilitySummary: definition.responsibilitySummary,
        skillIds: definition.skillIds,
        packageConfigPath: definition.packageConfigPath,
        packageStatePath: definition.packageStatePath,
        latestStateSummary: await summarizeLatestState(packageName, definition),
      };
    }),
  );

  return surfaceItems.filter((item): item is AgentSurfaceItem => item !== null);
}
