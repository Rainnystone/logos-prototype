# LOGOS Title Page Replacement Design

## 1. Overview

This design replaces the current `/` dashboard with a new LOGOS title page.
The new page becomes the canonical destination for:

- first entry at `localhost:3000`
- every `Return to Title` action
- the visual home for runtime provider setup before entering either workbench

This is not a small copy refresh of the old dashboard.
It retires the dashboard framing and replaces it with a title-page experience
that feels like the front cover of a literary creation tool.

## 2. Approved Direction

The approved direction is the refined **B** variant from the visual companion,
with one further spatial rule confirmed by the user:

- the page is one unified visual field, not two disconnected left/right blocks
- the title composition sits in the middle-left area
- the provider setup cabinet sits in the middle-right area
- both sides have similar visual weight
- the outer edges keep clear whitespace
- the page should feel centered, calm, and symmetrical rather than crowded

## 3. Core Visual Contract

### 3.1 Overall Composition

The title page is a single-screen composition with generous outer whitespace.
The visual center sits inside the page rather than touching the edges.

The page should not contain extra explanatory copy outside the two main
elements. It should read as:

1. left title composition
2. right provider setup cabinet

Nothing else should compete with those two areas.

### 3.2 Left Title Composition

The left title composition contains exactly three stacked text layers:

1. `LOGOS`
2. the full expansion:
   `Linguistic Oriented Game Orchestration Studio`
3. handwritten `prototype`

Hard rules:

- `LOGOS` is the largest text on the page
- the width of `LOGOS` should visually align with the full expansion below it
- the three layers are vertically stacked
- the whole stack belongs in the middle-left zone, not as a full-width hero
- typography must scale fluidly with viewport size
- the large `LOGOS` treatment should use a fade treatment inside the letters
- `prototype` remains small and handwritten, used as a quiet accent rather than a headline

### 3.3 Right Provider Setup Cabinet

The provider setup lives in the middle-right zone as a cabinet of similar
importance to the title stack.

Hard rules:

- do not let the provider card occupy the whole right half
- keep it visually balanced with the left title zone
- include only the setup card content and its action row
- no extra dashboard prose outside the card

Inside the cabinet:

- `Provider Setup`
- `Provider`
- `API Key`
- `Model`
- `Base URL` when required by provider choice
- `Save Runtime Config`
- `Play Workbench`
- `Narrative Editor`

The action buttons must use the same overall scale and family.

## 4. Runtime Config Ownership

The provider inputs on the title page and the provider inputs in the workbench
must write to the same code-level location.

Approved implementation boundary:

- keep one shared runtime-config storage key and save/load utility
- keep one shared config shaping rule
- do not create a second persistence path for the title page
- do not let the title page and workbench drift into separate provider states

Current code already has this shared path:

- `src/app/runtime-config.ts`
- `ConfigPanel` already saves through that shared helper
- `PlayWorkbench` already reads the same stored config on boot

Approved direction for implementation:

- reuse the existing runtime-config helpers directly
- prefer reusing `ConfigPanel` behavior instead of rebuilding save logic
- if the visual presentation needs a different shell, split presentation from save logic rather than duplicating persistence behavior

This is the smallest and safest path because it preserves one source of truth.

## 5. Navigation Contract

The title page replaces the old dashboard as the root route.

Approved navigation consequences:

- `/` shows the new title page
- every `Return to Title` link points back to `/`
- the title page `Play Workbench` button opens `/play`
- if a current package is already known, preserve it in the play link
- the title page `Narrative Editor` button opens the editor at `worldbase-cast`
- if a current package is already known, preserve it in the editor link

The title page may still surface the available sample package context, but that
context must not reintroduce the old dashboard feeling.

## 6. Scope of Replacement

This design replaces the current root dashboard surfaces:

- `LOGOS Sample Dashboard` heading treatment
- dashboard intro copy
- package-selector-first framing
- old dashboard CTA grouping

This design does not change:

- workbench runtime flow
- editor save semantics
- narrative editor shell structure
- provider config storage format

## 7. Likely Implementation Surfaces

Primary surfaces:

- `src/app/page.tsx`
- `src/app/components/StoryPackageSelector.tsx`
- `src/app/components/ConfigPanel.tsx`
- `src/app/runtime-config.ts`
- `src/app/globals.css`

Likely supporting tests:

- `src/app/__tests__/page.test.tsx`
- `src/app/__tests__/select.test.tsx`
- `src/app/components/__tests__/ConfigPanel.test.tsx`
- `src/app/__tests__/layout.test.tsx`

Potential refactor surface if visual divergence grows:

- extract a small shared runtime-config form core from `ConfigPanel`
- keep title-page and workbench shells separate while sharing one save behavior

## 8. Implementation Risks To Cover In Planning

The implementation plan must explicitly cover these impacts:

1. Root-route replacement risk
   - `/` can no longer assume a dashboard-first content hierarchy
2. Shared provider state risk
   - title page and workbench must remain synchronized through one save/load path
3. Navigation drift risk
   - `Return to Title`, `Play Workbench`, and `Narrative Editor` must resolve correctly from all relevant surfaces
4. Visual regression risk
   - the new title page must not collapse back into a generic dashboard or two disconnected side-by-side cards
5. Package-context risk
   - if a selected package is passed through links, it must remain stable across title, play, and editor entrypoints

## 9. Verification Requirements

The work is only complete when all of the following are true:

1. Visiting `/` shows the new title page instead of the old sample dashboard
2. All `Return to Title` actions resolve back to the new title page
3. The left title stack and right provider cabinet appear as balanced mid-screen elements with outer whitespace
4. The page contains no unnecessary extra explanatory copy
5. Saving provider config on the title page updates the same stored config used by the workbench
6. The title-page `Play Workbench` and `Narrative Editor` actions route correctly
7. The workbench provider setup still reflects the same saved config
8. Automated tests and live desktop verification both pass

## 10. Planning Readiness

This design is ready for implementation planning.

The core decisions are now fixed:

- root dashboard is retired and replaced by a title page
- the approved visual direction is the refined `B` composition
- provider setup on the title page must share the exact same config path as the workbench
- `Return to Title` now means “return to the new title page,” not “return to the old dashboard”
- the upcoming plan must explicitly list the code surfaces and risks affected by that replacement
