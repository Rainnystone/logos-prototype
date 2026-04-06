# Phase 3 Part 1 Storyline Substrate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 3 Part 1 storyline substrate so one package can carry multiple storylines with storyline-bound variant workspaces and storyline-bound runtime sessions, while `/edit` and `/play` both resolve through the active storyline without the new management UI.

**Architecture:** Introduce a dedicated storyline repository layer plus variant-workspace filesystem helpers, then wrap the existing runtime-session substrate with storyline-aware bootstrap / create / switch / branch primitives. Keep the deterministic authoring bridge and story loader intact, but add one target-resolution seam so authored reads and writes move from package-root YAMLs to the active storyline workspace after bootstrap.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Node `fs/promises`, Zod, Vitest, package-local JSON/YAML persistence under `src/story-packages`

---

**Preflight:** Execute this plan in a dedicated git worktree created with `superpowers:using-git-worktrees` before touching code.

## File Map

### Storyline repository contract and workspace helpers

- Create: `src/types/storyline-repository.ts`
- Create: `src/storylines/repository.ts`
- Create: `src/storylines/workspaces.ts`
- Modify: `src/types/index.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/storylines/__tests__/repository.test.ts`
- Test: `src/storylines/__tests__/workspaces.test.ts`

### Storyline substrate service and runtime synchronization

- Create: `src/storylines/substrate.ts`
- Modify: `src/runtime-sessions/repository.ts`
- Modify: `src/runtime-sessions/views.ts`
- Modify: `src/app/api/play/packages/[packageName]/runtime-session/route.ts`
- Test: `src/storylines/__tests__/substrate.test.ts`
- Test: `src/runtime-sessions/__tests__/repository.test.ts`
- Test: `src/runtime-sessions/__tests__/views.test.ts`
- Test: `src/app/api/play/packages/[packageName]/runtime-session/route.test.ts`

### Story-package loading and authoring target resolution

- Modify: `src/engine/story-loader.ts`
- Modify: `src/authoring/persistence/repository.ts`
- Modify: `src/authoring/persistence/reload.ts`
- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/authoring/persistence/bridge.ts`
- Test: `src/engine/__tests__/story-loader.test.ts`
- Test: `src/authoring/persistence/__tests__/package-state.test.ts`
- Test: `src/authoring/persistence/__tests__/bridge.test.ts`

### Page-level active-storyline consumption

- Modify: `src/app/play/page.tsx`
- Modify: `src/app/edit/page.tsx`
- Test: `src/app/__tests__/play-page.test.tsx`
- Test: `src/app/edit/__tests__/page.test.tsx`

### Planning sync and final verification

- Modify: `docs/superpowers/phase-3/task_plan.md`
- Modify: `docs/superpowers/phase-3/progress.md`
- Modify: `docs/superpowers/phase-3/findings.md` only if implementation changes a frozen design decision

## Task 1: Add the storyline repository schema and variant-workspace filesystem helpers

**Files:**
- Create: `src/types/storyline-repository.ts`
- Create: `src/storylines/repository.ts`
- Create: `src/storylines/workspaces.ts`
- Modify: `src/types/index.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/storylines/__tests__/repository.test.ts`
- Test: `src/storylines/__tests__/workspaces.test.ts`

- [ ] **Step 1: Write the failing schema and workspace tests**

```ts
it('requires a non-null activeStorylineId once a storyline repository exists', () => {
  expect(() =>
    StorylineRepositoryFileSchema.parse({
      version: 1,
      activeStorylineId: null,
      storylinesById: {},
      variantsById: {},
    }),
  ).toThrow(/activeStorylineId/i);
});

it('pins workspaceRoot to variants/<variantId>', () => {
  expect(() =>
    StorylineVariantSchema.parse({
      variantId: 'variant_main',
      workspaceRoot: 'variants/other',
      createdFromStorylineId: null,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    }),
  ).toThrow(/workspaceRoot/i);
});

it('copies the full variant workspace recursively for variant-to-variant cloning', async () => {
  await cloneVariantWorkspace({
    packageName: '__storyline-workspaces-test__',
    sourceVariantId: 'variant_source',
    targetVariantId: 'variant_copy',
  });

  expect(readFileSync(resolveVariantWorkspacePath('__storyline-workspaces-test__', 'variant_copy', 'notes/readme.txt'), 'utf8')).toContain('opaque file');
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/storylines/__tests__/repository.test.ts src/storylines/__tests__/workspaces.test.ts`

Expected: FAIL because the storyline-repository schema and workspace helpers do not exist yet.

- [ ] **Step 3: Implement the minimal schema and filesystem helpers**

```ts
export const StorylineVariantSchema = z
  .object({
    variantId: z.string(),
    workspaceRoot: z.string(),
    createdFromStorylineId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.workspaceRoot !== `variants/${value.variantId}`) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'workspaceRoot must match variants/<variantId>.',
        path: ['workspaceRoot'],
      });
    }
  });

export function resolveVariantWorkspaceRoot(packageName: string, variantId: string): string {
  return path.resolve(resolvePackageRoot(packageName), 'variants', variantId);
}
```

Implementation notes:
- Keep this layer metadata-first. Do not put runtime checkpoint truth into `src/types/storyline-repository.ts`.
- Put raw file path resolution and JSON read/write in `src/storylines/repository.ts`.
- Put stage / promote / clone helpers in `src/storylines/workspaces.ts`.
- Make workspace cloning copy the full directory recursively, but keep bootstrap-from-baseline constrained to the six managed YAML files listed in the spec.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/storylines/__tests__/repository.test.ts src/storylines/__tests__/workspaces.test.ts`

Expected: PASS with the new schema and workspace helpers wired into `src/types/index.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/types/storyline-repository.ts src/storylines/repository.ts src/storylines/workspaces.ts src/types/index.ts src/types/__tests__/type-conformance.test.ts src/storylines/__tests__/repository.test.ts src/storylines/__tests__/workspaces.test.ts
git commit -m "feat: add storyline repository contracts"
```

## Task 2: Build the storyline substrate service and runtime-session synchronization primitives

**Files:**
- Create: `src/storylines/substrate.ts`
- Modify: `src/runtime-sessions/repository.ts`
- Modify: `src/runtime-sessions/views.ts`
- Modify: `src/app/api/play/packages/[packageName]/runtime-session/route.ts`
- Test: `src/storylines/__tests__/substrate.test.ts`
- Test: `src/runtime-sessions/__tests__/repository.test.ts`
- Test: `src/runtime-sessions/__tests__/views.test.ts`
- Test: `src/app/api/play/packages/[packageName]/runtime-session/route.test.ts`

- [ ] **Step 1: Write the failing substrate and runtime-sync tests**

```ts
it('bootstraps a default storyline and awaiting_start session on the first mutating runtime command when runtime state is empty', async () => {
  const result = await ensureStorylineAwareActiveSession('__storyline-substrate-test__');

  expect(result.storyline.storylineId).toBe('storyline_main');
  expect(result.session.lifecycle).toBe('awaiting_start');
  expect(result.repository.activeStorylineId).toBe('storyline_main');
});

it('creates a new storyline from the source storyline head without switching activeStorylineId', async () => {
  const created = await createStorylineFromSource({
    packageName: '__storyline-substrate-test__',
    sourceStorylineId: 'storyline_main',
    name: 'Branch A',
  });

  expect(created.storyline.sourceCheckpointId).toBe('chk_02');
  expect(created.storyline.headCheckpointId).toBe('chk_02');
  expect(created.repository.activeStorylineId).toBe('storyline_main');
});

it('updates runtime-sessions.json activeSessionId as a mirror when switching storylines', async () => {
  await switchActiveStoryline('__storyline-substrate-test__', 'storyline_alt');

  expect((await readRuntimeSessionsFile('__storyline-substrate-test__'))?.activeSessionId).toBe('sess_alt');
});

it('branches a new storyline from an explicit historical checkpoint without switching the active storyline', async () => {
  const created = await branchStorylineFromCheckpoint({
    packageName: '__storyline-substrate-test__',
    sourceStorylineId: 'storyline_main',
    checkpointId: 'chk_01',
    name: 'Checkpoint Branch',
  });

  expect(created.storyline.sourceCheckpointId).toBe('chk_01');
  expect(created.storyline.headCheckpointId).toBe('chk_01');
  expect(created.repository.activeStorylineId).toBe('storyline_main');
});

it('repairs mirror drift on the next storyline-aware preflight instead of silently trusting stale mirrors', async () => {
  await introduceMirrorDrift('__storyline-substrate-test__');

  const repaired = await resolveActiveStorylineContext('__storyline-substrate-test__', { forWrite: false });

  expect(repaired.storyline.headCheckpointId).toBe('chk_02');
  expect((await readRuntimeSessionsFile('__storyline-substrate-test__'))?.activeSessionId).toBe('sess_main');
});

it('fails loudly on structural mismatch instead of inventing missing storyline bindings', async () => {
  await writeBrokenStorylineRepository('__storyline-substrate-test__', {
    activeStorylineId: 'storyline_main',
    storylinesById: {
      storyline_main: {
        activeSessionId: 'sess_missing',
      },
    },
  });

  await expect(resolveActiveStorylineContext('__storyline-substrate-test__', { forWrite: false })).rejects.toThrow(/does not resolve/i);
});

it('deletes the staged workspace when create-from-source fails before workspace promotion', async () => {
  await injectRuntimeWriteFailureOnce('__storyline-substrate-test__');

  await expect(
    createStorylineFromSource({
      packageName: '__storyline-substrate-test__',
      sourceStorylineId: 'storyline_main',
      name: 'Broken Branch',
    }),
  ).rejects.toThrow(/runtime/i);

  expect(listWorkspaceStageEntries('__storyline-substrate-test__')).toEqual([]);
});

it('ignores a variant workspace directory that is not registered in variantsById during normal resolution', async () => {
  await createOrphanVariantWorkspace('__storyline-substrate-test__', 'variant_orphan');

  const context = await resolveActiveStorylineContext('__storyline-substrate-test__', { forWrite: false });

  expect(context.variant.variantId).toBe('variant_main');
  expect(context.authoredRoot).not.toContain('variant_orphan');
});

it('ignores a runtime session that is not bound by storyline-repository.json during normal resolution', async () => {
  await appendUnboundSession('__storyline-substrate-test__', 'sess_orphan');

  const context = await resolveActiveStorylineContext('__storyline-substrate-test__', { forWrite: false });

  expect(context.storyline.activeSessionId).toBe('sess_main');
  expect(context.session.sessionId).toBe('sess_main');
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- src/storylines/__tests__/substrate.test.ts src/runtime-sessions/__tests__/repository.test.ts src/runtime-sessions/__tests__/views.test.ts 'src/app/api/play/packages/[packageName]/runtime-session/route.test.ts'`

Expected: FAIL because the storyline substrate service and mirror-sync APIs do not exist yet.

- [ ] **Step 3: Implement the minimal runtime/storyline coordination layer**

```ts
export async function switchActiveStoryline(packageName: string, storylineId: string) {
  return runWithStorylineWriteQueue(packageName, async () => {
    const repo = await readStorylineRepositoryForWrite(packageName);
    const storyline = repo.storylinesById[storylineId];
    await runtimeSessionsRepository.setMirroredActiveSession(packageName, storyline.activeSessionId);
    return writeStorylineRepository(packageName, { ...repo, activeStorylineId: storylineId });
  });
}
```

Implementation notes:
- Keep `storyline-repository.json` canonical for storyline existence, `variantId`, and `activeSessionId`.
- Keep `runtime-sessions.json` canonical for session lifecycle and checkpoint pointers.
- Extend `src/runtime-sessions/repository.ts` with the smallest possible low-level helpers needed by the substrate service:
  - create/bootstrap an `awaiting_start` session when none exists
  - create a new session rooted at a known checkpoint
  - update the compatibility mirror `activeSessionId`
- Keep the lifecycle transition simple:
  - bootstrap may create an `awaiting_start` session
  - the first accepted-beat write moves that same storyline-bound session into `in_progress` or `complete`
  - do not add a separate storyline-specific transition mechanism unless an existing runtime-session contract truly cannot express it
- Make `resolveActiveStorylineContext()` perform the narrow load-time repair required by the spec:
  - repair only mirror drift for `runtime-sessions.json.activeSessionId` and `storyline.headCheckpointId`
  - throw on structural mismatch such as missing `activeStorylineId`, missing `variantId`, or unbound `activeSessionId`
- Explicitly test and implement the three failure-path behaviors frozen in spec §8.3:
  - delete staged workspaces when failure happens before promotion
  - ignore orphan variant directories that are not registered in `variantsById`
  - ignore unbound runtime sessions during normal storyline resolution
- Route all runtime mutation commands through `src/storylines/substrate.ts`, not directly through bare runtime-session repository calls.
- Preserve the repo-first failure model from the spec:
  - stage workspace
  - persist runtime session state
  - promote workspace
  - persist storyline repository last

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run: `npm test -- src/storylines/__tests__/substrate.test.ts src/runtime-sessions/__tests__/repository.test.ts src/runtime-sessions/__tests__/views.test.ts 'src/app/api/play/packages/[packageName]/runtime-session/route.test.ts'`

Expected: PASS with bootstrap, create-from-source, branch-from-checkpoint, and switch semantics all covered.

- [ ] **Step 5: Commit**

```bash
git add src/storylines/substrate.ts src/runtime-sessions/repository.ts src/runtime-sessions/views.ts 'src/app/api/play/packages/[packageName]/runtime-session/route.ts' src/storylines/__tests__/substrate.test.ts src/runtime-sessions/__tests__/repository.test.ts src/runtime-sessions/__tests__/views.test.ts 'src/app/api/play/packages/[packageName]/runtime-session/route.test.ts'
git commit -m "feat: add storyline substrate primitives"
```

## Task 3: Move authored load/save resolution onto the active variant workspace

**Files:**
- Modify: `src/engine/story-loader.ts`
- Modify: `src/authoring/persistence/repository.ts`
- Modify: `src/authoring/persistence/reload.ts`
- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/authoring/persistence/bridge.ts`
- Test: `src/engine/__tests__/story-loader.test.ts`
- Test: `src/authoring/persistence/__tests__/package-state.test.ts`
- Test: `src/authoring/persistence/__tests__/bridge.test.ts`

- [ ] **Step 1: Write the failing authoring-resolution tests**

```ts
it('loads the active storyline variant workspace after bootstrap instead of package-root YAML', async () => {
  const result = await loadAuthoringState('__storyline-authoring-test__');
  expect(result.state.worldBase.worldBaseSetting).toBe('variant-world-setting');
});

it('writes deterministic bridge saves into the active variant workspace and leaves package-root baseline untouched', async () => {
  await saveSectionDraft({
    requestId: 'req-variant-write',
    source: 'page',
    packageName: '__storyline-authoring-test__',
    sectionId: 'worldbase-cast',
    payload: { uiFields: { worldBaseSetting: 'variant-only-setting' } },
  });

  expect(readFileSync(path.resolve(testPackagePath, 'variants/variant_main/world-base.yaml'), 'utf8')).toContain('variant-only-setting');
  expect(readFileSync(path.resolve(testPackagePath, 'world-base.yaml'), 'utf8')).not.toContain('variant-only-setting');
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- src/engine/__tests__/story-loader.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/authoring/persistence/__tests__/bridge.test.ts`

Expected: FAIL because the loader and persistence layer still read and write package-root YAMLs only.

- [ ] **Step 3: Implement the minimal authored-root resolution seam**

```ts
export async function loadStoryPackage(
  packageName: string,
  options?: { authoredRootOverride?: string; runtimeProjection?: boolean },
): Promise<StoryPackage> {
  return loadStoryPackageInternal(packageName, options);
}
```

Implementation notes:
- Add an authored-root override to `src/engine/story-loader.ts`, but keep the default path on package-root baseline so catalog code and untouched callers stay compatible.
- In `src/authoring/persistence/repository.ts`, introduce a small target-resolution seam instead of a second persistence path. Every read/write/restore helper should resolve a target authored root first, then use the same deterministic YAML logic.
- In `src/authoring/persistence/package-state.ts` and `src/authoring/persistence/reload.ts`, resolve the active storyline context before loading the story package.
- In `src/authoring/persistence/bridge.ts`, allow the first save on a legacy package to trigger bootstrap, then continue the deterministic write into the variant workspace.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run: `npm test -- src/engine/__tests__/story-loader.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/authoring/persistence/__tests__/bridge.test.ts`

Expected: PASS with legacy-read compatibility preserved and post-bootstrap writes redirected into `variants/<variantId>/...`.

- [ ] **Step 5: Commit**

```bash
git add src/engine/story-loader.ts src/authoring/persistence/repository.ts src/authoring/persistence/reload.ts src/authoring/persistence/package-state.ts src/authoring/persistence/bridge.ts src/engine/__tests__/story-loader.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/authoring/persistence/__tests__/bridge.test.ts
git commit -m "feat: resolve authoring through active storyline variants"
```

## Task 4: Make `/play` and `/edit` consume the active storyline by default

**Files:**
- Modify: `src/app/play/page.tsx`
- Modify: `src/app/edit/page.tsx`
- Modify: `src/runtime-sessions/views.ts`
- Test: `src/app/__tests__/play-page.test.tsx`
- Test: `src/app/edit/__tests__/page.test.tsx`
- Test: `src/runtime-sessions/__tests__/views.test.ts`

- [ ] **Step 1: Write the failing page/view tests**

```ts
it('loads Play Workbench from the active storyline package projection instead of the package baseline after bootstrap', async () => {
  render(await PlayPage({ searchParams: { storyPackage: '__storyline-page-test__' } }));
  expect(screen.getByText(/variant scene name/i)).toBeInTheDocument();
});

it('loads Edit Workbench from the active storyline package projection after bootstrap', async () => {
  render(await EditPage({ searchParams: { storyPackage: '__storyline-page-test__' } }));
  expect(screen.getByDisplayValue('variant-world-setting')).toBeInTheDocument();
});

it('loads Play Workbench in read-only legacy mode without materializing Phase 3 files before a mutating command runs', async () => {
  render(await PlayPage({ searchParams: { storyPackage: '__storyline-page-test__' } }));
  expect(existsSync(path.resolve(testPackagePath, 'storyline-repository.json'))).toBe(false);
  expect(existsSync(path.resolve(testPackagePath, 'variants'))).toBe(false);
});

it('loads Edit Workbench in read-only legacy mode without materializing Phase 3 files before a save runs', async () => {
  render(await EditPage({ searchParams: { storyPackage: '__storyline-page-test__' } }));
  expect(existsSync(path.resolve(testPackagePath, 'storyline-repository.json'))).toBe(false);
  expect(existsSync(path.resolve(testPackagePath, 'variants'))).toBe(false);
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- src/app/__tests__/play-page.test.tsx src/app/edit/__tests__/page.test.tsx src/runtime-sessions/__tests__/views.test.ts`

Expected: FAIL because the page loaders still pull package-root state and package-global runtime views.

- [ ] **Step 3: Implement the minimal page-level resolution changes**

```ts
const storylineContext = await resolveActiveStorylineContext(selectedPackageName, { forWrite: false });
const storyPackage = await loadStoryPackage(selectedPackageName, {
  authoredRootOverride: storylineContext.authoredRoot,
  runtimeProjection: true,
});
```

Implementation notes:
- Keep story-package catalog loading baseline packages only. The storyline-aware shift starts at `/edit` and `/play`.
- `src/runtime-sessions/views.ts` should accept an explicitly resolved session id or storyline context so `loadPlayRuntimeSessionView` and `loadEditRuntimeContinuityView` no longer depend on package-global `activeSessionId` alone.
- `/play` page should load the active storyline-authored package plus the active storyline runtime view.
- `/edit` page should load the active storyline-authored package plus the bounded edit continuity view.
- Pure read `/play` and `/edit` loads on legacy packages must stay non-materializing; only the first storyline-aware write may bootstrap the explicit repository.
- Do not add new query params or UI state in Part 1.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run: `npm test -- src/app/__tests__/play-page.test.tsx src/app/edit/__tests__/page.test.tsx src/runtime-sessions/__tests__/views.test.ts`

Expected: PASS with legacy read-only compatibility still intact and explicit storyline packages resolving after bootstrap.

- [ ] **Step 5: Commit**

```bash
git add src/app/play/page.tsx src/app/edit/page.tsx src/runtime-sessions/views.ts src/app/__tests__/play-page.test.tsx src/app/edit/__tests__/page.test.tsx src/runtime-sessions/__tests__/views.test.ts
git commit -m "feat: resolve play and edit through active storylines"
```

## Task 5: Run the full verification loop and sync planning documents

**Files:**
- Modify: `docs/superpowers/phase-3/task_plan.md`
- Modify: `docs/superpowers/phase-3/progress.md`
- Modify: `docs/superpowers/phase-3/findings.md` only if execution changes a frozen design decision

- [ ] **Step 1: Run the targeted regression suite for the whole Part 1 slice**

Run:

```bash
npm test -- src/types/__tests__/type-conformance.test.ts src/storylines/__tests__/repository.test.ts src/storylines/__tests__/workspaces.test.ts src/storylines/__tests__/substrate.test.ts src/runtime-sessions/__tests__/repository.test.ts src/runtime-sessions/__tests__/views.test.ts src/engine/__tests__/story-loader.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/authoring/persistence/__tests__/bridge.test.ts 'src/app/api/play/packages/[packageName]/runtime-session/route.test.ts' src/app/__tests__/play-page.test.tsx src/app/edit/__tests__/page.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run build validation**

Run: `npm run build`

Expected: successful production build with no TypeScript or Next.js route errors.

- [ ] **Step 3: Run simulation-toolset validation required by the touched boundaries**

Run:

```bash
npm run type-check:simulation
npm run test:simulation
```

Expected: PASS.

- [ ] **Step 4: Run the full repo test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Manually verify the two primary flows in the browser**

Check:
- `/edit?storyPackage=<test-package>` opens without materializing a legacy package on pure read
- first save in `/edit` creates `storyline-repository.json` plus `variants/<variantId>/...`
- `/play?storyPackage=<test-package>` also stays non-materializing on pure read before any mutating command runs
- `/play?storyPackage=<test-package>` restores the active storyline session after bootstrap
- switching via direct substrate primitive in tests changes the next `/edit` and `/play` load target

- [ ] **Step 6: Sync execution status back into the Phase 3 planning files**

Update:
- `docs/superpowers/phase-3/task_plan.md`
- `docs/superpowers/phase-3/progress.md`
- `docs/superpowers/phase-3/findings.md` only if the code forced a spec correction

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/phase-3/task_plan.md docs/superpowers/phase-3/progress.md docs/superpowers/phase-3/findings.md
git commit -m "docs: sync phase 3 part 1 execution status"
```
