# Coordinator-First Authoring Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working authoring editor for LOGOS with shared save flow, four section surfaces, coordinator-assisted saves, and saved-state reopening.

**Architecture:** Add a dedicated authoring route and a server-side save pipeline that every section page and coordinator call shares. Implement the four section surfaces as independent vertical slices on top of that pipeline, then add the global diagnostics dashboard for unresolved cross-section issues.

**Tech Stack:** Next.js 15, React 19, TypeScript, TailwindCSS, Zod, YAML, Vitest

---

## Scope Check

This redesign touches multiple subsystems, but they are tightly coupled by one shared save path and one editor shell. This plan keeps them in a single document while still decomposing work into shippable vertical slices:

1. shared authoring contracts and save path
2. editor shell and saved-state reopening
3. `世界与角色 (WorldBase & Cast)`
4. `故事结构 (Scene & Phase Authoring)`
5. `控制模块 (Control Modules)`
6. `组装与校验 (Package Wiring & Validation)`
7. coordinator integration and final verification

If execution becomes too large for one branch, split Tasks 3-6 into separate execution sessions, but do not fork the save-path design.

Saved-state rule for this plan:

- there is no separate draft store in v1
- “latest saved state” means the current on-disk story package files under `src/story-packages/<packageName>/`
- `src/story-packages/<packageName>/authoring-state.json` is the lightweight marker that distinguishes first-sample boot from a previously saved package
- reopening the editor reloads the current package files and reads `authoring-state.json` only to decide whether the source is `initial-sample` or `latest-saved`

## File Structure

### New authoring core

- Create: `src/authoring/contracts.ts`
- Create: `src/authoring/persistence/bridge.ts`
- Create: `src/authoring/persistence/repository.ts`
- Create: `src/authoring/persistence/reload.ts`
- Create: `src/authoring/persistence/save-results.ts`
- Create: `src/authoring/persistence/package-state.ts`
- Create: `src/authoring/persistence/authoring-status.ts`
- Create: `src/authoring/persistence/__tests__/bridge.test.ts`
- Create: `src/authoring/persistence/__tests__/package-state.test.ts`

### New section mappers/renderers

- Create: `src/authoring/sections/worldbase-cast.ts`
- Create: `src/authoring/sections/scene-phase-authoring.ts`
- Create: `src/authoring/sections/control-modules.ts`
- Create: `src/authoring/sections/package-diagnostics.ts`
- Create: `src/authoring/sections/__tests__/worldbase-cast.test.ts`
- Create: `src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
- Create: `src/authoring/sections/__tests__/control-modules.test.ts`
- Create: `src/authoring/sections/__tests__/package-diagnostics.test.ts`

### New coordinator code

- Create: `src/authoring/coordinator/coordinator.ts`
- Create: `src/authoring/coordinator/dispatch.ts`
- Create: `src/authoring/coordinator/__tests__/coordinator.test.ts`

### New app routes and editor shell

- Create: `src/app/edit/page.tsx`
- Create: `src/app/edit/EditWorkbench.tsx`
- Create: `src/app/edit/shared/SectionTabs.tsx`
- Create: `src/app/edit/shared/PageActionBar.tsx`
- Create: `src/app/edit/shared/PageHelperPanel.tsx`
- Create: `src/app/edit/sections/WorldBaseCastSection.tsx`
- Create: `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
- Create: `src/app/edit/sections/ControlModulesSection.tsx`
- Create: `src/app/edit/sections/PackageWiringValidationSection.tsx`
- Create: `src/app/edit/__tests__/page.test.tsx`
- Create: `src/app/edit/__tests__/EditWorkbench.test.tsx`

### New server entrypoints

- Create: `src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.ts`
- Create: `src/app/api/authoring/packages/[packageName]/coordinator/route.ts`
- Create: `src/app/api/authoring/packages/[packageName]/diagnostics/route.ts`
- Create: `src/app/api/authoring/__tests__/sections-route.test.ts`
- Create: `src/app/api/authoring/__tests__/coordinator-route.test.ts`
- Create: `src/app/api/authoring/__tests__/diagnostics-route.test.ts`

### Existing files that will change

- Modify: `src/app/page.tsx`
- Modify: `src/app/components/StoryPackageSelector.tsx`
- Modify: `src/app/story-package-catalog.ts`
- Modify: `src/engine/story-loader.ts`
- Modify: `src/engine/modules/director-note-layer.ts`
- Modify: `src/engine/modules/light-cone-collapse.ts`
- Modify: `src/engine/modules/prompt-assembler.ts`
- Modify: `src/types/story-package.ts`
- Modify: `src/types/prompt-object.ts`
- Modify: `src/types/audit-question-set.ts`
- Modify: `src/story-packages/sample-scene/world-base.yaml`
- Modify: `src/story-packages/sample-scene/scene.yaml`
- Modify: `src/story-packages/sample-scene/phase-plans.yaml`
- Modify: `src/story-packages/sample-scene/router-lexicon.yaml`
- Modify: `src/story-packages/sample-scene/audit-questions.yaml`
- Create: `src/story-packages/sample-scene/control-modules.yaml`
- Create: `src/story-packages/sample-scene/authoring-state.json`

### Specs and docs that must co-evolve

- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/light-cone-collapse.md`
- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/director-note-layer.md`
- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/prompt-assembler.md`
- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/narrative-router.md`
- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/auditor.md`
- Modify: `archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml`
- Modify: `archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml`
- Modify: `archive/docs/narrative-editor-redesign/*.md` as implementation-confirmation updates only

## Task 1: Shared authoring contracts and save pipeline

**Files:**
- Create: `src/authoring/contracts.ts`
- Create: `src/authoring/persistence/bridge.ts`
- Create: `src/authoring/persistence/repository.ts`
- Create: `src/authoring/persistence/reload.ts`
- Create: `src/authoring/persistence/save-results.ts`
- Create: `src/authoring/persistence/__tests__/bridge.test.ts`
- Test: `src/engine/__tests__/story-loader.test.ts`

- [ ] **Step 1: Write the failing bridge contract tests**

```ts
import { describe, expect, it } from 'vitest';
import { saveSectionDraft } from '@/authoring/persistence/bridge';

describe('saveSectionDraft', () => {
  it('routes page-save and coordinator-save through one pipeline', async () => {
    const result = await saveSectionDraft({
      source: 'page',
      packageName: 'sample-scene',
      sectionId: 'worldbase-cast',
      payload: {},
    });

    expect(result.kind).toBe('save_applied');
  });
});
```

- [ ] **Step 2: Run bridge tests to verify they fail**

Run: `npm run test -- src/authoring/persistence/__tests__/bridge.test.ts`
Expected: FAIL with missing module or missing export errors

- [ ] **Step 3: Implement minimal contracts and save result families**

```ts
export type SectionId =
  | 'worldbase-cast'
  | 'scene-phase-authoring'
  | 'control-modules'
  | 'package-wiring-validation';

export type SaveResultKind =
  | 'save_applied'
  | 'save_applied_with_warnings'
  | 'save_blocked'
  | 'save_failed';
```

- [ ] **Step 4: Implement bridge skeleton with deterministic routing**

```ts
export async function saveSectionDraft(input: SaveRequest): Promise<SaveResult> {
  const candidate = normalizeSaveRequest(input);
  const validated = await validateCandidate(candidate);
  const writeOutput = await persistCandidate(validated);
  const result = await reloadAndSummarize(writeOutput);
  if (result.kind === 'save_applied' || result.kind === 'save_applied_with_warnings') {
    await writeAuthoringStatus(input.packageName, {
      hasSuccessfulSave: true,
      lastSavedAt: new Date().toISOString(),
      lastEditedSection: input.sectionId,
    });
  }
  return result;
}
```

`SaveRequest` must always include `sectionId`, and hybrid sections must also include
an explicit `moduleScope` so all save callers share one contract from the start.

- [ ] **Step 5: Add one shared-path integration test that proves page save and coordinator save use the same route and same bridge**

```ts
it('produces the same save result family for page and coordinator entrypoints', async () => {
  const fromPage = await saveSectionDraft(pageRequest);
  const fromCoordinator = await saveSectionDraft(coordinatorRequest);
  expect(fromPage.kind).toBe(fromCoordinator.kind);
});
```

- [ ] **Step 6: Re-run bridge and loader tests**

Run: `npm run test -- src/authoring/persistence/__tests__/bridge.test.ts src/engine/__tests__/story-loader.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/authoring src/engine/__tests__/story-loader.test.ts
git commit -m "feat: add shared authoring save pipeline"
```

## Task 2: Saved-state reopening and editor shell

**Files:**
- Create: `src/authoring/persistence/package-state.ts`
- Create: `src/authoring/persistence/authoring-status.ts`
- Create: `src/authoring/persistence/__tests__/package-state.test.ts`
- Create: `src/app/edit/page.tsx`
- Create: `src/app/edit/EditWorkbench.tsx`
- Create: `src/app/edit/shared/SectionTabs.tsx`
- Create: `src/app/edit/shared/PageActionBar.tsx`
- Create: `src/app/edit/shared/PageHelperPanel.tsx`
- Create: `src/app/edit/__tests__/page.test.tsx`
- Create: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Modify: `src/app/components/StoryPackageSelector.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write failing tests for latest-saved-state preference**

```ts
it('prefers latest saved package state over initial sample values', async () => {
  const state = await loadAuthoringState('sample-scene');
  expect(state.source).toBe('latest-saved');
});
```

- [ ] **Step 2: Run the new state and page tests**

Run: `npm run test -- src/authoring/persistence/__tests__/package-state.test.ts src/app/edit/__tests__/page.test.tsx`
Expected: FAIL with missing route/state loader

- [ ] **Step 3: Implement package-state loader around the current package files, not a separate draft store**

```ts
export async function loadAuthoringState(packageName: string): Promise<AuthoringStateLoadResult> {
  const currentPackage = await loadCurrentPackageFiles(packageName);
  const status = await loadAuthoringStatus(packageName);
  return {
    source: status.hasSuccessfulSave ? 'latest-saved' : 'initial-sample',
    state: currentPackage,
  };
}
```

`authoring-state.json` should stay tiny:

```json
{
  "hasSuccessfulSave": true,
  "lastSavedAt": "2026-03-25T14:30:00.000Z",
  "lastEditedSection": "worldbase-cast"
}
```

- [ ] **Step 4: Build `/edit` shell with section tabs, page action bar, and helper panel slots**

```tsx
<EditWorkbench
  packageName={selectedPackageName}
  activeSection={requestedSection ?? 'worldbase-cast'}
  initialState={authoringState}
/>
```

- [ ] **Step 5: Update the dashboard to offer “Open Editor” beside “Open Scene”**

```tsx
<Link href={`/edit?storyPackage=${encodeURIComponent(entry.packageName)}`}>Open Editor</Link>
```

- [ ] **Step 6: Re-run UI tests**

Run: `npm run test:ui -- src/app/edit src/app/components/StoryPackageSelector.tsx`
Expected: PASS

- [ ] **Step 6.5: Add one explicit reopen test**

```ts
it('reopens from latest-saved after one successful section submit', async () => {
  await saveSectionDraft(validWorldBaseSave);
  const reopened = await loadAuthoringState('sample-scene');
  expect(reopened.source).toBe('latest-saved');
});
```

- [ ] **Step 7: Commit**

```bash
git add src/app src/authoring/persistence/package-state.ts
git commit -m "feat: add editor shell and saved-state reopening"
```

## Task 3: `世界与角色 (WorldBase & Cast)` vertical slice

**Files:**
- Create: `src/authoring/sections/worldbase-cast.ts`
- Create: `src/authoring/sections/__tests__/worldbase-cast.test.ts`
- Create: `src/app/edit/sections/WorldBaseCastSection.tsx`
- Modify: `src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.ts`
- Modify: `src/story-packages/sample-scene/world-base.yaml`
- Test: `src/story-packages/__tests__/sample-scene.test.ts`

- [ ] **Step 1: Write failing renderer tests for hero, core cast, antagonists, supporting cast, and location blocks**

```ts
it('renders supporting cast into lightweight npcCharacters entries', () => {
  const output = renderWorldBase(sampleInput);
  expect(output.npcCharacters).toContain('竹田启司：');
});
```

- [ ] **Step 2: Run the worldbase tests and confirm failure**

Run: `npm run test -- src/authoring/sections/__tests__/worldbase-cast.test.ts`
Expected: FAIL with missing renderer

- [ ] **Step 3: Implement deterministic `world-base.yaml` rendering**

```ts
export function renderWorldBase(input: WorldBaseCastDraft): WorldBase {
  return {
    mainCharacters: renderMainCharacters(input),
    npcCharacters: renderSupportingCast(input),
    locationPatch: renderLocationPatch(input),
  };
}
```

- [ ] **Step 4: Build the page surface with left summary rail, right editor, page-level submit/reset, and `页面助手`**

```tsx
<WorldBaseCastSection
  value={draft}
  onSelectCharacter={setSelectedCharacterId}
  onSubmit={handleSectionSubmit}
  onReset={handleSectionReset}
/>
```

- [ ] **Step 5: Connect this section to the shared save route**

Run: `npm run test -- src/authoring/sections/__tests__/worldbase-cast.test.ts src/story-packages/__tests__/sample-scene.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/authoring/sections/worldbase-cast.ts src/app/edit/sections/WorldBaseCastSection.tsx src/story-packages/sample-scene/world-base.yaml
git commit -m "feat: add worldbase and cast authoring slice"
```

## Task 4: `故事结构 (Scene & Phase Authoring)` vertical slice

**Files:**
- Create: `src/authoring/sections/scene-phase-authoring.ts`
- Create: `src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
- Create: `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
- Modify: `src/story-packages/sample-scene/scene.yaml`
- Modify: `src/story-packages/sample-scene/phase-plans.yaml`
- Modify: `src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.ts`
- Test: `src/engine/modules/__tests__/phase-gradient.test.ts`

- [ ] **Step 1: Write failing tests for deterministic scene/phase mapping**

```ts
it('keeps phaseId stable and recalculates phaseIndex from order', () => {
  const output = applyScenePhasePatch(existingState, reorderPatch);
  expect(output.phasePlans[0].phaseId).toBe(existingState.phasePlans[1].phaseId);
  expect(output.phasePlans[0].phaseIndex).toBe(1);
});
```

- [ ] **Step 2: Run the section tests and confirm failure**

Run: `npm run test -- src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
Expected: FAIL with missing mapper

- [ ] **Step 3: Implement scene and phase patch application**

```ts
export function applyScenePhasePatch(
  current: ScenePhaseAuthoringState,
  patch: ScenePhasePatch,
): ScenePhaseAuthoringState {
  return reindexPhases(applyPatch(current, patch));
}
```

- [ ] **Step 4: Implement the UI with scene block, horizontal phase rail, visible horizontal scrollbar, right-side phase editor, and page action bar**

```tsx
<ScenePhaseAuthoringSection
  value={draft}
  routerOptions={routerOptions}
  onSubmit={handleSectionSubmit}
  onReset={handleSectionReset}
/>
```

- [ ] **Step 5: Enforce selection-only `gradientType` and `routerHint` behavior**

Run: `npm run test -- src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/engine/modules/__tests__/phase-gradient.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/authoring/sections/scene-phase-authoring.ts src/app/edit/sections/ScenePhaseAuthoringSection.tsx src/story-packages/sample-scene/scene.yaml src/story-packages/sample-scene/phase-plans.yaml
git commit -m "feat: add scene and phase authoring slice"
```

## Task 5: `控制模块 (Control Modules)` vertical slice

**Files:**
- Create: `src/story-packages/sample-scene/control-modules.yaml`
- Create: `src/authoring/sections/control-modules.ts`
- Create: `src/authoring/sections/__tests__/control-modules.test.ts`
- Create: `src/app/edit/sections/ControlModulesSection.tsx`
- Modify: `src/engine/story-loader.ts`
- Modify: `src/types/story-package.ts`
- Modify: `src/engine/modules/light-cone-collapse.ts`
- Modify: `src/engine/modules/director-note-layer.ts`
- Modify: `src/engine/modules/prompt-assembler.ts`
- Modify: `src/story-packages/sample-scene/router-lexicon.yaml`
- Modify: `src/story-packages/sample-scene/audit-questions.yaml`

- [ ] **Step 1: Write failing loader and module tests for `control-modules.yaml`**

```ts
it('loads control module customizations alongside existing package files', async () => {
  const storyPackage = await loadStoryPackage('sample-scene');
  expect(storyPackage.controlModules.lightConeCustomization).toBeDefined();
});
```

- [ ] **Step 2: Run core tests to confirm failure**

Run: `npm run test -- src/authoring/sections/__tests__/control-modules.test.ts src/engine/__tests__/story-loader.test.ts`
Expected: FAIL with missing controlModules shape

- [ ] **Step 3: Add shared control source file and package types**

```ts
export const ControlModulesFileSchema = z.object({
  sceneId: z.string(),
  lightConeCustomization: z.object({ /* ... */ }),
  directorNoteAdditions: z.object({ /* ... */ }),
  beatVolumeDefinitions: z.object({ /* ... */ }),
});
```

- [ ] **Step 4: Implement deterministic bridge fan-out**

```ts
switch (moduleScope) {
  case 'router-profile-set':
    return writeRouterLexicon(...);
  case 'auditor-question-set':
    return writeAuditQuestions(...);
  case 'light-cone':
  case 'director-note-additions':
  case 'beat-volume-definitions':
    return writeControlModulesFile(...);
  default:
    throw new Error(`Unsupported moduleScope: ${String(moduleScope)}`);
}
```

- [ ] **Step 5: Build the control-modules page with left stack, right-top active module editor, right-bottom `页面助手`, and auditor add/delete + vertical scroll**

```tsx
<ControlModulesSection
  value={draft}
  activeModule={activeModule}
  moduleScope={activeModule}
  onSubmit={handleSectionSubmit}
  onReset={handleSectionReset}
/>
```

- [ ] **Step 5.5: Lock cross-section safety rules in tests before wiring the page**

```ts
it('keeps audit question ids stable when editing existing questions', () => {
  expect(updateQuestion(existingQuestion).id).toBe(existingQuestion.id);
});

it('blocks deleting a router profile that is still referenced by scene-phase data', async () => {
  await expect(deleteRouterProfile(inUseProfile)).rejects.toThrow(/still referenced/);
});

it('refreshes scene-phase router choices immediately after router-profile save and reload', async () => {
  await saveSectionDraft(validRouterProfileSave);
  const routerChoices = await loadScenePhaseRouterChoices('sample-scene');
  expect(routerChoices).toContain('新路由');
});
```

- [ ] **Step 6: Re-run control, loader, and engine module tests**

Run: `npm run test:core -- src/authoring/sections/__tests__/control-modules.test.ts src/engine/__tests__/story-loader.test.ts src/engine/modules/__tests__/light-cone-collapse.test.ts src/engine/modules/__tests__/director-note-layer.test.ts src/engine/modules/__tests__/prompt-assembler.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/story-packages/sample-scene/control-modules.yaml src/authoring/sections/control-modules.ts src/app/edit/sections/ControlModulesSection.tsx src/engine/story-loader.ts src/types/story-package.ts src/engine/modules/light-cone-collapse.ts src/engine/modules/director-note-layer.ts src/engine/modules/prompt-assembler.ts
git commit -m "feat: add control modules authoring slice"
```

## Task 6: `组装与校验 (Package Wiring & Validation)` diagnostics slice

**Files:**
- Create: `src/authoring/sections/package-diagnostics.ts`
- Create: `src/authoring/sections/__tests__/package-diagnostics.test.ts`
- Create: `src/app/edit/sections/PackageWiringValidationSection.tsx`
- Create: `src/app/api/authoring/packages/[packageName]/diagnostics/route.ts`
- Create: `src/app/api/authoring/__tests__/diagnostics-route.test.ts`

- [ ] **Step 1: Write failing tests for result promotion and diagnostics shaping**

```ts
it('promotes save_applied_with_warnings to diagnostics while keeping local success', () => {
  const view = buildPackageDiagnostics(sampleSaveAppliedWithWarnings);
  expect(view.globalIssues).toHaveLength(1);
});
```

- [ ] **Step 2: Run diagnostics tests to confirm failure**

Run: `npm run test -- src/authoring/sections/__tests__/package-diagnostics.test.ts src/app/api/authoring/__tests__/diagnostics-route.test.ts`
Expected: FAIL with missing diagnostics builder

- [ ] **Step 3: Implement diagnostics builder and route**

```ts
export function buildPackageDiagnostics(input: DiagnosticsInput): PackageDiagnosticsView {
  return {
    packageStatus: summarizePackageStatus(input),
    sectionStatuses: summarizeSections(input),
    globalIssues: collectPromotedIssues(input),
  };
}
```

- [ ] **Step 4: Build the advanced diagnostics dashboard page surface with view/jump/refresh only**

```tsx
<PackageWiringValidationSection
  value={diagnostics}
  onRefresh={handleRefresh}
  onJumpToSection={handleJumpToSection}
/>
```

Do not add ordinary editing actions here. This page is diagnostics-only.

- [ ] **Step 5: Re-run diagnostics tests**

Run: `npm run test -- src/authoring/sections/__tests__/package-diagnostics.test.ts src/app/api/authoring/__tests__/diagnostics-route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/authoring/sections/package-diagnostics.ts src/app/edit/sections/PackageWiringValidationSection.tsx src/app/api/authoring/packages/[packageName]/diagnostics/route.ts
git commit -m "feat: add package diagnostics dashboard"
```

## Task 7: Coordinator integration

**Files:**
- Create: `src/authoring/coordinator/coordinator.ts`
- Create: `src/authoring/coordinator/dispatch.ts`
- Create: `src/authoring/coordinator/__tests__/coordinator.test.ts`
- Create: `src/app/api/authoring/packages/[packageName]/coordinator/route.ts`
- Create: `src/app/api/authoring/__tests__/coordinator-route.test.ts`
- Modify: `src/app/edit/shared/PageHelperPanel.tsx`

- [ ] **Step 1: Write failing tests for section dispatch and shared save path**

```ts
it('sends both direct page save and coordinator-assisted save through the same bridge', async () => {
  const result = await runCoordinatorSave(sampleInvocation);
  expect(result.saveResult.kind).toBe('save_applied');
});
```

- [ ] **Step 2: Run coordinator tests to confirm failure**

Run: `npm run test -- src/authoring/coordinator/__tests__/coordinator.test.ts src/app/api/authoring/__tests__/coordinator-route.test.ts`
Expected: FAIL with missing coordinator implementation

- [ ] **Step 3: Implement narrow dispatch + repair loop controller**

```ts
export async function runCoordinatorSave(input: CoordinatorInvocation) {
  const firstPatch = await dispatchToSectionSkill(input);
  const firstResult = await saveSectionDraft({
    ...input,
    source: 'coordinator',
    moduleScope: resolveModuleScope(input, firstPatch),
    payload: firstPatch,
  });

  if (firstResult.kind !== 'save_blocked') {
    return firstResult;
  }

  if (!firstResult.repairable) {
    return firstResult;
  }

  const repairedPatch = await repairWithSameSkill(input, firstResult.validationErrors);
  const repairedResult = await saveSectionDraft({
    ...input,
    source: 'coordinator',
    moduleScope: resolveModuleScope(input, repairedPatch),
    payload: repairedPatch,
  });

  return repairedResult;
}
```

- [ ] **Step 4: Connect `页面助手` to coordinator results without turning it into the action bar**

```tsx
<PageHelperPanel
  localStatus={saveResult}
  coordinatorSummary={coordinatorSummary}
/>
```

- [ ] **Step 5: Re-run coordinator and UI tests**

Run: `npm run test -- src/authoring/coordinator/__tests__/coordinator.test.ts src/app/api/authoring/__tests__/coordinator-route.test.ts src/app/edit/__tests__/EditWorkbench.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/authoring/coordinator src/app/api/authoring/packages/[packageName]/coordinator/route.ts src/app/edit/shared/PageHelperPanel.tsx
git commit -m "feat: add coordinator-assisted authoring saves"
```

## Task 8: Final spec sync and full verification

**Files:**
- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/light-cone-collapse.md`
- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/director-note-layer.md`
- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/prompt-assembler.md`
- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/narrative-router.md`
- Modify: `archive/vendor/LOGOS-SPEC/04_MODULES/auditor.md`
- Modify: `archive/vendor/LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml`
- Modify: `archive/vendor/LOGOS-SPEC/05_CONTRACTS/audit-question-set-schema.yaml`
- Modify: `archive/docs/narrative-editor-redesign/*.md` where implementation confirms or narrows a design rule

- [ ] **Step 1: Write or extend tests that prove the new save path and new package file load successfully end-to-end**

```ts
it('loads a saved authoring package and starts the play workbench from the saved state shape', async () => {
  const packageState = await loadAuthoringState('sample-scene');
  expect(packageState.state.worldBase).toBeDefined();
});
```

- [ ] **Step 2: Run targeted tests first**

Run: `npm run test:core`
Expected: PASS

- [ ] **Step 3: Run UI tests**

Run: `npm run test:ui`
Expected: PASS

- [ ] **Step 4: Run end-to-end engine tests**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 5: Run lint and type-check**

Run: `npm run lint && npm run type-check`
Expected: PASS

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Sync spec snapshot and redesign docs to the final implemented behavior**

```bash
git add archive/vendor/LOGOS-SPEC archive/docs/narrative-editor-redesign
```

- [ ] **Step 8: Commit**

```bash
git add src archive/vendor/LOGOS-SPEC archive/docs
git commit -m "feat: ship coordinator-first authoring editor"
```

## Execution Notes

- Keep commits small and aligned to task boundaries.
- Do not implement draft autosave; only restore latest successful save.
- Do not add multi-scene, custom beat counts, relationship maps, or package archive UX in this branch.
- Prefer deterministic code for rendering, validation, save result shaping, and reload.
- Use the section docs under `archive/docs/narrative-editor-redesign/` as the implementation source of truth when code needs behavior details.
- Update vendored spec files in the same task where behavior changes become real.

## Definition of Done

The work is complete only when all of the following are true:

1. A user can open `/edit?storyPackage=sample-scene` and move across all four sections.
2. Each of the first three sections has page-level `提交 / 重置`, and both act only on the current section.
3. A successful submit reopens to the latest saved state instead of the initial sample content.
4. Coordinator-assisted saves and direct page saves use the same server-side save path.
5. `world-base.yaml`, `scene.yaml`, `phase-plans.yaml`, `router-lexicon.yaml`, `audit-questions.yaml`, and `control-modules.yaml` are updated only through deterministic bridge logic.
6. The diagnostics page only shows promoted cross-section or package-level issues.
7. The play flow still starts from the existing opening-hook / start button path.
8. Lint, type-check, targeted tests, and full tests all pass.
