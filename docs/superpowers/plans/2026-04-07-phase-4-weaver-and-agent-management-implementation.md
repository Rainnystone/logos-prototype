# Phase 4 Weaver And Agent Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `weaver agent` text-import package creation, shared sidecar reference loading, built-in `agent 管理页面`, and `gossipelog` bootstrap/fallback without introducing a second persistence path or a second sidecar architecture.

**Architecture:** Keep all writes server-owned and deterministic. Extend the existing package-creation seam into a discriminated `blank | text_import` flow, run `weaver` as one bounded sidecar import operation that returns a validated payload, apply that payload into the staged scaffold before promotion, and keep `prompt assembly` as the single outward prompt boundary by resolving sidecar references before prompt construction. Reuse the browser's existing runtime adapter config store for Phase 4 instead of inventing a second editor-only provider settings surface.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, Zod, YAML, Node `fs/promises`, existing API adapter under `src/engine/api-adapter/`, existing package scaffold service under `src/story-packages/scaffold.ts`

**Spec Reference:** [`../specs/2026-04-07-phase-4-weaver-agent-management-design.md`](../specs/2026-04-07-phase-4-weaver-agent-management-design.md)

---

**Preflight:** Execute this plan in a dedicated git worktree created with `@superpowers:using-git-worktrees` before touching code.

**Scope note:** Keep this as one implementation plan. `weaver` import, shared sidecar reference loading, the built-in agent surface, and `gossipelog` bootstrap all hang off the same package-creation boundary and the same built-in sidecar architecture. Splitting them into separate plans would create artificial seams and duplicate setup work.

## File Map

### Shared contracts, enums, and request shapes

- Create: `src/types/weaver.ts`
- Modify: `src/types/storyline-management.ts`
- Modify: `src/types/index.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`

Responsibilities:
- define the `text_import` request shape without creating a second package-creation endpoint family
- freeze `weaver` payload, summary, and bootstrap-status schemas
- freeze the Phase 4 `12,000`-character request-edge bound as a shared exported constant
- freeze agent operational hint enums for the UI and service layers

### Shared adapter-config parsing for authoring/play routes

- Create: `src/app/api/shared/adapter-config.ts`
- Modify: `src/app/api/authoring/packages/route.ts`
- Modify: `src/app/api/play/gossipelog/route.ts`
- Test: `src/app/api/authoring/packages/route.test.ts`
- Test: `src/app/api/play/gossipelog/route.test.ts`

Responsibilities:
- reuse one bounded server-side parser for browser-supplied adapter config
- keep route-level input validation consistent between authoring and play
- avoid duplicating fragile inline config parsing logic

### Shared sidecar registry metadata and reference loader

- Create: `src/agents/reference-loader.ts`
- Create: `src/agents/__tests__/reference-loader.test.ts`
- Create: `src/agents/__tests__/agent-surface.test.ts`
- Modify: `src/agents/gossipelog/definition.ts`
- Modify: `src/agents/registry.ts`
- Modify: `src/agents/agent-surface.ts`
- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/authoring/persistence/__tests__/package-state.test.ts`

Responsibilities:
- extend `AgentDefinition` with skill display metadata and sidecar reference manifests
- resolve repo-local reference assets with required/priority/budget rules
- keep built-in sidecars visible in the surface even when config/state files are missing
- freeze built-in sidecar config semantics: config files stay materialized, but `enabled: false` becomes a drift warning instead of a deactivation switch
- make the shared agent-surface loader the single producer of `operationalHint`, including bootstrap-related state mapping
- make the shared agent-surface loader the single producer of each card's `latest bounded state line`

### Weaver sidecar shell and adapter mode

- Create: `src/agents/weaver/index.ts`
- Create: `src/agents/weaver/definition.ts`
- Create: `src/agents/weaver/contracts.ts`
- Create: `src/agents/weaver/repository.ts`
- Create: `src/agents/weaver/agent.ts`
- Create: `src/agents/weaver/references/import-reference.md`
- Modify: `src/agents/registry.ts`
- Modify: `src/engine/types/adapter-interface.ts`
- Modify: `src/engine/api-adapter/prompt-templates.ts`
- Modify: `src/engine/api-adapter/schema-mapper.ts`
- Modify: `src/engine/api-adapter/response-parsers.ts`
- Modify: `src/engine/api-adapter/adapter.ts`
- Modify: `src/engine/api-adapter/providers/provider-interface.ts`
- Modify: `src/engine/api-adapter/__tests__/fixtures.ts`
- Modify: `src/engine/schema-validator.ts`
- Test: `src/agents/weaver/__tests__/agent.test.ts`
- Test: `src/agents/weaver/__tests__/repository.test.ts`
- Test: `src/engine/api-adapter/__tests__/adapter.test.ts`

Responsibilities:
- add one `weaverImport` adapter operation with structured JSON output
- keep `weaver` identity instructions code-owned and references repo-owned
- persist one bounded `weaver` import summary file

### Atomic text-import scaffold integration

- Create: `src/story-packages/import-seed.ts`
- Create: `src/story-packages/__tests__/import-seed.test.ts`
- Modify: `src/story-packages/scaffold.ts`
- Modify: `src/story-packages/scaffold-errors.ts`
- Modify: `src/story-packages/__tests__/scaffold.test.ts`
- Modify: `src/app/api/authoring/packages/route.ts`
- Modify: `src/app/api/authoring/packages/route.test.ts`

Responsibilities:
- extend the existing staged scaffold service instead of adding a second write path
- apply validated `weaver` output into staged authored files before promotion
- write built-in sidecar config files and initial `weaver` summary state into the new package
- preserve explicit naming precedence: author input first, `weaver` suggestion second, otherwise fail

### Story package management import UI and agent management surface

- Modify: `src/app/edit/sections/StoryPackageCreationPanel.tsx`
- Modify: `src/app/edit/sections/StoryPackageManagementSection.tsx`
- Modify: `src/app/edit/sections/AgentSurfacePanel.tsx`
- Modify: `src/app/edit/sections/PackageWiringValidationSection.tsx`
- Modify: `src/app/edit/shared/SectionTabs.tsx`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx`
- Modify: `src/app/edit/sections/__tests__/story-package-management.fixtures.ts`
- Modify: `src/app/edit/__tests__/PackageWiringValidationSection.test.tsx`
- Modify: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Modify: `src/app/globals.css`
- Reference: `src/app/runtime-config.ts` (read existing browser config only; do not add a new settings system)

Responsibilities:
- let `新建故事包` branch into `空白创建 / 文本导入`
- reuse the existing runtime adapter config from browser storage for text import
- convert the visible console surface into built-in `agent 管理`
- keep the internal section id `package-wiring-validation` this phase to avoid route churn

### Gossipelog bootstrap and first-play fallback

- Create: `src/agents/gossipelog/bootstrap.ts`
- Create: `src/app/api/play/gossipelog/bootstrap/route.ts`
- Create: `src/app/api/play/gossipelog/bootstrap/route.test.ts`
- Modify: `src/agents/gossipelog/agent.ts`
- Modify: `src/agents/gossipelog/repository.ts`
- Modify: `src/agents/weaver/repository.ts`
- Modify: `src/app/api/authoring/packages/route.ts`
- Modify: `src/app/api/authoring/packages/route.test.ts`
- Modify: `src/app/play/PlayWorkbench.tsx`
- Modify: `src/app/__tests__/play.test.tsx`
- Test: `src/agents/gossipelog/__tests__/agent.test.ts`

Responsibilities:
- bootstrap `gossipelog` immediately after successful imported package creation
- record bootstrap status in `weaver` summary state
- trigger one bounded first-play fallback only for packages with a persisted `weaver` import summary when `gossipelog` state is missing or unreadable; reconcile summary status after the fallback decision

### Final synchronization and verification

- Modify: `docs/superpowers/phase-4/task_plan.md`
- Modify: `docs/superpowers/phase-4/progress.md`
- Modify: `docs/superpowers/phase-4/findings.md`
- Modify: `task_plan.md` only if the root recovery index must mention the completed Phase 4 plan
- Modify: `progress.md` only if the root recovery index must mention the completed Phase 4 plan
- Modify: `findings.md` only if the root recovery index must mention the completed Phase 4 plan

Responsibilities:
- mark the implementation plan as written and later mark delivery status truthfully
- keep repository-level recovery docs aligned without duplicating the full Phase 4 detail log

## Task 1: Freeze text-import contracts, enums, and bounded naming rules

**Files:**
- Create: `src/types/weaver.ts`
- Modify: `src/types/storyline-management.ts`
- Modify: `src/types/index.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`

- [ ] **Step 1: Write the failing schema/type tests**

```ts
it('accepts the blank and text_import package creation payloads', () => {
  expect(() =>
    StoryPackageCreationRequestSchema.parse({
      mode: 'blank',
      displayName: '新故事包',
    }),
  ).not.toThrow();

  expect(() =>
    StoryPackageCreationRequestSchema.parse({
      mode: 'text_import',
      displayName: '',
      sourceText: '原始 opening hook 文本',
    }),
  ).not.toThrow();
});

it('rejects text_import sourceText beyond the frozen Phase 4 limit', () => {
  expect(() =>
    StoryPackageCreationRequestSchema.parse({
      mode: 'text_import',
      sourceText: 'a'.repeat(MAX_TEXT_IMPORT_SOURCE_LENGTH + 1),
    }),
  ).toThrow();
});

it('freezes the weaver summary and operational hint enums', () => {
  expect(WeaverBootstrapStatusSchema.options).toEqual([
    'pending',
    'succeeded',
    'failed',
    'fallback_pending',
  ]);
  expect(AgentOperationalHintSchema.options).toEqual([
    'ready',
    'warning',
    'pending_bootstrap',
  ]);
});

it('freezes the weaver payload and summary shapes', () => {
  expect(
    WeaverImportPayloadSchema.parse({
      suggestedPackageName: 'woven-package',
      sourceSummary: '一段关于外部文本来源的简短摘要',
      importSummary: '一段关于导入结果的简短摘要',
      openingHook: '作者原始文本',
      worldBase: {
        settingSummary: '近未来沿海都市',
      },
      hero: {
        displayName: '林深',
        roleSummary: '被迫接管灯塔网络的主角',
      },
      coreCast: [],
      antagonists: [],
      npcCharacters: [],
      locations: [],
      warnings: [],
      unresolvedGaps: [],
    }),
  ).toBeTruthy();

  expect(
    WeaverImportSummarySchema.parse({
      schemaVersion: 1,
      sourceKind: 'text_import',
      lastRunAt: '2026-04-07T12:00:00.000Z',
      suggestedPackageName: 'woven-package',
      sourceSummary: '一段关于外部文本来源的简短摘要',
      importSummary: '一段关于导入结果的简短摘要',
      warnings: ['角色关系只得到部分文本支持'],
      unresolvedGaps: ['缺少明确的地点时间线'],
      warningCount: 1,
      unresolvedGapCount: 1,
      bootstrapStatus: 'pending',
    }),
  ).toBeTruthy();
});

it('freezes the package-creation response warnings contract', () => {
  expect(
    StoryPackageCreationResponseSchema.parse({
      packageName: 'woven-package',
      activeStorylineId: 'storyline_main',
      createdAt: '2026-04-07T12:00:00.000Z',
      warnings: ['gossipelog bootstrap pending'],
    }),
  ).toBeTruthy();
});
```

- [ ] **Step 2: Run the targeted tests to verify RED**

Run:

```bash
npm test -- src/types/__tests__/type-conformance.test.ts
```

Expected:
- FAIL because `text_import` does not exist in the package-creation schema
- FAIL because `weaver` schemas and enums do not exist yet

- [ ] **Step 3: Implement the minimal contract layer**

```ts
export const MAX_TEXT_IMPORT_SOURCE_LENGTH = 12_000;

export const StoryPackageCreationRequestSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('blank'),
    displayName: z.string().trim().min(1),
  }).strict(),
  z.object({
    mode: z.literal('text_import'),
    displayName: z.string().optional(),
    sourceText: z
      .string()
      .trim()
      .min(1)
      .max(MAX_TEXT_IMPORT_SOURCE_LENGTH),
  }).strict(),
]);

export const StoryPackageCreationResponseSchema = z.object({
  packageName: z.string().trim().min(1),
  activeStorylineId: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  warnings: z.array(z.string().trim().min(1)).default([]),
});

export const AgentOperationalHintSchema = z.enum([
  'ready',
  'warning',
  'pending_bootstrap',
]);

export const WeaverBootstrapStatusSchema = z.enum([
  'pending',
  'succeeded',
  'failed',
  'fallback_pending',
]);

export const WeaverImportPayloadSchema = z.object({
  suggestedPackageName: z.string().trim().min(1).optional(),
  sourceSummary: z.string().trim().min(1),
  importSummary: z.string().trim().min(1),
  openingHook: z.string().trim().min(1),
  worldBase: z.object({}).passthrough(),
  hero: z.object({}).passthrough().optional(),
  coreCast: z.array(z.object({}).passthrough()),
  antagonists: z.array(z.object({}).passthrough()),
  npcCharacters: z.array(z.object({}).passthrough()),
  locations: z.array(z.object({}).passthrough()),
  warnings: z.array(z.string().trim().min(1)),
  unresolvedGaps: z.array(z.string().trim().min(1)),
});

export const WeaverImportSummarySchema = z.object({
  schemaVersion: z.literal(1),
  sourceKind: z.literal('text_import'),
  lastRunAt: z.string().datetime(),
  suggestedPackageName: z.string().trim().min(1).optional(),
  sourceSummary: z.string().trim().min(1),
  importSummary: z.string().trim().min(1),
  warnings: z.array(z.string().trim().min(1)),
  unresolvedGaps: z.array(z.string().trim().min(1)),
  warningCount: z.number().int().nonnegative(),
  unresolvedGapCount: z.number().int().nonnegative(),
  bootstrapStatus: WeaverBootstrapStatusSchema,
});
```

Implementation notes:
- Put all `weaver`-specific Zod schemas in `src/types/weaver.ts`; re-export from `src/types/index.ts`.
- Freeze naming precedence in comments next to the request schema so later service code cannot drift:
  - non-empty author `displayName` wins
  - empty `displayName` allows `weaver` suggestion
  - invalid/conflicting suggestion must fail instead of silently rewriting
- Do not put `adapterConfig` into this shared request schema; keep provider parsing as a route concern.
- Treat `warnings` and `unresolvedGaps` as first-class persisted fields, not ad-hoc debug strings.
- Freeze the shared package-creation response shape here so route/UI layers can surface bounded warnings without local one-off typing.
- Preserve the existing creation-response fields `activeStorylineId` and `createdAt`; `warnings` extends the contract instead of replacing the current response shape.
- `WeaverImportPayloadSchema.openingHook` exists as a structured import field, but it is not the authoritative source for the persisted package `openingHook`; Task 4 must preserve the original `sourceText`.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run:

```bash
npm test -- src/types/__tests__/type-conformance.test.ts
```

Expected:
- PASS with the new discriminated request schema and `weaver` enums exported

- [ ] **Step 5: Commit**

```bash
git add src/types/weaver.ts src/types/storyline-management.ts src/types/index.ts src/types/__tests__/type-conformance.test.ts
git commit -m "feat: add weaver import contracts"
```

### Task 2: Add shared adapter-config parsing and sidecar reference-loading metadata

**Files:**
- Create: `src/app/api/shared/adapter-config.ts`
- Create: `src/agents/reference-loader.ts`
- Create: `src/agents/__tests__/reference-loader.test.ts`
- Create: `src/agents/__tests__/agent-surface.test.ts`
- Modify: `src/agents/gossipelog/definition.ts`
- Modify: `src/agents/registry.ts`
- Modify: `src/agents/agent-surface.ts`
- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/authoring/persistence/__tests__/package-state.test.ts`
- Modify: `src/app/api/authoring/packages/route.ts`
- Modify: `src/app/api/play/gossipelog/route.ts`
- Test: `src/app/api/authoring/packages/route.test.ts`
- Test: `src/app/api/play/gossipelog/route.test.ts`

- [ ] **Step 1: Write the failing loader/surface/route tests**

```ts
it('loads a required sidecar reference from a repo-relative static asset', async () => {
  const resolved = await resolveSidecarReferences({
    agentId: 'weaver',
    operationKind: 'weaver_import',
    manifests: [
      {
        referenceId: 'weaver-import',
        resolverKey: 'repo-text',
        relativePath: 'src/agents/weaver/references/import-reference.md',
        loadPolicy: 'operation-scoped',
        required: true,
        injectionLabel: 'weaver reference',
        priority: 100,
      },
    ],
  });

  expect(resolved).toHaveLength(1);
});

it('fails before any provider call when a required sidecar reference is missing', async () => {
  await expect(
    resolveSidecarReferences({
      agentId: 'weaver',
      operationKind: 'weaver_import',
      manifests: [
        {
          referenceId: 'missing-weaver-reference',
          resolverKey: 'repo-text',
          relativePath: 'src/agents/weaver/references/does-not-exist.md',
          loadPolicy: 'operation-scoped',
          required: true,
          injectionLabel: 'weaver reference',
          priority: 100,
        },
      ],
    }),
  ).rejects.toThrow(/required reference/i);
});

it('trims optional references after required references consume the frozen budget', async () => {
  const resolved = await resolveSidecarReferences({
    agentId: 'gossipelog',
    operationKind: 'gossipelog_update',
    manifests: [
      requiredManifestFixture,
      optionalManifestLowPriorityFixture,
      optionalManifestHighPriorityFixture,
    ],
    maxReferenceTokens: 40,
  });

  expect(resolved.map((reference) => reference.referenceId)).toContain('required-core');
  expect(resolved.map((reference) => reference.referenceId)).toContain('optional-high');
  expect(resolved.map((reference) => reference.referenceId)).not.toContain('optional-low');
});

it('keeps a registered built-in sidecar visible when config/state files are missing', async () => {
  const items = await loadAgentSurfaceItems('__phase4-missing-sidecar__');
  expect(items.some((item) => item.agentId === 'gossipelog')).toBe(true);
});

it('treats enabled false on a built-in sidecar config as drift, not as deactivation', async () => {
  const items = await loadAgentSurfaceItems('__phase4-built-in-config-drift__');
  expect(items.find((item) => item.agentId === 'gossipelog')?.operationalHint).toBe('warning');
});

it('marks gossipelog as pending_bootstrap for imported packages when relationship state is missing', async () => {
  const items = await loadAgentSurfaceItems('__phase4-imported-package-missing-gossipelog__');

  expect(items.find((item) => item.agentId === 'gossipelog')?.operationalHint).toBe(
    'pending_bootstrap',
  );
  expect(items.find((item) => item.agentId === 'weaver')?.operationalHint).toBe('ready');
});

it('marks gossipelog as ready once relationship state is readable, even if bootstrap status drifted', async () => {
  const items = await loadAgentSurfaceItems('__phase4-imported-package-readable-gossipelog__');

  expect(items.find((item) => item.agentId === 'gossipelog')?.operationalHint).toBe('ready');
});

it('produces a bounded latest state line for each built-in sidecar card', async () => {
  const items = await loadAgentSurfaceItems('__phase4-imported-package-readable-gossipelog__');

  expect(items.find((item) => item.agentId === 'weaver')?.latestStateLine).toEqual(expect.any(String));
  expect(items.find((item) => item.agentId === 'gossipelog')?.latestStateLine).toEqual(
    expect.any(String),
  );
});

it('returns 400 for text_import without a valid adapter config', async () => {
  const response = await POST(
    new Request('http://localhost/api/authoring/packages', {
      method: 'POST',
      body: JSON.stringify({ mode: 'text_import', sourceText: 'raw text' }),
    }),
  );

  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: Run the targeted tests to verify RED**

Run:

```bash
npm test -- src/agents/__tests__/reference-loader.test.ts src/agents/__tests__/agent-surface.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/app/api/authoring/packages/route.test.ts src/app/api/play/gossipelog/route.test.ts
```

Expected:
- FAIL because there is no shared reference loader
- FAIL because built-in sidecars disappear when config is missing
- FAIL because authoring routes do not share adapter-config parsing

- [ ] **Step 3: Implement the shared loader/registry surface**

```ts
export interface SidecarReferenceManifest {
  readonly referenceId: string;
  readonly resolverKey: 'repo-text';
  readonly relativePath: string;
  readonly loadPolicy: 'always' | 'operation-scoped';
  readonly required: boolean;
  readonly injectionLabel: string;
  readonly priority: number;
}

export interface AgentSkillSummary {
  readonly skillId: string;
  readonly displayName: string;
  readonly description: string;
}
```

Implementation notes:
- Keep the first loader tiny: repo-relative static text assets only, no remote fetchers and no plugin/extensibility.
- Enforce the Phase 4 reference budget here:
  - cache key basis: `agentId + operationKind + referenceRevision`
  - total resolved-reference budget: `4,000` tokens equivalent
  - trim by ascending priority after required references are kept
- Change `loadAgentSurfaceItems()` so registry-defined built-ins are always listed; missing config/state should degrade to bounded status instead of removal.
- Update `src/agents/gossipelog/definition.ts` in the same slice so `gossipelog` and `weaver` both satisfy the expanded registry contract.
- Freeze built-in config semantics in code comments and tests:
  - built-in sidecars still materialize `config.yaml`
  - `enabled: false` must not suppress built-in display
  - surface loaders should convert that state into a warning/drift hint instead
- Freeze `operationalHint` ownership and meaning here:
  - `loadAgentSurfaceItems()` is the only producer of final card hints
  - `weaver` card uses `ready` or `warning` based on its own persisted import summary, never `pending_bootstrap`
  - `gossipelog` card uses `pending_bootstrap` only when the package has a persisted `weaver` import summary and `gossipelog` state is missing or unreadable
  - `gossipelog` card uses `ready` when relationship state is readable, even if summary status later drifted
  - `warning` is reserved for config drift, unreadable built-in files outside the import-bootstrap path, or other non-pending degraded states
- Freeze latest-state-line ownership and meaning here:
  - `loadAgentSurfaceItems()` is the only producer of `latestStateLine`
  - each agent definition contributes bounded summary inputs, but cards do not assemble strings in React
  - `weaver.latestStateLine` comes from the persisted import summary or a bounded built-in fallback copy for blank packages
  - `gossipelog.latestStateLine` comes from readable relationship state when present, otherwise from bounded bootstrap/fallback status copy
- Extract one shared `parseAdapterConfig()` helper into `src/app/api/shared/adapter-config.ts` and make both authoring and play routes use it.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run:

```bash
npm test -- src/agents/__tests__/reference-loader.test.ts src/agents/__tests__/agent-surface.test.ts src/authoring/persistence/__tests__/package-state.test.ts src/app/api/authoring/packages/route.test.ts src/app/api/play/gossipelog/route.test.ts
```

Expected:
- PASS with repo-local reference loading, shared route parsing, and built-in sidecar visibility preserved

- [ ] **Step 5: Commit**

```bash
git add src/app/api/shared/adapter-config.ts src/agents/reference-loader.ts src/agents/__tests__/reference-loader.test.ts src/agents/__tests__/agent-surface.test.ts src/agents/gossipelog/definition.ts src/agents/registry.ts src/agents/agent-surface.ts src/authoring/persistence/package-state.ts src/authoring/persistence/__tests__/package-state.test.ts src/app/api/authoring/packages/route.ts src/app/api/play/gossipelog/route.ts src/app/api/authoring/packages/route.test.ts src/app/api/play/gossipelog/route.test.ts
git commit -m "feat: add shared sidecar reference loading"
```

### Task 3: Add the `weaver` sidecar shell and the `weaverImport` adapter operation

**Files:**
- Create: `src/agents/weaver/index.ts`
- Create: `src/agents/weaver/definition.ts`
- Create: `src/agents/weaver/contracts.ts`
- Create: `src/agents/weaver/repository.ts`
- Create: `src/agents/weaver/agent.ts`
- Create: `src/agents/weaver/references/import-reference.md`
- Modify: `src/agents/registry.ts`
- Modify: `src/engine/types/adapter-interface.ts`
- Modify: `src/engine/api-adapter/prompt-templates.ts`
- Modify: `src/engine/api-adapter/schema-mapper.ts`
- Modify: `src/engine/api-adapter/response-parsers.ts`
- Modify: `src/engine/api-adapter/adapter.ts`
- Modify: `src/engine/api-adapter/providers/provider-interface.ts`
- Modify: `src/engine/api-adapter/__tests__/fixtures.ts`
- Modify: `src/engine/schema-validator.ts`
- Test: `src/agents/weaver/__tests__/agent.test.ts`
- Test: `src/agents/weaver/__tests__/repository.test.ts`
- Test: `src/engine/api-adapter/__tests__/adapter.test.ts`

- [ ] **Step 1: Write the failing `weaver` agent and adapter tests**

```ts
it('createAPIAdapter exposes weaverImport on the full adapter surface', () => {
  const adapter = createAPIAdapter(sampleAdapterConfig);
  expect(adapter.weaverImport).toEqual(expect.any(Function));
});

it('runWeaverImport returns a validated payload and bounded summary state', async () => {
  const result = await runWeaverImport({
    adapter,
    packageNameHint: 'new-package',
    sourceText: '原始 opening hook 文本',
  });

  expect(result.payload.openingHook).toContain('opening hook');
  expect(result.summary.bootstrapStatus).toBe('pending');
});

it('runWeaverImport resolves and injects required references before provider call', async () => {
  await runWeaverImport({
    adapter,
    packageNameHint: 'new-package',
    sourceText: '原始 opening hook 文本',
  });

  expect(mockWeaverImport).toHaveBeenCalledWith(
    expect.objectContaining({
      resolvedReferences: [
        expect.objectContaining({ referenceId: 'weaver-import' }),
      ],
    }),
  );
});

it('runWeaverImport blocks provider calls when a required reference cannot be resolved', async () => {
  await expect(
    runWeaverImport({
      adapter,
      packageNameHint: 'new-package',
      sourceText: '原始 opening hook 文本',
      overrideReferencePath: 'src/agents/weaver/references/does-not-exist.md',
    }),
  ).rejects.toThrow(/required reference/i);

  expect(mockWeaverImport).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the targeted tests to verify RED**

Run:

```bash
npm test -- src/agents/weaver/__tests__/agent.test.ts src/agents/weaver/__tests__/repository.test.ts src/engine/api-adapter/__tests__/adapter.test.ts
```

Expected:
- FAIL because `weaver` files and adapter methods do not exist yet

- [ ] **Step 3: Implement the minimal `weaver` shell and adapter mode**

```ts
export interface WeaverImportRequest {
  readonly packageNameHint?: string;
  readonly sourceText: string;
  readonly resolvedReferences: readonly ResolvedSidecarReference[];
}

export interface LLMAdapter {
  // existing methods...
  weaverImport?(request: WeaverImportRequest): Promise<WeaverImportResponse>;
}
```

Implementation notes:
- Keep identity instructions in code-owned prompt builders; keep the heavy import rules in `src/agents/weaver/references/import-reference.md`.
- Register `weaver` with:
  - English display name `Weaver`
  - Chinese responsibility summary
  - one skill summary for the import skill
  - one required reference manifest
- Persist `import-summary.yaml` through `src/agents/weaver/repository.ts` with the frozen schema from Task 1.
- Make `runWeaverImport()` own the integration seam between `weaver` definition manifests and the shared reference loader; do not leave reference resolution to the route layer.
- In `prompt-templates.ts`, keep section order stable: instructions, context, resolved references, output contract.
- In `adapter.ts`, validate input before provider call and parse the returned JSON through the `weaver` schema.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run:

```bash
npm test -- src/agents/weaver/__tests__/agent.test.ts src/agents/weaver/__tests__/repository.test.ts src/engine/api-adapter/__tests__/adapter.test.ts
```

Expected:
- PASS with one validated `weaverImport` mode, one `weaver` sidecar definition, and bounded summary persistence

- [ ] **Step 5: Commit**

```bash
git add src/agents/weaver src/agents/registry.ts src/engine/types/adapter-interface.ts src/engine/api-adapter/prompt-templates.ts src/engine/api-adapter/schema-mapper.ts src/engine/api-adapter/response-parsers.ts src/engine/api-adapter/adapter.ts src/engine/api-adapter/providers/provider-interface.ts src/engine/api-adapter/__tests__/fixtures.ts src/engine/schema-validator.ts src/agents/weaver/__tests__/agent.test.ts src/agents/weaver/__tests__/repository.test.ts src/engine/api-adapter/__tests__/adapter.test.ts
git commit -m "feat: add weaver sidecar shell"
```

### Task 4: Extend the staged scaffold service for atomic text import

**Files:**
- Create: `src/story-packages/import-seed.ts`
- Create: `src/story-packages/__tests__/import-seed.test.ts`
- Modify: `src/story-packages/scaffold.ts`
- Modify: `src/story-packages/scaffold-errors.ts`
- Modify: `src/story-packages/__tests__/scaffold.test.ts`
- Modify: `src/app/api/authoring/packages/route.ts`
- Modify: `src/app/api/authoring/packages/route.test.ts`

- [ ] **Step 1: Write the failing import-seed/scaffold/route tests**

```ts
it('applies validated weaver seeds into the staged authored files before promotion', async () => {
  const result = await createStoryPackageScaffold({
    mode: 'text_import',
    displayName: '',
    sourceText: 'opening hook text',
    adapter,
  });

  await expect(readFile(path.resolve(packageRoot, 'scene.yaml'), 'utf8')).resolves.toContain(
    'openingHook: opening hook text',
  );
});

it('preserves the original sourceText as scene openingHook even when weaver returns a rewritten openingHook', async () => {
  mockWeaverImport.mockResolvedValueOnce({
    payload: {
      ...sampleWeaverPayload,
      openingHook: '模型改写后的 opening hook',
    },
    summary: sampleWeaverSummary,
  });

  await createStoryPackageScaffold({
    mode: 'text_import',
    displayName: '',
    sourceText: '作者原始文本',
    adapter,
  });

  await expect(readFile(path.resolve(packageRoot, 'scene.yaml'), 'utf8')).resolves.toContain(
    'openingHook: 作者原始文本',
  );
});

it('writes built-in sidecar config files for gossipelog and weaver', async () => {
  await expect(access(path.resolve(packageRoot, 'agents/gossipelog/config.yaml'))).resolves.toBeUndefined();
  await expect(access(path.resolve(packageRoot, 'agents/weaver/config.yaml'))).resolves.toBeUndefined();
});

it('writes a readable weaver import summary for text_import packages', async () => {
  await expect(
    readFile(path.resolve(packageRoot, 'agents/weaver/import-summary.yaml'), 'utf8'),
  ).resolves.toContain('sourceKind: text_import');
});

it('returns a bounded error when text_import reaches the route without a usable name', async () => {
  expect(response.status).toBe(400);
});

it('returns 400 before the LLM call when sourceText exceeds the frozen limit', async () => {
  const response = await POST(
    new Request('http://localhost/api/authoring/packages', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'text_import',
        sourceText: 'a'.repeat(MAX_TEXT_IMPORT_SOURCE_LENGTH + 1),
        adapterConfig: sampleAdapterConfig,
      }),
    }),
  );

  expect(response.status).toBe(400);
  expect(mockWeaverImport).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the targeted tests to verify RED**

Run:

```bash
npm test -- src/story-packages/__tests__/import-seed.test.ts src/story-packages/__tests__/scaffold.test.ts src/app/api/authoring/packages/route.test.ts
```

Expected:
- FAIL because the scaffold service only supports blank creation
- FAIL because the staged package does not receive import seeds or built-in sidecar config files

- [ ] **Step 3: Implement atomic text-import integration**

```ts
export type CreateStoryPackageScaffoldInput =
  | { mode: 'blank'; displayName: string }
  | {
      mode: 'text_import';
      displayName?: string;
      sourceText: string;
      adapter: Pick<LLMAdapter, 'weaverImport'>;
    };
```

Implementation notes:
- Keep one public `createStoryPackageScaffold()` entry point; branch internally on `mode`.
- For `text_import`:
  1. run `weaver`
  2. resolve final display name by precedence
  3. build the blank stage
  4. apply validated `world-base.yaml` overrides in stage and persist `scene.yaml -> openingHook` from the original `sourceText`
  5. write `agents/gossipelog/config.yaml`, `agents/weaver/config.yaml`, and `agents/weaver/import-summary.yaml`
  6. validate the staged package
  7. promote once
- For `blank` creation:
  - still materialize built-in sidecar config files
  - do **not** create a fake `weaver` import-summary file
- Do not create a blank package and then call a second authoring write path as the mainline success flow.
- Add one explicit import error class if route mapping needs to distinguish invalid `weaver` output from generic scaffold failure.
- Route-level validation must reject oversize `sourceText` before adapter construction or any LLM call.
- Freeze `openingHook` ownership here:
  - the authoritative persisted `scene.yaml -> openingHook` always comes from the original request `sourceText`
  - `payload.openingHook` may be used for validation, comparison, or diagnostics, but must not overwrite the author's original pasted text

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run:

```bash
npm test -- src/story-packages/__tests__/import-seed.test.ts src/story-packages/__tests__/scaffold.test.ts src/app/api/authoring/packages/route.test.ts
```

Expected:
- PASS with one unified route, atomic stage application, and built-in sidecar config materialized in the new package

- [ ] **Step 5: Commit**

```bash
git add src/story-packages/import-seed.ts src/story-packages/__tests__/import-seed.test.ts src/story-packages/scaffold.ts src/story-packages/scaffold-errors.ts src/story-packages/__tests__/scaffold.test.ts src/app/api/authoring/packages/route.ts src/app/api/authoring/packages/route.test.ts
git commit -m "feat: add atomic text import package creation"
```

### Task 5: Update package-management creation UI and convert the console into `agent 管理`

**Files:**
- Modify: `src/app/edit/sections/StoryPackageCreationPanel.tsx`
- Modify: `src/app/edit/sections/StoryPackageManagementSection.tsx`
- Modify: `src/app/edit/sections/AgentSurfacePanel.tsx`
- Modify: `src/app/edit/sections/PackageWiringValidationSection.tsx`
- Modify: `src/app/edit/shared/SectionTabs.tsx`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx`
- Modify: `src/app/edit/sections/__tests__/story-package-management.fixtures.ts`
- Modify: `src/app/edit/__tests__/PackageWiringValidationSection.test.tsx`
- Modify: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Modify: `src/app/globals.css`
- Reference: `src/app/runtime-config.ts`

- [ ] **Step 1: Write the failing UI tests**

```tsx
it('lets the user choose blank creation or text import in the package creation panel', async () => {
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.click(screen.getByRole('button', { name: '新建故事包' }));
  expect(screen.getByRole('button', { name: '空白创建' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '文本导入' })).toBeInTheDocument();
});

it('shows a bounded message when text import is selected without saved runtime config', async () => {
  vi.spyOn(runtimeConfig, 'loadAdapterConfig').mockReturnValue(null);
  // ...
  expect(screen.getByText(/需要先配置模型/i)).toBeInTheDocument();
});

it('renames the visible console section to agent 管理 and shows Chinese skill descriptions', () => {
  expect(screen.getByRole('heading', { name: 'agent 管理' })).toBeInTheDocument();
  expect(screen.getByText('技能')).toBeInTheDocument();
});

it('renders the operational hint text for built-in sidecars', () => {
  render(<AgentSurfacePanel items={agentSurfaceItemsFixture} />);

  expect(screen.getByText(/准备就绪|需要关注|等待 bootstrap/i)).toBeInTheDocument();
});

it('shows the pending copy while Weaver is creating the imported package', async () => {
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  // trigger text import submit...

  expect(screen.getByText(/Weaver 正在整理文本并创建故事包/)).toBeInTheDocument();
});

it('offers a navigation action from the weaver card back to 文本导入创建', async () => {
  render(<PackageWiringValidationSection packageName="sample-scene" view={workspaceViewFixture} />);

  await user.click(screen.getByRole('button', { name: /前往文本导入创建/i }));
  expect(screen.getByRole('textbox', { name: /导入文本/i })).toBeInTheDocument();
});

it('redirects successful text import back to the new package 故事包管理 view', async () => {
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  // trigger text import success...

  expect(screen.getByRole('heading', { name: /故事包管理/i })).toBeInTheDocument();
  expect(screen.getByText(/Weaver/)).toBeInTheDocument();
});

it('does not render disable controls for built-in sidecars', () => {
  render(<AgentSurfacePanel items={agentSurfaceItemsFixture} />);

  expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /关闭|停用/i })).not.toBeInTheDocument();
});

it('renders the latest bounded state line under each built-in sidecar name', () => {
  render(<AgentSurfacePanel items={agentSurfaceItemsFixture} />);

  expect(screen.getByText(/最近导入|关系层状态|等待 bootstrap/i)).toBeInTheDocument();
});

it('shows one bounded server-error message when text import fails', async () => {
  render(<StoryPackageManagementSection packageName="sample-scene" view={workspaceViewFixture} />);

  // mock 409 naming conflict or bounded 500 import failure...

  expect(screen.getByText(/文本导入创建失败，请调整后重试/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the targeted tests to verify RED**

Run:

```bash
npm test -- src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/__tests__/PackageWiringValidationSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
```

Expected:
- FAIL because the creation panel only supports blank creation
- FAIL because the visible console still renders diagnostics-first copy
- FAIL because skill labels/descriptions are not shown yet

- [ ] **Step 3: Implement the minimal UI conversion**

```tsx
type CreationMode = 'blank' | 'text_import';

if (creationMode === 'text_import' && !adapterConfig) {
  setCreationFeedback('需要先在运行配置中保存一个可用模型，才能执行文本导入。');
  return;
}
```

Implementation notes:
- Reuse `StoryPackageCreationPanel.tsx`; do not introduce a second parallel creation panel system.
- Extend the panel with:
  - mode chooser
  - optional name field
  - large text area only for `text_import`
  - character counter based on the `12,000` character cap
- In `StoryPackageManagementSection.tsx`, load browser config with `loadAdapterConfig()` only when text import is selected; do not add a second config form in the editor.
- In `SectionTabs.tsx` and `EditWorkbench.tsx`, keep the internal section id `package-wiring-validation` but rename the visible title/description to `agent 管理`.
- In `PackageWiringValidationSection.tsx`, demote diagnostics into a small bounded status area and make `AgentSurfacePanel` the primary content.
- In `AgentSurfacePanel.tsx`, render English agent name plus Chinese responsibility summary and Chinese skill summaries. Do not show built-in on/off toggles.
- Render the shared `operationalHint` contract as user-visible Chinese state copy so `ready / warning / pending_bootstrap` is not trapped in data-only plumbing.
- Do not recompute hints in React components; `AgentSurfacePanel` must render the loader-produced hint as-is.
- Render `latestStateLine` directly from the shared surface contract under each card title; do not build per-agent summary strings in React.
- Add one bounded action for `weaver` only: navigate back into `故事包管理 -> 文本导入创建`; keep `gossipelog` display-only this phase.
- After successful `text_import`, navigate to the created package's `故事包管理` view instead of staying on the creation form.
- Freeze one bounded server-error slot in the creation panel so naming conflict, import parse failure, and scaffold failure do not disappear into route-only errors.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run:

```bash
npm test -- src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/__tests__/PackageWiringValidationSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
```

Expected:
- PASS with the new mode switch, text-import validation, and agent-management-first surface

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/sections/StoryPackageCreationPanel.tsx src/app/edit/sections/StoryPackageManagementSection.tsx src/app/edit/sections/AgentSurfacePanel.tsx src/app/edit/sections/PackageWiringValidationSection.tsx src/app/edit/shared/SectionTabs.tsx src/app/edit/EditWorkbench.tsx src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/sections/__tests__/story-package-management.fixtures.ts src/app/edit/__tests__/PackageWiringValidationSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/globals.css
git commit -m "feat: add agent management and text import ui"
```

### Task 6: Add `gossipelog` bootstrap-on-create and bounded first-play fallback

**Files:**
- Create: `src/agents/gossipelog/bootstrap.ts`
- Create: `src/app/api/play/gossipelog/bootstrap/route.ts`
- Create: `src/app/api/play/gossipelog/bootstrap/route.test.ts`
- Modify: `src/agents/gossipelog/agent.ts`
- Modify: `src/agents/gossipelog/repository.ts`
- Modify: `src/agents/weaver/repository.ts`
- Modify: `src/app/api/authoring/packages/route.ts`
- Modify: `src/app/api/authoring/packages/route.test.ts`
- Modify: `src/app/play/PlayWorkbench.tsx`
- Modify: `src/app/__tests__/play.test.tsx`
- Test: `src/agents/gossipelog/__tests__/agent.test.ts`

- [ ] **Step 1: Write the failing bootstrap/fallback tests**

```ts
it('bootstraps gossipelog after imported package creation using scene openingHook', async () => {
  const result = await runGossipelogBootstrap({
    storyPackageName: 'imported-package',
    storyPackage,
    adapter,
  });

  expect(result.relationshipLayer.stableBackgroundText).toEqual(expect.any(String));
});

it('requests bootstrap fallback once on first play when an imported package has missing gossipelog state', async () => {
  render(<PlayWorkbench /* ... */ />);
  expect(fetchMock).toHaveBeenCalledWith('/api/play/gossipelog/bootstrap', expect.any(Object));
});

it('marks bootstrap warning in the creation route response when initial bootstrap fails', async () => {
  const response = await POST(successfulTextImportRequest);
  const body = await response.json();

  expect(response.status).toBe(201);
  expect(body.warnings).toContain('gossipelog bootstrap pending');
});

it('returns 400 from the bootstrap route when adapter config cannot be parsed', async () => {
  const response = await POST(invalidBootstrapAdapterConfigRequest);

  expect(response.status).toBe(400);
});

it('does not retry on first play when gossipelog state is readable even if summary still says fallback_pending', async () => {
  const response = await POST(bootstrapFallbackRequestForReadableState);
  const body = await response.json();

  expect(body.retried).toBe(false);
});

it('retries on first play when gossipelog state is missing even if summary still says succeeded', async () => {
  const response = await POST(bootstrapFallbackRequestForMissingState);
  const body = await response.json();

  expect(body.retried).toBe(true);
});

it('retries on first play when gossipelog state exists but is unreadable', async () => {
  const response = await POST(bootstrapFallbackRequestForUnreadableState);
  const body = await response.json();

  expect(body.retried).toBe(true);
});

it('includes relationship-relevant weaver warnings in bootstrap context when available', async () => {
  await runGossipelogBootstrap({
    storyPackageName: 'imported-package',
    storyPackage,
    adapter,
    weaverSummary: {
      warnings: ['角色关系仅由单段旁白支持'],
    },
  });

  expect(mockGossipelogUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      acceptedBeatText: expect.stringContaining('角色关系仅由单段旁白支持'),
    }),
  );
});
```

- [ ] **Step 2: Run the targeted tests to verify RED**

Run:

```bash
npm test -- src/agents/gossipelog/__tests__/agent.test.ts src/app/api/authoring/packages/route.test.ts src/app/api/play/gossipelog/bootstrap/route.test.ts src/app/__tests__/play.test.tsx
```

Expected:
- FAIL because there is no bootstrap service or route
- FAIL because Play does not request bounded fallback for imported packages whose `gossipelog` state is missing or unreadable

- [ ] **Step 3: Implement the minimal bootstrap path**

```ts
export async function runGossipelogBootstrap(input: {
  storyPackageName: string;
  storyPackage: StoryPackage;
  adapter: Pick<LLMAdapter, 'gossipelogUpdate' | 'gossipelogInjection'>;
  weaverSummary?: Pick<WeaverImportSummary, 'warnings'>;
}) {
  return runGossipelogCycle({
    ...input,
    acceptedBeatText: [
      input.storyPackage.sceneSpec.openingHook,
      ...deriveRelationshipBootstrapNotes(input.weaverSummary?.warnings ?? []),
    ].join('\n\n'),
    roundId: '__bootstrap__',
  });
}
```

Implementation notes:
- Reuse `runGossipelogCycle()` instead of inventing a second LLM mode.
- Add one repository/helper function that can tell whether persisted relationship state exists on disk and whether it is readable without auto-creating it.
- Freeze ownership boundaries explicitly:
  - `src/story-packages/scaffold.ts` remains pure staged creation and promotion; it never calls `gossipelog`
  - `src/app/api/authoring/packages/route.ts` owns immediate post-promotion bootstrap for `text_import`
  - `src/app/api/play/gossipelog/bootstrap/route.ts` owns first-play fallback decisioning and server-side `weaver` summary loading
- `PlayWorkbench.tsx` only triggers that fallback route once during initialization; it does not inspect package files directly
- In the authoring package-creation route:
  - call bootstrap after package promotion
  - on success, set `bootstrapStatus: succeeded`
  - on failure, set `bootstrapStatus: fallback_pending`
- In `src/app/api/play/gossipelog/bootstrap/route.ts`:
  - reuse the shared `parseAdapterConfig()` helper from Task 2 instead of defining route-local adapter parsing
  - only packages with a persisted `weaver` summary created by `text_import` are eligible for fallback
  - fallback decision is driven by actual `gossipelog` state readability first, not by `bootstrapStatus` alone
  - if `gossipelog` state is readable, return a no-op result even when `bootstrapStatus` drifted to `fallback_pending`
  - if `gossipelog` state is missing or unreadable, attempt one bootstrap even when `bootstrapStatus` still says `succeeded`, then reconcile the summary
  - if no `weaver` summary exists, return a no-op result
- In `PlayWorkbench.tsx`:
  - call the bootstrap route once before initializing the orchestrator when an adapter config exists
  - if no adapter config exists, skip fallback and proceed without blocking Play startup
- Keep the fallback bounded to one attempt per initial workbench initialization; do not place it in the per-beat loop.
- Freeze one timeout/bounded-failure rule in this slice:
  - bootstrap/fallback gets one model attempt per trigger path
  - if the call exceeds the existing provider timeout or throws, persist `fallback_pending` and continue without blocking package creation or Play forever
- When bootstrap input is assembled, include a bounded relationship-confidence note derived from `weaverSummary.warnings` so `gossipelog` sees uncertainty carried forward from import parsing.
- The bootstrap route must not invent new hint semantics; it only updates persisted state/summary so the shared agent-surface loader can recompute the card hint deterministically.

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run:

```bash
npm test -- src/agents/gossipelog/__tests__/agent.test.ts src/app/api/authoring/packages/route.test.ts src/app/api/play/gossipelog/bootstrap/route.test.ts src/app/__tests__/play.test.tsx
```

Expected:
- PASS with post-create bootstrap and one first-play fallback path driven by `gossipelog` state readability plus `weaver` import eligibility

- [ ] **Step 5: Commit**

```bash
git add src/agents/gossipelog/bootstrap.ts src/app/api/play/gossipelog/bootstrap/route.ts src/app/api/play/gossipelog/bootstrap/route.test.ts src/agents/gossipelog/agent.ts src/agents/gossipelog/repository.ts src/agents/weaver/repository.ts src/app/api/authoring/packages/route.ts src/app/api/authoring/packages/route.test.ts src/app/play/PlayWorkbench.tsx src/app/__tests__/play.test.tsx src/agents/gossipelog/__tests__/agent.test.ts
git commit -m "feat: add gossipelog bootstrap fallback"
```

### Task 7: Final synchronization, browser verification, and release-grade test pass

**Files:**
- Modify: `docs/superpowers/phase-4/task_plan.md`
- Modify: `docs/superpowers/phase-4/progress.md`
- Modify: `docs/superpowers/phase-4/findings.md`
- Modify: `task_plan.md` only if root recovery notes need the completed implementation-plan pointer
- Modify: `progress.md` only if root recovery notes need the completed implementation-plan pointer
- Modify: `findings.md` only if root recovery notes need the completed implementation-plan pointer

- [ ] **Step 1: Sync the Phase 4 planning docs with the written implementation plan**

```md
- Added implementation plan: `docs/superpowers/plans/2026-04-07-phase-4-weaver-and-agent-management-implementation.md`
- Execution not started yet / or mark completed slices truthfully after code lands
```

- [ ] **Step 2: Run the targeted suites while iterating**

Run:

```bash
npm test -- src/types/__tests__/type-conformance.test.ts src/agents/__tests__/reference-loader.test.ts src/agents/__tests__/agent-surface.test.ts src/agents/weaver/__tests__/agent.test.ts src/agents/weaver/__tests__/repository.test.ts src/story-packages/__tests__/import-seed.test.ts src/story-packages/__tests__/scaffold.test.ts src/app/api/authoring/packages/route.test.ts src/app/api/play/gossipelog/route.test.ts src/app/api/play/gossipelog/bootstrap/route.test.ts src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/edit/__tests__/PackageWiringValidationSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/__tests__/play.test.tsx src/engine/api-adapter/__tests__/adapter.test.ts
```

Expected:
- PASS for all changed contracts, routes, UI surfaces, and sidecar services

- [ ] **Step 3: Run browser and build verification before calling the work complete**

Run:

```bash
npm run build
npm test
```

Expected:
- `npm run build` succeeds
- full `npm test` succeeds

Browser verification:
- open the editor
- create one blank package
- create one imported package from pasted text
- confirm `agent 管理` renders `Gossipelog` and `Weaver`
- confirm imported package lands in `故事包管理`
- confirm built-in sidecars show no disable controls

- [ ] **Step 4: Confirm the related docs contain only relative links**

Run:

```bash
python - <<'PY'
from pathlib import Path
import re
import sys

targets = [
    Path("docs/superpowers/phase-4"),
    Path("docs/superpowers/specs/2026-04-07-phase-4-weaver-agent-management-design.md"),
    Path("docs/superpowers/plans/2026-04-07-phase-4-weaver-and-agent-management-implementation.md"),
]

root_relative_pattern = re.compile(r"\[[^\]]*\]" + r"\(" + r"/")
absolute_fs_pattern = "/Use" + "rs/"
file_scheme_pattern = "file" + "://"
bad_matches = []

for target in targets:
    paths = [target] if target.is_file() else sorted(target.rglob("*"))
    for path in paths:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        if (
            absolute_fs_pattern in text
            or file_scheme_pattern in text
            or root_relative_pattern.search(text)
        ):
            bad_matches.append(str(path))

if bad_matches:
    for path in bad_matches:
        print(path)
    sys.exit(1)
PY
```

Expected:
- no matches

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/phase-4/task_plan.md docs/superpowers/phase-4/progress.md docs/superpowers/phase-4/findings.md task_plan.md progress.md findings.md
git commit -m "docs: sync phase 4 implementation status"
```
