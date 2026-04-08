import type {
  AuditResult,
  CollapseInput,
  GenerateResult,
  GossipelogInjectionResponse,
  GossipelogUpdateResponse,
  LLMAdapter,
  RouteRequest,
  RouteResult,
  WeaverImportResponse,
} from '@/engine/types/adapter-interface';
import type { CollapseResponse } from '@/types';

type ScriptedOperation =
  | 'collapse'
  | 'route'
  | 'generate'
  | 'audit'
  | 'gossipelogUpdate'
  | 'gossipelogInjection'
  | 'weaverImport';

type TimeoutScript = {
  kind: 'timeout';
  message?: string;
};

type ErrorScript = {
  kind: 'error';
  message: string;
};

type MalformedScript = {
  kind: 'malformed';
  value: unknown;
};

type DuplicateScript<T> = {
  kind: 'duplicate';
  value: T;
};

type DelayScript<T> = {
  kind: 'delay';
  delayMs: number;
  value: T;
};

type OutOfOrderScript<T> = {
  kind: 'out-of-order';
  value: T;
};

type ScriptedEntry<T> =
  | T
  | TimeoutScript
  | ErrorScript
  | MalformedScript
  | DuplicateScript<T>
  | DelayScript<T>
  | OutOfOrderScript<T>;

type ScriptQueues = {
  readonly collapse?: readonly ScriptedEntry<CollapseResponse>[];
  readonly route?: readonly ScriptedEntry<RouteResult>[];
  readonly generate?: readonly ScriptedEntry<GenerateResult>[];
  readonly audit?: readonly ScriptedEntry<AuditResult>[];
  readonly gossipelogUpdate?: readonly ScriptedEntry<GossipelogUpdateResponse>[];
  readonly gossipelogInjection?: readonly ScriptedEntry<GossipelogInjectionResponse>[];
  readonly weaverImport?: readonly ScriptedEntry<WeaverImportResponse>[];
};

type OperationTrace = {
  readonly operation: ScriptedOperation;
  readonly outcome:
    | 'result'
    | 'timeout'
    | 'error'
    | 'malformed'
    | 'duplicate'
    | 'delayed'
    | 'out-of-order';
  readonly request: unknown;
  readonly response?: unknown;
  readonly error?: string;
  readonly delayMs?: number;
  readonly startedAtMs?: number;
  readonly completedAtMs?: number;
  readonly elapsedMs?: number;
};

export type ScriptedAdapterTrace = {
  readonly operations: readonly OperationTrace[];
};

export type ScriptedAdapter = LLMAdapter & {
  getTrace(): ScriptedAdapterTrace;
};

function isScriptObject(entry: unknown): entry is { kind: string } {
  return typeof entry === 'object' && entry !== null && 'kind' in entry;
}

function isTimeoutScript(entry: unknown): entry is TimeoutScript {
  return isScriptObject(entry) && entry.kind === 'timeout';
}

function isErrorScript(entry: unknown): entry is ErrorScript {
  return isScriptObject(entry) && entry.kind === 'error';
}

function isMalformedScript(entry: unknown): entry is MalformedScript {
  return isScriptObject(entry) && entry.kind === 'malformed';
}

function isDuplicateScript<T>(entry: unknown): entry is DuplicateScript<T> {
  return isScriptObject(entry) && entry.kind === 'duplicate';
}

function isDelayScript<T>(entry: unknown): entry is DelayScript<T> {
  return isScriptObject(entry) && entry.kind === 'delay';
}

function isOutOfOrderScript<T>(entry: unknown): entry is OutOfOrderScript<T> {
  return isScriptObject(entry) && entry.kind === 'out-of-order';
}

function defaultCollapseResponse(): CollapseResponse {
  return {
    alpha: 'simulation-alpha',
    beta: 'simulation-beta',
    inferenceTrace: 'simulation-collapse-trace',
  };
}

function defaultRouteResult(): RouteResult {
  return {
    routerName: 'default-router',
    inferenceTrace: 'simulation-route-trace',
  };
}

function defaultGenerateResult(): GenerateResult {
  return {
    beatText: 'simulation-beat',
    options: ['option-a', 'option-b', 'option-c', 'option-d'],
  };
}

function defaultAuditResult(): AuditResult {
  return {
    answers: [],
  };
}

function resolveDefault(operation: ScriptedOperation) {
  switch (operation) {
    case 'collapse':
      return defaultCollapseResponse();
    case 'route':
      return defaultRouteResult();
    case 'generate':
      return defaultGenerateResult();
    case 'audit':
      return defaultAuditResult();
    case 'gossipelogUpdate':
      return {
        involvedRoleIds: [],
        invocationNoOp: true,
        edgeUpdates: [],
      } as GossipelogUpdateResponse;
    case 'gossipelogInjection':
      return {
        highlightedDeltasText: '',
        stableBackgroundText: '',
      } as GossipelogInjectionResponse;
    case 'weaverImport':
      return {
        sourceSummary: '',
        importSummary: '',
        openingHook: '',
        worldBase: {},
        coreCast: [],
        antagonists: [],
        npcCharacters: [],
        locations: [],
        warnings: [],
        unresolvedGaps: [],
      } as WeaverImportResponse;
  }
}

function createScriptResolver(queues: ScriptQueues, operations: OperationTrace[]) {
  const counters = new Map<ScriptedOperation, number>();

  return async function resolve<T>(
    operation: ScriptedOperation,
    request: unknown,
  ): Promise<T> {
    const nextIndex = counters.get(operation) ?? 0;
    counters.set(operation, nextIndex + 1);

    const queue = queues[operation] as readonly ScriptedEntry<T>[] | undefined;
    const entry = queue?.[nextIndex];

    if (isTimeoutScript(entry)) {
      operations.push({
        operation,
        outcome: 'timeout',
        request,
        error: entry.message ?? `${operation} timed out`,
      });
      throw new Error(entry.message ?? `${operation} timed out`);
    }

    if (isErrorScript(entry)) {
      operations.push({
        operation,
        outcome: 'error',
        request,
        error: entry.message,
      });
      throw new Error(entry.message);
    }

    if (isMalformedScript(entry)) {
      operations.push({
        operation,
        outcome: 'malformed',
        request,
        response: entry.value,
      });
      return entry.value as T;
    }

    if (isDuplicateScript<T>(entry)) {
      operations.push({
        operation,
        outcome: 'duplicate',
        request,
        response: entry.value,
      });
      return entry.value;
    }

    if (isDelayScript<T>(entry)) {
      const startedAtMs = Date.now();
      await new Promise((resolveDelay) => setTimeout(resolveDelay, entry.delayMs));
      const completedAtMs = Date.now();
      const elapsedMs = completedAtMs - startedAtMs;

      operations.push({
        operation,
        outcome: 'delayed',
        request,
        response: entry.value,
        delayMs: entry.delayMs,
        startedAtMs,
        completedAtMs,
        elapsedMs,
      });
      return entry.value;
    }

    if (isOutOfOrderScript<T>(entry)) {
      operations.push({
        operation,
        outcome: 'out-of-order',
        request,
        response: entry.value,
      });
      return entry.value;
    }

    const response = (entry ?? resolveDefault(operation)) as T;
    operations.push({
      operation,
      outcome: 'result',
      request,
      response,
    });
    return response;
  };
}

export function createScriptedAdapter(queues: ScriptQueues = {}): ScriptedAdapter {
  const operations: OperationTrace[] = [];
  const resolve = createScriptResolver(queues, operations);

  return {
    collapse(request: CollapseInput) {
      return resolve<CollapseResponse>('collapse', request);
    },
    route(request: RouteRequest) {
      return resolve<RouteResult>('route', request);
    },
    generate(request) {
      return resolve<GenerateResult>('generate', request);
    },
    audit(request) {
      return resolve<AuditResult>('audit', request);
    },
    gossipelogUpdate(request) {
      return resolve<GossipelogUpdateResponse>('gossipelogUpdate', request);
    },
    gossipelogInjection(request) {
      return resolve<GossipelogInjectionResponse>('gossipelogInjection', request);
    },
    weaverImport(request) {
      return resolve<WeaverImportResponse>('weaverImport', request);
    },
    getTrace() {
      return {
        operations,
      };
    },
  };
}
