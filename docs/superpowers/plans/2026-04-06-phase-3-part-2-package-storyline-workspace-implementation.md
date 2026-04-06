# Phase 3 Part 2 Package & Storyline Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `故事包管理` workspace so `/edit` lands on a package-first, storyline-first management page that can render bounded package/storyline state, rename storyline display names, switch storylines, create storylines from a source row, and branch from beat dots through the existing Part 1 substrate.

**Architecture:** Keep Part 1 as the only persistence substrate, then add one bounded server read model plus one server-owned workspace action seam for the UI. Extend the current editor shell in place: add a new section id, keep the existing brutalist navigation frame, pass the management view from the server page into `EditWorkbench`, and isolate the new management UI in focused section components that talk to the action route and then refresh or navigate.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, Node `fs/promises`, existing storyline substrate under `src/storylines/`, global CSS in `src/app/globals.css`

---

**Preflight:** Execute this plan in a dedicated git worktree created with `superpowers:using-git-worktrees` before touching code.

## File Map

### Workspace contracts and bounded server read model

- Create: `src/types/storyline-management.ts`
- Create: `src/storylines/workspace-view.ts`
- Modify: `src/types/index.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/storylines/__tests__/workspace-view.test.ts`

### Metadata-only mutation seam and workspace action route

- Modify: `src/storylines/substrate.ts`
- Create: `src/app/api/authoring/packages/[packageName]/storylines/actions/route.ts`
- Test: `src/storylines/__tests__/substrate.test.ts`
- Test: `src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts`

### Editor routing and shell integration

- Modify: `src/authoring/contracts.ts`
- Modify: `src/authoring/persistence/bridge.ts`
- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/authoring/sections/package-diagnostics.ts`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/edit/page.tsx`
- Modify: `src/app/components/TitleLandingSurface.tsx`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/shared/SectionTabs.tsx`
- Test: `src/app/__tests__/layout.test.tsx`
- Test: `src/app/__tests__/page.test.tsx`
- Test: `src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.test.ts`
- Test: `src/app/components/__tests__/TitleLandingSurface.test.tsx`
- Test: `src/authoring/persistence/__tests__/bridge.test.ts`
- Test: `src/authoring/persistence/__tests__/package-state.test.ts`
- Test: `src/authoring/sections/__tests__/package-diagnostics.test.ts`
- Test: `src/app/edit/__tests__/page.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

### Story-package-management UI, motion, and row actions

- Create: `src/app/edit/sections/StoryPackageManagementSection.tsx`
- Create: `src/app/edit/sections/StoryPackageSelector.tsx`
- Create: `src/app/edit/sections/StorylineWorkspaceRow.tsx`
- Create: `src/app/edit/sections/__tests__/story-package-management.fixtures.ts`
- Modify: `src/app/globals.css`
- Test: `src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

### Planning sync and final verification

- Modify: `docs/superpowers/phase-3/task_plan.md`
- Modify: `docs/superpowers/phase-3/progress.md`
- Modify: `docs/superpowers/phase-3/findings.md` only if implementation forces a real design change

## Task 1: Add the workspace contracts and bounded read model

**Files:**
- Create: `src/types/storyline-management.ts`
- Create: `src/storylines/workspace-view.ts`
- Modify: `src/types/index.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/storylines/__tests__/workspace-view.test.ts`

- [ ] **Step 1: Write the failing type and read-model tests**

```ts
it('defines a bounded workspace view without exposing raw repository maps', () => {
  expectTypeOf<StoryPackageManagementWorkspaceView>().toMatchTypeOf<{
    packages: readonly StoryPackageManagementPackageItem[];
    packageName: string;
    activeStorylineId: string;
    storylines: readonly StoryPackageManagementStorylineRowView[];
  }>();
});

it('builds checkpoint rails only from checkpoints reachable by each storyline-bound session', async () => {
  const view = await loadStoryPackageManagementWorkspaceView('__storyline-workspace-test__');

  expect(view.storylines.find((row) => row.storylineId === 'storyline_main')?.checkpointRail).toEqual([
    expect.objectContaining({ checkpointId: 'chk_01', acceptedBeatOrdinal: 1 }),
    expect.objectContaining({ checkpointId: 'chk_02', acceptedBeatOrdinal: 2, isHead: true }),
  ]);
});

it('fails loudly when a storyline row cannot resolve its bound session instead of guessing around drift', async () => {
  await expect(
    loadStoryPackageManagementWorkspaceView('__storyline-workspace-broken__'),
  ).rejects.toThrow(/activeSessionId/i);
});

it('returns a single implicit storyline row for legacy packages without materializing storyline files', async () => {
  const view = await loadStoryPackageManagementWorkspaceView('__storyline-workspace-legacy__');

  expect(view.storylines).toHaveLength(1);
  expect(view.storylines[0]).toEqual(
    expect.objectContaining({
      storylineId: 'storyline_main',
      isActive: true,
    }),
  );
  expect(
    existsSync(
      path.resolve(process.cwd(), 'src/story-packages', '__storyline-workspace-legacy__', 'storyline-repository.json'),
    ),
  ).toBe(false);
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/storylines/__tests__/workspace-view.test.ts`

Expected: FAIL because the management view contracts and loader do not exist yet.

- [ ] **Step 3: Implement the minimal contracts and server read model**

```ts
export interface StoryPackageManagementCheckpointNode {
  readonly checkpointId: string;
  readonly acceptedBeatOrdinal: number;
  readonly phaseIndex: number;
  readonly beatIndex: number;
  readonly isHead: boolean;
  readonly isBranchSource: boolean;
}

export interface StoryPackageManagementStorylineRowView {
  readonly storylineId: string;
  readonly displayName: string;
  readonly status: string;
  readonly isActive: boolean;
  readonly sourceCheckpointId: string | null;
  readonly headCheckpointId: string | null;
  readonly headSummary: string | null;
  readonly canCreateFromSource: boolean;
  readonly canContinue: boolean;
  readonly checkpointRail: readonly StoryPackageManagementCheckpointNode[];
}

export async function loadStoryPackageManagementWorkspaceView(
  packageName: string,
): Promise<StoryPackageManagementWorkspaceView> {
  const packages = await listStoryPackageCatalog();
  const context = await resolveActiveStorylineContext(packageName, { forWrite: false });
  return context.repository
    ? buildWorkspaceViewFromRepository(packages, packageName, context.repository, context.runtimeFile)
    : buildImplicitLegacyWorkspaceView(packages, context);
}
```

Implementation notes:
- Keep the bounded query in `src/storylines/workspace-view.ts`; do not make `EditWorkbench` or the page layer parse raw `storyline-repository.json` or `runtime-sessions.json`.
- Reuse `listStoryPackageCatalog()` for left-column package metadata instead of re-scanning package roots in a second place.
- Treat Part 1 structural mismatch rules as hard failures here too. Do not invent “best effort” rows.
- Derive `headSummary` from the bound session checkpoint transcript, but keep it bounded and presentation-ready.
- Respect Part 1 legacy read rules. When `storyline-repository.json` is absent, synthesize one implicit default row from `resolveActiveStorylineContext(..., { forWrite: false })` and do not materialize any new files on read.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/storylines/__tests__/workspace-view.test.ts`

Expected: PASS with the new contracts exported through `src/types/index.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/types/storyline-management.ts src/storylines/workspace-view.ts src/types/index.ts src/types/__tests__/type-conformance.test.ts src/storylines/__tests__/workspace-view.test.ts
git commit -m "feat: add storyline workspace view"
```

## Task 2: Add the metadata-only rename seam and one bounded workspace action route

**Files:**
- Modify: `src/storylines/substrate.ts`
- Create: `src/app/api/authoring/packages/[packageName]/storylines/actions/route.ts`
- Test: `src/storylines/__tests__/substrate.test.ts`
- Test: `src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts`

- [ ] **Step 1: Write the failing substrate and route tests**

```ts
it('updates only storyline.name and updatedAt for display-name edits', async () => {
  const result = await updateStorylineDisplayName({
    packageName: '__storyline-actions-test__',
    storylineId: 'storyline_main',
    nextDisplayName: '  Side Route  ',
  });

  expect(result.storyline.name).toBe('Side Route');
  expect(result.storyline.variantId).toBe('variant_main');
  expect(result.storyline.activeSessionId).toBe('sess_main');
});

it('treats a normalized no-op rename as success without rewriting runtime mirrors', async () => {
  const before = await readRuntimeSessionsFile('__storyline-actions-test__');

  await updateStorylineDisplayName({
    packageName: '__storyline-actions-test__',
    storylineId: 'storyline_main',
    nextDisplayName: 'Main Line',
  });

  expect(await readRuntimeSessionsFile('__storyline-actions-test__')).toEqual(before);
});

it('dispatches branch_from_checkpoint through the action route and generates the default storyline name server-side', async () => {
  const response = await POST(
    new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'branch_from_checkpoint',
        sourceStorylineId: 'storyline_main',
        checkpointId: 'chk_02',
      }),
    }),
    { params: Promise.resolve({ packageName: 'sample-scene' }) },
  );

  expect(branchStorylineFromCheckpoint).toHaveBeenCalledWith(
    expect.objectContaining({
      packageName: 'sample-scene',
      sourceStorylineId: 'storyline_main',
      checkpointId: 'chk_02',
      name: expect.stringMatching(/Beat 2|故事线/i),
    }),
  );
  expect(switchActiveStoryline).toHaveBeenCalledWith('sample-scene', 'storyline_new');
  expect(response.status).toBe(200);
});

it('dispatches create_from_source through the action route and switches to the created storyline', async () => {
  const response = await POST(
    new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'create_from_source',
        sourceStorylineId: 'storyline_main',
      }),
    }),
    { params: Promise.resolve({ packageName: 'sample-scene' }) },
  );

  expect(createStorylineFromSource).toHaveBeenCalledWith(
    expect.objectContaining({
      packageName: 'sample-scene',
      sourceStorylineId: 'storyline_main',
      name: expect.stringMatching(/故事线/i),
    }),
  );
  expect(switchActiveStoryline).toHaveBeenCalledWith('sample-scene', 'storyline_created');
  expect(response.status).toBe(200);
});

it('dispatches switch_active_storyline through the action route', async () => {
  const response = await POST(
    new Request('http://localhost/api/authoring/packages/sample-scene/storylines/actions', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'switch_active_storyline',
        storylineId: 'storyline_alt',
      }),
    }),
    { params: Promise.resolve({ packageName: 'sample-scene' }) },
  );

  expect(switchActiveStoryline).toHaveBeenCalledWith('sample-scene', 'storyline_alt');
  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- src/storylines/__tests__/substrate.test.ts 'src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts'`

Expected: FAIL because the rename seam and action route do not exist yet.

- [ ] **Step 3: Implement the minimal mutation seam and action route**

```ts
export async function updateStorylineDisplayName(input: {
  readonly packageName: string;
  readonly storylineId: string;
  readonly nextDisplayName: string;
}): Promise<StorylineMutationResult> {
  return runWithSubstrateWriteQueue(input.packageName, async () => {
    const context = await resolveActiveStorylineContextInternal(input.packageName, { forWrite: true });
    assertExplicitContext(context);
    const storyline = resolveStorylineForMutationOrThrow(context.repository, input.storylineId);
    const normalizedName = input.nextDisplayName.trim();
    if (normalizedName.length === 0) {
      throw new Error('Storyline display name cannot be empty.');
    }
    if (normalizedName === storyline.name.trim()) {
      return buildMutationResultFromContext(context, storyline);
    }
    const updatedStoryline = cloneStoryline(storyline, {
      name: normalizedName,
      updatedAt: new Date().toISOString(),
    });
    // write updated repository only
  });
}
```

Implementation notes:
- Keep all workspace mutations behind one bounded route such as `POST /api/authoring/packages/[packageName]/storylines/actions`.
- Validate the request body with a discriminated union schema from `src/types/storyline-management.ts`.
- Support exactly the Part 2 actions: `switch_active_storyline`, `create_from_source`, `branch_from_checkpoint`, and `rename_display_name`.
- Generate default storyline names in the route/service layer, not in the client.
- Route responses should stay bounded: return only the information the client needs to refresh or navigate, not raw repository files.
- Freeze the composite flows inside the route:
  - `create_from_source` must call `createStorylineFromSource`, then `switchActiveStoryline`, then return the new active storyline id
  - `branch_from_checkpoint` must call `branchStorylineFromCheckpoint`, then `switchActiveStoryline`, then return the new active storyline id
- Keep `rename_display_name` metadata-only. It must not trigger any runtime-session mirror write.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run: `npm test -- src/storylines/__tests__/substrate.test.ts 'src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts'`

Expected: PASS with rename semantics frozen and the action route delegating to Part 1 primitives.

- [ ] **Step 5: Commit**

```bash
git add src/storylines/substrate.ts src/app/api/authoring/packages/[packageName]/storylines/actions/route.ts src/storylines/__tests__/substrate.test.ts src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts
git commit -m "feat: add storyline workspace actions"
```

## Task 3: Wire the new editor section, default routing, and server page loading

**Files:**
- Modify: `src/authoring/contracts.ts`
- Modify: `src/authoring/persistence/bridge.ts`
- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/authoring/sections/package-diagnostics.ts`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/edit/page.tsx`
- Modify: `src/app/components/TitleLandingSurface.tsx`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/shared/SectionTabs.tsx`
- Test: `src/app/__tests__/layout.test.tsx`
- Test: `src/app/__tests__/page.test.tsx`
- Test: `src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.test.ts`
- Test: `src/app/components/__tests__/TitleLandingSurface.test.tsx`
- Test: `src/authoring/persistence/__tests__/bridge.test.ts`
- Test: `src/authoring/persistence/__tests__/package-state.test.ts`
- Test: `src/authoring/sections/__tests__/package-diagnostics.test.ts`
- Test: `src/app/edit/__tests__/page.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

- [ ] **Step 1: Write the failing routing and shell tests**

```ts
it('defaults /edit to story-package-management when section is omitted', async () => {
  const { default: EditPage } = await import('@/app/edit/page');

  render(await EditPage({ searchParams: { storyPackage: testPackageName } }));

  const workbenchProps = loadEditWorkbenchProps.mock.calls[0]?.[0];
  expect(workbenchProps.activeSection).toBe('story-package-management');
});

it('updates the global Narrative Editor entry link to land on 故事包管理', () => {
  render(
    <AppShell>
      <div>Workbench Child</div>
    </AppShell>,
  );
  expect(screen.getByRole('link', { name: 'Narrative Editor' })).toHaveAttribute(
    'href',
    '/edit?storyPackage=sample-scene&section=story-package-management',
  );
});

it('updates the title landing Narrative Editor entry link to land on 故事包管理', () => {
  render(<TitleLandingSurface packageName="sample-scene" />);
  expect(screen.getByRole('link', { name: 'Narrative Editor' })).toHaveAttribute(
    'href',
    '/edit?storyPackage=sample-scene&section=story-package-management',
  );
});

it('keeps the root page Narrative Editor CTA aligned with 故事包管理', async () => {
  const { default: RootPage } = await import('@/app/page');

  render(await RootPage());
  expect(screen.getByRole('link', { name: 'Narrative Editor' })).toHaveAttribute(
    'href',
    '/edit?storyPackage=sample-scene&section=story-package-management',
  );
});

it('keeps save-capable sections limited to worldbase, scene-phase, and control-modules', async () => {
  const response = await PATCH(
    new Request('http://localhost/api/authoring/packages/sample-scene/sections/story-package-management', {
      method: 'PATCH',
      body: JSON.stringify({
        requestId: 'story-package-management-save',
        source: 'page',
        payload: {},
      }),
    }),
    { params: Promise.resolve({ packageName: 'sample-scene', sectionId: 'story-package-management' }) },
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    kind: 'save_blocked',
    blockingIssues: expect.arrayContaining([expect.stringMatching(/不支持的页面|保存/i)]),
  });
});

it('keeps diagnostics health views scoped to the three writable authoring pages', () => {
  const diagnostics = buildPackageDiagnostics({
    packageName: 'sample-scene',
    source: 'latest-saved',
    storyPackage: storyPackageFixture,
    recentSaveResults: [],
  });

  expect(diagnostics.sectionHealthViews.map((view) => view.sectionId)).toEqual([
    'worldbase-cast',
    'scene-phase-authoring',
    'control-modules',
  ]);
});

it('renders the 故事包管理 tab before 世界 while keeping 控制台 reachable', () => {
  const managementViewStub = {
    packages: [],
    packageName: 'sample-scene',
    activeStorylineId: 'storyline_main',
    storylines: [],
  } as StoryPackageManagementWorkspaceView;

  render(
    <EditWorkbench
      packageName="sample-scene"
      activeSection="story-package-management"
      activeSurface="world"
      initialState={{ source: 'latest-saved', state: storyPackageFixture }}
      storyPackageManagementView={managementViewStub}
    />,
  );

  expect(screen.getAllByRole('link', { name: /故事包管理|世界|角色|场景与阶段|控制模块|控制台/ })).toHaveLength(6);
  expect(screen.getByRole('link', { name: '故事包管理' })).toHaveAttribute(
    'href',
    '/edit?storyPackage=sample-scene&section=story-package-management',
  );
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- src/app/__tests__/layout.test.tsx src/app/__tests__/page.test.tsx 'src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.test.ts' src/app/components/__tests__/TitleLandingSurface.test.tsx src/authoring/persistence/__tests__/bridge.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/authoring/sections/__tests__/package-diagnostics.test.ts src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: FAIL because the new section id, default route, and workbench prop surface are missing.

- [ ] **Step 3: Implement the minimal section and page wiring**

```ts
export const SECTION_IDS = [
  'worldbase-cast',
  'scene-phase-authoring',
  'control-modules',
] as const;
export type SaveSectionId = (typeof SECTION_IDS)[number];

export const EDITOR_SECTION_IDS = [
  'story-package-management',
  ...SECTION_IDS,
  'package-wiring-validation',
] as const;
export type EditorSectionId = (typeof EDITOR_SECTION_IDS)[number];

const activeSection = requestedSection ?? 'story-package-management';
const storyPackageManagementView =
  activeSection === 'story-package-management'
    ? await loadStoryPackageManagementWorkspaceView(selectedPackageName)
    : undefined;
```

Implementation notes:
- Keep `SECTION_IDS` as the save-capable authoring sections consumed by bridge and authoring-state logic. Introduce a separate editor-navigation contract for visible tabs instead of changing deterministic write scope by array order.
- Name the type split explicitly in `src/authoring/contracts.ts`, for example:
  - `SaveSectionId` for bridge, save requests, authoring-state bookkeeping, and deterministic write validation
  - `EditorSectionId` for `/edit` query parsing, `EditWorkbench`, `SectionTabs`, and diagnostics/navigation surfaces
- Update every consumer that currently assumes `SECTION_IDS` means “all visible editor tabs”, including `page.tsx`, `EditWorkbench.tsx`, `SectionTabs.tsx`, `package-state.ts`, `bridge.ts`, and `package-diagnostics.ts`.
- Keep `loadAuthoringState()` unchanged as the authored-state loader; do not force the new workspace query into authoring persistence if page-level composition is enough.
- In `EditWorkbench.test.tsx`, mock `StoryPackageManagementSection` just like the existing scene-phase mock so Task 3 can verify shell wiring without depending on the real management UI or router mocks. Save the real workspace fixtures for Task 4.
- Pass the new workspace view into `EditWorkbench` as a separate prop instead of overloading existing `runtimeContinuityView`.
- Preserve the current `worldbase-cast` surface rules. `story-package-management` has no `surface` sub-mode.
- Keep `控制台` reachable; only change default landing and tab order.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run: `npm test -- src/app/__tests__/layout.test.tsx src/app/__tests__/page.test.tsx 'src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.test.ts' src/app/components/__tests__/TitleLandingSurface.test.tsx src/authoring/persistence/__tests__/bridge.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/authoring/sections/__tests__/package-diagnostics.test.ts src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: PASS with the new default section and six-tab shell order.

- [ ] **Step 5: Commit**

```bash
git add src/authoring/contracts.ts src/authoring/persistence/bridge.ts src/authoring/persistence/package-state.ts src/authoring/sections/package-diagnostics.ts src/app/AppShell.tsx src/app/page.tsx src/app/edit/page.tsx src/app/components/TitleLandingSurface.tsx src/app/edit/EditWorkbench.tsx src/app/edit/shared/SectionTabs.tsx src/app/__tests__/layout.test.tsx src/app/__tests__/page.test.tsx src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.test.ts src/app/components/__tests__/TitleLandingSurface.test.tsx src/authoring/persistence/__tests__/bridge.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/authoring/sections/__tests__/package-diagnostics.test.ts src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
git commit -m "feat: wire story package management entry"
```

## Task 4: Build the story-package-management section UI and brutalist layout

**Files:**
- Create: `src/app/edit/sections/StoryPackageManagementSection.tsx`
- Create: `src/app/edit/sections/StoryPackageSelector.tsx`
- Create: `src/app/edit/sections/StorylineWorkspaceRow.tsx`
- Create: `src/app/edit/sections/__tests__/story-package-management.fixtures.ts`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/globals.css`
- Test: `src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

- [ ] **Step 1: Write the failing UI structure tests**

```ts
it('renders a two-column package selector plus storyline workspace layout', () => {
  render(
    <StoryPackageManagementSection
      packageName="sample-scene"
      view={workspaceViewFixture}
    />,
  );

  expect(screen.getByLabelText('Story package selector')).toBeInTheDocument();
  expect(screen.getByLabelText('Storyline workspace')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'sample-scene' })).toHaveAttribute('aria-current', 'page');
});

it('renders the package headline plus storyline status, provenance, and head summary', () => {
  render(
    <StoryPackageManagementSection
      packageName="sample-scene"
      view={workspaceViewFixture}
    />,
  );

  expect(screen.getByRole('heading', { name: 'sample-scene' })).toBeInTheDocument();
  expect(screen.getByText('active')).toBeInTheDocument();
  expect(screen.getByText(/来源|从 Beat 2 分出/i)).toBeInTheDocument();
  expect(screen.getByText(/当前头部|Beat 3/i)).toBeInTheDocument();
});

it('renders package switching as bounded navigation instead of client-side repository parsing', () => {
  render(
    <StoryPackageManagementSection
      packageName="sample-scene"
      view={workspaceViewFixture}
    />,
  );

  expect(screen.getByRole('link', { name: 'alt-scene' })).toHaveAttribute(
    'href',
    '/edit?storyPackage=alt-scene&section=story-package-management',
  );
});

it('keeps the existing brutalist editor shell and mounts the management section inside it', () => {
  render(
    <EditWorkbench
      packageName="sample-scene"
      activeSection="story-package-management"
      activeSurface="world"
      initialState={{ source: 'latest-saved', state: storyPackageFixture }}
      storyPackageManagementView={workspaceViewFixture}
    />,
  );

  expect(screen.getByRole('heading', { name: 'LOGOS Narrative Editor' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '故事包管理' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: FAIL because the management section components and shell integration do not exist yet.

- [ ] **Step 3: Implement the minimal section components and layout**

```tsx
export function StoryPackageManagementSection(props: {
  readonly packageName: string;
  readonly view: StoryPackageManagementWorkspaceView;
}) {
  return (
    <section className="panel story-package-management" aria-label="Storyline workspace">
      <div className="story-package-management__grid">
        <StoryPackageSelector packageName={props.packageName} packages={props.view.packages} />
        <div className="story-package-management__workspace">
          {props.view.storylines.map((row) => (
            <StorylineWorkspaceRow key={row.storylineId} packageName={props.packageName} row={row} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

Implementation notes:
- Split left selector and storyline row into separate files. Do not grow `EditWorkbench.tsx` into the management page itself.
- Add a dedicated test-support file such as `src/app/edit/sections/__tests__/story-package-management.fixtures.ts` for `workspaceViewFixture` and `workspaceViewWithoutHeadFixture`, and keep `mockPush` / `mockRefresh` local to `StoryPackageManagementSection.test.tsx` via `next/navigation` mocks.
- Use plain CSS transitions in `src/app/globals.css`; do not add a new animation library.
- Reuse the existing font stack and panel language from `src/app/globals.css`. No rounded corners, no new font families, no soft shadows.
- Keep package selection link-based or router-based so changing packages updates the URL and benefits from the existing server page reload path.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run: `npm test -- src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: PASS with the two-column structure rendered inside the existing shell.

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/sections/StoryPackageManagementSection.tsx src/app/edit/sections/StoryPackageSelector.tsx src/app/edit/sections/StorylineWorkspaceRow.tsx src/app/edit/sections/__tests__/story-package-management.fixtures.ts src/app/edit/EditWorkbench.tsx src/app/globals.css src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
git commit -m "feat: add story package management workspace"
```

## Task 5: Add row actions, beat-dot confirm motion, docs sync, and final verification

**Files:**
- Modify: `src/app/edit/sections/StoryPackageManagementSection.tsx`
- Modify: `src/app/edit/sections/StorylineWorkspaceRow.tsx`
- Modify: `src/app/globals.css`
- Modify: `docs/superpowers/phase-3/task_plan.md`
- Modify: `docs/superpowers/phase-3/progress.md`
- Modify: `docs/superpowers/phase-3/findings.md` only if implementation forces a design change
- Test: `src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

- [ ] **Step 1: Write the failing interaction tests**

```ts
it('opens a split-down confirm drawer when a beat dot is clicked and closes it on cancel', async () => {
  const user = userEvent.setup();
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.click(screen.getByRole('button', { name: 'Beat 2' }));
  expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '取消' }));
  expect(screen.queryByRole('button', { name: '确认' })).not.toBeInTheDocument();
});

it('confirms a beat dot by calling branch_and_switch then refreshing the workspace', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  global.fetch = fetchMock;

  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.click(screen.getByRole('button', { name: 'Beat 2' }));
  await user.click(screen.getByRole('button', { name: '确认' }));

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/authoring/packages/sample-scene/storylines/actions',
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('branch_from_checkpoint'),
    }),
  );
  expect(mockRefresh).toHaveBeenCalled();
});

it('continues an inactive row by switching it first and then navigating into the world editor flow', async () => {
  const user = userEvent.setup();
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.click(screen.getByRole('button', { name: '继续 Alt Line' }));

  expect(fetch).toHaveBeenCalledWith(
    '/api/authoring/packages/sample-scene/storylines/actions',
    expect.objectContaining({ body: expect.stringContaining('switch_active_storyline') }),
  );
  expect(mockPush).toHaveBeenCalledWith(
    '/edit?storyPackage=sample-scene&section=worldbase-cast&surface=world',
  );
});

it('switches to another storyline from a row action without leaving 故事包管理', async () => {
  const user = userEvent.setup();
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.click(screen.getByRole('button', { name: '切换到 Alt Line' }));

  expect(fetch).toHaveBeenCalledWith(
    '/api/authoring/packages/sample-scene/storylines/actions',
    expect.objectContaining({ body: expect.stringContaining('switch_active_storyline') }),
  );
  expect(mockRefresh).toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

it('creates a new storyline from the source row action and refreshes into the new active row', async () => {
  const user = userEvent.setup();
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.click(screen.getByRole('button', { name: '从当前线派生 Main Line' }));

  expect(fetch).toHaveBeenCalledWith(
    '/api/authoring/packages/sample-scene/storylines/actions',
    expect.objectContaining({ body: expect.stringContaining('create_from_source') }),
  );
  expect(mockRefresh).toHaveBeenCalled();
});

it('disables create-from-source when the row has no head checkpoint', () => {
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewWithoutHeadFixture} />);

  expect(screen.getByRole('button', { name: '从当前线派生 Empty Line' })).toBeDisabled();
});

it('submits inline rename through the metadata-only action seam', async () => {
  const user = userEvent.setup();
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.clear(screen.getByRole('textbox', { name: '故事线名称 Main Line' }));
  await user.type(screen.getByRole('textbox', { name: '故事线名称 Main Line' }), '  Side Route  {enter}');

  expect(fetch).toHaveBeenCalledWith(
    '/api/authoring/packages/sample-scene/storylines/actions',
    expect.objectContaining({ body: expect.stringContaining('rename_display_name') }),
  );
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: FAIL because the row actions, confirm drawer, and router/fetch wiring are not implemented yet.

- [ ] **Step 3: Implement the minimal interaction layer and motion**

```tsx
const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);

async function confirmCheckpointBranch(checkpointId: string) {
  await postStorylineAction({
    kind: 'branch_from_checkpoint',
    sourceStorylineId: row.storylineId,
    checkpointId,
  });
  router.refresh();
}
```

Implementation notes:
- Keep row action semantics row-local. Do not add a second persistent “selected storyline” state outside the active storyline from the server.
- Provide a dedicated row-level `switch storyline` action that stays inside `故事包管理`; do not treat `continue` as the only way to switch lines.
- For `continue`, if the row is inactive, call `switch_active_storyline` first, await success, then `router.push('/edit?storyPackage=...&section=worldbase-cast&surface=world')`.
- For inline rename, submit on blur or Enter, show the normalized saved value after `router.refresh()`, and treat unchanged normalized names as success.
- Implement the seam-opening animation with CSS transitions on the row drawer and a small translate/opacity shift. Avoid modal overlays and floaty easing.
- Keep destructive management actions out of this task. No archive, duplicate, or delete shortcuts here.

- [ ] **Step 4: Run the targeted verification, then the full verification**

Run: `npm test -- src/storylines/__tests__/workspace-view.test.ts src/storylines/__tests__/substrate.test.ts 'src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts' src/app/__tests__/layout.test.tsx src/app/components/__tests__/TitleLandingSurface.test.tsx src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx`

Expected: PASS for the bounded read model, mutation seam, route, page routing, shell wiring, and UI interactions.

Run: `npm run type-check:simulation`

Expected: PASS so the storyline-aware editor entry changes do not break the simulation toolset type boundary.

Run: `npm run test:simulation`

Expected: PASS so the route and authoring/runtime boundary changes clear the repository's required simulation regression gate.

Run: `npm run build`

Expected: PASS with the new `故事包管理` section included in the editor app surface.

Run: `npm test`

Expected: PASS across the full repository before claiming completion.

Manual verification:
- Open `/edit` and confirm it lands on `故事包管理`.
- Verify the new tab sits before `世界` and `控制台` remains reachable.
- Switch packages from the left column and confirm the URL stays on `section=story-package-management`.
- Use the row-level “从当前线派生” action and confirm it creates a new storyline and makes it active without leaving the workspace.
- Use the row-level “切换到 …” action and confirm it switches the active storyline while staying on `故事包管理`。
- Click a beat dot and confirm the drawer opens downward from that dot with `确认 / 取消`.
- Confirming the drawer should create a new storyline, refresh the workspace, and show the new storyline as active.
- Clicking `继续` on an inactive row should switch and enter the normal `世界` authoring page.
- Inline rename should update the visible display name without exposing any internal id.

- [ ] **Step 5: Update planning docs and commit**

```bash
git add src/app/edit/sections/StoryPackageManagementSection.tsx src/app/edit/sections/StorylineWorkspaceRow.tsx src/app/globals.css docs/superpowers/phase-3/task_plan.md docs/superpowers/phase-3/progress.md
git commit -m "feat: complete story package management workspace"
```

Implementation notes:
- Only update `docs/superpowers/phase-3/findings.md` if execution reveals a real design change, not just implementation detail.
- When marking the plan complete, check off completed boxes in this document and reflect the same status in `docs/superpowers/phase-3/task_plan.md`.
