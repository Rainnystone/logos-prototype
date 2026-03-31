# Scene & Phase Authoring Page

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: second refreshed section page under the coordinator-first redesign
- Global section map: [../section-map.md](../section-map.md)
- Related bridge doc: [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)
- Related coordinator doc: [../coordinator-agent.md](../coordinator-agent.md)
- Visual references:
  - [scene-phase UIUX参考图.png](scene-phase%20UIUX%E5%8F%82%E8%80%83%E5%9B%BE.png)
  - [../../assets/example.png](../../assets/example.png)
  - [../../superpowers/specs/2026-03-22-ui-hybrid-logic-design.md](../../superpowers/specs/2026-03-22-ui-hybrid-logic-design.md)

## 1. Purpose

This document defines the approved page surface for `故事结构 (Scene & Phase Authoring)`.

This page is a downstream authoring surface.
It must fit:

- the `coordinator`
- the deterministic bridge
- the current runtime-backed `phase-plans.yaml` path
- the approved interaction pattern already established by `世界与角色 (WorldBase & Cast)`

This page should help the author do two things well:

1. define one scene-level narrative frame
2. browse and edit multiple phase entries without losing global story context

## 2. Approved Content Scope

This page currently includes:

- one scene-level configuration block
- a horizontal phase rail
- one selected phase detailed editor
- phase-local control choices that are tightly coupled to phase authoring
- a lower-right `页面助手` block

This page currently does not include:

- the full independent `控制模块 (Control Modules)` page
- cross-package validation wiring
- world / cast editing
- memory system editing

## 3. Approved Field Scope

### 3.1 Scene-Level Fields

The fixed scene block includes:

- scene name
- scene start / opening situation
- main axis
- end line
- opening hook
- `samplePurpose`

### 3.2 Phase-Level Fields

Each phase may expose:

- phase name
- phase goal
- phase end point
- gradient type
- router hint
- note

### 3.3 Selection-Based Control Fields

`gradientType` and `routerHint` should not be treated as free text inputs in
this page.

Approved rule:

- `gradientType` is selected from the runtime-approved gradient value set
- `routerHint` is selected from the active story package's effective router-profile set, for example from the route names currently loaded from [`router-lexicon.yaml`](../../../src/story-packages/sample-scene/router-lexicon.yaml)

That means:

- `routerHint` should use a dropdown menu backed by the currently effective route list
- `gradientType` should use an explicit bounded selector such as dropdown or segmented control
- `routerHint` is author-selected but code-populated; the author never types arbitrary router text
- `gradientType` is author-selected but code-bounded; do not hardcode a second competing option list in the page

Cross-section dependency note:

- this page does not own router profile definitions
- future router-profile create/edit belongs to `控制模块 (Control Modules)`
- this page only consumes the active router-profile set after that section has defined it

Do not make the author type arbitrary gradient or router text in V1.

### 3.4 Code-Generated Fields

These should not be author-facing text inputs in this page:

- `phaseId`
- `phaseIndex`

Approved ownership:

- author enters a normal phase name
- code generates stable `phaseId`
- code generates `phaseIndex` from current order

Do not use the coordinator for mechanical ID generation.

Additional stability rules:

- `phaseId` is code-owned
- generate `phaseId` once when a phase is created
- persist that `phaseId` with the phase entry
- do not regenerate `phaseId` on rename, reorder, or normal text edits
- `phaseIndex` is code-owned and derived from current phase order
- recompute `phaseIndex` whenever phases are added, removed, or reordered
- do not treat either field as an author-editable input

### 3.5 Beat Count Rule In V1

Although future versions may expose custom beat counts, this page should treat
beat count as fixed in V1.

Approved V1 behavior:

- keep the current 4-beat assumption visible where helpful
- do not expose beat count as a user-editable field yet
- do not block future expansion in the layout
- `beatCount` remains code-owned and fixed at `4` in V1
- the page may show a read-only beat count state
- neither the author nor the coordinator sets `beatCount` in V1
- any beat labels or beat slots shown in the page should be derived from that fixed count

### 3.6 Narrative Spine Rule

This page should not present scene fields and phase fields as unrelated form
islands.

The effective narrative spine for this section is:

1. scene start / opening situation
2. main axis
3. each phase goal
4. end line

The page should make that relationship legible:

- scene start and main axis belong together in the scene block
- each phase goal belongs to one phase card + one selected phase editor
- end line remains the scene-level destination

This matters because the current runtime actually carries `mainAxis`,
`phaseGoal`, and `endLine` through to prompt assembly as core narrative fields,
while `routerHint` and `gradientType` act as control handles around that spine.

## 4. Approved UX Layout

This page should deliberately mirror the high-level structure of
`世界与角色 (WorldBase & Cast)` so the redesign reads as one coherent workbench.

### 4.1 Overall Layout

Use a two-column page shell:

- left: light main editing surface
- right: stacked detail column

The right column is split vertically:

- upper panel: selected phase editor and phase-local controls
- lower panel: `页面助手` block

This is an approved layout rule.

### 4.2 Left Side: Independent Scroll Surface

The full left surface must have its own vertical scroll area.

This left surface contains, top to bottom:

1. scene configuration block
2. phase horizontal rail

The author should be able to scroll scene + phase browsing independently from
the right-side detail column.

### 4.3 Left Top: Fixed Scene Block

The scene block is the scene-level equivalent of the hero block in the previous
page:

- one fixed object
- always visible near the top
- not duplicated into the phase rail

It should use a clean grouped-card layout, not one giant textarea wall.

Recommended presentation:

- compact structured fields
- clear hierarchy
- no horizontal rail for scene itself

### 4.4 Left Bottom: Phase Horizontal Rail

The phase rail should follow the current workbench's narrow-card browsing
grammar shown in [`src/app/components/AuthorControlPanel.tsx`](../../../src/app/components/AuthorControlPanel.tsx).

Each phase card should be:

- narrow
- summary-oriented
- horizontally scrollable
- explicitly selectable

The rail should include:

- one card per phase
- one explicit add-phase card or button
- a clear horizontal overflow affordance
- a visible horizontal slider / scrub bar below the card rail for direct left-right dragging

### 4.5 Right Top: Selected Phase Editor

The upper-right panel edits the currently selected phase.

It should be split internally into two layers:

1. a compact control strip
2. the detailed phase form

The control strip contains:

- gradient type
- router hint
- beat count state

For V1:

- gradient type is a bounded selector from approved gradient values
- router hint is a dropdown backed by the active story package's currently effective router-profile set
- neither field should appear as a freeform textarea or arbitrary text input
- if a stored router value is no longer in the loaded route list, show it as stale or invalid and require reselection

This is the approved place to expose phase-local control choices without forcing
the user to jump to the separate `控制模块 (Control Modules)` page.

### 4.6 Right Bottom: `页面助手` Block

The lower-right block follows the same role as the previous page:

- AI assistance trigger
- missing-field or conflict feedback
- save state
- compact page snapshot

This block should be treated as the primary place for handling and explaining
most issues tied to the author's current scene or phase edits.

That includes:

- field gaps
- local conflicts
- invalid current selections
- save-state changes

Do not move this block above the selected phase editor.

### 4.7 Page Actions

This page needs clear page-level actions:

- primary `提交`
- secondary `重置`

Recommended placement:

- in the right-side column as a stable page-level action bar
- aligned with the selected phase editor and the lower-right `页面助手` block
- easy to find without digging into any single phase card or left-side rail area

They should remain easy to find and should not be buried inside a single phase
card.

Approved behavior:

- `提交` applies only to this section page
- it sends the current page's unsaved changes into the existing save / validate / reload path
- `重置` applies only to this section page
- it discards only this page's unsaved changes and returns to the latest successful saved state, or the currently loaded state if no newer save exists

Important boundary:

- these actions do not start the runtime loop
- to observe runtime effects, the user returns to the existing workbench flow and starts from the opening-hook / `Start Round` step

## 5. Approved Summary Card Pattern

The phase rail is for summary browsing, not deep editing.

Each phase card should show:

- phase name
- gradient type
- one-line phase goal summary
- short router hint summary
- a short note excerpt

The note excerpt should display real content, not only a status dot.

The summary card uses display-only snippets derived from existing phase fields.

It does not introduce extra stored author fields for summaries or excerpts.

The horizontal slider is a required part of this interaction pattern.

Do not rely only on trackpad, wheel, or hidden overflow behavior.

Do not place the full phase form inside the phase card.

## 6. Approved Detailed Editor Pattern

Only one phase should be open in the detailed editor at a time.

The selected phase editor should include:

- phase name
- phase goal
- phase end point
- note

The control strip above it should include:

- gradient type
- router hint
- beat count state

This keeps the interaction model consistent:

- browse left
- edit right

## 7. Relation To Control Modules

This page and `控制模块 (Control Modules)` should stay related but not merged.

Approved rule:

- phase-local control choices belong in this page's selected-phase editor
- the full control-modules page still exists as a separate section

This avoids two bad outcomes:

- forcing the author to bounce between pages for every phase edit
- collapsing story structure and control modules into one overloaded page

## 8. TailwindCSS Build Rule

This repo uses TailwindCSS for page construction.

Coding agents should treat that as an explicit build constraint for this page.

Approved rule:

- build the page with Tailwind utility classes and existing design tokens
- reuse established utility patterns from current app components where possible
- avoid introducing page-local plain CSS files or large bespoke CSS blocks for layout

Small additions to shared Tailwind-friendly styling are acceptable only when the
existing utility vocabulary is clearly insufficient, but plain CSS should not be
the default path.

## 9. Existing Code References

### 9.1 Current Phase Rail Reference

Closest interaction reference:

- [`src/app/components/AuthorControlPanel.tsx`](../../../src/app/components/AuthorControlPanel.tsx)

Reuse the interaction grammar, not the literal copy:

- horizontal overflow
- narrow card width
- selected card emphasis
- summary-first browsing

### 9.1.1 Current Runtime Reality

Unlike `world-base.yaml`, the scene and phase data path is already field-driven.

At runtime:

- `scene.yaml`, `phase-plans.yaml`, and `router-lexicon.yaml` are loaded as files
- then their validated fields are consumed separately by orchestrator, router,
  and prompt assembly

This means this page should be designed around structured field ownership, not
around large prose block generation.

### 9.2 Current Workbench Tone Reference

Relevant current references:

- [`src/app/play/PlayWorkbench.tsx`](../../../src/app/play/PlayWorkbench.tsx)
- [`../../assets/example.png`](../../assets/example.png)

Use them to preserve:

- light editing surfaces
- dark technical blocks only where system feedback belongs
- strong left-to-right hierarchy

### 9.3 Previous Redesign Reference

The closest redesign companion page is:

- [../worldbase-and-cast/worldbase-cast-page.md](../worldbase-and-cast/worldbase-cast-page.md)
- [scene-phase UIUX参考图.png](scene-phase%20UIUX%E5%8F%82%E8%80%83%E5%9B%BE.png)

This matters because both refreshed pages should feel like part of the same
authoring suite.

## 10. Coding Agent Build Rules

When building this page, coding agents should follow these rules:

1. keep the page aligned with the `世界与角色` page grammar
2. keep scene as one fixed top block
3. keep phase as a horizontal summary rail
4. keep selected phase editing in the upper-right panel
5. keep `页面助手` in the lower-right panel
6. do not expose `phaseId` as a raw author field
7. do not expose `phaseIndex` as a raw author field
8. do not merge the full control-modules page into this one
9. do not fall back to custom CSS when Tailwind utilities are sufficient
10. do not hide note entirely in the phase summary card; show a short excerpt
11. do not omit the visible horizontal slider below the phase rail
12. do not make `gradientType` a free text field
13. do not make `routerHint` a free text field
14. do not present scene start, main axis, phase goals, and end line as unrelated inputs
15. do not regenerate `phaseId` on rename, reorder, or normal edits
16. do recompute `phaseIndex` from current order after add/remove/reorder
17. do treat `beatCount` as code-owned fixed `4` in V1
18. do treat phase-card summaries as display-only derived snippets
19. do treat `routerHint` options as downstream data from the active router-profile set, not as page-owned definitions

## 11. Pairing Reminder

The matching `scene-phase-authoring-skill` document is now active.

Future coding agents should keep page and skill aligned on:

- scene vs phase field ownership
- code-generated `phaseId` and `phaseIndex`
- fixed V1 beat count
- phase-local control strip behavior
- selection-based `gradientType` and `routerHint`
- the narrative spine relation between scene start, main axis, phase goals, and end line
