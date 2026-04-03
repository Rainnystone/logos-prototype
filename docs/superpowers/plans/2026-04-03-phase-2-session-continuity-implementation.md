# Phase 2 Session Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a durable package-scoped runtime session/checkpoint substrate that restores play progress, keeps edit/play aligned to the active session, and preserves checkpoint-ready continuity truth for future storyline branching.

**Architecture:** Phase 2 adds one server-owned `runtime-sessions.json` file per package, validated through a dedicated runtime-session repository instead of the authoring bridge or YAML story loader. The play workbench writes accepted-beat checkpoints and gossipelog finalization through a typed server bridge, while `/play` and `/edit` consume bounded continuity views rather than raw file contents.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Zod, Vitest, existing play runtime/orchestrator flow, package-local filesystem persistence

---

## File Map

### Runtime session schema and repository

- Create: `src/types/runtime-sessions.ts`
- Create: `src/runtime-sessions/repository.ts`
- Create: `src/runtime-sessions/views.ts`
- Modify: `src/types/index.ts`
- Modify: `src/engine/schema-validator.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/runtime-sessions/__tests__/repository.test.ts`
- Test: `src/runtime-sessions/__tests__/views.test.ts`

### Play runtime continuity bridge

- Create: `src/app/api/play/packages/[packageName]/runtime-session/route.ts`
- Test: `src/app/api/play/packages/[packageName]/runtime-session/route.test.ts`
- Modify: `src/app/play/runtime.ts`
- Test: `src/app/play/runtime.test.ts`

### Orchestrator persistence hooks

- Modify: `src/engine/orchestrator.ts`
- Test: `src/engine/__tests__/orchestrator.test.ts`
- Test: `src/engine/__tests__/e2e/phase-end-processing.test.ts`

### Play page restore and reset UX

- Modify: `src/app/play/page.tsx`
- Modify: `src/app/play/PlayWorkbench.tsx`
- Create: `src/app/__tests__/play-page.test.tsx`
- Modify: `src/app/__tests__/play.test.tsx`

### Edit continuity projection

- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/app/edit/page.tsx`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/sections/CharacterSection.tsx`
- Test: `src/authoring/persistence/__tests__/package-state.test.ts`
- Test: `src/app/edit/__tests__/page.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Test: `src/app/edit/__tests__/CharacterSection.test.tsx`

### Final verification and planning sync

- Modify: `task_plan.md`
- Modify: `progress.md`
- Modify: `findings.md` only if execution changes a frozen design decision

## Task 1: Add the runtime-session schemas, file contract, and bounded repository

**Files:**
- Create: `src/types/runtime-sessions.ts`
- Create: `src/runtime-sessions/repository.ts`
- Modify: `src/types/index.ts`
- Modify: `src/engine/schema-validator.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/runtime-sessions/__tests__/repository.test.ts`

- [ ] **Step 1: Write the failing schema and repository tests**

```ts
it('parses a versioned runtime-sessions file with one active session and explicit head pointers', () => {
  expect(RuntimeSessionsFileSchema.parse({
    version: 1,
    activeSessionId: 'sess_01',
    sessionsById: {
      sess_01: {
        sessionId: 'sess_01',
        lifecycle: 'awaiting_start',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
        headCheckpointId: null,
        activeCheckpointId: null,
        orderedCheckpointIds: [],
        checkpointsById: {},
        lastStableRelationshipLayer: {
          highlightedDeltasText: '',
          stableBackgroundText: '',
        },
      },
    },
  })).toBeDefined();
});

it('rejects runtime files whose session or checkpoint pointers do not resolve', async () => {
  await writeRuntimeSessionsFile('tmp-package', {
    version: 1,
    activeSessionId: 'sess_missing',
    sessionsById: {
      sess_01: {
        sessionId: 'sess_01',
        lifecycle: 'in_progress',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:01.000Z',
        headCheckpointId: 'chk_missing',
        activeCheckpointId: 'chk_missing',
        orderedCheckpointIds: [],
        checkpointsById: {},
        lastStableRelationshipLayer: makeRelationshipLayer(),
      },
    },
  });
  await expect(repository.readFile('tmp-package')).rejects.toThrow(/runtime session consistency/i);
});

it('creates a bootstrap session when the runtime file is missing', async () => {
  const session = await repository.ensureActiveSession('tmp-package');
  expect(session).toMatchObject({
    lifecycle: 'awaiting_start',
    headCheckpointId: null,
    activeCheckpointId: null,
    orderedCheckpointIds: [],
  });
  expect(session.createdAt).toEqual(expect.any(String));
  expect(session.updatedAt).toEqual(expect.any(String));
});

it('advances session head pointers when appending an accepted beat checkpoint', async () => {
  const { session } = await repository.recordAcceptedBeat({
    packageName: 'tmp-package',
    sessionId: 'sess_01',
    checkpointId: 'chk_01',
    lifecycle: 'in_progress',
    acceptedBeatOrdinal: 1,
    phaseIndex: 1,
    beatIndex: 1,
    sceneId: 'scene_opening',
    roundId: 'round_01',
    acceptedTranscript: {
      playerInput: 'open the door',
      beatText: 'The door swings open.',
    },
    stateSnapshot: makeStateSnapshot(),
    lastStableRelationshipLayer: makeRelationshipLayer(),
  });
  expect(session.headCheckpointId).toBe('chk_01');
  expect(session.activeCheckpointId).toBe('chk_01');
  expect(session.orderedCheckpointIds).toEqual(['chk_01']);
  expect(session.updatedAt).toEqual(expect.any(String));
});

it('persists lifecycle transitions provided by accepted-beat writes', async () => {
  const first = await repository.recordAcceptedBeat({
    packageName: 'tmp-package',
    sessionId: 'sess_01',
    checkpointId: 'chk_01',
    lifecycle: 'in_progress',
    acceptedBeatOrdinal: 1,
    phaseIndex: 1,
    beatIndex: 1,
    sceneId: 'scene_opening',
    roundId: 'round_01',
    acceptedTranscript: {
      playerInput: 'open the door',
      beatText: 'The door swings open.',
    },
    stateSnapshot: makeStateSnapshot(),
    lastStableRelationshipLayer: makeRelationshipLayer(),
  });
  const final = await repository.recordAcceptedBeat({
    packageName: 'tmp-package',
    sessionId: 'sess_01',
    checkpointId: 'chk_02',
    lifecycle: 'complete',
    acceptedBeatOrdinal: 2,
    phaseIndex: 1,
    beatIndex: 2,
    sceneId: 'scene_opening',
    roundId: 'round_02',
    acceptedTranscript: {
      playerInput: 'step through',
      beatText: 'You step through into the ending state.',
    },
    stateSnapshot: makeStateSnapshot(),
    lastStableRelationshipLayer: makeRelationshipLayer(),
  });
  expect(first.session.lifecycle).toBe('in_progress');
  expect(final.session.lifecycle).toBe('complete');
});

it('serializes conflicting writes so stale finalization cannot overwrite a newer active session', async () => {
  const staleFinalize = repository.finalizeRelationshipLayer({
    packageName: 'tmp-package',
    sessionId: 'sess_01',
    checkpointId: 'chk_01',
    lastStableRelationshipLayer: makeRelationshipLayer('stale'),
  });
  const reset = repository.resetWorkbench('tmp-package');

  await Promise.allSettled([staleFinalize, reset]);

  const file = await repository.readFile('tmp-package');
  const nextActiveSession = file.activeSessionId ? file.sessionsById[file.activeSessionId] : null;

  expect(nextActiveSession?.sessionId).not.toBe('sess_01');
  expect(nextActiveSession?.lastStableRelationshipLayer).not.toEqual(makeRelationshipLayer('stale'));
});
```

- [ ] **Step 2: Run the schema/repository tests to verify RED**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/runtime-sessions/__tests__/repository.test.ts`

Expected: FAIL because runtime-session schemas and repository APIs do not exist yet.

- [ ] **Step 3: Implement the versioned runtime-session contract and repository**

```ts
export const RuntimeSessionSchema = z.object({
  sessionId: z.string(),
  lifecycle: RuntimeSessionLifecycleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  headCheckpointId: z.string().nullable(),
  activeCheckpointId: z.string().nullable(),
  orderedCheckpointIds: z.array(z.string()),
  checkpointsById: z.record(z.string(), RuntimeCheckpointSchema),
  lastStableRelationshipLayer: RelationshipLayerSchema,
}).strict();
```

Implementation notes:
- keep the file at package root as `runtime-sessions.json`
- validate all reads and writes through Zod
- add repository-level semantic validation after Zod parsing:
  - `activeSessionId`, when present, must point to an existing session
  - `headCheckpointId` and `activeCheckpointId` must point to checkpoints in that session
  - `orderedCheckpointIds` and `checkpointsById` must stay consistent
- serialize all package-scoped read-modify-write operations inside the repository with a per-package write queue or mutex
- queued writes must re-read the latest file state inside the critical section before commit so reset/head advancement wins over stale finalization
- keep the active-session boundary explicit in both schema and tests:
  - `createdAt`
  - `updatedAt`
  - `headCheckpointId`
  - `activeCheckpointId`
- expose repository operations for:
  - reading the whole file
  - ensuring a bootstrap active session
  - appending an accepted-beat checkpoint
  - finalizing a checkpoint relationship layer by bound `sessionId + checkpointId`
  - resetting by creating a new active session
- make `recordAcceptedBeat` persist a caller-supplied lifecycle; repository should not guess scene semantics on its own
- accepted-beat append must advance `orderedCheckpointIds`, `headCheckpointId`, `activeCheckpointId`, and `updatedAt` together
- do not add refresh-status or diagnostics-only fields
- write JSON with stable indentation and trailing newline, matching current repo file-writing style

- [ ] **Step 4: Re-run the schema/repository tests to verify GREEN**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/runtime-sessions/__tests__/repository.test.ts`

Expected: PASS for schema shape, semantic pointer validation, per-package write serialization, missing-file bootstrap, explicit session-pointer fields, and repository read/write behavior.

- [ ] **Step 5: Commit**

```bash
git add src/types/runtime-sessions.ts src/runtime-sessions/repository.ts src/types/index.ts src/engine/schema-validator.ts src/types/__tests__/type-conformance.test.ts src/runtime-sessions/__tests__/repository.test.ts
git commit -m "feat: add runtime session repository contract"
```

## Task 2: Add bounded continuity views for `/play` and `/edit`

**Files:**
- Create: `src/runtime-sessions/views.ts`
- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/app/play/page.tsx`
- Modify: `src/app/edit/page.tsx`
- Test: `src/runtime-sessions/__tests__/views.test.ts`
- Test: `src/authoring/persistence/__tests__/package-state.test.ts`
- Test: `src/app/edit/__tests__/page.test.tsx`
- Create: `src/app/__tests__/play-page.test.tsx`

- [ ] **Step 1: Write the failing bounded-view tests**

```ts
it('builds a play continuity view from the active session head checkpoint', async () => {
  const view = await loadPlayRuntimeSessionView('tmp-package');
  expect(view.kind).toBe('restorable');
  expect(view.activeSessionId).toBe('sess_01');
  expect(view.activeCheckpointId).toBe('chk_02');
  expect(view.beatHistory).toHaveLength(2);
});

it('returns an unavailable continuity view instead of silently bootstrapping when the runtime file is invalid', async () => {
  await writeInvalidRuntimeSessionsFile('tmp-package');
  const view = await loadPlayRuntimeSessionView('tmp-package');
  expect(view.kind).toBe('unavailable');
  expect(view.reason).toMatch(/runtime continuity/i);
});

it('keeps play and edit loaders aligned to the same active session', async () => {
  const playView = await loadPlayRuntimeSessionView('tmp-package');
  const editState = await loadAuthoringState('tmp-package', { includeRuntimeContinuity: true });
  const playViewAgain = await loadPlayRuntimeSessionView('tmp-package');
  expect(editState.runtimeContinuityView?.activeSession?.sessionId).toBe(playView.activeSessionId);
  expect(playViewAgain.activeSessionId).toBe(playView.activeSessionId);
});

it('adds a bounded runtime continuity view to loadAuthoringState without exposing raw checkpoints', async () => {
  const result = await loadAuthoringState('tmp-package', { includeRuntimeContinuity: true });
  expect(result.runtimeContinuityView?.activeSession?.relationshipStatus).toBeDefined();
  expect(JSON.stringify(result.runtimeContinuityView)).not.toContain('checkpointsById');
});
```

- [ ] **Step 2: Run the bounded-view tests to verify RED**

Run: `npm test -- src/runtime-sessions/__tests__/views.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/app/edit/__tests__/page.test.tsx src/app/__tests__/play-page.test.tsx`

Expected: FAIL because no continuity-view loaders or page integrations exist yet.

- [ ] **Step 3: Implement bounded play/edit continuity loaders**

```ts
export interface RuntimeRelationshipSummary {
  highlightedDeltasText: string;
  stableBackgroundText: string;
  source: 'session' | 'checkpoint' | 'empty';
}

export interface PlayRuntimeSessionView {
  kind: 'empty' | 'awaiting_start' | 'restorable' | 'unavailable';
  activeSessionId: string | null;
  activeCheckpointId: string | null;
  beatHistory: readonly { beatNumber: number; playerInput: string; beatText: string }[];
  stateSnapshot: StateSnapshot | null;
  relationshipSummary: RuntimeRelationshipSummary;
  lifecycle: RuntimeSessionLifecycle | null;
  reason?: string;
}
```

Implementation notes:
- keep raw runtime file access on the server
- define Phase 2 continuity DTOs in the view layer instead of exposing `GossipelogInjectionResult` directly to pages
- `loadPlayRuntimeSessionView()` should reconstruct:
  - active session lifecycle
  - active checkpoint identity
  - `currentState`
  - derived beat history
  - relationship summary using the spec priority:
    1. session-level layer
    2. active checkpoint layer
    3. empty layer
- extend `loadAuthoringState()` with an opt-in `includeRuntimeContinuity` flag
- when the runtime file is invalid, return an explicit unavailable/error continuity view instead of silently creating a new session on the read path
- the edit-facing continuity view must be section-safe and bounded:
  - no raw `checkpointsById`
  - no raw transcript dump
  - only active-session presence, progress position, lifecycle, and reduced relationship summary data

- [ ] **Step 4: Re-run the bounded-view tests to verify GREEN**

Run: `npm test -- src/runtime-sessions/__tests__/views.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/app/edit/__tests__/page.test.tsx src/app/__tests__/play-page.test.tsx`

Expected: PASS for bounded play restore view, bounded edit projection, and server-page loading behavior.

- [ ] **Step 5: Commit**

```bash
git add src/runtime-sessions/views.ts src/authoring/persistence/package-state.ts src/app/play/page.tsx src/app/edit/page.tsx src/runtime-sessions/__tests__/views.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/app/edit/__tests__/page.test.tsx src/app/__tests__/play-page.test.tsx
git commit -m "feat: add bounded runtime session views"
```

## Task 3: Add the server bridge for runtime-session read/write operations

**Files:**
- Create: `src/app/api/play/packages/[packageName]/runtime-session/route.ts`
- Test: `src/app/api/play/packages/[packageName]/runtime-session/route.test.ts`
- Modify: `src/app/play/runtime.ts`
- Modify: `src/runtime-sessions/repository.ts`
- Test: `src/app/play/runtime.test.ts`

- [ ] **Step 1: Write the failing runtime-session bridge tests**

```ts
it('posts an accepted-beat checkpoint write command through the browser bridge', async () => {
  await browserClient.recordAcceptedBeat({
    packageName: 'sample-scene',
    sessionId: 'sess_01',
    checkpointId: 'chk_02',
  });
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/play/packages/sample-scene/runtime-session',
    expect.objectContaining({ method: 'POST' }),
  );
});

it('resets by creating a new active session instead of deleting history', async () => {
  const response = await POST(new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ kind: 'reset_workbench' }),
  }), context);
  expect(await response.json()).toMatchObject({ activeSessionId: expect.any(String) });
});

it('surfaces write failures from accepted-beat persistence instead of pretending success', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
    error: 'disk write failed',
  }), { status: 500, headers: { 'content-type': 'application/json' } }));

  await expect(browserClient.recordAcceptedBeat({
    packageName: 'sample-scene',
    sessionId: 'sess_01',
    checkpointId: 'chk_02',
  })).rejects.toThrow(/disk write failed/i);
});

it('returns a non-2xx response when reset persistence fails', async () => {
  repository.resetWorkbench = vi.fn(async () => {
    throw new Error('reset write failed');
  });

  const response = await POST(new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ kind: 'reset_workbench' }),
  }), context);

  expect(response.status).toBeGreaterThanOrEqual(500);
});
```

- [ ] **Step 2: Run the bridge tests to verify RED**

Run: `npm test -- src/app/play/runtime.test.ts src/app/api/play/packages/[packageName]/runtime-session/route.test.ts`

Expected: FAIL because the typed runtime-session route and browser bridge do not exist yet.

- [ ] **Step 3: Implement the typed browser/server bridge**

```ts
type RuntimeSessionCommand =
  | { kind: 'ensure_active_session' }
  | { kind: 'record_accepted_beat'; payload: RecordAcceptedBeatInput }
  | { kind: 'finalize_relationship_layer'; payload: FinalizeRelationshipLayerInput }
  | { kind: 'reset_workbench' };
```

Implementation notes:
- keep one route file and one typed command envelope for Phase 2
- do not invent separate ad hoc fetch shapes per action
- route responsibilities:
  - validate command body
  - call repository
  - return bounded result payloads
  - translate repository write failures into explicit non-2xx error payloads
- browser bridge responsibilities:
  - hide fetch details from `PlayWorkbench`
  - return typed results
  - throw explicit errors when accepted-beat / reset / finalization persistence fails

- [ ] **Step 4: Re-run the bridge tests to verify GREEN**

Run: `npm test -- src/app/play/runtime.test.ts src/app/api/play/packages/[packageName]/runtime-session/route.test.ts`

Expected: PASS for accepted-beat, finalization, and reset commands, plus explicit write-failure propagation.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/play/packages/[packageName]/runtime-session/route.ts src/app/api/play/packages/[packageName]/runtime-session/route.test.ts src/app/play/runtime.ts src/runtime-sessions/repository.ts src/app/play/runtime.test.ts
git commit -m "feat: add runtime session browser bridge"
```

## Task 4: Extend the orchestrator to emit persisted checkpoints, restore runtime truth, and finalize bound relationship layers

**Files:**
- Modify: `src/engine/orchestrator.ts`
- Test: `src/engine/__tests__/orchestrator.test.ts`
- Test: `src/engine/__tests__/e2e/phase-end-processing.test.ts`

- [ ] **Step 1: Write the failing orchestrator continuity tests**

```ts
it('records one full checkpoint for each accepted beat', async () => {
  const recorder = createRecorderSpy();
  const orchestrator = createOrchestrator({ ...config, runtimeSessionStore: recorder });
  await orchestrator.initScene();
  await orchestrator.runBeat('opening action');
  expect(recorder.recordAcceptedBeat).toHaveBeenCalledTimes(1);
});

it('finalizes only the bound checkpoint when a delayed gossipelog refresh resolves', async () => {
  const recorder = createRecorderSpy();
  const orchestrator = createOrchestrator({ ...config, runtimeSessionStore: recorder });
  await orchestrator.runBeat('beat one');
  await orchestrator.runBeat('beat two');
  expect(recorder.finalizeRelationshipLayer).toHaveBeenCalledWith(
    expect.objectContaining({ sessionId: expect.any(String), checkpointId: expect.any(String) }),
  );
});

it('hydrates current state, accepted history, and relationship context before continuation resumes', async () => {
  const orchestrator = createOrchestrator(config);
  const restoredState = await orchestrator.hydrateScene({
    currentState: makeStateSnapshot(),
    acceptedHistory: makeAcceptedHistory(2),
    lastStableRelationshipLayer: makeRelationshipLayer(),
    sceneComplete: false,
  });
  expect(restoredState.roundState.historyWindow).toHaveLength(4);
  expect(orchestrator.getState()).toEqual(restoredState);
});

it('writes in_progress lifecycle for non-final accepted beats', async () => {
  const recorder = createRecorderSpy();
  const orchestrator = createOrchestrator({ ...config, runtimeSessionStore: recorder });
  await orchestrator.initScene();
  await orchestrator.runBeat('opening action');
  expect(recorder.recordAcceptedBeat).toHaveBeenCalledWith(
    expect.objectContaining({ lifecycle: 'in_progress' }),
  );
});

it('writes complete lifecycle when the accepted beat finishes the scene', async () => {
  const recorder = createRecorderSpy();
  const orchestrator = createOrchestrator({ ...config, runtimeSessionStore: recorder });
  await orchestrator.initScene();
  await runSceneToCompletion(orchestrator);
  expect(recorder.recordAcceptedBeat).toHaveBeenLastCalledWith(
    expect.objectContaining({ lifecycle: 'complete' }),
  );
});

it('keeps the accepted beat durable when delayed relationship-layer finalization persistence fails', async () => {
  const recorder = createRecorderSpy({
    finalizeRelationshipLayer: vi.fn(async () => {
      throw new Error('finalize write failed');
    }),
  });
  const orchestrator = createOrchestrator({ ...config, runtimeSessionStore: recorder });

  await orchestrator.initScene();
  await expect(orchestrator.runBeat('opening action')).resolves.toMatchObject({
    beatResult: expect.objectContaining({ beatText: expect.any(String) }),
  });
});
```

- [ ] **Step 2: Run the orchestrator tests to verify RED**

Run: `npm test -- src/engine/__tests__/orchestrator.test.ts src/engine/__tests__/e2e/phase-end-processing.test.ts`

Expected: FAIL because the orchestrator does not yet expose runtime-session persistence hooks.

- [ ] **Step 3: Implement continuity-aware orchestrator hooks**

```ts
export interface OrchestratorRestoreInput {
  currentState: StateSnapshot;
  acceptedHistory: readonly HistoryEntry[];
  lastStableRelationshipLayer: GossipelogInjectionResult;
  sceneComplete: boolean;
}

export interface RuntimeSessionStore {
  ensureActiveSession(): Promise<EnsureActiveSessionResult>;
  recordAcceptedBeat(input: RecordAcceptedBeatInput): Promise<void>;
  finalizeRelationshipLayer(input: FinalizeRelationshipLayerInput): Promise<void>;
}
```

Implementation notes:
- keep the orchestrator as the accepted-beat truth source
- do not move prompt assembly or runtime decision logic into the repository
- add an explicit `hydrateScene()` path that restores in-memory runtime truth:
  - `currentState`
  - `acceptedHistory`
  - queued `lastStableRelationshipLayer`
  - `sceneComplete`
- write accepted-beat checkpoints only after the continuation-ready next `StateSnapshot` exists
- accepted-beat writes should move session lifecycle as follows:
  - bootstrap session starts as `awaiting_start`
  - first accepted beat and every non-final accepted beat write `in_progress`
  - the accepted beat that completes the scene writes `complete`
- bind refresh finalization to the originating `sessionId + checkpointId`
- allow an older bound checkpoint to finalize itself later
- never let an older refresh overwrite the current active-session mirror
- if post-accept finalization persistence fails, keep the already accepted checkpoint durable and continue using the previously stable relationship truth

- [ ] **Step 4: Re-run the orchestrator tests to verify GREEN**

Run: `npm test -- src/engine/__tests__/orchestrator.test.ts src/engine/__tests__/e2e/phase-end-processing.test.ts`

Expected: PASS for checkpoint creation, hydrate-scene restore, lifecycle transitions, bound finalization, stale-refresh protection, and non-fatal finalization-write failure handling.

- [ ] **Step 5: Commit**

```bash
git add src/engine/orchestrator.ts src/engine/__tests__/orchestrator.test.ts src/engine/__tests__/e2e/phase-end-processing.test.ts
git commit -m "feat: persist and hydrate runtime checkpoints"
```

## Task 5: Restore browser runtime and play state from the active session, and add `Reset Workbench`

**Files:**
- Modify: `src/app/play/runtime.ts`
- Modify: `src/app/play/PlayWorkbench.tsx`
- Modify: `src/app/play/page.tsx`
- Modify: `src/app/play/runtime.test.ts`
- Modify: `src/app/__tests__/play.test.tsx`
- Modify: `src/app/__tests__/play-page.test.tsx`

- [ ] **Step 1: Write the failing play-restore tests**

```tsx
it('builds orchestrator restore input from the active runtime session view', () => {
  const input = buildOrchestratorRestoreInput(restorableView);
  expect(input).toMatchObject({
    currentState: restorableView.stateSnapshot,
    lastStableRelationshipLayer: {
      highlightedDeltasText: restorableView.relationshipSummary.highlightedDeltasText,
      stableBackgroundText: restorableView.relationshipSummary.stableBackgroundText,
    },
    sceneComplete: false,
  });
  expect(input.acceptedHistory).toHaveLength(4);
});

it('surfaces an explicit continuity error and blocks automatic restore when the runtime file is invalid', async () => {
  render(<PlayWorkbench initialRuntimeSession={unavailableView} ... />);
  expect(screen.getByText(/runtime continuity unavailable/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start Round' })).not.toBeInTheDocument();
});

it('restores beat history and current state from the active runtime session view', async () => {
  render(<PlayWorkbench initialRuntimeSession={restorableView} ... />);
  expect(screen.getByText('Beat 3 ready. Choose an option or write the next action.')).toBeInTheDocument();
  expect(screen.getByText(/Accepted Beats/i)).toBeInTheDocument();
});

it('resets into the pre-start waiting state without deleting old history', async () => {
  render(<PlayWorkbench initialRuntimeSession={restorableView} ... />);
  await user.click(screen.getByRole('button', { name: 'Reset Workbench' }));
  expect(screen.getByRole('button', { name: 'Start Round' })).toBeInTheDocument();
});

it('shows a write error and preserves local continuity state when reset persistence fails', async () => {
  render(<PlayWorkbench initialRuntimeSession={restorableView} runtimeClient={failingRuntimeClient} ... />);
  await user.click(screen.getByRole('button', { name: 'Reset Workbench' }));
  expect(screen.getByText(/reset write failed/i)).toBeInTheDocument();
  expect(screen.getByText(/Accepted Beats/i)).toBeInTheDocument();
});

it('does not append accepted beat history when durable checkpoint persistence fails', async () => {
  render(<PlayWorkbench initialRuntimeSession={awaitingStartView} runtimeClient={failingRuntimeClient} ... />);
  await user.click(screen.getByRole('button', { name: 'Start Round' }));
  expect(screen.getByText(/checkpoint write failed/i)).toBeInTheDocument();
  expect(screen.queryByText(/Accepted Beats/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the play tests to verify RED**

Run: `npm test -- src/app/play/runtime.test.ts src/app/__tests__/play.test.tsx src/app/__tests__/play-page.test.tsx`

Expected: FAIL because the browser runtime cold-starts, invalid continuity is not surfaced, and there is no reset flow.

- [ ] **Step 3: Implement play restore/reset behavior**

```tsx
<PlayWorkbench
  storyPackage={storyPackage}
  storyPackageName={selectedPackageName}
  initialRuntimeSession={runtimeSessionView}
/>
```

Implementation notes:
- restore must seed browser/runtime truth before the user can continue:
  - `acceptedHistory`
  - `currentState`
  - active `lastStableRelationshipLayer`
  - active `sessionId` and `activeCheckpointId`
- build a concrete restore input in `src/app/play/runtime.ts`, then call `orchestrator.hydrateScene()` for `restorable` sessions
- convert `RuntimeRelationshipSummary` back into the internal relationship-layer type at the restore boundary; keep UI surfaces depending on Phase 2 DTOs only
- preserve the existing `acceptedHistory -> historyWindow -> prompt assembler -> memory placeholder` chain; do not fake continuation by only painting old beats into the UI
- when `initialRuntimeSession.kind === 'unavailable'`, surface a truthful continuity error state and block automatic restore/cold bootstrap
- when `initialRuntimeSession.kind === 'awaiting_start'`, keep the opening-hook waiting state
- only call `initScene()` for fresh bootstrap / `awaiting_start` sessions, not for already-restorable sessions
- when `kind === 'restorable'`, seed:
  - `currentState`
  - `beatHistory`
  - `roundStarted`
  - scene-complete state
- add an explicit `Reset Workbench` button that calls the runtime-session bridge
- after reset, rebuild local workbench state from the returned bootstrap session view instead of force-reloading the page
- if reset or accepted-beat persistence fails, surface a non-silent error and keep the previously truthful local state instead of pretending the write succeeded

- [ ] **Step 4: Re-run the play tests to verify GREEN**

Run: `npm test -- src/app/play/runtime.test.ts src/app/__tests__/play.test.tsx src/app/__tests__/play-page.test.tsx`

Expected: PASS for runtime hydration, refresh restore, invalid-file blocking, waiting-state bootstrap, reset semantics, and write-failure feedback without silent UI drift.

- [ ] **Step 5: Commit**

```bash
git add src/app/play/runtime.ts src/app/play/PlayWorkbench.tsx src/app/play/page.tsx src/app/play/runtime.test.ts src/app/__tests__/play.test.tsx src/app/__tests__/play-page.test.tsx
git commit -m "feat: hydrate play runtime from active session"
```

## Task 6: Surface continuity-backed relationship state in `/edit`

**Files:**
- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/app/edit/page.tsx`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/sections/WorldBaseCastSection.tsx`
- Modify: `src/app/edit/sections/CharacterSection.tsx`
- Test: `src/authoring/persistence/__tests__/package-state.test.ts`
- Test: `src/app/edit/__tests__/page.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Test: `src/app/edit/__tests__/WorldBaseCastSection.test.tsx`
- Test: `src/app/edit/__tests__/CharacterSection.test.tsx`

- [ ] **Step 1: Write the failing edit-continuity tests**

```tsx
it('requests runtime continuity when loading the character surface', async () => {
  render(await EditPage({
    searchParams: { storyPackage: 'sample-scene', section: 'worldbase-cast', surface: 'character' },
  }));
  expect(loadAuthoringState).toHaveBeenCalledWith('sample-scene', expect.objectContaining({
    includeRuntimeContinuity: true,
  }));
});

it('renders continuity-backed relationship status when an active session exists', () => {
  render(<CharacterSection runtimeContinuity={restorableRelationshipView} ... />);
  expect(screen.getByText(/latest relationship state/i)).toBeInTheDocument();
});

it('passes runtime continuity through WorldBaseCastSection into CharacterSection', () => {
  render(<WorldBaseCastSection runtimeContinuity={restorableRelationshipView} surface="character" ... />);
  expect(renderCharacterSection).toHaveBeenCalledWith(
    expect.objectContaining({ runtimeContinuity: restorableRelationshipView }),
  );
});
```

- [ ] **Step 2: Run the edit-continuity tests to verify RED**

Run: `npm test -- src/authoring/persistence/__tests__/package-state.test.ts src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/WorldBaseCastSection.test.tsx src/app/edit/__tests__/CharacterSection.test.tsx`

Expected: FAIL because edit loading and character rendering do not yet consume continuity views.

- [ ] **Step 3: Implement bounded edit continuity integration**

```ts
const authoringState = await loadAuthoringState(selectedPackageName, {
  includeAgentSurfaceItems: activeSection === 'package-wiring-validation',
  includeRuntimeContinuity: activeSection === 'worldbase-cast',
});
```

Implementation notes:
- keep the character relationship area bounded and section-safe
- route continuity props through the actual render chain:
  - `EditWorkbench`
  - `WorldBaseCastSection`
  - `CharacterSection`
- do not dump raw checkpoint transcripts into the editor
- render three truthful states:
  - no active continuity yet
  - continuity present with relationship summary
  - continuity unreadable / unavailable due to runtime-file error
- do not reintroduce a temporary bridge that bypasses the new continuity substrate

- [ ] **Step 4: Re-run the edit-continuity tests to verify GREEN**

Run: `npm test -- src/authoring/persistence/__tests__/package-state.test.ts src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/WorldBaseCastSection.test.tsx src/app/edit/__tests__/CharacterSection.test.tsx`

Expected: PASS for bounded runtime projection and truthful character-page rendering.

- [ ] **Step 5: Commit**

```bash
git add src/authoring/persistence/package-state.ts src/app/edit/page.tsx src/app/edit/EditWorkbench.tsx src/app/edit/sections/WorldBaseCastSection.tsx src/app/edit/sections/CharacterSection.tsx src/authoring/persistence/__tests__/package-state.test.ts src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/WorldBaseCastSection.test.tsx src/app/edit/__tests__/CharacterSection.test.tsx
git commit -m "feat: show continuity-backed edit relationship state"
```

## Task 7: Run full verification and sync planning records

**Files:**
- Modify: `task_plan.md`
- Modify: `progress.md`
- Modify: `findings.md` only if execution changes a frozen decision

- [ ] **Step 1: Run focused Phase 2 verification suites**

Run: `npm test -- src/runtime-sessions/__tests__/repository.test.ts src/runtime-sessions/__tests__/views.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/app/api/play/packages/[packageName]/runtime-session/route.test.ts src/engine/__tests__/orchestrator.test.ts src/app/play/runtime.test.ts src/app/__tests__/play.test.tsx src/app/__tests__/play-page.test.tsx src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/WorldBaseCastSection.test.tsx`

Expected: PASS for repository, bridge, orchestrator, per-package write serialization, invalid-file restore blocking, same-session `/play -> /edit -> /play` continuity, play restore, explicit write-failure feedback, and edit continuity coverage.

- [ ] **Step 2: Run repository-wide static and type checks**

Run: `npm run lint && npm run type-check && npm run type-check:simulation`

Expected: PASS with no new lint or type regressions.

- [ ] **Step 3: Run the full application test suite**

Run: `npm test`

Expected: PASS across existing authoring, runtime, and simulation-facing tests.

- [ ] **Step 4: Run production build and manual continuity check**

Run: `npm run build`

Expected: PASS

Manual check:
- start a round and accept at least two beats
- refresh `/play` and confirm restore
- switch to `/edit?section=worldbase-cast&surface=character` and confirm bounded relationship state
- return to `/play` and continue
- press `Reset Workbench` and confirm pre-start waiting state with old session history retained on disk

- [ ] **Step 5: Commit**

```bash
git add task_plan.md progress.md
git add -u findings.md
git commit -m "feat: deliver phase 2 session continuity"
```

## Notes For Execution

- Use TDD inside every task exactly as written: RED -> minimal implementation -> GREEN.
- Do not mix runtime continuity into `authoring-state.json`, `StoryPackage`, or gossipelog YAML state.
- Do not widen Phase 2 into checkpoint browser UI or storyline management.
- Keep repository writes serialized per package; do not bypass the repository with ad hoc file writes in route or UI code.
- Keep UI contracts on Phase 2 continuity DTOs, not direct gossipelog internal types.
- Keep subagent ownership tight:
  - repository/schema work
  - play runtime bridge/orchestrator work
  - edit continuity view work
- If implementation discovers a contradiction with the approved spec instead of a missing detail, stop and resolve the spec first rather than improvising in code.
