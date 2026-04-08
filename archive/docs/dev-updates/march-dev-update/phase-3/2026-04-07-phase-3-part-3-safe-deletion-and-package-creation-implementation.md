# March Dev Update Phase 3 Part 3 Safe Deletion And Package Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement safe storyline deletion and local explicit-Phase-3 story package creation inside `故事包管理`, without breaking continuity truth, package invariants, or the existing LOGOS visual language.

**Architecture:** Keep all writes server-owned and deterministic. First extend the bounded management contracts so delete availability and package-creation payloads are explicit, then add one safe deletion substrate path and one staged package-scaffold service, then wire two thin API routes and integrate only the minimal new UI states into the existing management workspace. Package creation must validate both the authored YAML package and the explicit `Phase 3` repository state before promotion; deletion must remove visible storyline state while preserving package-scoped checkpoint truth.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, Node `fs/promises`, Zod, YAML, existing storyline substrate under `src/storylines/`, package loader under `src/engine/story-loader.ts`

**Archive note:** This plan preserves the original execution-time instructions. Some inline path examples still mention the then-active `docs/superpowers/...` locations that are now archived under `archive/docs/dev-updates/march-dev-update/`.

**UI References:**
- [`../phase-3/phase 3 part 3.png`](../phase-3/phase%203%20part%203.png)
- [`../phase-3/phase 3 part 3 新增story package视觉参考图.png`](../phase-3/phase%203%20part%203%20新增story%20package视觉参考图.png)
- [`../phase-3/整体视觉参考图 1.png`](../phase-3/整体视觉参考图%201.png)
- [`../phase-3/整体视觉参考图 2.png`](../phase-3/整体视觉参考图%202.png)

---

**Preflight:** Execute this plan in a dedicated git worktree created with `superpowers:using-git-worktrees` before touching code.

**Scope note:** Although `Part 3` contains two product actions, keep one implementation plan. Safe deletion and local package creation share the same `故事包管理` surface, the same bounded management contracts, the same route family, and the same final browser acceptance pass.

## File Map

### Shared management contracts and ordering truth

- Create: `src/storylines/order.ts`
- Modify: `src/types/storyline-management.ts`
- Modify: `src/storylines/workspace-view.ts`
- Modify: `src/types/index.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/storylines/__tests__/workspace-view.test.ts`

Responsibilities:
- freeze one shared rendered-order helper so delete replacement logic and workspace rendering cannot drift
- extend the bounded row view with delete availability / disabled-reason fields
- add request / response contracts for package creation
- add `delete_storyline` to the bounded storyline action schema

### Safe storyline deletion substrate and route

- Modify: `src/storylines/substrate.ts`
- Modify: `src/storylines/workspaces.ts`
- Modify: `src/app/api/authoring/packages/[packageName]/storylines/actions/route.ts`
- Test: `src/storylines/__tests__/substrate.test.ts`
- Test: `src/storylines/__tests__/workspaces.test.ts`
- Test: `src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts`

Responsibilities:
- add one deterministic delete mutation that preserves checkpoint truth
- remove the deleted storyline record and its variant workspace
- auto-promote a nearby remaining storyline when deleting the active line
- reject deletion of the last remaining usable storyline
- keep retained runtime session data invisible when it cannot be physically removed safely

### Cross-platform package naming and explicit `Phase 3` scaffold service

- Create: `src/story-packages/package-slug.ts`
- Create: `src/story-packages/scaffold.ts`
- Test: `src/story-packages/__tests__/package-slug.test.ts`
- Test: `src/story-packages/__tests__/scaffold.test.ts`

Responsibilities:
- derive a deterministic cross-platform-safe `packageName` slug from one display name
- reject duplicates case-insensitively and reject Windows reserved names
- create a staged explicit-`Phase 3` package with authored YAML, `storyline-repository.json`, `variants/variant_main/...`, and `runtime-sessions.json`
- validate the staged package through both the YAML loader and repository validators before promotion

### Package-creation API seam

- Create: `src/app/api/authoring/packages/route.ts`
- Test: `src/app/api/authoring/packages/route.test.ts`

Responsibilities:
- expose one server-owned `POST /api/authoring/packages` seam
- return the new `packageName`, `activeStorylineId`, and `createdAt`
- map invalid name / duplicate / write failure / scaffold validation failure to actionable 4xx/5xx responses

### Story package management UI integration

- Create: `src/app/edit/sections/StoryPackageCreationPanel.tsx`
- Create: `src/app/edit/sections/StorylineDeleteControl.tsx`
- Modify: `src/app/edit/sections/StoryPackageSelector.tsx`
- Modify: `src/app/edit/sections/StoryPackageManagementSection.tsx`
- Modify: `src/app/edit/sections/StorylineWorkspaceRow.tsx`
- Modify: `src/app/edit/sections/__tests__/story-package-management.fixtures.ts`
- Modify: `src/app/globals.css`
- Test: `src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

Responsibilities:
- add the dashed `新建故事包` tile below the ready package list
- keep the left selector name-only
- open a right-side inline creation state, not a full modal
- show a row-local delete confirmation state without inventing a second modal system
- keep the current LOGOS brutalist language, fonts, borders, and restrained density

### Final synchronization and verification

- Modify: `docs/superpowers/specs/2026-04-06-phase-3-master-design.md` only if implementation forces a real spec correction
- Modify: `docs/superpowers/phase-3/task_plan.md`
- Modify: `docs/superpowers/phase-3/progress.md`
- Modify: `docs/superpowers/phase-3/findings.md` only if implementation forces a real design change
- Modify: `task_plan.md`
- Modify: `progress.md`
- Modify: `findings.md` only if implementation changes a frozen conclusion

Responsibilities:
- sync execution status after code is verified
- keep root and `Phase 3` planning files aligned with what was actually delivered

## Task 1: Extend bounded management contracts and shared row ordering

**Files:**
- Create: `src/storylines/order.ts`
- Modify: `src/types/storyline-management.ts`
- Modify: `src/storylines/workspace-view.ts`
- Modify: `src/types/index.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/storylines/__tests__/workspace-view.test.ts`

- [ ] **Step 1: Write the failing contract and workspace-view tests**

```ts
it('adds delete availability to the bounded storyline row view', () => {
  expectTypeOf<StoryPackageManagementStorylineRowView>().toMatchTypeOf<{
    storylineId: string;
    displayName: string;
    canDelete: boolean;
    deleteDisabledReason: string | null;
  }>();
});

it('accepts delete_storyline and package-creation payload contracts', () => {
  expect(() =>
    StorylineActionSchema.parse({
      kind: 'delete_storyline',
      storylineId: 'storyline_main',
    }),
  ).not.toThrow();

  expect(() =>
    StoryPackageCreationRequestSchema.parse({
      displayName: '新故事包',
    }),
  ).not.toThrow();
});

it('marks the last remaining usable storyline as non-deletable in the workspace view', async () => {
  const view = await loadStoryPackageManagementWorkspaceView('__storyline-last-row__');

  expect(view.storylines).toHaveLength(1);
  expect(view.storylines[0]).toMatchObject({
    canDelete: false,
    deleteDisabledReason: '至少保留一条故事线',
  });
});
```

- [ ] **Step 2: Run the targeted tests to verify RED**

Run:

```bash
npm test -- src/types/__tests__/type-conformance.test.ts src/storylines/__tests__/workspace-view.test.ts
```

Expected:
- FAIL because `delete_storyline` and package-creation schemas do not exist yet
- FAIL because the row view does not expose delete availability yet

- [ ] **Step 3: Implement the minimal contract and ordering changes**

```ts
export interface StoryPackageManagementStorylineRowView {
  readonly storylineId: string;
  readonly displayName: string;
  readonly canDelete: boolean;
  readonly deleteDisabledReason: string | null;
}

export const StorylineDeleteActionSchema = z
  .object({
    kind: z.literal('delete_storyline'),
    storylineId: z.string(),
  })
  .strict();

export const StoryPackageCreationRequestSchema = z
  .object({
    displayName: z.string(),
  })
  .strict();

export function compareStorylineRowsForWorkspace(
  left: StoryPackageManagementStorylineRowView,
  right: StoryPackageManagementStorylineRowView,
): number {
  if (left.isActive !== right.isActive) {
    return left.isActive ? -1 : 1;
  }

  return left.displayName.localeCompare(right.displayName) || left.storylineId.localeCompare(right.storylineId);
}
```

Implementation notes:
- Put the row-order comparator in `src/storylines/order.ts` so `workspace-view.ts` and later delete replacement logic consume the same ordering truth.
- Keep delete availability computed inside the bounded read model; do not make the client re-derive “last remaining usable storyline” from raw arrays.
- Keep package-creation payload types in the existing management-contract file unless a clean split becomes obviously necessary while coding.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run:

```bash
npm test -- src/types/__tests__/type-conformance.test.ts src/storylines/__tests__/workspace-view.test.ts
```

Expected:
- PASS with the new schemas exported through `src/types/index.ts`
- PASS with delete availability present in the bounded row view

- [ ] **Step 5: Commit**

```bash
git add src/storylines/order.ts src/types/storyline-management.ts src/storylines/workspace-view.ts src/types/index.ts src/types/__tests__/type-conformance.test.ts src/storylines/__tests__/workspace-view.test.ts
git commit -m "feat: extend part 3 management contracts"
```

## Task 2: Implement safe storyline deletion in the substrate and action route

**Files:**
- Modify: `src/storylines/substrate.ts`
- Modify: `src/storylines/workspaces.ts`
- Modify: `src/app/api/authoring/packages/[packageName]/storylines/actions/route.ts`
- Test: `src/storylines/__tests__/substrate.test.ts`
- Test: `src/storylines/__tests__/workspaces.test.ts`
- Test: `src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts`

- [ ] **Step 1: Write the failing deletion tests**

```ts
it('deletes the active storyline and promotes the next visible remaining row', async () => {
  const result = await deleteStoryline({
    packageName: '__storyline-delete-test__',
    storylineId: 'storyline_main',
  });

  expect(result.repository.activeStorylineId).toBe('storyline_alt');
  expect(result.deletedStorylineId).toBe('storyline_main');
});

it('deletes the last visible active storyline and falls back to the previous remaining row', async () => {
  const result = await deleteStoryline({
    packageName: '__storyline-delete-test__',
    storylineId: 'storyline_branch',
  });

  expect(result.repository.activeStorylineId).toBe('storyline_alt');
  expect(result.deletedStorylineId).toBe('storyline_branch');
});

it('refuses to delete the last remaining usable storyline', async () => {
  await expect(
    deleteStoryline({
      packageName: '__storyline-delete-last__',
      storylineId: 'storyline_main',
    }),
  ).rejects.toThrow(/至少保留一条故事线|last remaining/i);
});

it('removes the deleted variant workspace but preserves retained runtime checkpoint truth', async () => {
  await deleteStoryline({
    packageName: '__storyline-delete-test__',
    storylineId: 'storyline_branch',
  });

  expect(await pathExists(resolveVariantWorkspaceRoot('__storyline-delete-test__', 'variant_branch'))).toBe(false);
  expect((await readRuntimeSessionsFile('__storyline-delete-test__'))?.sessionsById.sess_branch).toBeDefined();
});

it('maps delete_storyline validation failures to 400 in the storyline action route', async () => {
  const response = await POST(
    new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'delete_storyline',
        storylineId: 'storyline_main',
      }),
    }),
    { params: Promise.resolve({ packageName: 'sample-scene' }) },
  );

  expect(response.status).toBe(400);
});

it('maps missing delete targets to 404 in the storyline action route', async () => {
  const response = await POST(
    new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'delete_storyline',
        storylineId: 'storyline_missing',
      }),
    }),
    { params: Promise.resolve({ packageName: 'sample-scene' }) },
  );

  expect(response.status).toBe(404);
});
```

- [ ] **Step 2: Run the targeted tests to verify RED**

Run:

```bash
npm test -- src/storylines/__tests__/substrate.test.ts src/storylines/__tests__/workspaces.test.ts 'src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts'
```

Expected:
- FAIL because no delete substrate or route branch exists yet

- [ ] **Step 3: Implement the minimal safe-delete path**

```ts
export async function deleteStoryline(input: {
  packageName: string;
  storylineId: string;
}): Promise<{
  repository: StorylineRepositoryFile;
  deletedStorylineId: string;
  nextActiveStorylineId: string;
}> {
  return runWithSubstrateWriteQueue(input.packageName, async () => {
    const repository = await readStorylineRepositoryForWrite(input.packageName);
    const runtimeFile = await runtimeSessionsRepository.readFile(input.packageName);
    const orderedRows = await buildDeletableWorkspaceRows(input.packageName, repository, runtimeFile);
    const target = repository.storylinesById[input.storylineId];
    const replacement = chooseReplacementStoryline(orderedRows, input.storylineId);

    // update active storyline first if needed
    // remove storyline repository record
    // remove variant workspace
    // keep runtime session when deleting it would also destroy checkpoint truth
  });
}
```

Implementation notes:
- Reuse the shared row-order helper from Task 1 so the replacement active storyline matches the current rendered order.
- Keep delete semantics aligned with the approved spec:
  - checkpoint truth is package-scoped and must survive
  - variant workspace should be cleaned up
  - retained unbound runtime sessions must stay invisible to normal workspace resolution
- Cover both promotion branches in tests: next visible row first, then previous visible row when the deleted active row was already last in order.
- Add one focused helper in `src/storylines/workspaces.ts` for variant-workspace removal instead of inlining `rm(...)` logic inside `substrate.ts`.
- Extend `mapActionError()` so “last remaining storyline”, “does not exist”, and structural mismatch conditions remain 4xx instead of generic 500s.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run:

```bash
npm test -- src/storylines/__tests__/substrate.test.ts src/storylines/__tests__/workspaces.test.ts 'src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts'
```

Expected:
- PASS with deletion, replacement-active, and bounded route error mapping all green

- [ ] **Step 5: Commit**

```bash
git add src/storylines/substrate.ts src/storylines/workspaces.ts 'src/app/api/authoring/packages/[packageName]/storylines/actions/route.ts' src/storylines/__tests__/substrate.test.ts src/storylines/__tests__/workspaces.test.ts 'src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts'
git commit -m "feat: add safe storyline deletion"
```

## Task 3: Add cross-platform package naming and explicit `Phase 3` scaffold service

**Files:**
- Create: `src/story-packages/package-slug.ts`
- Create: `src/story-packages/scaffold.ts`
- Test: `src/story-packages/__tests__/package-slug.test.ts`
- Test: `src/story-packages/__tests__/scaffold.test.ts`

- [x] **Step 1: Write the failing naming and scaffold tests**

```ts
it('derives a deterministic lowercase slug and rejects Windows reserved names', () => {
  expect(buildStoryPackageSlug('Café del Mar')).toBe('cafe-del-mar');
  expect(buildStoryPackageSlug('雾间回廊')).toMatch(/^story-package-[a-f0-9]{8}$/);
  expect(buildStoryPackageSlug('雾间回廊')).toBe(buildStoryPackageSlug('雾间回廊'));
  expect(() => assertValidStoryPackageSlug('con')).toThrow(/reserved/i);
  expect(() => assertValidStoryPackageSlug('aux')).toThrow(/reserved/i);
});

it('rejects empty or whitespace-only display names before hash fallback is considered', () => {
  expect(() => buildStoryPackageSlug('')).toThrow(/display name/i);
  expect(() => buildStoryPackageSlug('   ')).toThrow(/display name/i);
});

it('creates an explicit Phase 3 package scaffold that validates through both loader and repositories', async () => {
  const result = await createStoryPackageScaffold({
    displayName: '新故事包',
  });

  expect(result.packageName).toMatch(/[a-z0-9-]+/);
  expect(await loadStoryPackage(result.packageName)).toMatchObject({
    sceneSpec: expect.objectContaining({ sceneName: '新故事包' }),
  });
  const repository = await readStorylineRepository(result.packageName);
  const runtimeFile = await readRuntimeSessionsFile(result.packageName);

  expect(repository).toMatchObject({
    activeStorylineId: 'storyline_main',
    storylinesById: {
      storyline_main: expect.objectContaining({
        storylineId: 'storyline_main',
        variantId: 'variant_main',
        activeSessionId: expect.any(String),
      }),
    },
    variantsById: {
      variant_main: expect.objectContaining({
        variantId: 'variant_main',
        workspaceRoot: 'variants/variant_main',
      }),
    },
  });
  expect(runtimeFile).toMatchObject({
    activeSessionId: repository.storylinesById.storyline_main.activeSessionId,
    sessionsById: {
      [repository.storylinesById.storyline_main.activeSessionId]: expect.objectContaining({
        lifecycle: 'awaiting_start',
        headCheckpointId: null,
        activeCheckpointId: null,
      }),
    },
  });
});

it('cleans up the staged directory if scaffold validation fails before promotion', async () => {
  await expect(
    createStoryPackageScaffold({
      displayName: 'broken package',
      testOnlyForceBrokenState: true,
    }),
  ).rejects.toThrow();

  expect(await findStagedPackageRoots('broken-package')).toEqual([]);
});
```

- [x] **Step 2: Run the targeted tests to verify RED**

Run:

```bash
npm test -- src/story-packages/__tests__/package-slug.test.ts src/story-packages/__tests__/scaffold.test.ts
```

Expected:
- FAIL because neither the slug helper nor scaffold service exists yet

- [x] **Step 3: Implement the minimal slug helper and scaffold service**

```ts
export function buildStoryPackageSlug(displayName: string): string {
  if (displayName.trim().length === 0) {
    throw new Error('Package display name is required.');
  }

  const normalized = displayName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized : `story-package-${hashDisplayName(displayName)}`;
}

export async function createStoryPackageScaffold(input: {
  displayName: string;
}): Promise<{
  packageName: string;
  activeStorylineId: 'storyline_main';
  createdAt: string;
}> {
  // validate display name and slug
  // write staged YAML + storyline-repository + variants/variant_main + runtime-sessions
  // validate loadStoryPackage + readStorylineRepository + runtimeSessionsRepository.readFile
  // promote into src/story-packages/<packageName>
}
```

Implementation notes:
- Keep everything story-agnostic. The scaffold content should be schema-valid and generic, not derived from `sample-scene`.
- Reuse the same slug helper in both server route and client preview so the user sees the exact server rule before confirmation.
- Do not add a transliteration dependency just for package slugs. Reuse the repo’s existing `normalize('NFKD')` ASCII-slug pattern and add one small local deterministic hash fallback when the normalized body would otherwise be empty.
- Include `control-modules.yaml` because the current editor authoring surface still reads and writes it, even though `story-package.schema.md` only documents the runtime-required subset.
- Create the initial runtime file with one explicit `awaiting_start` session bound to `storyline_main`; do not rely on later bootstrap repair.
- Use staged writes under the approved package root and only promote after every validation pass succeeds.

- [x] **Step 4: Run the targeted tests to verify GREEN**

Run:

```bash
npm test -- src/story-packages/__tests__/package-slug.test.ts src/story-packages/__tests__/scaffold.test.ts
```

Expected:
- PASS with cross-platform name validation, staged creation, and dual validation all green

- [x] **Step 5: Commit**

```bash
git add src/story-packages/package-slug.ts src/story-packages/scaffold.ts src/story-packages/__tests__/package-slug.test.ts src/story-packages/__tests__/scaffold.test.ts
git commit -m "feat: add phase 3 package scaffold service"
```

## Task 4: Expose package creation through one bounded API route

**Files:**
- Create: `src/app/api/authoring/packages/route.ts`
- Test: `src/app/api/authoring/packages/route.test.ts`

- [x] **Step 1: Write the failing package-creation route tests**

```ts
it('creates a package and returns the new package selection payload', async () => {
  const response = await POST(
    new Request('http://localhost/api/authoring/packages', {
      method: 'POST',
      body: JSON.stringify({ displayName: '新故事包' }),
    }),
  );

  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toMatchObject({
    packageName: expect.any(String),
    activeStorylineId: 'storyline_main',
    createdAt: expect.any(String),
  });
});

it('maps invalid display names to 400 responses', async () => {
  createStoryPackageScaffold.mockRejectedValueOnce(new Error('Package name is reserved.'));

  const response = await POST(
    new Request('http://localhost/api/authoring/packages', {
      method: 'POST',
      body: JSON.stringify({ displayName: 'CON' }),
    }),
  );

  expect(response.status).toBe(400);
});

it('maps duplicate package names to 409 responses', async () => {
  createStoryPackageScaffold.mockRejectedValueOnce(
    new Error('Package "new-story-package" already exists.'),
  );

  const response = await POST(
    new Request('http://localhost/api/authoring/packages', {
      method: 'POST',
      body: JSON.stringify({ displayName: '新故事包' }),
    }),
  );

  expect(response.status).toBe(409);
});

it('maps scaffold validation failures to a bounded 500 response', async () => {
  createStoryPackageScaffold.mockRejectedValueOnce(
    new Error('Scaffold validation failed: storyline repository consistency violation.'),
  );

  const response = await POST(
    new Request('http://localhost/api/authoring/packages', {
      method: 'POST',
      body: JSON.stringify({ displayName: '新故事包' }),
    }),
  );

  expect(response.status).toBe(500);
});

it('maps package root write failures to a bounded 500 response', async () => {
  createStoryPackageScaffold.mockRejectedValueOnce(
    new Error('Could not create package root under src/story-packages.'),
  );

  const response = await POST(
    new Request('http://localhost/api/authoring/packages', {
      method: 'POST',
      body: JSON.stringify({ displayName: '新故事包' }),
    }),
  );

  expect(response.status).toBe(500);
});
```

- [x] **Step 2: Run the targeted tests to verify RED**

Run:

```bash
npm test -- 'src/app/api/authoring/packages/route.test.ts'
```

Expected:
- FAIL because the route does not exist yet

- [x] **Step 3: Implement the minimal route**

```ts
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = StoryPackageCreationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid package creation payload.' }, { status: 400 });
  }

  const created = await createStoryPackageScaffold(parsed.data);

  return NextResponse.json(created, { status: 201 });
}
```

Implementation notes:
- Keep the route thin. All filesystem and validation work stays in `src/story-packages/scaffold.ts`.
- Distinguish invalid payload / invalid slug from true write failures.
- Prefer `409` for duplicate package names instead of collapsing collisions into a generic `400`.
- Treat scaffold validation failures and package-root write failures as bounded `500`s with different user-facing messages.
- Do not reuse the storyline action route for package creation. Package creation is package-scoped, not storyline-scoped.

- [x] **Step 4: Run the targeted tests to verify GREEN**

Run:

```bash
npm test -- 'src/app/api/authoring/packages/route.test.ts'
```

Expected:
- PASS with `201` success and bounded error mapping

- [x] **Step 5: Commit**

```bash
git add 'src/app/api/authoring/packages/route.ts' 'src/app/api/authoring/packages/route.test.ts'
git commit -m "feat: add story package creation route"
```

## Task 5: Wire deletion and package creation into `故事包管理`

**Files:**
- Create: `src/app/edit/sections/StoryPackageCreationPanel.tsx`
- Create: `src/app/edit/sections/StorylineDeleteControl.tsx`
- Modify: `src/app/edit/sections/StoryPackageSelector.tsx`
- Modify: `src/app/edit/sections/StoryPackageManagementSection.tsx`
- Modify: `src/app/edit/sections/StorylineWorkspaceRow.tsx`
- Modify: `src/app/edit/sections/__tests__/story-package-management.fixtures.ts`
- Modify: `src/app/globals.css`
- Test: `src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

- [x] **Step 1: Write the failing UI tests**

```tsx
it('renders a dashed 新建故事包 tile below the ready package list', () => {
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  expect(screen.getByRole('button', { name: '新建故事包' })).toBeInTheDocument();
});

it('opens an inline package-creation state on the right without leaving 故事包管理', async () => {
  const user = userEvent.setup();
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.click(screen.getByRole('button', { name: '新建故事包' }));

  expect(screen.getByRole('heading', { name: '新建故事包' })).toBeInTheDocument();
  expect(screen.getByLabelText('故事包名称')).toBeInTheDocument();
  expect(screen.getByText(/slug/i)).toBeInTheDocument();
});

it('submits package creation and replaces into the new management route on success', async () => {
  const user = userEvent.setup();
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({
      packageName: 'new-story-package',
      activeStorylineId: 'storyline_main',
      createdAt: '2026-04-07T00:00:00.000Z',
    }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    }),
  );

  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.click(screen.getByRole('button', { name: '新建故事包' }));
  await user.type(screen.getByLabelText('故事包名称'), '新故事包');
  await user.click(screen.getByRole('button', { name: '确认创建' }));

  expect(mockReplace).toHaveBeenCalledWith(
    '/edit?storyPackage=new-story-package&section=story-package-management',
  );
});

it('requires secondary confirmation before deleting a storyline', async () => {
  const user = userEvent.setup();
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.click(screen.getByRole('button', { name: '删除 Branch Line' }));
  expect(screen.getByRole('button', { name: '确认删除' })).toBeVisible();
  expect(screen.getByRole('button', { name: '取消删除' })).toBeVisible();
});

it('shows bounded inline feedback when delete fails after confirmation', async () => {
  const user = userEvent.setup();
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ error: '目标故事线已不存在。' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    }),
  );

  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.click(screen.getByRole('button', { name: '删除 Branch Line' }));
  await user.click(screen.getByRole('button', { name: '确认删除' }));

  expect(await screen.findByText('目标故事线已不存在。')).toBeInTheDocument();
});

it('disables delete for the last remaining usable storyline', () => {
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewSingleLineFixture} />);

  expect(screen.getByRole('button', { name: '删除 Main Line' })).toBeDisabled();
  expect(screen.getByText('至少保留一条故事线')).toBeInTheDocument();
});
```

- [x] **Step 2: Run the targeted UI tests to verify RED**

Run:

```bash
npm test -- src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
```

Expected:
- FAIL because the create tile, creation state, and delete controls do not exist yet

- [x] **Step 3: Implement the minimal UI changes**

```tsx
export function StoryPackageCreationPanel({
  draftDisplayName,
  slugPreview,
  feedback,
  onChangeDraftDisplayName,
  onConfirm,
  onCancel,
}: StoryPackageCreationPanelProps) {
  return (
    <section className="story-package-creation-panel panel" aria-label="Story package creation">
      <h3>新建故事包</h3>
      <label>
        <span>故事包名称</span>
        <input value={draftDisplayName} onChange={(event) => onChangeDraftDisplayName(event.target.value)} />
      </label>
      <p>{slugPreview}</p>
      {feedback ? <p>{feedback}</p> : null}
      <button type="button" onClick={onConfirm}>确认创建</button>
      <button type="button" onClick={onCancel}>取消</button>
    </section>
  );
}
```

Implementation notes:
- Keep the selector name-only. The new tile should be the only new left-rail affordance.
- Extract `StorylineDeleteControl.tsx` instead of making `StorylineWorkspaceRow.tsx` even larger than it already is.
- Keep delete confirmation local and lightweight; do not introduce a new modal system.
- Delete failures must stay row-local and actionable; do not collapse them into generic toast-less refresh failures.
- Reuse the shared slug helper for the inline preview so the client matches the server exactly.
- Package creation success should use `router.replace('/edit?storyPackage=<new>&section=story-package-management')`, not `router.refresh()`, because the selected package itself changes.
- Delete success should continue using `router.refresh()` because the current page stays in the same package workspace.
- Preserve the existing LOGOS brutalist language in `src/app/globals.css`: dashed add tile, hard border, square corners, black shadow, mono-led typography, no rounded SaaS card treatment.

- [x] **Step 4: Run the targeted UI tests to verify GREEN**

Run:

```bash
npm test -- src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
```

Expected:
- PASS with dashed add tile, inline creation state, delete confirmation, and bounded router behavior all green

- [x] **Step 5: Commit**

```bash
git add src/app/edit/sections/StoryPackageCreationPanel.tsx src/app/edit/sections/StorylineDeleteControl.tsx src/app/edit/sections/StoryPackageSelector.tsx src/app/edit/sections/StoryPackageManagementSection.tsx src/app/edit/sections/StorylineWorkspaceRow.tsx src/app/edit/sections/__tests__/story-package-management.fixtures.ts src/app/globals.css src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
git commit -m "feat: add part 3 story package management UI"
```

## Task 6: Final verification and planning sync

**Files:**
- Modify: `docs/superpowers/phase-3/task_plan.md`
- Modify: `docs/superpowers/phase-3/progress.md`
- Modify: `docs/superpowers/phase-3/findings.md` only if implementation forces a real design change
- Modify: `task_plan.md`
- Modify: `progress.md`
- Modify: `findings.md` only if implementation changes a frozen conclusion

- [x] **Step 1: Run the full targeted verification suite**

Run:

```bash
npm test -- src/storylines/__tests__/workspace-view.test.ts src/storylines/__tests__/substrate.test.ts src/storylines/__tests__/workspaces.test.ts src/story-packages/__tests__/package-slug.test.ts src/story-packages/__tests__/scaffold.test.ts 'src/app/api/authoring/packages/route.test.ts' 'src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts' src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
```

Expected:
- PASS for all `Part 3` targeted tests

- [x] **Step 2: Run required repo-wide verification**

Run:

```bash
npm run type-check:simulation
npm run test:simulation
npm run build
npm test
```

Expected:
- all commands PASS
- no new warnings beyond known existing repo warnings

- [x] **Step 3: Perform browser verification against the real workspace**

Run the local app, then verify these exact flows in the browser:

1. Open:

```text
/edit?storyPackage=sample-scene&section=story-package-management
```

2. Confirm the left rail shows:
   - ready package names only
   - one dashed `新建故事包` tile below them
3. Click `新建故事包` and confirm:
   - the right side opens an inline create state
   - the slug preview updates as the name changes
   - invalid names show bounded inline feedback
4. Create one real package and confirm:
   - selector refreshes
   - the new package becomes active
   - the URL lands on `?storyPackage=<new>&section=story-package-management`
   - the new package folder exists under `src/story-packages/<new>/`
   - required YAML, `storyline-repository.json`, `variants/variant_main/...`, and `runtime-sessions.json` all exist
5. Delete one non-last storyline and confirm:
   - delete requires secondary confirmation
   - the row disappears after success
   - deleting the active line promotes a nearby remaining line
6. Confirm the last remaining storyline cannot be deleted.

- [x] **Step 4: Sync planning files with what actually shipped**

Implementation notes:
- Update the `Phase 3` and root planning files only after all verification passes.
- If implementation forced any real design correction, write it once in `findings.md` rather than silently drifting the spec.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/phase-3/task_plan.md docs/superpowers/phase-3/progress.md task_plan.md progress.md
git commit -m "docs: sync phase 3 part 3 delivery"
```
