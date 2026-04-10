import { createAPIAdapter } from '@/engine/api-adapter/adapter';
import { createWorkbenchDemoAdapter } from '@/engine/__mocks__/workbench-demo-adapter';
import type { OrchestratorRestoreInput } from '@/engine/orchestrator';
import type {
  FinalizeRelationshipLayerInput,
  RecordAcceptedBeatInput,
  RuntimeSessionCommand,
  RuntimeSessionCommandResult,
} from '@/runtime-sessions/repository';
import type {
  GossipelogCycleRunner,
  RunGossipelogCycleResult,
} from '@/agents/gossipelog/contracts';
import { parseAuditResult } from '@/engine/modules/auditor';
import { resolveAudit } from '@/engine/modules/audit-resolver';
import { buildVolumeSequence } from '@/engine/modules/phase-gradient';
import type { AdapterConfig } from '@/engine/api-adapter/providers/provider-interface';
import type { LLMAdapter } from '@/engine/types/adapter-interface';
import type { PlayRuntimeSessionView, RuntimeRelationshipSummary } from '@/runtime-sessions/views';
import type {
  AuditQuestion,
  AuditQuestionSet,
  GossipelogInjectionResult,
  GossipelogUpdateResult,
  HistoryEntry,
  PhasePlan,
  StoryPackage,
  UsageInfo,
} from '@/types';

export const RESTORE_COMPATIBILITY_ERROR =
  'Saved runtime continuity is incompatible with the current story package. Reset the workbench to start a new session.';

export type WorkbenchStatus =
  | 'initializing'
  | 'idle'
  | 'generating'
  | 'auditing'
  | 'rewriting'
  | 'accepted'
  | 'force-accepted'
  | 'error';

export type WorkbenchOperation = 'collapse' | 'route' | 'generate' | 'audit' | 'settlement';

export interface WorkbenchDiagnostics {
  readonly latestOperation: WorkbenchOperation | null;
  readonly usage: Readonly<Record<WorkbenchOperation, UsageInfo | null>>;
}

export function createEmptyWorkbenchDiagnostics(): WorkbenchDiagnostics {
  return {
    latestOperation: null,
    usage: {
      collapse: null,
      route: null,
      generate: null,
      audit: null,
      settlement: null,
    },
  };
}

export interface WorkbenchReporter {
  onStatusChange(status: WorkbenchStatus): void;
  onRewriteFeedback(feedback: string | null): void;
  onUsage(operation: WorkbenchOperation, usage: UsageInfo | null): void;
}

type GossipelogFallbackFunction = {
  readonly __logosGossipelogFallback?: true;
};

interface BrowserGossipelogCycleRunnerOptions {
  readonly adapterConfig: AdapterConfig | null;
  readonly fetchImpl?: typeof fetch;
}

interface BrowserRuntimeSessionClientOptions {
  readonly storyPackageName: string;
  readonly fetchImpl?: typeof fetch;
}

export interface BrowserRuntimeSessionClient {
  ensureActiveSession(): Promise<{ activeSessionId: string }>;
  recordAcceptedBeat(
    payload: RecordAcceptedBeatInput,
  ): Promise<{ activeSessionId: string; activeCheckpointId: string }>;
  finalizeRelationshipLayer(
    payload: FinalizeRelationshipLayerInput,
  ): Promise<{ activeSessionId: string; activeCheckpointId: string }>;
  resetWorkbench(): Promise<{ activeSessionId: string }>;
}

function defaultNoOpUpdate(): GossipelogUpdateResult {
  return {
    involvedRoleIds: [],
    invocationNoOp: true,
    memoryUpdates: [],
  };
}

function defaultEmptyInjection(): GossipelogInjectionResult {
  return {
    highlightedDeltasText: '',
    stableBackgroundText: '',
  };
}

function buildQuestionMap(questionSet: AuditQuestionSet): Map<string, AuditQuestion> {
  const phaseSpecificQuestions = Object.values(questionSet.phaseSpecificQuestions ?? {}).flat();
  const questions = [
    ...questionSet.globalQuestions,
    ...questionSet.controlQuestions,
    ...phaseSpecificQuestions,
  ];

  return new Map(questions.map((question) => [question.question, question]));
}

function isFallbackGossipelogMethod(method: unknown): boolean {
  return Boolean(
    method &&
      typeof method === 'function' &&
      '__logosGossipelogFallback' in method &&
      (method as GossipelogFallbackFunction).__logosGossipelogFallback === true,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildRuntimeSessionRoutePath(storyPackageName: string): string {
  return `/api/play/packages/${encodeURIComponent(storyPackageName)}/runtime-session`;
}

function parseRuntimeSessionCommandResult(body: unknown): RuntimeSessionCommandResult {
  if (!isPlainObject(body) || typeof body.activeSessionId !== 'string') {
    throw new Error('Runtime session bridge response is invalid.');
  }

  if (body.activeCheckpointId !== undefined && typeof body.activeCheckpointId !== 'string') {
    throw new Error('Runtime session bridge response is invalid.');
  }

  return {
    activeSessionId: body.activeSessionId,
    ...(typeof body.activeCheckpointId === 'string'
      ? { activeCheckpointId: body.activeCheckpointId }
      : {}),
  };
}

function parseRuntimeSessionError(status: number, body: unknown): string {
  if (isPlainObject(body) && typeof body.error === 'string' && body.error.length > 0) {
    return body.error;
  }

  return `Runtime session bridge request failed with status ${status}.`;
}

function assertMatchingRuntimeSessionPackageName(
  expectedPackageName: string,
  payloadPackageName: string,
): void {
  if (payloadPackageName !== expectedPackageName) {
    throw new Error(
      `Runtime session packageName mismatch: expected "${expectedPackageName}", received "${payloadPackageName}".`,
    );
  }
}

async function postRuntimeSessionCommand(
  storyPackageName: string,
  command: RuntimeSessionCommand,
  fetchImpl: typeof fetch,
): Promise<RuntimeSessionCommandResult> {
  const response = await fetchImpl(buildRuntimeSessionRoutePath(storyPackageName), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const responseBody = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(parseRuntimeSessionError(response.status, responseBody));
  }

  return parseRuntimeSessionCommandResult(responseBody);
}

export function createWorkbenchAdapter(config: AdapterConfig | null): LLMAdapter {
  return config ? createAPIAdapter(config) : createWorkbenchDemoAdapter();
}

export function createBrowserGossipelogCycleRunner(
  options: BrowserGossipelogCycleRunnerOptions,
): GossipelogCycleRunner {
  const fetchImpl = options.fetchImpl ?? fetch;

  return async (input) => {
    const response = await fetchImpl('/api/play/gossipelog', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        storyPackageName: input.storyPackageName,
        adapterConfig: options.adapterConfig,
        acceptedBeatText: input.acceptedBeatText,
        roundId: input.roundId,
        phaseId: input.phaseId,
        beatIndex: input.beatIndex,
        lastStableRelationshipLayer: input.lastStableRelationshipLayer,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gossipelog bridge request failed with status ${response.status}.`);
    }

    return (await response.json()) as RunGossipelogCycleResult;
  };
}

export function createBrowserRuntimeSessionClient(
  options: BrowserRuntimeSessionClientOptions,
): BrowserRuntimeSessionClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async ensureActiveSession() {
      const result = await postRuntimeSessionCommand(
        options.storyPackageName,
        { kind: 'ensure_active_session' },
        fetchImpl,
      );

      return {
        activeSessionId: result.activeSessionId,
      };
    },

    async recordAcceptedBeat(payload) {
      try {
        assertMatchingRuntimeSessionPackageName(options.storyPackageName, payload.packageName);
        const result = await postRuntimeSessionCommand(
          options.storyPackageName,
          { kind: 'record_accepted_beat', payload },
          fetchImpl,
        );

        if (typeof result.activeCheckpointId !== 'string') {
          throw new Error('Runtime session bridge response is missing activeCheckpointId.');
        }

        return {
          activeSessionId: result.activeSessionId,
          activeCheckpointId: result.activeCheckpointId,
        };
      } catch (error) {
        throw new Error(`Failed to persist accepted beat: ${getErrorMessage(error)}`);
      }
    },

    async finalizeRelationshipLayer(payload) {
      try {
        assertMatchingRuntimeSessionPackageName(options.storyPackageName, payload.packageName);
        const result = await postRuntimeSessionCommand(
          options.storyPackageName,
          { kind: 'finalize_relationship_layer', payload },
          fetchImpl,
        );

        if (typeof result.activeCheckpointId !== 'string') {
          throw new Error('Runtime session bridge response is missing activeCheckpointId.');
        }

        return {
          activeSessionId: result.activeSessionId,
          activeCheckpointId: result.activeCheckpointId,
        };
      } catch (error) {
        throw new Error(
          `Failed to persist relationship-layer finalization: ${getErrorMessage(error)}`,
        );
      }
    },

    async resetWorkbench() {
      try {
        const result = await postRuntimeSessionCommand(
          options.storyPackageName,
          { kind: 'reset_workbench' },
          fetchImpl,
        );

        return {
          activeSessionId: result.activeSessionId,
        };
      } catch (error) {
        throw new Error(`Failed to reset runtime workbench: ${getErrorMessage(error)}`);
      }
    },
  };
}

function buildAcceptedHistoryFromBeatHistory(
  beatHistory: PlayRuntimeSessionView['beatHistory'],
): readonly HistoryEntry[] {
  return beatHistory.flatMap((entry) => [
    {
      role: 'user' as const,
      content: entry.playerInput,
    },
    {
      role: 'assistant' as const,
      content: entry.beatText,
    },
  ]);
}

export function buildRelationshipLayerFromSummary(
  relationshipSummary: RuntimeRelationshipSummary,
): GossipelogInjectionResult {
  return {
    highlightedDeltasText: relationshipSummary.highlightedDeltasText,
    stableBackgroundText: relationshipSummary.stableBackgroundText,
  };
}

export function buildOrchestratorRestoreInput(
  restorableView: PlayRuntimeSessionView,
): OrchestratorRestoreInput {
  if (restorableView.kind !== 'restorable') {
    throw new Error('Runtime session view is not restorable.');
  }

  if (!restorableView.stateSnapshot) {
    throw new Error('Restorable runtime session view is missing stateSnapshot.');
  }

  return {
    currentState: restorableView.stateSnapshot,
    acceptedHistory: buildAcceptedHistoryFromBeatHistory(restorableView.beatHistory),
    lastStableRelationshipLayer: buildRelationshipLayerFromSummary(
      restorableView.relationshipSummary,
    ),
    sceneComplete: restorableView.lifecycle === 'complete',
    ...(restorableView.activeSessionId
      ? { sessionId: restorableView.activeSessionId }
      : {}),
    ...(restorableView.activeCheckpointId
      ? { checkpointId: restorableView.activeCheckpointId }
      : {}),
  };
}

export function getRestoreCompatibilityError(
  storyPackage: StoryPackage,
  runtimeSessionView: PlayRuntimeSessionView | undefined,
): string | null {
  if (
    runtimeSessionView?.kind !== 'restorable' ||
    !runtimeSessionView.stateSnapshot
  ) {
    return null;
  }

  const restoredPhaseIndex = runtimeSessionView.stateSnapshot.sceneState.currentPhaseIndex;
  const matchingPhasePlan = storyPackage.phasePlans.find(
    (phasePlan) => phasePlan.phaseIndex === restoredPhaseIndex,
  );

  return matchingPhasePlan ? null : RESTORE_COMPATIBILITY_ERROR;
}

export function createTrackedWorkbenchAdapter(
  adapter: LLMAdapter,
  questionSet: AuditQuestionSet,
  reporter: WorkbenchReporter,
): LLMAdapter {
  const questionMap = buildQuestionMap(questionSet);
  let retryCount = 0;
  const gossipelogUpdate: NonNullable<LLMAdapter['gossipelogUpdate']> =
    adapter.gossipelogUpdate ??
    Object.assign(async () => defaultNoOpUpdate(), {
      __logosGossipelogFallback: true as const,
    } satisfies GossipelogFallbackFunction);
  const gossipelogInjection: NonNullable<LLMAdapter['gossipelogInjection']> =
    adapter.gossipelogInjection ??
    Object.assign(async () => defaultEmptyInjection(), {
      __logosGossipelogFallback: true as const,
    } satisfies GossipelogFallbackFunction);

  return {
    async collapse(request) {
      const result = await adapter.collapse(request);
      reporter.onUsage('collapse', result.usage ?? null);
      return result;
    },

    async route(request) {
      if (!adapter.route) {
        throw new Error('LLMAdapter.route is not configured.');
      }

      const result = await adapter.route(request);
      reporter.onUsage('route', result.usage ?? null);
      return result;
    },

    async generate(promptObject) {
      if (!adapter.generate) {
        throw new Error('LLMAdapter.generate is not configured.');
      }

      reporter.onStatusChange(
        promptObject.generationControl?.isRewrite ? 'rewriting' : 'generating',
      );

      const result = await adapter.generate(promptObject);
      reporter.onUsage('generate', result.usage ?? null);
      return result;
    },

    async streamGenerate(promptObject) {
      if (!adapter.streamGenerate) {
        return {
          kind: 'fallback' as const,
          reason: 'streaming-not-supported',
        };
      }

      reporter.onStatusChange(
        promptObject.generationControl?.isRewrite ? 'rewriting' : 'generating',
      );

      const streamResult = await adapter.streamGenerate(promptObject);

      if (streamResult.kind === 'fallback') {
        return streamResult;
      }

      return {
        kind: 'stream' as const,
        events: (async function* () {
          for await (const event of streamResult.events) {
            if (event.type === 'finalResult') {
              reporter.onUsage('generate', event.result.usage ?? null);
            }

            yield event;
          }
        })(),
      };
    },

    async audit(packet) {
      if (!adapter.audit) {
        throw new Error('LLMAdapter.audit is not configured.');
      }

      reporter.onStatusChange('auditing');
      const result = await adapter.audit(packet);
      reporter.onUsage('audit', result.usage ?? null);
      const selectedQuestions = packet.auditQuestions.map((questionText) => {
        const question = questionMap.get(questionText);

        if (!question) {
          throw new Error(`Audit question was not found for workbench tracking: ${questionText}`);
        }

        return question;
      });
      const parsedResult = parseAuditResult(result, selectedQuestions);
      const resolution = resolveAudit(parsedResult, retryCount);

      if (!resolution.pass) {
        reporter.onRewriteFeedback(resolution.rewriteFeedback);
        retryCount += 1;
      } else {
        retryCount = 0;
      }

      return result;
    },

    async settlement(packet) {
      if (!adapter.settlement) {
        throw new Error('LLMAdapter.settlement is not configured.');
      }

      const result = await adapter.settlement(packet);
      reporter.onUsage('settlement', result.usage ?? null);
      return result;
    },
    gossipelogUpdate,
    gossipelogInjection,
  };
}

export function shouldUseServerGossipelogBridge(adapter: LLMAdapter): boolean {
  return Boolean(
    adapter.gossipelogUpdate &&
      adapter.gossipelogInjection &&
      !isFallbackGossipelogMethod(adapter.gossipelogUpdate) &&
      !isFallbackGossipelogMethod(adapter.gossipelogInjection),
  );
}

export function getActivePhasePlan(storyPackage: StoryPackage, phaseIndex: number): PhasePlan {
  const phasePlan = storyPackage.phasePlans.find(
    (candidate) => candidate.phaseIndex === phaseIndex,
  );

  if (!phasePlan) {
    throw new Error(`Active phase ${phaseIndex} was not found in the story package.`);
  }

  return phasePlan;
}

export function getGradientSequence(storyPackage: StoryPackage, phaseIndex: number) {
  return buildVolumeSequence(getActivePhasePlan(storyPackage, phaseIndex).gradientType);
}

export function getReadyMessage(beatIndex: number, sceneComplete: boolean): string {
  if (sceneComplete) {
    return 'Scene complete. Review the final state and phase consequences.';
  }

  return `Beat ${beatIndex} ready. Choose an option or write the next action.`;
}
