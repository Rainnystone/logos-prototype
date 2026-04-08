# March Dev Update Phase 3 Part 3 Safe Deletion And Package Creation Design

Date: 2026-04-07
Status: Archived after implementation complete
Scope: `March Dev Update Phase 3 Part 3`
Depends on:
- `2026-04-06-phase-3-master-design.md`
- `2026-04-06-phase-3-part-1-storyline-substrate-design.md`
- `2026-04-06-phase-3-part-2-package-storyline-workspace-design.md`

Reference inputs:
- [`../phase-3/phase 3 part 3.png`](../phase-3/phase%203%20part%203.png)
- [`../phase-3/phase 3 part 3 新增story package视觉参考图.png`](../phase-3/phase%203%20part%203%20新增story%20package视觉参考图.png)
- [`../phase-3/整体视觉参考图 1.png`](../phase-3/整体视觉参考图%201.png)
- [`../phase-3/整体视觉参考图 2.png`](../phase-3/整体视觉参考图%202.png)

## 1. Goal

Part 3 exists to close the remaining gap between the current storyline workspace and a truly usable local authoring editor.

This part should make the following product statements true:

1. authors can delete a storyline safely without corrupting the package
2. deleting the active storyline automatically promotes a nearby remaining storyline as the new active line
3. the editor never lets a package fall into a “no usable storyline” state
4. authors can create a brand-new local story package from inside the workspace
5. a newly created package lands as a native `Phase 3` package instead of an old-style package that still needs bootstrap repair

Part 3 is successful when deletion becomes safe and bounded, and when package creation becomes a first-class local workflow rather than an external manual filesystem task.

## 2. Recommended Approach

Three realistic approaches were considered for the remaining Phase 3 work:

| Approach | Description | Pros | Cons | Recommendation |
|---|---|---|---|---|
| A | Only implement safe storyline deletion and defer package creation again | Smallest implementation slice | Leaves a major product gap: authors still cannot create a package locally | Not recommended |
| B | Implement safe storyline deletion plus local `Phase 3`-native package scaffolding in the same part | Matches the actual remaining product gap; keeps one consistent package-first workspace story | Slightly larger than deletion-only | Recommended |
| C | Add package creation, but generate only a legacy-style baseline folder and rely on later bootstrap | Smaller initial creator | Produces packages that immediately need repair or extra bootstrap semantics | Not recommended |

This spec adopts **Approach B**.

## 3. Includes

- Add a new `新建故事包` action to the left package-selector column.
- Keep that action visually aligned with the approved add-tile reference.
- Let the user create a local package inside `src/story-packages/`.
- Create the package as an explicit `Phase 3`-native package:
  - baseline authored YAML files
  - `storyline-repository.json`
  - `variants/variant_main/...`
  - `runtime-sessions.json`
- Add safe storyline deletion to the workspace.
- Auto-switch active storyline when deleting the currently active row.
- Disable deletion when the package would otherwise be left with no usable storyline.
- Add bounded destructive-action UX and failure feedback for deletion and package creation.
- Add final empty / edge-case UX closure for this surface.

## 4. Explicitly Does Not Include

- No `archive storyline` action.
- No separate generic `duplicate storyline` action.
- No recycle-bin or recovery-bin model.
- No package import / export workflow.
- No user-directory migration away from `src/story-packages/` in this part.
- No cloud or multi-user package creation semantics.
- No story-specific scaffold content.

Part 3 must remain system-agnostic and story-agnostic.

## 5. Design Guardrails

### 5.1 Preserve The Existing LOGOS Visual Language

Part 3 must continue the existing LOGOS neue brutalism shell:

- keep the current mono-led typography hierarchy
- keep hard black borders and offset shadows
- keep square corners
- keep high-contrast surfaces
- keep utility-first copy and restrained information density
- do not introduce glossy modal systems, rounded sheets, or SaaS-style floating cards

The visible structure should remain anchored to:

- [`../phase-3/phase 3 part 3.png`](../phase-3/phase%203%20part%203.png)
- [`../phase-3/phase 3 part 3 新增story package视觉参考图.png`](../phase-3/phase%203%20part%203%20新增story%20package视觉参考图.png)
- [`../phase-3/整体视觉参考图 1.png`](../phase-3/整体视觉参考图%201.png)
- [`../phase-3/整体视觉参考图 2.png`](../phase-3/整体视觉参考图%202.png)

### 5.2 Keep The Workspace Package-First

The package selector remains the left-side index.

Part 3 must not turn package creation into:

- a separate wizard page
- a diagnostics-console command
- a hidden developer-only route

The creation affordance belongs in the selector itself.

### 5.3 Keep Package Creation Server-Mediated

The browser must not attempt direct filesystem writes.

Package creation must be:

- server-owned
- deterministic
- validated before promotion
- bounded to the approved local root

### 5.4 Prefer Explicit Phase 3 Packages, Not Legacy Bootstraps

New packages created by Part 3 must be born in the explicit Phase 3 model.

They should not depend on:

- implicit legacy default storyline inference
- a later save just to materialize storyline state
- a later runtime bootstrap just to make the package structurally valid

### 5.5 Hard Delete Means Product-Level Removal, Not A Recovery Bin

This part adopts true delete semantics at the product level.

That means:

- deleted storylines disappear from the workspace
- there is no user-facing recovery bin
- there is no user-facing archived storage lane

Implementation may still need bounded orphan-handling for crash safety or filesystem cleanup failures, but that is not a product feature and must stay invisible to authors.

## 6. Visual Thesis, Content Plan, And Interaction Thesis

### 6.1 Visual Thesis

The `故事包管理` page remains a sparse monochrome workbench, and Part 3 should add only one new visible idea:

- a low-chrome “new package” insertion tile in the selector column

It should feel like a deliberate extension of the existing workspace, not a new subsystem.

### 6.2 Content Plan

- left rail: ready packages plus one add tile
- right workspace: selected package name and restrained storyline rows
- destructive or creation detail: lightweight inline workspace state, not a standalone management dashboard

### 6.3 Interaction Thesis

Part 3 should add only a small number of noticeable motions:

- add-tile hover / press feedback
- lightweight enter / exit state when package creation mode opens
- bounded destructive confirm transition for storyline delete

Motion must sharpen affordance, not increase spectacle.

## 7. New Story Package UX

### 7.1 Entry Point

The left selector column gains a new package-creation affordance directly below the ready package list.

This entry tile should visually follow the referenced “dashed add tile” idea from:

- [`../phase-3/phase 3 part 3 新增story package视觉参考图.png`](../phase-3/phase%203%20part%203%20新增story%20package视觉参考图.png)

The label is:

- `新建故事包`

This reference freezes the **left-rail add-tile motif only**.
It does not, by itself, freeze the full right-side creation-state layout.

### 7.2 Package Creation Surface

Clicking `新建故事包` should not open a full modal.

Instead, it should switch the right-side workspace into a focused package-creation state while preserving the same shell and left rail.

The creation state is intentionally specified here as an interaction contract, not as a fully frozen visual mock.

It should remain visually light and bounded, and must provide:

- one clear package title
- one required primary input for package name
- one read-only or secondary preview of the generated internal package id / slug
- one primary confirm action
- one cancel action

The left rail remains visible throughout, so the user still feels inside the same package-first workspace.

The exact right-side layout can still be refined by the later Part 3 UI sketch, as long as it does not violate:

- the existing two-column shell
- the restrained LOGOS brutalist language
- the requirement that creation stays inline to the workspace rather than becoming a separate wizard or modal

### 7.3 Package Name Model

The user should supply one author-facing package name.

The system then derives the filesystem-safe `packageName` slug.

Rules:

- the user is not forced to hand-author a raw folder slug
- the resulting package id must be deterministic and visible before confirmation
- collisions must be blocked before write
- validation errors must be shown as inline actionable feedback

### 7.4 Cross-Platform Naming Rules

The generated package slug must be safe on macOS and Windows.

It must:

- stay inside a constrained lowercase slug pattern
- reject empty values
- reject duplicates case-insensitively
- reject Windows reserved names such as `con`, `prn`, `aux`, `nul`, `com1`-`com9`, `lpt1`-`lpt9`
- avoid trailing spaces or dots
- resolve to a path that remains under `src/story-packages/`

### 7.5 Success Behavior

After a package is created successfully:

- the package selector refreshes
- the new package becomes the active package
- the right workspace exits creation mode and shows the new package’s management view
- the new package already contains one default storyline

The flow should not kick the user into another page automatically.
The user should remain inside `故事包管理` and see the newly created package in place.

## 8. New Story Package Data Contract

### 8.1 Physical Root

The package must be created at:

- `src/story-packages/<packageName>/`

### 8.2 Required Authored Baseline Files

Each new package must materialize the baseline authored file family required by the existing loader:

- `world-base.yaml`
- `scene.yaml`
- `phase-plans.yaml`
- `router-lexicon.yaml`
- `audit-questions.yaml`
- `control-modules.yaml`
- `state-snapshots.yaml`

These files must contain valid, schema-conforming, story-agnostic starter content.

### 8.3 Required Phase 3 Repository State

Each new package must also materialize:

- `storyline-repository.json`
- `variants/variant_main/...`
- `runtime-sessions.json`

The default state should be:

- one explicit `storyline_main`
- one explicit `variant_main`
- non-null `activeStorylineId`
- one storyline-bound `awaiting_start` or equivalent initial session state

### 8.4 Creation Flow

The creation flow should behave like a bounded staged write:

1. validate and normalize the requested package name
2. prepare a staging directory under the approved local root
3. write the baseline authored files
4. write the explicit storyline repository and runtime state
5. validate that the newly written baseline YAML package is loadable by the existing package loader
6. validate that the newly written `storyline-repository.json` and `runtime-sessions.json` both pass the current repository / consistency validators
7. promote the staged directory into the final package path
8. refresh workspace state and select the new package

The user-facing product contract is “create once and it is immediately usable.”

“Immediately usable” is a two-layer promise:

- the package must load as a valid story package through the existing YAML loader
- the package must also load as valid explicit `Phase 3` mutable state through the storyline and runtime repositories

### 8.5 Package Creation Server Contract

Part 3 must freeze one explicit server-owned creation seam instead of leaving route shape to implementation guesswork.

Recommended contract:

- `POST /api/authoring/packages`

Minimum request body:

- `displayName`

The server owns:

- slug generation
- cross-platform validation
- duplicate detection
- staged package creation
- loadability validation

Successful response must return enough data for the workspace to switch immediately, at minimum:

- `packageName`
- `activeStorylineId`
- `createdAt`

Failure responses must distinguish:

- invalid display name / invalid generated slug
- duplicate package name
- package root write failure
- scaffold validation failure

After success, the client should switch the workspace by navigating or refreshing into:

- `?storyPackage=<packageName>&section=story-package-management`

Recommended client behavior:

- `router.replace('/edit?storyPackage=<packageName>&section=story-package-management')`
- or an equivalent server-safe navigation that leaves the user inside the same management workspace while selecting the newly created package

## 9. Safe Storyline Deletion UX

### 9.1 What Delete Means

Deleting a storyline removes it from the package’s active management surface.

It also removes the storyline’s private mutable workline state, subject to bounded cleanup semantics.

It does **not** delete:

- package-scoped immutable checkpoints
- other storylines
- package-level baseline files

### 9.2 Delete Availability Rules

Deletion must be unavailable when:

- the target storyline is the last remaining usable storyline in the package

Deletion may remain available when:

- the target storyline is currently active
- there are other remaining storylines that can become active

For Part 3, a `usable storyline` means a storyline whose:

- repository record resolves
- referenced variant resolves
- bound session resolves

### 9.3 Active Storyline Replacement

If the deleted storyline is currently active, the system must automatically promote a nearby remaining storyline as the new active line.

Recommended rule:

- prefer the next visible row in current selector order
- if no next row exists, use the previous visible row

This replacement should happen as part of the same bounded delete operation, not as a second manual repair step.

### 9.4 Delete Confirmation

Delete must require explicit secondary confirmation.

The confirmation UI should:

- stay inside the same workspace language
- avoid introducing a full-screen modal system
- clearly say that the selected storyline will be removed
- clearly say that at least one storyline must remain in the package

Exact visual polish can be refined with the final Part 3 UI sketch, but the interaction contract must remain lightweight and local to the workspace.

### 9.5 Delete Failure Feedback

Delete failures must return bounded, user-facing messages.

Examples:

- cannot delete the last remaining storyline
- target storyline no longer exists
- could not switch active storyline replacement
- package state could not be updated

These should appear as actionable UI feedback, not as generic console-style crash text.

## 10. Safe Storyline Deletion Data Contract

### 10.1 Repository Truth

Deletion removes the storyline from the storyline repository and ensures the resulting repository still has one valid `activeStorylineId`.

### 10.2 Cleanup Scope

Deletion must treat current runtime-session ownership as a real architectural constraint.

Under the current repo model, checkpoints are still stored inside `runtime-sessions.json` session records rather than in a separate package-level checkpoint store.

Therefore deletion must distinguish between:

- storyline-visible state that can disappear immediately
- runtime session / checkpoint data that may still need to remain as hidden continuity truth

Deletion should always clean up:

- the deleted storyline’s variant workspace

Deletion should **not** assume that the deleted storyline’s bound runtime session can always be physically removed.

Default rule:

- remove the storyline binding from the repository
- keep the bound runtime session if removing it would also destroy checkpoint data
- ensure any retained unbound session becomes invisible to normal workspace resolution

The runtime session may be physically removed only when it is provably disposable, for example:

- it is no longer referenced by any storyline
- and it carries no checkpoint history that must remain available
- and removing it does not violate the runtime mirror contract

Workspace cleanup may still need bounded best-effort fallback if the underlying filesystem refuses removal.

If such orphan state remains due to cleanup failure, it must:

- stay invisible to normal workspace resolution
- not reappear as a valid storyline

### 10.3 Checkpoint Preservation

Package-scoped checkpoints remain immutable and shared.

Deleting one storyline must not destroy checkpoints that may still serve:

- another storyline’s history
- future comparisons
- package continuity truth

### 10.4 Delete Transaction Order

The delete flow must freeze one deterministic order so implementation does not invent its own mirror semantics.

Recommended order:

1. resolve the explicit repository context
2. validate that the target storyline is deletable
3. resolve the remaining usable storyline list in current rendered order
4. if the target storyline is active, choose the replacement storyline before writing
5. update active-storyline selection and runtime mirror so the package still has one valid active line
6. remove the target storyline record from the repository
7. perform bounded cleanup of variant workspace and any disposable runtime session data

This order keeps the package out of a transient “no active storyline” state.

## 11. Empty-State And Edge-Case UX

This part should avoid “empty workspace” by invariant rather than by decorative filler.

The key invariants are:

- a package should always retain at least one usable storyline
- `activeStorylineId` should remain non-null
- package creation should always create one default storyline immediately

As a result, the main UX closure points are:

- disabled delete on the last remaining storyline
- clear replacement messaging when deleting the active storyline
- clear package-creation validation feedback
- no ambiguous “empty package but not really broken” state

## 12. Testing And Acceptance Criteria

Part 3 is complete only when all of the following are true:

1. authors can create a new local package from the `故事包管理` workspace
2. the created package is immediately loadable and visible in the selector
3. the created package is explicit `Phase 3` state, not a legacy implicit package
4. authors can delete a storyline safely when at least one other storyline remains
5. deleting the active storyline automatically promotes a nearby remaining storyline
6. deleting the last remaining storyline is impossible through the UI and server seam
7. destructive failures and name-validation failures show bounded actionable feedback
8. all touched surfaces pass targeted tests, full regression, required browser verification, and UI/UX review

## 13. Open Questions Already Narrowed

The following are intentionally narrowed enough for implementation planning, not left as broad blockers:

- exact delete-confirm visual polish will follow the final Part 3 UI sketch, but it must remain local and non-modal
- `new story package` remains repo-local in this part, not user-directory-based
- the scaffold content must be schema-valid and story-agnostic, but the exact placeholder values can be finalized in implementation planning
