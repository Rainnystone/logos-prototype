# LOGOS Narrative Editor Shell Unification

## 1. Overview

This design defines a focused UIUX rehaul for the authoring editor shell under `src/app/edit/`.
The goal is to remove shell redundancy, reclaim horizontal space for the core editing surfaces,
and apply one consistent navigation and helper model across all four authoring pages without
changing save behavior, runtime entry points, or persistence semantics.

The direct user instruction for this work takes priority over older screenshots, existing tests,
and any legacy shell assumptions. If current code, tests, or design notes still encode the old
double-shell structure, they must be rewritten to match this design.

## 2. Problem Statement

The current editor shell has three structural problems:

1. The page identity is split across two stacked headers (`LOGOS Workbench` and
   `LOGOS Authoring Editor`), which makes the shell feel repetitive.
2. The section navigation sits in a separate vertical rail on the left, consuming width that
   should belong to the page-specific editing workspace.
3. The helper region is oversized and inconsistent, including a special embedded treatment for
   `Scene & Phase Authoring`, which breaks shell consistency across the four pages.

These problems are layout problems, not workflow problems. The fix must stay in the UI shell
layer and must not spill into the save pipeline or run pipeline.

## 3. Design Goals

### 3.1 Primary Goals

- Collapse the redundant shell naming into one unified editor identity:
  `LOGOS Narrative Editor`
- Move the four page switches into a compact horizontal tab strip in the top shell
- Restyle the tabs as small macOS-folder-like labels that visually merge with the editor shell
- Shrink the helper into a small rectangular panel at the upper-right of the shell
- Increase the width available to each page's main editing workspace
- Apply the same shell pattern to all four authoring pages

### 3.2 Preservation Goals

- Keep the four official sections and their responsibilities unchanged
- Keep page-level `Submit` and `Reset` behavior unchanged
- Keep `Start Round` and the existing runtime entry flow unchanged
- Keep save normalization and "reopen latest saved state" behavior unchanged
- Keep all existing API routes, persistence wiring, and coordinator-assisted save behavior unchanged

## 4. Chosen Direction

The chosen direction is the approved **B variant** from the visual comparison:

- a compact top shell strip
- one editor title only
- tabs compressed into the same top shell zone
- a smaller helper block on the right side of the top shell
- the main workspace immediately below with less permanent chrome

This is intentionally more space-efficient than the alternatives. The tradeoff is that the shell
feels more like a compact tool strip than a large editorial banner, but this is acceptable because
the user's priority is to give the authoring surfaces more room.

## 5. Shell Contract

### 5.1 Unified Identity

The authoring editor shell must present a single identity:

- Visible title: `LOGOS Narrative Editor`
- No separate `LOGOS Workbench` heading inside the edit page shell
- No second `LOGOS Authoring Editor` title block

This change applies to the edit experience as the new canonical shell wording. Any tests or UI
text that still assume the older two-layer edit shell must be updated.

### 5.2 Horizontal Section Tabs

The four section switches move from the left rail into a horizontal strip in the top shell:

1. `WorldBase & Cast`
2. `Scene & Phase Authoring`
3. `Control Modules`
4. `Package Wiring Validation`

Tab requirements:

- Tabs remain real page navigation, not local state-only switching
- Active state must remain visually explicit
- The strip must wrap or degrade gracefully on smaller widths
- The visual treatment should suggest compact file tabs or folder labels rather than generic pills
- The navigation must continue to work with the existing `section` query parameter

### 5.3 Helper Placement

The page helper becomes a small rectangular shell element in the upper-right area.

Helper requirements:

- Use the same placement model on all four pages
- Reduce height and visual weight compared with the current tall side panel
- Keep only the most important shell status and page guidance content visible at a glance
- Preserve the distinction between page-local helper content and package-wide diagnostics content
- Do not let helper placement reintroduce a third outer column

Minimum helper content contract:

- On normal authoring pages, always keep package name, state source, and active section visible
- If a page has a current save/status message, show it in compact form rather than dropping it
- If coordinator guidance exists, show a short compact summary rather than a full-height block
- `Scene & Phase Authoring` follows the same compact helper contract as the other normal pages
- On `Package Wiring Validation`, keep the global diagnostics summary visible and show only a
  compact repair-order preview; deeper diagnostics detail remains in the main page content

### 5.4 Main Workspace Expansion

The shell must reclaim space from the removed left navigation rail and the reduced helper region.
The central workspace becomes the dominant area again.

Expected outcome:

- more horizontal room for worldbase forms and character editing
- more room for scene configuration and phase editing
- more room for the control stack and selected module editor
- more readable distribution of diagnostics on the package wiring page

## 6. Page-Level Impact

### 6.1 WorldBase & Cast

- Preserve the left-side world-and-cast browsing structure and the horizontal character rails
- Keep the hero, core cast, and antagonist editing model unchanged
- Rebalance widths so the page benefits from the new shell without becoming cramped

### 6.2 Scene & Phase Authoring

- Preserve the scene block, phase rail, explicit rail slider, and selected phase editor
- Remove the current shell exception where the helper is embedded differently from the other pages
- Adapt the page to the same compact shell used elsewhere

### 6.3 Control Modules

- Preserve the left control-chain composition model and the five module areas already assigned
- Allow the control layout to breathe horizontally after the left shell rail is removed

### 6.4 Package Wiring & Validation

- Preserve its role as an overview and diagnostics page rather than a fourth normal content editor
- Keep package health, assembly flow, issue queue, detail view, and diagnostics explanation intact
- Apply the same compact shell framing even though the page's internal role differs from the other three

## 7. Architectural Boundaries

This work is allowed to change:

- the edit-page shell layout
- shell text and hierarchy
- tab placement and presentation
- helper placement, size, and visual treatment
- page-level spacing, width allocation, and responsive layout behavior
- tests and docs that still encode the retired shell

This work is not allowed to change unless an implementation detail makes a purely visual adaptation
impossible:

- persistence routes
- save payload shape
- coordinator request flow
- diagnostics data production
- page submit/reset semantics
- runtime start semantics
- authoring section domain contracts

If a conflict appears, the implementation should prefer adapting the layout layer over modifying
behavioral logic.

## 8. Affected Surfaces

The primary implementation surface is the shared edit shell:

- `src/app/edit/EditWorkbench.tsx`
- `src/app/edit/shared/SectionTabs.tsx`
- `src/app/edit/shared/PageHelperPanel.tsx`
- `src/app/globals.css`

Secondary adaptation surfaces are the four section pages and the tests that currently lock in the
old shell assumptions:

- `src/app/edit/sections/WorldBaseCastSection.tsx`
- `src/app/edit/sections/ScenePhaseAuthoringSection.tsx`
- `src/app/edit/sections/ControlModulesSection.tsx`
- `src/app/edit/sections/PackageWiringValidationSection.tsx`
- `src/app/edit/__tests__/...`

## 9. Responsive and Interaction Requirements

- The compact top shell must remain usable at desktop and tablet widths
- The tab strip must not create brittle breakpoint-specific duplicate components
- The helper must remain readable after shrinking
- Focus states and click affordances must remain clear
- Hover effects may refine affordance but must not cause layout shift
- The layout must not introduce horizontal scrolling at common editor widths

## 10. Verification Requirements

Implementation is only complete when all of the following are true:

1. All four edit pages show one unified shell title: `LOGOS Narrative Editor`
2. The section navigation appears as horizontal top tabs rather than a vertical left rail
3. The helper is reduced to a small upper-right rectangle on all four pages
4. The main editing workspace is visibly wider than before
5. `Submit`, `Reset`, and `Start Round` behavior remain unchanged
6. Reopening after successful save still shows the latest saved state
7. Tests, docs, and page assumptions that referenced the old shell have been updated
8. Visual verification confirms that the new shell works across the four pages

## 11. Non-Goals

- No redesign of the authoring domain model
- No change to the four official section names or their responsibilities
- No addition of draft autosave, multi-scene support, memory systems, or other deferred roadmap items
- No rewriting of page internals beyond what is necessary to fit the new shell
- No migration away from the current Tailwind-first styling approach

## 12. Planning Readiness

This design is ready for implementation planning because it resolves the key product decisions:

- the old double-shell is retired
- the horizontal top tab model is chosen
- the helper is uniformly reduced and repositioned
- the change is explicitly scoped to layout and UI shell behavior
- conflicting old tests and docs are explicitly expected to move with the new design
