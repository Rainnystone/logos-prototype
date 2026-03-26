# Editor Shell Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the redundant edit-page shell with one compact `LOGOS Narrative Editor` shell, move section navigation into horizontal top tabs, shrink the helper into a small top-right panel, and preserve all save/run behavior.

**Architecture:** The shared edit shell in `src/app/edit/` becomes the single layout control point. Shared shell tests lock the new title, tab placement, and helper contract first, then each of the four section pages adapts to the reclaimed layout width without changing persistence or runtime behavior.

**Tech Stack:** Next.js 15, React 19, TypeScript, TailwindCSS, Vitest, Testing Library

---

## File Structure

### Shared shell and tests

- Modify: `src/app/edit/EditWorkbench.tsx`
  - Collapse the old edit hero into the new compact top shell and remove the special embedded helper path.
- Modify: `src/app/edit/shared/SectionTabs.tsx`
  - Turn the section navigation into compact horizontal tabs inside the top shell.
- Modify: `src/app/edit/shared/PageHelperPanel.tsx`
  - Reduce helper content to the compact contract from the approved spec.
- Modify: `src/app/globals.css`
  - Replace the old three-column shell styling with the compact top-strip shell layout and responsive rules.
- Modify: `src/app/edit/__tests__/EditWorkbench.test.tsx`
  - Lock the new shell title, top tabs, compact helper, and the removal of the scene-only helper exception.
- Modify: `src/app/edit/__tests__/page.test.tsx`
  - Update entry-page expectations to the new shell wording.

### Section-specific adaptation

- Modify: `src/app/edit/sections/WorldBaseCastSection.tsx`
  - Rebalance the page for the wider shell and keep the horizontal cast rails intact.
- Modify: `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
  - Remove helper embedding and reflow the page to fit the uniform shell.
- Modify: `src/app/edit/sections/ControlModulesSection.tsx`
  - Rebalance the stack/editor composition to take advantage of the wider main workspace.
- Modify: `src/app/edit/sections/PackageWiringValidationSection.tsx`
  - Reframe overview and detail layout inside the new shared shell width.
- Modify: `src/app/edit/__tests__/WorldBaseCastSection.test.tsx`
- Modify: `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
- Modify: `src/app/edit/__tests__/ControlModulesSection.test.tsx`
- Modify: `src/app/edit/__tests__/PackageWiringValidationSection.test.tsx`
  - Keep section-level behavior covered after layout refit.

### Spec and plan references

- Reference: `docs/superpowers/specs/2026-03-26-logos-editor-shell-unification-design.md`
- Reference: `archive/docs/narrative-editor-redesign/uiux rehaul/uiux-rehaul-context.md`

---

### Task 1: Lock the new shell behavior with failing tests

**Files:**
- Modify: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Modify: `src/app/edit/__tests__/page.test.tsx`
- Reference: `src/app/edit/EditWorkbench.tsx`

- [ ] **Step 1: Write the failing shared-shell assertions**

```tsx
expect(screen.getByRole('heading', { name: 'LOGOS Narrative Editor' })).toBeInTheDocument();
expect(screen.queryByRole('heading', { name: 'LOGOS Authoring Editor' })).not.toBeInTheDocument();
expect(screen.getByRole('navigation', { name: 'Editor sections' })).toHaveClass('edit-top-tabs');
expect(screen.getByText('Shell status')).toBeInTheDocument();
```

- [ ] **Step 2: Run the targeted shell tests to verify they fail**

Run: `npm test -- src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/page.test.tsx`
Expected: FAIL because the old heading and layout structure are still rendered.

- [ ] **Step 3: Commit the red test changes**

```bash
git add src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/page.test.tsx
git commit -m "test: lock unified editor shell expectations"
```

### Task 2: Implement the compact shared shell

**Files:**
- Modify: `src/app/edit/EditWorkbench.tsx`
- Modify: `src/app/edit/shared/SectionTabs.tsx`
- Modify: `src/app/edit/shared/PageHelperPanel.tsx`
- Modify: `src/app/globals.css`
- Test: `src/app/edit/__tests__/EditWorkbench.test.tsx`
- Test: `src/app/edit/__tests__/page.test.tsx`

- [ ] **Step 1: Replace the old edit hero and three-column shell with the new compact top shell**

```tsx
<section className="panel edit-shell">
  <div className="edit-shell__bar">
    <div className="edit-shell__identity">
      <p className="panel-eyebrow">Unified Editor Shell</p>
      <h1>LOGOS Narrative Editor</h1>
    </div>
    {pageHelperPanel}
  </div>
  <SectionTabs ... />
</section>
```

- [ ] **Step 2: Remove the scene-only helper embedding path and make all pages use one helper contract**

Run: update `EditWorkbench.tsx` so `helperPanel` is no longer passed into `ScenePhaseAuthoringSection`, and remove the scene-only shell sizing branch that still rewrites the shared grid for that page.
Expected: `ScenePhaseAuthoringSection` no longer depends on an embedded helper prop, and all four pages use the same shared shell structure.

- [ ] **Step 3: Refit `SectionTabs` and `PageHelperPanel` to the new compact shell contract**

```tsx
<nav className="edit-top-tabs" aria-label="Editor sections">...</nav>
<aside className="edit-helper-panel edit-helper-panel--compact">...</aside>
```

- [ ] **Step 4: Update the shell CSS with responsive top-strip, folder-like tabs, and compact helper rules**

Run: edit `src/app/globals.css` classes for `.edit-layout`, tabs, helper, and shell spacing.
Expected: no left navigation rail, no permanent third outer column, wider content canvas.

- [ ] **Step 5: Run the targeted shared-shell tests to verify they pass**

Run: `npm test -- src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/page.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit the shared shell implementation**

```bash
git add src/app/edit/EditWorkbench.tsx src/app/edit/shared/SectionTabs.tsx src/app/edit/shared/PageHelperPanel.tsx src/app/globals.css src/app/edit/__tests__/EditWorkbench.test.tsx src/app/edit/__tests__/page.test.tsx
git commit -m "feat: unify edit shell layout"
```

### Task 3: Adapt WorldBase & Cast to the reclaimed layout

**Files:**
- Modify: `src/app/edit/sections/WorldBaseCastSection.tsx`
- Modify: `src/app/edit/__tests__/WorldBaseCastSection.test.tsx`

- [ ] **Step 1: Add a failing layout-focused assertion for the wider two-zone page composition**

```tsx
expect(screen.getByRole('region', { name: 'WorldBase workspace' })).toBeInTheDocument();
expect(screen.getByRole('region', { name: 'Character editor column' })).toBeInTheDocument();
```

- [ ] **Step 2: Run the section test to verify it fails**

Run: `npm test -- src/app/edit/__tests__/WorldBaseCastSection.test.tsx`
Expected: FAIL because the page does not yet expose the new layout markers or composition.

- [ ] **Step 3: Rebalance the page structure for the wider shell without changing editing behavior**

Run: adjust grid widths, card spacing, and section wrappers in `WorldBaseCastSection.tsx`.
Expected: world blocks and rails stay on the left, focused character editor stays on the right, actions remain unchanged.

- [ ] **Step 4: Run the section test to verify it passes**

Run: `npm test -- src/app/edit/__tests__/WorldBaseCastSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the WorldBase adaptation**

```bash
git add src/app/edit/sections/WorldBaseCastSection.tsx src/app/edit/__tests__/WorldBaseCastSection.test.tsx
git commit -m "feat: refit worldbase cast layout"
```

### Task 4: Adapt Scene & Phase Authoring to the uniform shell

**Files:**
- Modify: `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
- Modify: `src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`

- [ ] **Step 1: Write the failing test that removes the embedded helper requirement**

```tsx
expect(screen.queryByText('Helper marker')).not.toBeInTheDocument();
expect(screen.getByRole('region', { name: 'Scene phase workspace' })).toBeInTheDocument();
```

- [ ] **Step 2: Run the section test to verify it fails**

Run: `npm test -- src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
Expected: FAIL because the current page still renders the helper inside the detail column.

- [ ] **Step 3: Rework the page layout for the new wider shell and remove helper-panel wiring**

Run: remove the `helperPanel` prop dependency, refit the grid, preserve scene block, rail, slider, and selected phase editor.
Expected: page structure stays intact, but helper no longer occupies page-local space.

- [ ] **Step 4: Run the section test to verify it passes**

Run: `npm test -- src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the Scene & Phase adaptation**

```bash
git add src/app/edit/sections/ScenePhaseAuthoringSection.tsx src/app/edit/__tests__/ScenePhaseAuthoringSection.test.tsx
git commit -m "feat: refit scene phase layout"
```

### Task 5: Adapt Control Modules to the wider workspace

**Files:**
- Modify: `src/app/edit/sections/ControlModulesSection.tsx`
- Modify: `src/app/edit/__tests__/ControlModulesSection.test.tsx`

- [ ] **Step 1: Add the failing layout assertion for the new control workspace split**

```tsx
expect(screen.getByRole('region', { name: 'Control stack column' })).toBeInTheDocument();
expect(screen.getByRole('region', { name: 'Module editor column' })).toBeInTheDocument();
```

- [ ] **Step 2: Run the section test to verify it fails**

Run: `npm test -- src/app/edit/__tests__/ControlModulesSection.test.tsx`
Expected: FAIL because the current section does not expose the new composition markers.

- [ ] **Step 3: Rebalance stack and editor widths without changing module save behavior**

Run: update layout wrappers, spacing, and card density in `ControlModulesSection.tsx`.
Expected: left stack reads more clearly and active module editor gets more width.

- [ ] **Step 4: Run the section test to verify it passes**

Run: `npm test -- src/app/edit/__tests__/ControlModulesSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the Control Modules adaptation**

```bash
git add src/app/edit/sections/ControlModulesSection.tsx src/app/edit/__tests__/ControlModulesSection.test.tsx
git commit -m "feat: refit control modules layout"
```

### Task 6: Adapt Package Wiring & Validation to the new shell

**Files:**
- Modify: `src/app/edit/sections/PackageWiringValidationSection.tsx`
- Modify: `src/app/edit/__tests__/PackageWiringValidationSection.test.tsx`

- [ ] **Step 1: Add the failing test for the overview/detail layout under the compact shell**

```tsx
expect(screen.getByRole('region', { name: 'Package overview column' })).toBeInTheDocument();
expect(screen.getByRole('region', { name: 'Selected diagnostics detail' })).toBeInTheDocument();
```

- [ ] **Step 2: Run the section test to verify it fails**

Run: `npm test -- src/app/edit/__tests__/PackageWiringValidationSection.test.tsx`
Expected: FAIL because the page does not yet expose the new layout contract.

- [ ] **Step 3: Reframe the diagnostics page to use the wider shared shell cleanly**

Run: adjust layout wrappers, spacing, and detail column framing in `PackageWiringValidationSection.tsx`.
Expected: overview remains dominant, detail stays readable, role of the page remains diagnostic rather than authoring-first.

- [ ] **Step 4: Run the section test to verify it passes**

Run: `npm test -- src/app/edit/__tests__/PackageWiringValidationSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the Package Wiring adaptation**

```bash
git add src/app/edit/sections/PackageWiringValidationSection.tsx src/app/edit/__tests__/PackageWiringValidationSection.test.tsx
git commit -m "feat: refit package validation layout"
```

### Task 7: Final integration verification

**Files:**
- Verify: `src/app/edit/**`
- Verify: `src/app/globals.css`
- Verify: `docs/superpowers/specs/2026-03-26-logos-editor-shell-unification-design.md`

- [ ] **Step 1: Run the full UI test suite**

Run: `npm run test:ui`
Expected: PASS

- [ ] **Step 2: Run static verification**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Run type checking**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 4: Run the app locally and visually inspect all four edit pages**

Run: `npm run dev`
Expected: each page shows one shell title, top tabs, compact top-right helper, and wider main editing space.

- [ ] **Step 4a: Smoke-check the diagnostics helper contract on the package page**

Run: open the package wiring page in the browser after the shell change.
Expected: the compact helper still shows the global diagnostics summary and a shortened repair-order preview instead of disappearing or expanding back into a full-height side panel.

- [ ] **Step 5: Commit the final integration pass**

```bash
git add src/app/edit src/app/globals.css
git commit -m "chore: verify unified editor shell rollout"
```
