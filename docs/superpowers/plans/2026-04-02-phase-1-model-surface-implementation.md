# Phase 1 Model & Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the mixed world/character editor into truthful Phase 1 surfaces, promote locations into structured authored objects, add optional scene location references, and expose the current sidecar-agent layer as a bounded read-only surface without changing the underlying four-family deterministic save model.

**Architecture:** Phase 1 keeps `worldbase-cast` as one save boundary while introducing two visible subpages over the same draft. Structured locations become authored source-of-truth data on `worldBase`, while `locationPatch` remains a derived compatibility output for the current runtime path. The console remains the host for diagnostics plus a read-only sidecar-agent card surface, and all changes stay inside the existing neue brutalism shell rather than replacing it.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Zod, Vitest, existing authoring bridge/repository flow

---

## File Map

### Routing and shell

- Modify: `src/app/edit/page.tsx`
- Modify: `src/app/edit/shared/SectionTabs.tsx`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/shared/PageHelperPanel.tsx`
- Test: `src/app/edit/__tests__/page.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

### World and character surfaces

- Create: `src/app/edit/sections/WorldSection.tsx`
- Create: `src/app/edit/sections/CharacterSection.tsx`
- Modify: `src/app/edit/sections/WorldBaseCastSection.tsx` only as an extraction staging file, then remove if fully unused
- Test: `src/app/edit/__tests__/WorldSection.test.tsx`
- Test: `src/app/edit/__tests__/CharacterSection.test.tsx`

### Location contract and compatibility

- Create: `src/lib/location-id.ts`
- Create: `src/authoring/sections/world-locations.ts`
- Modify: `src/types/prompt-object.ts`
- Modify: `src/types/story-package.ts`
- Modify: `src/authoring/sections/worldbase-cast.ts`
- Modify: `src/story-packages/world-base-compat.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/authoring/sections/__tests__/worldbase-cast.test.ts`
- Test: `src/story-packages/__tests__/world-base-compat.test.ts`

### Scene location references and deterministic validation

- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/authoring/sections/scene-phase-authoring.ts`
- Modify: `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
- Modify: `src/authoring/persistence/bridge.ts`
- Modify: `src/authoring/persistence/repository.ts`
- Test: `src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
- Test: `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
- Test: `src/authoring/persistence/__tests__/bridge.test.ts`

### Read-only agent surface

- Create: `src/agents/agent-surface.ts`
- Create: `src/app/edit/sections/AgentSurfacePanel.tsx`
- Modify: `src/agents/gossipelog/definition.ts`
- Modify: `src/agents/registry.ts`
- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/sections/PackageWiringValidationSection.tsx`
- Test: `src/authoring/persistence/__tests__/package-state.test.ts`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Test: `src/app/edit/__tests__/PackageWiringValidationSection.test.tsx`
- Test: `src/types/__tests__/type-conformance.test.ts`

## Task 1: Lock the split-surface route contract without creating new save families

**Files:**
- Modify: `src/app/edit/page.tsx`
- Modify: `src/app/edit/shared/SectionTabs.tsx`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Test: `src/app/edit/__tests__/page.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

- [ ] **Step 1: Write the failing route-contract tests**

```tsx
it('defaults worldbase-cast to the world surface', async () => {
  render(await EditPage({ searchParams: { storyPackage: 'sample-scene', section: 'worldbase-cast' } }));
  expect(screen.getByRole('link', { name: '世界' })).toHaveAttribute(
    'href',
    expect.stringContaining('section=worldbase-cast'),
  );
});

it('renders five visible workspaces while keeping four save families', () => {
  renderWorkbench({ activeSection: 'worldbase-cast', activeSurface: 'character' });
  expect(screen.getByRole('link', { name: '世界' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '角色' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the route tests to verify RED**

Run: `npm test -- src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: FAIL because `surface` parsing and five-workspace rendering do not exist yet.

- [ ] **Step 3: Implement the explicit split-surface route model**

```ts
type WorldbaseSurface = 'world' | 'character';

function getRequestedWorldbaseSurface(value: string | readonly string[] | undefined): WorldbaseSurface {
  return value === 'character' ? 'character' : 'world';
}
```

Implementation notes:
- keep `section` authoritative for save family selection
- keep `worldbase-cast` as the only section key for both new visible pages
- drive top tabs from a UI tab config, not a direct `SECTION_IDS.map(...)`
- pass `activeSurface` into `EditWorkbench`

- [ ] **Step 4: Run the route tests to verify GREEN**

Run: `npm test -- src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: PASS for URL parsing, visible tab rendering, and default-world behavior.

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/page.tsx src/app/edit/shared/SectionTabs.tsx src/app/edit/EditWorkbench.tsx src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
git commit -m "feat: split worldbase editor surface routing"
```

## Task 2: Preserve one shared `worldbase-cast` draft across world/character switching

**Files:**
- Modify: `src/app/edit/EditWorkbench.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

- [ ] **Step 1: Write the failing shared-draft tests**

```tsx
it('keeps unsaved worldbase edits when switching from world to character surface', async () => {
  renderWorkbench({ activeSection: 'worldbase-cast', activeSurface: 'world' });
  await user.type(screen.getByLabelText('世界基础设定'), ' extra');
  await user.click(screen.getByRole('link', { name: '角色' }));
  expect(screen.getByDisplayValue(expect.stringContaining('extra'))).toBeInTheDocument();
});

it('resets the whole shared draft from either surface', async () => {
  renderWorkbench({ activeSection: 'worldbase-cast', activeSurface: 'character' });
  await user.type(screen.getByLabelText('角色名'), 'X');
  await user.click(screen.getByRole('button', { name: '重置' }));
  expect(screen.queryByDisplayValue(expect.stringContaining('X'))).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the workbench test file to verify RED**

Run: `npm test -- src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: FAIL because switching surfaces currently reloads or remounts the mixed page state.

- [ ] **Step 3: Implement shared-draft surface switching**

```ts
const [activeWorldbaseSurface, setActiveWorldbaseSurface] = useState<WorldbaseSurface>(initialSurface);

const showWorldSurface =
  activeSection === 'worldbase-cast' && activeWorldbaseSurface === 'world';
```

Implementation notes:
- do not create a second draft object for characters
- keep one `draftWorldBase` and one `savedWorldBase`
- save/reset handlers continue to submit the whole `worldbase-cast` payload
- only package changes or successful reloads should replace the saved baseline

- [ ] **Step 4: Re-run the workbench tests to verify GREEN**

Run: `npm test -- src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: PASS for cross-surface draft retention and boundary-level reset behavior.

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/EditWorkbench.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
git commit -m "feat: preserve shared worldbase draft across split surfaces"
```

## Task 3: Add structured location contracts and deterministic legacy hydration

**Files:**
- Create: `src/lib/location-id.ts`
- Create: `src/authoring/sections/world-locations.ts`
- Modify: `src/types/prompt-object.ts`
- Modify: `src/types/story-package.ts`
- Modify: `src/authoring/sections/worldbase-cast.ts`
- Modify: `src/story-packages/world-base-compat.ts`
- Test: `src/types/__tests__/type-conformance.test.ts`
- Test: `src/authoring/sections/__tests__/worldbase-cast.test.ts`
- Test: `src/story-packages/__tests__/world-base-compat.test.ts`

- [ ] **Step 1: Write the failing location-contract tests**

```ts
it('hydrates one imported location from a legacy locationPatch blob', () => {
  const draft = createWorldBaseCastDraft({
    ...fixtureWorldBase,
    locationPatch: 'Legacy location notes',
  });
  expect(draft.locations).toHaveLength(1);
  expect(draft.locations[0]).toMatchObject({
    name: '',
    description: 'Legacy location notes',
  });
});

it('accepts loc_ ids on persisted worldBase locations', () => {
  expect(WorldBaseSchema.parse({
    ...fixtureWorldBase,
    locations: [{ locationId: 'loc_a1b2c3', name: '', description: '', environmentAppearance: '', atmosphereDescription: '', humanContextDescription: '' }],
  })).toBeDefined();
});
```

- [ ] **Step 2: Run the location-related tests to verify RED**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/authoring/sections/__tests__/worldbase-cast.test.ts src/story-packages/__tests__/world-base-compat.test.ts`

Expected: FAIL because `locations[]`, location IDs, and deterministic hydration are not implemented yet.

- [ ] **Step 3: Implement the location schema, ID generator, and hydration/projection helpers**

```ts
export interface AuthoredLocation {
  readonly locationId: string;
  readonly name: string;
  readonly description: string;
  readonly environmentAppearance: string;
  readonly atmosphereDescription: string;
  readonly humanContextDescription: string;
}

export function generateLocationId(): string {
  return `loc_${toHex(getRandomBytes(3))}`;
}
```

Implementation notes:
- add `locations: z.array(LocationSchema).default([])` to `WorldBaseSchema`
- keep `locationPatch` on `WorldBaseSchema` as the derived compatibility field
- hydrate untouched legacy `locationPatch` into one imported location draft with empty name and full description text
- mint persisted `locationId` only when the structured location is first saved successfully
- if one imported location still only has `description`, project that description back to `locationPatch` unchanged after normalization

- [ ] **Step 4: Re-run the location-related tests to verify GREEN**

Run: `npm test -- src/types/__tests__/type-conformance.test.ts src/authoring/sections/__tests__/worldbase-cast.test.ts src/story-packages/__tests__/world-base-compat.test.ts`

Expected: PASS for schema shape, deterministic hydration, and compatibility projection.

- [ ] **Step 5: Commit**

```bash
git add src/lib/location-id.ts src/authoring/sections/world-locations.ts src/types/prompt-object.ts src/types/story-package.ts src/authoring/sections/worldbase-cast.ts src/story-packages/world-base-compat.ts src/types/__tests__/type-conformance.test.ts src/authoring/sections/__tests__/worldbase-cast.test.ts src/story-packages/__tests__/world-base-compat.test.ts
git commit -m "feat: add structured location authoring contract"
```

## Task 4: Replace the mixed world/character UI with dedicated world and character sections

**Files:**
- Create: `src/app/edit/sections/WorldSection.tsx`
- Create: `src/app/edit/sections/CharacterSection.tsx`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/sections/WorldBaseCastSection.tsx` only for extraction, then remove if unused
- Test: `src/app/edit/__tests__/WorldSection.test.tsx`
- Test: `src/app/edit/__tests__/CharacterSection.test.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

- [ ] **Step 1: Write the failing world/character surface tests**

```tsx
it('renders location rail and detail fields on the world surface', () => {
  render(<WorldSection ... />);
  expect(screen.getByLabelText('地点名称')).toBeInTheDocument();
  expect(screen.getByLabelText('环境外观描述')).toBeInTheDocument();
});

it('keeps world rules and tone baseline on the world surface', () => {
  render(<WorldSection ... />);
  expect(screen.getByLabelText('世界规则 / 禁忌 / 异常性质')).toBeInTheDocument();
  expect(screen.getByLabelText('文风基线')).toBeInTheDocument();
});

it('renders the relationship area as a valid empty state on the character surface', () => {
  render(<CharacterSection relationshipState="empty" ... />);
  expect(screen.getByText(/连续会话/)).toBeInTheDocument();
});

it('offers an explicit remove action for the selected location', () => {
  render(<WorldSection ... />);
  expect(screen.getByRole('button', { name: '删除地点' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the new surface tests to verify RED**

Run: `npm test -- src/app/edit/__tests__/WorldSection.test.tsx src/app/edit/__tests__/CharacterSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: FAIL because the split surface components do not exist yet.

- [ ] **Step 3: Implement the new world and character sections**

```tsx
<WorldSection
  value={draftWorldBase}
  onChange={setDraftWorldBase}
  onSubmit={handleWorldBaseSave}
  onReset={handleWorldBaseReset}
/>

<CharacterSection
  value={draftWorldBase}
  relationshipState="empty"
  onChange={setDraftWorldBase}
  onSubmit={handleWorldBaseSave}
  onReset={handleWorldBaseReset}
/>
```

Implementation notes:
- WorldSection owns world text, locations, and supporting cast
- keep `worldBaseSetting`, `worldRules`, and `toneBaseline` together on the world surface
- CharacterSection owns hero, core cast, antagonists, and the empty relationship panel
- the location rail must support add, select, and edit for multiple entries rather than a single static detail form
- the location detail area must also expose an explicit remove action for the currently selected location
- switching between location entries must preserve unsaved edits inside the shared world draft until explicit save or reset
- keep the existing brutalist component language from the mixed section
- if `WorldBaseCastSection.tsx` becomes a dead extraction artifact, delete it and update imports/tests in the same task

- [ ] **Step 4: Re-run the split-surface tests to verify GREEN**

Run: `npm test -- src/app/edit/__tests__/WorldSection.test.tsx src/app/edit/__tests__/CharacterSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: PASS for dedicated world/character rendering and the truthful empty relationship state.

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/sections/WorldSection.tsx src/app/edit/sections/CharacterSection.tsx src/app/edit/EditWorkbench.tsx src/app/edit/__tests__/WorldSection.test.tsx src/app/edit/__tests__/CharacterSection.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
git add -u src/app/edit/sections/WorldBaseCastSection.tsx
git commit -m "feat: split world and character editor surfaces"
```

## Task 5: Add optional scene location references and deterministic save blockers

**Files:**
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/types/story-package.ts`
- Modify: `src/authoring/sections/scene-phase-authoring.ts`
- Modify: `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
- Modify: `src/authoring/persistence/bridge.ts`
- Modify: `src/authoring/persistence/repository.ts`
- Test: `src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
- Test: `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
- Test: `src/authoring/persistence/__tests__/bridge.test.ts`

- [ ] **Step 1: Write the failing scene-location tests**

```ts
it('omits locationIds when no locations are selected', () => {
  const rendered = renderScenePhaseAuthoring(currentState, {
    ...draft,
    sceneSpec: { ...draft.sceneSpec, locationIds: [] },
  });
  expect(rendered.sceneSpec.locationIds).toBeUndefined();
});

it('blocks save when a scene references a removed location', async () => {
  const result = await saveSectionDraft({
    sectionId: 'worldbase-cast',
    payload: { uiFields: { locations: [] } },
  });
  expect(result.kind).toBe('save_blocked');
  expect(result.blockingIssues).toContainEqual(expect.stringContaining('scene'));
});
```

- [ ] **Step 2: Run the scene-location tests to verify RED**

Run: `npm test -- src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx src/authoring/persistence/__tests__/bridge.test.ts`

Expected: FAIL because `locationIds` and referential blockers do not exist yet.

- [ ] **Step 3: Implement location selection and bridge validation**

```ts
export interface ScenePhaseSceneDraft {
  sceneName: string;
  openingSituation: string;
  startPoint: string;
  endLine: string;
  openingHook: string;
  castMode: 'unset' | 'explicit';
  cast?: string[];
  locationIds?: string[];
}
```

Implementation notes:
- add `locationIds: z.array(z.string()).optional()` to `SceneSpecSchema`
- keep the field optional and omit it when empty
- wire authored world locations from `EditWorkbench` into `ScenePhaseAuthoringSection` as explicit props before building the multi-select UI
- let `ScenePhaseAuthoringSection` render a multi-select location picker using authored locations from `worldBase`
- in bridge validation, scan the current package for scenes that still reference the location IDs being removed
- when blocking a delete, include the referencing scene names or scene IDs in `blockingIssues`
- surface the same blocker summary through the page-top status area and helper panel so the author knows what must be cleared first
- do not make location selection required

- [ ] **Step 4: Re-run the scene-location tests to verify GREEN**

Run: `npm test -- src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx src/authoring/persistence/__tests__/bridge.test.ts`

Expected: PASS for optional references, omit-when-empty behavior, and save blockers on broken references.

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/EditWorkbench.tsx src/types/story-package.ts src/authoring/sections/scene-phase-authoring.ts src/app/edit/sections/ScenePhaseAuthoringSection.tsx src/authoring/persistence/bridge.ts src/authoring/persistence/repository.ts src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx src/authoring/persistence/__tests__/bridge.test.ts
git commit -m "feat: add scene location references"
```

## Task 6: Move page-local status into the page top area while keeping helper guidance on the right

**Files:**
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/shared/PageHelperPanel.tsx`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`

- [ ] **Step 1: Write the failing status-surface tests**

```tsx
it('shows the active page save result above the current surface', () => {
  renderWorkbench({ activeSection: 'worldbase-cast', worldBaseSaveStatus: '已保存。' });
  expect(screen.getByText('已保存。')).toBeInTheDocument();
});

it('keeps helper guidance visible on the right panel', () => {
  renderWorkbench({ activeSection: 'worldbase-cast' });
  expect(screen.getByText(/PAGE HELPER/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the status-surface tests to verify RED**

Run: `npm test -- src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: FAIL because page-top status handling is not explicit for the split surfaces yet.

- [ ] **Step 3: Implement top-of-page status rendering**

```tsx
{activeLocalStatusMessage ? (
  <section className="panel edit-page-status" aria-label="当前页状态">
    <p>{activeLocalStatusMessage}</p>
  </section>
) : null}
```

Implementation notes:
- surface save results, blockers, and warnings near the page content top
- keep helper panel for summary, context, and secondary guidance
- do not duplicate full diagnostics content into both surfaces

- [ ] **Step 4: Re-run the status-surface tests to verify GREEN**

Run: `npm test -- src/app/edit/__tests__/EditWorkbench.test.tsx`

Expected: PASS for page-top status visibility plus right-panel continuity.

- [ ] **Step 5: Commit**

```bash
git add src/app/edit/EditWorkbench.tsx src/app/edit/shared/PageHelperPanel.tsx src/app/edit/__tests__/EditWorkbench.test.tsx
git commit -m "feat: move edit status to page-top surfaces"
```

## Task 7: Add the bounded read-only sidecar-agent surface to the console

**Files:**
- Create: `src/agents/agent-surface.ts`
- Create: `src/app/edit/sections/AgentSurfacePanel.tsx`
- Modify: `src/agents/gossipelog/definition.ts`
- Modify: `src/agents/registry.ts`
- Modify: `src/authoring/persistence/package-state.ts`
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/sections/PackageWiringValidationSection.tsx`
- Test: `src/authoring/persistence/__tests__/package-state.test.ts`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Test: `src/app/edit/__tests__/PackageWiringValidationSection.test.tsx`
- Test: `src/types/__tests__/type-conformance.test.ts`

- [ ] **Step 1: Write the failing agent-surface tests**

```tsx
it('renders the gossipelog agent as a read-only console card', () => {
  render(<PackageWiringValidationSection ... />);
  expect(screen.getByText('gossipelog agent')).toBeInTheDocument();
  expect(screen.getByText(/relationship/i)).toBeInTheDocument();
});

it('does not render raw YAML from the state file', () => {
  render(<AgentSurfacePanel items={[fixture]} />);
  expect(screen.queryByText(/relationshipsBySource/)).not.toBeInTheDocument();
});

it('loads bounded agent surface data with the editor package payload', async () => {
  const loaded = await loadAuthoringState('sample-scene');
  expect(loaded.agentSurfaceItems?.[0]).toMatchObject({
    agentId: 'gossipelog',
    displayName: 'gossipelog agent',
  });
});
```

- [ ] **Step 2: Run the agent-surface tests to verify RED**

Run: `npm test -- src/authoring/persistence/__tests__/package-state.test.ts src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/PackageWiringValidationSection.test.tsx src/types/__tests__/type-conformance.test.ts`

Expected: FAIL because the read-only agent panel and responsibility metadata do not exist yet.

- [ ] **Step 3: Implement the bounded agent card surface**

```ts
export const gossipelogAgentDefinition = {
  agentId: 'gossipelog',
  displayName: 'gossipelog agent',
  responsibilitySummary: 'Tracks persisted relationship state after accepted beats.',
  skillIds: ['relationship-update-skill', 'relationship-injection-skill'],
  packageConfigPath: 'agents/gossipelog/config.yaml',
  packageStatePath: 'agents/gossipelog/character-relationships.yaml',
} as const;
```

Implementation notes:
- build the summary on the server side in a focused helper such as `src/agents/agent-surface.ts`
- extend `loadAuthoringState(...)` so `EditWorkbench` receives bounded agent surface items together with the package payload
- host the panel inside `PackageWiringValidationSection`
- render only true sidecar agents from the shared registry
- show bounded summary fields such as present/missing/invalid, last updated time if available, and one short status line
- never dump YAML, node IDs, or editable controls into the UI

- [ ] **Step 4: Re-run the agent-surface tests to verify GREEN**

Run: `npm test -- src/authoring/persistence/__tests__/package-state.test.ts src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/PackageWiringValidationSection.test.tsx src/types/__tests__/type-conformance.test.ts`

Expected: PASS for read-only rendering, bounded summary behavior, and registry-backed metadata.

- [ ] **Step 5: Commit**

```bash
git add src/agents/agent-surface.ts src/app/edit/sections/AgentSurfacePanel.tsx src/agents/gossipelog/definition.ts src/agents/registry.ts src/authoring/persistence/package-state.ts src/app/edit/EditWorkbench.tsx src/app/edit/sections/PackageWiringValidationSection.tsx src/authoring/persistence/__tests__/package-state.test.ts src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/PackageWiringValidationSection.test.tsx src/types/__tests__/type-conformance.test.ts
git commit -m "feat: add read-only agent surface to console"
```

## Task 8: Run the full verification gate and perform the Phase 1 UI/UX review

**Files:**
- Modify only if verification or review exposes real issues
- Check: `docs/superpowers/specs/2026-04-02-phase-1-model-surface-design.md`
- Check: `task_plan.md`
- Check: `progress.md`

- [ ] **Step 1: Run the focused edit/authoring verification batch**

Run:

```bash
npm test -- src/app/edit/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/WorldSection.test.tsx src/app/edit/__tests__/CharacterSection.test.tsx src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx src/app/edit/__tests__/PackageWiringValidationSection.test.tsx
npm test -- src/authoring/sections/__tests__/worldbase-cast.test.ts src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/authoring/persistence/__tests__/bridge.test.ts src/story-packages/__tests__/world-base-compat.test.ts src/types/__tests__/type-conformance.test.ts
```

Expected: PASS across the new Phase 1 routing, structured location, scene reference, and console surface coverage.

- [ ] **Step 2: Run repository verification**

Run:

```bash
npm run lint
npm run type-check
npm run type-check:simulation
npm test
npm run build
```

Expected: all commands PASS.

- [ ] **Step 3: Run the manual UI/UX review against the spec checklist**

Checklist:
- `世界` and `角色` read as separate surfaces but still feel like one product
- location rail/detail inherits the same brutalist interaction rhythm as the current character rail
- relationship area is visibly present and honestly empty
- top status sits near the edited surface and helper guidance still lives on the right
- no rounded cards, polished SaaS drift, soft shadows, or visual style fork

- [ ] **Step 4: Sync plan/progress documents and close the implementation slice**

```bash
git add task_plan.md findings.md progress.md
git commit -m "docs: sync phase1 implementation progress"
```
