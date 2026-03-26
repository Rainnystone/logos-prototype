# LOGOS Title Page Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old root dashboard with the approved LOGOS title page while keeping provider setup on the exact same runtime-config path used by the workbench.

**Architecture:** The root route becomes a dedicated title-page surface rather than a package-selector dashboard. To keep the provider setup stable, extract one shared runtime-config form core and reuse it in both the title page and the existing workbench config panel, while the shared `runtime-config.ts` storage path remains the single source of truth.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library, CSS

---

### Task 1: Lock the root-route replacement contract with failing tests

**Files:**
- Modify: `src/app/__tests__/layout.test.tsx`
- Modify: `src/app/__tests__/page.test.tsx`
- Reference: `src/app/AppShell.tsx`
- Reference: `src/app/page.tsx`

- [ ] **Step 1: Write the failing tests**
  Update the shell and home-page tests so they require the new title behavior:
  - `/` must no longer show the global `LOGOS Workbench` header
  - the old `LOGOS Sample Dashboard` heading must disappear
  - the root page must render the approved title-page entry surface instead
  - the title page must expose `Play Workbench` and `Narrative Editor` actions targeting the selected sample package

- [ ] **Step 2: Run tests to verify they fail**
  Run: `npm test -- src/app/__tests__/layout.test.tsx src/app/__tests__/page.test.tsx`
  Expected: FAIL because the current root still renders the old dashboard and still keeps the global workbench header on `/`.

### Task 2: Extract one shared runtime-config form path before rebuilding the title page

**Files:**
- Create: `src/app/components/RuntimeConfigForm.tsx`
- Modify: `src/app/components/ConfigPanel.tsx`
- Create: `src/app/components/__tests__/RuntimeConfigForm.test.tsx`
- Modify: `src/app/components/__tests__/ConfigPanel.test.tsx`
- Reference: `src/app/runtime-config.ts`

- [ ] **Step 3: Write the failing shared-form tests**
  Add tests that prove:
  - the reusable runtime-config form saves through the existing `logos-adapter-config` storage key
  - it still conditionally shows `Base URL` for `openai-compatible`
  - `ConfigPanel` can keep its existing workbench-specific usage block while delegating input/save behavior to the shared form core

- [ ] **Step 4: Run tests to verify they fail**
  Run: `npm test -- src/app/components/__tests__/RuntimeConfigForm.test.tsx src/app/components/__tests__/ConfigPanel.test.tsx`
  Expected: FAIL because the shared runtime-config form core does not exist yet.

- [ ] **Step 5: Implement the minimal shared form extraction**
  Create a reusable runtime-config form component that owns:
  - provider selection
  - API key / model / base URL inputs
  - save button behavior
  - status message handling

  Keep `src/app/runtime-config.ts` as the only save/load helper. Do not add a second title-page-specific config path.

- [ ] **Step 6: Run tests to verify they pass**
  Run: `npm test -- src/app/components/__tests__/RuntimeConfigForm.test.tsx src/app/components/__tests__/ConfigPanel.test.tsx`
  Expected: PASS

### Task 3: Build the new title page surface and retire the old dashboard framing

**Files:**
- Create: `src/app/components/TitleLandingSurface.tsx`
- Create: `src/app/components/__tests__/TitleLandingSurface.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/globals.css`
- Reference: `src/app/components/StoryPackageSelector.tsx`

- [ ] **Step 7: Write the failing title-surface tests**
  Add tests that require:
  - the approved mid-left `LOGOS` / full-name / `prototype` composition
  - the mid-right `Provider Setup` cabinet
  - `Save Runtime Config`, `Play Workbench`, and `Narrative Editor` inside the title-page tool cabinet
  - package-aware links to `/play?storyPackage=...` and `/edit?storyPackage=...&section=worldbase-cast`
  - a quiet exceptional fallback if no loadable package exists

- [ ] **Step 8: Run tests to verify they fail**
  Run: `npm test -- src/app/components/__tests__/TitleLandingSurface.test.tsx src/app/__tests__/layout.test.tsx src/app/__tests__/page.test.tsx`
  Expected: FAIL because the title page component and shell gating do not exist yet.

- [ ] **Step 9: Implement the new title page**
  Build the new title surface with these rules:
  - one unified visual field
  - generous outer whitespace
  - balanced middle-left title stack and middle-right provider cabinet
  - no leftover dashboard intro copy or package-selector framing
  - root route uses the new title page as the default view
  - `AppShell` hides the global workbench header on `/` just as it already does on `/edit`

  Implementation note:
  Use the first ready package from `listStoryPackageCatalog()` as the default target for play/editor links. Leave the old `StoryPackageSelector` component untouched unless the new title surface truly needs a small part of it.

- [ ] **Step 10: Run tests to verify they pass**
  Run: `npm test -- src/app/components/__tests__/TitleLandingSurface.test.tsx src/app/__tests__/layout.test.tsx src/app/__tests__/page.test.tsx`
  Expected: PASS

### Task 4: Verify return-to-title behavior and cross-surface config reuse

**Files:**
- Modify: `src/app/__tests__/layout.test.tsx`
- Modify: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Modify: `src/app/edit/__tests__/page.test.tsx`
- Reference: `src/app/play/PlayWorkbench.tsx`

- [ ] **Step 11: Add or tighten regression checks**
  Ensure tests cover:
  - `Return to Title` still resolves to `/`
  - `/` now shows the new title page
  - saving config from the shared runtime-config form updates what `PlayWorkbench` later reads from `loadAdapterConfig()`

- [ ] **Step 12: Run the targeted regression suite**
  Run: `npm test -- src/app/__tests__/layout.test.tsx src/app/__tests__/page.test.tsx src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/page.test.tsx src/app/components/__tests__/RuntimeConfigForm.test.tsx src/app/components/__tests__/ConfigPanel.test.tsx`
  Expected: PASS

### Task 5: Full verification and live desktop review

**Files:**
- Modify: none

- [ ] **Step 13: Run broader verification**
  Run: `npm run test:ui`
  Run: `npm run lint`
  Run: `npm run type-check`

- [ ] **Step 14: Run live desktop verification**
  Start the dev server and confirm all of the following at desktop size:
  - `localhost:3000` opens the new title page
  - the title page shows the approved centered composition with outer whitespace
  - provider setup saves successfully
  - `Play Workbench` opens the workbench for the same package
  - `Narrative Editor` opens `worldbase-cast`
  - any `Return to Title` action lands back on the new title page

## Potential Impact Checklist

The implementation must explicitly account for these code impacts:

- `src/app/AppShell.tsx`
  Root-shell header visibility now depends on `/` as well as `/edit`.

- `src/app/page.tsx`
  Root content changes from dashboard composition to title-page composition.

- `src/app/components/ConfigPanel.tsx`
  Provider-setup inputs should delegate to a shared form core instead of being the only owner of that logic.

- `src/app/runtime-config.ts`
  Must remain the only persisted config entry path; changes here should be avoided unless a helper extraction is required.

- Root-route tests
  Existing dashboard assumptions in `src/app/__tests__/page.test.tsx` and `src/app/__tests__/layout.test.tsx` will need replacement.

- Possible dormant code
  `src/app/components/StoryPackageSelector.tsx` may become root-route-dead but can remain in the repo if removing it would create unnecessary churn in this task.
