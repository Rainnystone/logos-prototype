import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import { type AgentDefinition, listSidecarAgentDefinitions } from '@/agents/registry';
import { resolvePackageRoot } from '@/authoring/persistence/package-state';
import type { AgentOperationalHint } from '@/types';

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
  readonly operationalHint?: AgentOperationalHint;
  readonly latestStateLine?: string;
  readonly latestStateSummary: AgentLatestStateSummary;
}

interface AgentConfigEnabled {
  readonly kind: 'enabled';
}

interface AgentConfigMissing {
  readonly kind: 'missing';
}

interface AgentConfigDisabled {
  readonly kind: 'disabled';
}

interface AgentConfigUnreadable {
  readonly kind: 'unreadable';
  readonly statusLine: string;
}

type AgentConfigState =
  | AgentConfigEnabled
  | AgentConfigMissing
  | AgentConfigDisabled
  | AgentConfigUnreadable;

interface AgentStateInspection {
  readonly statePresence: AgentStatePresence;
  readonly lastUpdatedAt?: string;
  readonly latestStateLine: string;
  readonly recommendedOperationalHint?: Exclude<AgentOperationalHint, 'pending_bootstrap'>;
}

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

function builtInConfigMissingCopy(agentDefinition: AgentDefinition): string {
  return `${agentDefinition.displayName} config is missing. Built-in sidecar visibility is preserved, but this package has config drift.`;
}

function builtInConfigDisabledCopy(agentDefinition: AgentDefinition): string {
  return `${agentDefinition.displayName} config drifted to enabled: false. Built-in sidecars stay active in the surface until the file is reconciled.`;
}

function builtInConfigUnreadableCopy(agentDefinition: AgentDefinition): string {
  return `${agentDefinition.displayName} config exists but could not be read safely. Built-in sidecar state is being held in a bounded warning mode.`;
}

function blankWeaverFallbackCopy(): string {
  return 'No persisted text-import summary exists yet. Blank packages stay on scaffold defaults until import is used.';
}

function pendingBootstrapCopy(): string {
  return 'Relationship state is not readable yet. Bootstrap is still pending from the persisted import summary.';
}

function missingGossipelogFallbackCopy(): string {
  return 'Relationship state is not available yet. Bootstrap will wait for a later import seed or bounded fallback.';
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
      return { kind: 'missing' };
    }

    return {
      kind: 'unreadable',
      statusLine: builtInConfigUnreadableCopy(agentDefinition),
    };
  }

  let parsedConfig: unknown;
  try {
    parsedConfig = YAML.parse(rawConfig) as unknown;
  } catch {
    return {
      kind: 'unreadable',
      statusLine: builtInConfigUnreadableCopy(agentDefinition),
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
      statusLine: builtInConfigUnreadableCopy(agentDefinition),
    };
  }

  const configObject = parsedConfig as { enabled: boolean; agentId?: unknown };
  if (
    typeof configObject.agentId === 'string' &&
    configObject.agentId !== agentDefinition.agentId
  ) {
    return {
      kind: 'unreadable',
      statusLine: builtInConfigUnreadableCopy(agentDefinition),
    };
  }

  if (!configObject.enabled) {
    return { kind: 'disabled' };
  }

  return { kind: 'enabled' };
}

async function inspectLatestState(
  packageName: string,
  agentDefinition: AgentDefinition,
): Promise<AgentStateInspection> {
  const statePath = resolvePackageStatePath(packageName, agentDefinition.packageStatePath);

  let lastUpdatedAt: string | undefined;
  try {
    const fileStats = await stat(statePath);
    lastUpdatedAt = fileStats.mtime.toISOString();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        statePresence: 'missing',
        latestStateLine: toBoundedStatusLine(
          agentDefinition.agentId === 'weaver'
            ? blankWeaverFallbackCopy()
            : missingGossipelogFallbackCopy(),
        ),
      };
    }

    return {
      statePresence: 'unreadable',
      latestStateLine: toBoundedStatusLine('State file exists but could not be inspected safely.'),
    };
  }

  try {
    const rawState = await readFile(statePath, 'utf8');
    const derivedStateSummary = agentDefinition.deriveReadableStateSummary?.(rawState);
    const latestStateLine = derivedStateSummary
      ? derivedStateSummary.latestStateLine
      : agentDefinition.summarizeState
        ? agentDefinition.summarizeState(rawState)
        : 'State file is present and readable.';

    return {
      statePresence: 'present',
      lastUpdatedAt,
      latestStateLine: toBoundedStatusLine(latestStateLine),
      ...(derivedStateSummary?.recommendedOperationalHint
        ? { recommendedOperationalHint: derivedStateSummary.recommendedOperationalHint }
        : {}),
    };
  } catch {
    return {
      statePresence: 'unreadable',
      lastUpdatedAt,
      latestStateLine: toBoundedStatusLine(
        'State file exists but could not be parsed into a bounded summary.',
      ),
    };
  }
}

export async function loadAgentSurfaceItems(packageName: string): Promise<readonly AgentSurfaceItem[]> {
  const sidecarAgentDefinitions = listSidecarAgentDefinitions();
  const inspectionResults = (
    await Promise.all(
      sidecarAgentDefinitions.map(async (definition) => ({
        definition,
        configState: await loadConfigState(packageName, definition),
        stateInspection: await inspectLatestState(packageName, definition),
      })),
    )
  );

  const hasReadableWeaverSummary = inspectionResults.some(
    ({ definition, stateInspection }) =>
      definition.agentId === 'weaver' && stateInspection.statePresence === 'present',
  );

  return inspectionResults.map(({ definition, configState, stateInspection }) => {
    let operationalHint: AgentOperationalHint;
    let latestStateLine: string;

    if (configState.kind === 'missing') {
      operationalHint = 'warning';
      latestStateLine = toBoundedStatusLine(builtInConfigMissingCopy(definition));
    } else if (configState.kind === 'disabled') {
      operationalHint = 'warning';
      latestStateLine = toBoundedStatusLine(builtInConfigDisabledCopy(definition));
    } else if (configState.kind === 'unreadable') {
      operationalHint = 'warning';
      latestStateLine = toBoundedStatusLine(configState.statusLine);
    } else if (definition.agentId === 'weaver') {
      operationalHint =
        stateInspection.statePresence === 'unreadable'
          ? 'warning'
          : stateInspection.recommendedOperationalHint ?? 'ready';
      latestStateLine = stateInspection.latestStateLine;
    } else if (stateInspection.statePresence === 'present') {
      operationalHint = 'ready';
      latestStateLine = stateInspection.latestStateLine;
    } else if (hasReadableWeaverSummary) {
      operationalHint = 'pending_bootstrap';
      latestStateLine = toBoundedStatusLine(pendingBootstrapCopy());
    } else {
      operationalHint = 'warning';
      latestStateLine = stateInspection.latestStateLine;
    }

    return {
      agentId: definition.agentId,
      displayName: definition.displayName,
      responsibilitySummary: definition.responsibilitySummary,
      skillIds: definition.skillIds,
      packageConfigPath: definition.packageConfigPath,
      packageStatePath: definition.packageStatePath,
      operationalHint,
      latestStateLine,
      latestStateSummary: {
        statePresence:
          configState.kind === 'unreadable' ? 'unreadable' : stateInspection.statePresence,
        ...(stateInspection.lastUpdatedAt ? { lastUpdatedAt: stateInspection.lastUpdatedAt } : {}),
        statusLine: latestStateLine,
      },
    };
  });
}
