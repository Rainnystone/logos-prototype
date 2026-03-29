# Scene Cast Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a proper Scene Cast editor to the Narrative Editor so authors can choose which shared core characters and antagonists enter a Scene, write that choice straight into `scene.yaml.cast`, and preserve the difference between legacy unset Scenes and explicit empty selection.

**Architecture:** Keep shared characters in `world-base.yaml` and treat Scene Cast as a Scene-level reference list only. Introduce one focused authoring helper for cast candidate extraction plus save normalization, then let the editor page hold an editor-only `unset | explicit` mode so old Scenes do not silently change meaning. The UI stays inside `ScenePhaseAuthoringSection`, but the cast picker itself lives in a dedicated component so interaction rules, brutalist styling, and persistence semantics stay isolated and testable.

**Tech Stack:** Next.js, React 19, TypeScript, Zod, YAML, Vitest, Testing Library

---

## File Map

- `src/authoring/sections/scene-cast.ts`
  Build Scene Cast candidate lists from shared WorldBase data and normalize saved IDs by dropping hero, removing stale entries, deduplicating, and preserving shared-library order.
- `src/authoring/sections/__tests__/scene-cast.test.ts`
  Cover ordering, stale-ID cleanup, hero exclusion, and empty/explicit behavior for the new cast helper.
- `src/authoring/sections/scene-phase-authoring.ts`
  Extend the Scene draft shape with `cast` plus `castMode`, load legacy unset state correctly, and render `scene.yaml.cast` only when the Scene is explicit.
- `src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
  Lock the `unset` versus `explicit` semantics and verify render output for explicit empty cast and normalized cast ordering.
- `src/authoring/persistence/bridge.ts`
  Accept the new Scene Cast UI payload shape and pass editor-only mode through the shared save bridge.
- `src/authoring/persistence/__tests__/bridge.test.ts`
  Prove no-op saves preserve absent `cast`, explicit empty saves write `cast: []`, stale IDs are removed on save, and hidden `samplePurpose` content is not deleted by this page.
- `src/app/edit/sections/SceneCastSelector.tsx`
  Render the new brutalist Scene Cast component with summary strip, expandable grouped pools, direct chip removal, warning chips for stale IDs, and hidden implicit hero behavior.
- `src/app/edit/__tests__/SceneCastSelector.test.tsx`
  Cover collapsed-by-default behavior, summary copy, expand/collapse, card toggling, and stale warning rendering in isolation.
- `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
  Replace the current `示例用途` block with the new Scene Cast selector and wire it into the page draft.
- `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
  Prove the page now shows Scene Cast instead of `示例用途`, updates draft state through the selector, and keeps the rest of the page layout intact.
- `src/app/edit/EditWorkbench.tsx`
  Pass the shared WorldBase character library into the Scene page so the selector can render current candidates without duplicating data.
- `src/app/__tests__/fixtures.ts`
  Update app-level fixtures so `sceneSpec.cast` contains only non-hero IDs.
- `src/story-packages/sample-scene/scene.yaml`
  Keep the sample package aligned with the non-hero-only Scene Cast contract.
- `src/story-packages/__tests__/sample-scene.test.ts`
  Assert that sample Scene Cast values exclude the hero and still resolve against the shared character library.
- `src/engine/__tests__/story-loader.test.ts`
  Keep runtime semantics covered by proving absent `cast` still means “load all shared characters,” while explicit Scene Cast continues to filter only non-hero roles.

### Task 1: Lock Scene Cast Semantics In Tests First

**Files:**
- Create: `src/authoring/sections/__tests__/scene-cast.test.ts`
- Modify: `src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
- Modify: `src/authoring/persistence/__tests__/bridge.test.ts`
- Modify: `src/engine/__tests__/story-loader.test.ts`
- Modify: `src/story-packages/__tests__/sample-scene.test.ts`

- [ ] **Step 1: Write the failing cast-helper tests**

Add tests for candidate extraction and save normalization, including hero exclusion, duplicate removal, stale-ID removal, and shared-library ordering.

- [ ] **Step 2: Run the helper test to verify it fails**

Run: `npm exec vitest run src/authoring/sections/__tests__/scene-cast.test.ts`
Expected: FAIL because the helper file does not exist yet.

- [ ] **Step 3: Extend the failing scene-phase authoring tests**

Add coverage for three draft/render cases: legacy Scene with no `cast` loads as `castMode: 'unset'`, explicit empty cast renders `cast: []`, and explicit cast saves in shared-character order instead of click order.

- [ ] **Step 4: Run the scene-phase authoring test to verify it fails**

Run: `npm exec vitest run src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
Expected: FAIL because the draft model does not yet support `castMode` or cast normalization.

- [ ] **Step 5: Extend the failing bridge and runtime tests**

Add save-path coverage for preserving absent `cast` on untouched legacy Scenes, writing explicit empty `cast: []`, dropping stale IDs on save, and preserving existing `samplePurpose` when this page saves; add loader coverage proving absent `cast` still loads the full shared cast.

- [ ] **Step 6: Run the bridge, loader, and sample package tests to verify they fail**

Run: `npm exec vitest run src/authoring/persistence/__tests__/bridge.test.ts src/engine/__tests__/story-loader.test.ts src/story-packages/__tests__/sample-scene.test.ts`
Expected: FAIL because the current editor/save path cannot preserve `unset` state and the sample fixture still includes the hero in `sceneSpec.cast`.

### Task 2: Implement Scene Cast Authoring Semantics And Save Normalization

**Files:**
- Create: `src/authoring/sections/scene-cast.ts`
- Modify: `src/authoring/sections/scene-phase-authoring.ts`
- Modify: `src/authoring/persistence/bridge.ts`
- Modify: `src/authoring/sections/__tests__/scene-cast.test.ts`
- Modify: `src/authoring/sections/__tests__/scene-phase-authoring.test.ts`
- Modify: `src/authoring/persistence/__tests__/bridge.test.ts`

- [ ] **Step 1: Implement the Scene Cast helper**

Create one focused helper module that derives selectable `coreCast` and `antagonists` entries from `worldBase`, tracks stale IDs separately, and normalizes explicit saves against the current shared library.

- [ ] **Step 2: Extend the scene-phase draft model**

Add `cast?: string[]` and `castMode: 'unset' | 'explicit'` to the authoring draft, load absent `sceneSpec.cast` as legacy unset, and remove `samplePurpose` from this page’s editable controls while still preserving any existing underlying value through save.

- [ ] **Step 3: Render Scene cast with correct save semantics**

Update `renderScenePhaseAuthoring()` so untouched legacy Scenes preserve an absent `cast`, explicit empty selections save `cast: []`, and explicit selections save normalized non-hero IDs only.

- [ ] **Step 4: Teach the shared save bridge the new payload**

Update `extractScenePhaseAuthoringDraft()` so it accepts `cast` plus `castMode`, keeps malformed inputs safe, and forwards the explicit/unset distinction into the existing deterministic save path.

- [ ] **Step 5: Run the authoring tests to verify they pass**

Run: `npm exec vitest run src/authoring/sections/__tests__/scene-cast.test.ts src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/authoring/persistence/__tests__/bridge.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the authoring semantics layer**

```bash
git add src/authoring/sections/scene-cast.ts src/authoring/sections/scene-phase-authoring.ts src/authoring/persistence/bridge.ts src/authoring/sections/__tests__/scene-cast.test.ts src/authoring/sections/__tests__/scene-phase-authoring.test.ts src/authoring/persistence/__tests__/bridge.test.ts
git commit -m "feat: add scene cast authoring semantics"
```

### Task 3: Build The Scene Cast Selector UI In TDD Order

**Files:**
- Create: `src/app/edit/sections/SceneCastSelector.tsx`
- Create: `src/app/edit/__tests__/SceneCastSelector.test.tsx`
- Modify: `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
- Modify: `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`

- [ ] **Step 1: Write the failing selector component tests**

Cover the component in isolation: collapsed by default, summary strip always visible, neutral legacy placeholder copy, explicit empty copy, expandable grouped pools, direct chip removal, and disabled warning chips for stale IDs.

- [ ] **Step 2: Run the selector component test to verify it fails**

Run: `npm exec vitest run src/app/edit/__tests__/SceneCastSelector.test.tsx`
Expected: FAIL because the selector component does not exist yet.

- [ ] **Step 3: Update the failing page-level section tests**

Replace expectations around the `示例用途` textarea with expectations for the Scene Cast block, while keeping the existing phase-rail and page-structure assertions intact.

- [ ] **Step 4: Run the section UI test to verify it fails**

Run: `npm exec vitest run src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
Expected: FAIL because the page still renders `示例用途` and has no Scene Cast interactions.

- [ ] **Step 5: Implement the selector and wire it into the page**

Build a dedicated brutalist `SceneCastSelector` component, feed it the draft’s `cast`/`castMode` plus shared candidates, and replace the old `示例用途` block inside `ScenePhaseAuthoringSection` without changing the rest of the page layout.

- [ ] **Step 6: Run the selector and section tests to verify they pass**

Run: `npm exec vitest run src/app/edit/__tests__/SceneCastSelector.test.tsx src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit the editor UI**

```bash
git add src/app/edit/sections/SceneCastSelector.tsx src/app/edit/__tests__/SceneCastSelector.test.tsx src/app/edit/sections/ScenePhaseAuthoringSection.tsx src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx
git commit -m "feat: add scene cast selector to scene authoring"
```

### Task 4: Wire Shared Candidates Through The Workbench And Align Fixtures

**Files:**
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Modify: `src/app/__tests__/fixtures.ts`
- Modify: `src/story-packages/sample-scene/scene.yaml`
- Modify: `src/story-packages/__tests__/sample-scene.test.ts`
- Modify: `src/engine/__tests__/story-loader.test.ts`

- [ ] **Step 1: Write the failing workbench and fixture adjustments**

Update `EditWorkbench.test.tsx` so it fails until the Scene page receives shared cast candidates from package state, then update fixture expectations so `sceneSpec.cast` contains only non-hero IDs and add assertions where needed that the hero remains implicit rather than listed.

- [ ] **Step 2: Run the workbench, fixture, and loader tests to verify they fail**

Run: `npm exec vitest run src/app/edit/__tests__/EditWorkbench.test.tsx src/story-packages/__tests__/sample-scene.test.ts src/engine/__tests__/story-loader.test.ts`
Expected: FAIL because `EditWorkbench` does not yet pass candidate data and current fixtures still encode the hero inside `sceneSpec.cast`.

- [ ] **Step 3: Pass shared character candidates into the Scene page**

Update `EditWorkbench` so `ScenePhaseAuthoringSection` receives current `hero`, `coreCast`, and `antagonists` data from the loaded package rather than reconstructing candidate state locally.

- [ ] **Step 4: Align fixture data with the final contract**

Update app fixtures and `src/story-packages/sample-scene/scene.yaml` so Scene Cast stores only non-hero IDs while runtime behavior still keeps the hero available.

- [ ] **Step 5: Run the wiring tests to verify they pass**

Run: `npm exec vitest run src/engine/__tests__/story-loader.test.ts src/story-packages/__tests__/sample-scene.test.ts src/app/edit/__tests__/EditWorkbench.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit the wiring and fixture alignment**

```bash
git add src/app/edit/EditWorkbench.tsx src/app/__tests__/fixtures.ts src/story-packages/sample-scene/scene.yaml src/story-packages/__tests__/sample-scene.test.ts src/engine/__tests__/story-loader.test.ts
git commit -m "refactor: align scene cast fixtures with editor contract"
```

### Task 5: Final Verification And Browser QA

**Files:**
- Modify: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Modify: `src/app/edit/__tests__/page.test.tsx`
- Modify: `src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.test.ts`

- [ ] **Step 1: Add any missing regression coverage around page wiring**

Make sure page-level tests still prove the Scene page renders through the unified editor shell, that section saves keep using the existing route, and that saving this page does not delete preserved `samplePurpose` content.

- [ ] **Step 2: Run the focused UI and route tests**

Run: `npm exec vitest run src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/page.test.tsx src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.test.ts`
Expected: PASS

- [ ] **Step 3: Run the quality gates**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Run the type check**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Perform real browser verification**

Open the Narrative Editor, navigate to `场景与阶段`, verify the new Scene Cast block visually matches the existing brutalist style, confirm collapsed-by-default behavior, select and remove characters, save, reload, and confirm the Scene Cast persists correctly into the page state and runtime-facing data. Also verify three high-risk cases manually: an untouched legacy Scene still saves without creating `cast`, stale characters show warning state before save and disappear only after save, and existing `samplePurpose` content remains preserved even though it is no longer editable on this page.

- [ ] **Step 7: Commit the final regressions and verification work**

```bash
git add src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/page.test.tsx src/app/api/authoring/packages/[packageName]/sections/[sectionId]/route.test.ts
git commit -m "test: verify scene cast editor end to end"
```
