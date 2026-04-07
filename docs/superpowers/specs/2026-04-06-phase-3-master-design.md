# Phase 3 Package & Storyline Layer Master Design

Date: 2026-04-06
Status: Approved
Scope: `Phase 3: Package & Storyline Layer`

## 1. Why Phase 3 Exists

`Phase 1` stabilized the editor surface and authoring model foundations.
`Phase 2` introduced durable runtime continuity through package-scoped checkpoints and resumable sessions.

What the product still cannot do is the thing an actual author needs next:

- keep multiple alternative progress lines inside one story package
- compare different prompt strategies or authoring choices side by side
- branch from a prior accepted beat without cloning an entire package by hand
- let the editor treat “one storyline” as the real unit of comparison and continuation

Phase 3 exists to close that gap.

The target is not “add a storyline list page.”
The target is to upgrade the product from:

- one package
- one package-global authoring definition
- one current live progress line

into:

- one package as container
- many storylines inside that package
- each storyline having its own authoring variant and active session
- all storylines sharing the same package-scoped immutable checkpoint graph

In other words:

- the unit of author comparison becomes `storyline`
- not `package`
- and not individual `beat`

## 2. Product Goal

Phase 3 should make the following product statements true:

1. A story package can hold multiple named storylines.
2. A storyline is the main author-facing workline for comparison, branching, switching, and continuation.
3. Authoring state is no longer forced to be package-global only.
4. Runtime continuation is no longer forced to be package-global only.
5. Authors can continue the current storyline directly, or create a new storyline from a prior accepted checkpoint and continue there.
6. Storyline management is exposed through a dedicated package/storyline workspace instead of the current diagnostics-first console model.

## 3. Non-Goals

Phase 3 does not try to do all future package tooling at once.

Explicit non-goals:

- no attempt to turn `checkpoint` into a storyline-owned object
- no author-visible raw checkpoint dump browser in the first substrate slice
- no beat-level authoring variants
- no package-wide migration away from YAML authoring files as the authored content format
- no Git-like staging or history-rewrite UX
- no requirement that “new story package scaffolding” be solved before storyline substrate lands
- no pressure to finish every storyline management action in the same implementation slice

## 4. Design Principles

### 4.1 Storyline Is The Main Comparison Boundary

Authors want to compare “what happens if I use a different prompt direction, cast setup, world rule emphasis, or module setup.”

That comparison boundary is too large for `beat`, and too small for `package`.

The right boundary is `storyline`.

### 4.2 Checkpoint Must Stay Package-Scoped And Immutable

`checkpoint` remains a package-scoped immutable continuation node.

This is not negotiable, because the same accepted checkpoint must be allowed to serve as:

- the current head of one storyline
- the branching source of another storyline
- a stable continuation anchor for future replay / resume behavior

If checkpoints became storyline-owned, branching would collapse into history copying instead of reference-based reuse.

### 4.3 Storyline Owns Mutable Workline State

What should move with a storyline is not the checkpoint object itself.
What should move with a storyline is the mutable workline state around it:

- active authoring variant
- active session
- storyline metadata
- current head pointer

### 4.4 Repository Seam Before UI

The package/storyline management UI must consume an already-defined substrate.

UI is not allowed to invent:

- persistence truth
- object ownership
- repository topology
- fallback data contracts

Those must be frozen first.

### 4.5 Use Materialized Variant Workspaces, Not Overlay Magic

For this repo, `authoring variant` is frozen as one physical model only:

- an explicit materialized authoring workspace
- backed by concrete authored files
- stored outside the package-root baseline file set

It is not:

- an overlay patch layer
- a partial fallback tree
- a sometimes-workspace, sometimes-revision-root hybrid

Reason:

- current authoring bridge is deterministic and file-based
- current authored content already lives in concrete YAML files
- a materialized variant workspace is easier to validate, reload, copy, and reason about than a partial overlay graph

This is the cleaner fit for the current architecture, even if it costs more disk space.

### 4.6 Package Creation Is Important, But Not The Foundation

“Create a new story package” matters for product completeness, but it is not the foundational substrate problem.

The foundational problem is:

- multiple storylines inside one package
- with storyline-scoped authoring and continuation

Therefore new package scaffolding should be treated as a separate closeout slice after the storyline workspace lands, not as a prerequisite for the substrate itself.

## 5. Global Object Model

Phase 3 formalizes five first-class objects.

### 5.1 Package

`package` remains the top-level container and namespace boundary.

It owns:

- authored baseline assets
- package-local mutable repository state
- package-local runtime history
- package-local agents and supporting files

It does **not** represent a single authoring line anymore.

### 5.2 Checkpoint

`checkpoint` remains:

- package-scoped
- immutable
- runtime-continuity-first
- opaque-id-based

It continues to represent one accepted continuation anchor.

It does **not** own:

- storyline identity
- storyline name
- storyline archive status
- storyline authoring variant

### 5.3 Storyline

`storyline` becomes the main author-facing workline.

A storyline should own or point to:

- `storylineId`
- human-readable name
- status (`active`, `archived`, or equivalent)
- source checkpoint reference for branch origin
- current head checkpoint reference
- package-level selection state via `activeStorylineId`
- active authoring variant reference
- active session reference
- timestamps and lightweight provenance

Once the explicit storyline repository exists, the package-level `activeStorylineId` must be non-null and resolve to one concrete storyline; only pre-bootstrap legacy compatibility is allowed to operate without that explicit record.

A storyline is the thing authors will:

- continue
- switch to
- rename
- branch from
- delete when safe
- compare against another storyline

### 5.4 Authoring Variant

`authoring variant` is the storyline-bound materialized authoring workspace.

It is responsible for carrying the storyline-specific authored content state for:

- `worldbase`
- `cast`
- `scene-phase`
- `control modules`

The workspace is a concrete file set, not an overlay.

The preferred physical shape is:

- one variant directory per `variantId`
- containing concrete authored files that mirror the authoring baseline file family

At minimum, the workspace should materialize the authored files currently saved through the deterministic bridge:

- `world-base.yaml`
- `scene.yaml`
- `phase-plans.yaml`
- `router-lexicon.yaml`
- `audit-questions.yaml`
- `control-modules.yaml`

It should not be embedded into checkpoints.

Instead:

- a storyline points to an authoring variant
- the variant provides the authored inputs used when the storyline continues

This keeps runtime history and authored configuration meaningfully separate.

Once a storyline has a materialized variant workspace, storyline-aware editor and play reads should resolve against that workspace directly.

They should not silently fall back to package-root baseline authored files.

### 5.5 Session

`session` becomes storyline-bound mutable runtime work state.

In Phase 2, session behavior was package-global in practice.
In Phase 3, session should be understood as:

- a mutable continuation container tied to one storyline
- pointing into the shared checkpoint graph
- carrying `storylineId` explicitly in its owning repository contract

It should carry:

- session lifecycle
- active checkpoint pointer
- any current resumable continuation truth already defined by Phase 2

Phase 3 product behavior freezes:

- one active session per storyline
- one active storyline per package for default `/play` and `/edit` resolution

### 5.6 Storyline Head And Session Invariants

To keep Part 1 implementable, the following invariants are frozen now.

1. `storyline.headCheckpointId` is the storyline’s current official continuation head.
2. `storyline.activeSessionId` points to the storyline’s current active session.
3. `storyline.variantId` is stable after bootstrap or storyline creation in Phase 3 v1; later actions may create a new storyline, but should not rebind an existing storyline to a different variant.
4. When a storyline has an active session, `session.activeCheckpointId` and `storyline.headCheckpointId` must resolve to the same checkpoint.
5. Continuing a storyline and accepting a new beat advances both:
   - `session.activeCheckpointId`
   - `storyline.headCheckpointId`
6. Checkpoint-driven fallback in the management workspace creates a new storyline rooted at the chosen checkpoint:
   - the source storyline remains unchanged
   - the new storyline receives a copied variant workspace
   - the new storyline receives a fresh active session rooted at that checkpoint
   - the workspace may switch the package-level `activeStorylineId` to that new storyline after user confirmation
7. Switching storylines changes the package-level `activeStorylineId`, then resolves that storyline’s:
   - variant workspace
   - active session
   - head checkpoint

This intentionally keeps storyline and active-session semantics simple in Phase 3.
If future phases need one storyline to carry multiple concurrent live sessions, that is a later extension, not a Part 1 requirement.

### 5.7 Ownership Summary

| Object | Scope | Mutable? | Main responsibility |
|---|---|---|---|
| `package` | package | yes, as container state | namespace, assets, repository boundary |
| `checkpoint` | package | no | immutable continuation node |
| `storyline` | package | yes | author-facing workline and comparison unit |
| `authoring variant` | storyline-bound | yes | storyline-specific authored definition |
| `session` | storyline-bound | yes | storyline-specific resumable runtime state |

## 6. Repository Seam And File Topology

### 6.1 Separation Rule

Phase 3 introduces an explicit repository seam between:

- authored baseline package definition
- mutable package/storyline state
- mutable storyline authoring workspaces
- mutable runtime sessions/checkpoints

At the architectural level, the system should no longer behave as if every edit always targets only the package root baseline.

### 6.2 Baseline Authored Definition

The existing package-root YAML files remain the package baseline definition:

- `world-base.yaml`
- `scene.yaml`
- `phase-plans.yaml`
- `router-lexicon.yaml`
- `audit-questions.yaml`
- `control-modules.yaml`

This baseline remains useful as:

- package seed content
- default import/export surface
- package scaffold source
- compatibility anchor

But it should no longer be the only writable authoring target once storyline variants exist.

### 6.3 Mutable Repository Layer

Phase 3 should introduce a package-local repository layer responsible for:

- storyline metadata
- package-level `activeStorylineId`
- active storyline pointer
- authoring variant metadata
- storyline/session binding
- branch provenance

This layer should be explicit and server-owned.

The preferred initial physical topology is:

- package root baseline authored files remain where they are
- `runtime-sessions.json` remains the package-local runtime continuity file
- `storyline-repository.json` is added at package root to store storyline and variant metadata
- `variants/<variantId>/...` stores materialized authored workspaces for storyline-bound variants

The responsibility split is frozen as follows:

| Layer | Responsibility | Must not own |
|---|---|---|
| package-root baseline YAMLs | seed content, scaffold source, compatibility anchor, import/export baseline | storyline-local mutable authoring truth |
| `storyline-repository.json` | `activeStorylineId`, `storylinesById`, `variantsById`, storyline-session binding, branch provenance | checkpoint graph, accepted transcript history |
| `variants/<variantId>/...` | concrete storyline-specific authored files | runtime continuity truth |
| `runtime-sessions.json` | checkpoint graph, session continuity truth, active checkpoint pointer, resumable runtime state | storyline naming, archive state, authoring variant files |

### 6.4 Materialized Variant Workspaces

The preferred Phase 3 direction is:

- each storyline points to a materialized authoring variant workspace
- the workspace stores concrete authored files
- the bridge and loader resolve against that workspace instead of inventing an overlay merge engine

This keeps the authoring pipeline deterministic:

- structured request
- deterministic validation
- file writeback
- reload
- diagnostics

Workspace creation rules are frozen now:

- creating a new storyline materializes a new variant workspace by copying the source storyline’s current variant workspace
- duplicating a storyline materializes a new variant workspace by copying the duplicated storyline’s current variant workspace
- branching from a checkpoint still copies the source storyline’s current variant workspace; only the checkpoint anchor changes
- no storyline creation path in Phase 3 relies on overlay inheritance or deferred first-write materialization

This means `authoring variant` tracks storyline-specific authored intent, while `checkpoint` tracks runtime continuation history.

### 6.5 Runtime Continuity Layer

`runtime-sessions.json` remains the home of runtime continuity truth, but Phase 3 must evolve the ownership semantics:

- sessions become storyline-bound
- checkpoints remain package-scoped immutable nodes
- active continuity in `/play` and `/edit` should resolve through the currently selected storyline

This means `Phase 2`’s package-global behavior becomes a migration starting point, not the final model.

### 6.6 Legacy Compatibility And Lazy Bootstrap Migration

Phase 3 must remain able to open existing Phase 2-era packages.

The compatibility strategy is frozen as:

- lazy bootstrap migration

Read behavior when `storyline-repository.json` is absent:

- treat the package as having one implicit default storyline
- treat the package-root baseline YAMLs as that default storyline’s authored source
- treat the existing Phase 2 active session, when present, as the implicit default storyline’s active session

First Phase 3 write behavior:

- materialize `storyline-repository.json`
- create one default storyline record
- create one default variant workspace by copying the package-root baseline authored files
- bind the default storyline to the current active session if one exists
- otherwise bootstrap a new storyline-bound awaiting-start session through the runtime session layer

After that first write:

- storyline-aware play and edit reads resolve through:
  - `activeStorylineId`
  - that storyline’s variant workspace
  - that storyline’s active session
- routine storyline editing no longer writes directly back to the package-root baseline YAMLs

This preserves compatibility without forcing a one-shot migration step before old packages can open.

## 7. Core Operations

Phase 3 should support the following operation classes at the product level.

### 7.1 Create Storyline

Create a new storyline inside an existing package.

The new storyline must be able to start from:

- the current active checkpoint of another storyline
- or another explicitly chosen checkpoint

The new storyline should receive:

- its own storyline id
- its own authoring variant
- its own active session binding

At the product-contract level:

- creating from another storyline's current state uses that storyline's current head checkpoint as the new anchor
- creating from an explicitly chosen checkpoint uses that selected checkpoint as the new anchor
- the new storyline gets its own bound session rooted at that anchor
- the non-UI substrate primitive may keep switching separate
- but the Part 2 workspace flow is allowed to compose create + switch so the newly created storyline becomes active immediately after the author confirms the row action

### 7.2 Continue Storyline

Continuing a storyline means:

- load that storyline’s authoring variant
- resolve that storyline’s active session
- continue from that storyline’s active checkpoint or current resumable state

In the Part 2 workspace, `continue` remains a row-local action.
If the target row is not already active, the workspace may switch `activeStorylineId` first and then enter the editor continuation flow.

### 7.3 Checkpoint-Driven Fallback As New Storyline

An author should be able to choose an earlier accepted checkpoint and branch from there directly inside the package/storyline workspace.

In Phase 3, that fallback action is no longer modeled as an in-place restart of the same storyline.

Instead, it should:

- use the chosen checkpoint as the continuation anchor
- create a new storyline rather than mutating the source storyline identity
- copy the source storyline’s current authoring variant into a fresh variant workspace
- bind a fresh runtime session rooted at the chosen checkpoint
- assign a system-generated default display name that the author may edit later
- switch the package-level `activeStorylineId` to the new storyline after user confirmation in the workspace flow

This preserves the source line for comparison while still giving the author a fast “go back to beat 2 and try again” workflow.

### 7.4 Switch Storyline

Switching storylines means the editor and play workbench both resolve against:

- another storyline’s authoring variant
- another storyline’s active session
- another storyline’s head pointer

The package-level `activeStorylineId` becomes the default selection source for both `/play` and `/edit`.

### 7.5 Manage Storyline

Storyline management includes:

- rename
- delete
- destructive-action safeguards
- final usability closure

At this point, `rename` has already landed in `Part 2`.
The remaining `Phase 3` mainline management work is therefore centered on safe deletion and the UX needed to make that action trustworthy.
`archive` is intentionally removed from the current phase scope because it no longer has a clear author-facing purpose, and `duplicate` is materially covered by the `Part 2` `create from source` flow.

## 8. Package Creation Boundary

Creating a new story package is a valid product goal for a truly usable editor.

It should be treated as:

- a controlled scaffolding workflow
- server-mediated
- template-backed
- constrained to approved local paths and file sets

It should not block `Part 1`.

Now that `Part 1` substrate and `Part 2` workspace have both landed, package creation is no longer just a companion candidate.

Current placement:

- required `Part 3` delivery
- paired with safe storyline deletion as the final product-completeness closeout for Phase 3

## 9. Part Decomposition

### 9.1 Part 1: Storyline Substrate

Purpose:

- freeze and implement the object substrate

Primary delivery target:

- package-level repository seam
- storyline object contract
- authoring variant contract
- storyline-bound session semantics
- checkpoint-ref model
- non-UI substrate primitives for active-storyline resolution, create-from-source, switch, and branch-from-checkpoint
- lazy bootstrap migration for old packages

Completion means:

- a package can formally contain multiple storylines
- each storyline has its own authoring variant and active session binding
- the system can resolve the active storyline without requiring the new management UI yet
- the server-owned substrate primitives for create / switch / branch already exist before the workspace UI lands
- old Phase 2-era packages still open through implicit-default-storyline compatibility

### 9.2 Part 2: Package & Storyline Workspace

Purpose:

- introduce a real package/storyline workspace as the editor’s default first page, while retaining the console as a diagnostics page

Primary delivery target:

- dedicated `故事包管理` page
- editor-top navigation entry placed before `世界`
- default `/edit` landing target
- package selector showing ready packages by package name only
- storyline list workspace
- restrained storyline rows instead of a wide fact grid
- create storyline
- inline storyline display-name editing
- branch from checkpoint
- switch storyline
- continue storyline
- beat-dot checkpoint rail with dynamic phase / beat growth
- beat-dot checkpoint rail with split-down confirm / cancel interaction

Approved structural reference:

- [`../phase-3/结构布局示意图.png`](../phase-3/结构布局示意图.png)

Completion means:

- storyline substrate is no longer hidden behind internal state only
- authors can use the editor to manage and continue lines directly
- the left selector stays package-first and name-only
- the right workspace stays visually restrained and does not default to package summary / provenance / head-summary fact blocks
- clicking a beat dot opens a confirmation drawer with only `确认` and `取消`, and confirmation creates a new storyline from that checkpoint before switching to it
- the package/storyline workspace, not the diagnostics console, is the default editor entry surface

### 9.3 Part 3: Management Actions And UX Closure

Purpose:

- finish the destructive management surface and close the remaining usability gaps

Primary delivery target:

- delete
- controlled local new story package scaffolding
- bounded failure handling
- empty-state and edge-case UX
- final verification and UI/UX review

Completion means:

- storyline deletion is safe, comprehensible, and bounded
- the package never falls into a “no usable storyline” state
- authors can create a new local package from the workspace and land directly in an explicit `Phase 3` package
- the remaining `Phase 3` storyline-management surface is materially complete for author use

## 10. Global Acceptance Criteria

Phase 3 should only be considered complete when all of the following are true:

1. One package can hold multiple storylines without copying the whole package manually.
2. Authors can compare and continue work at the storyline level.
3. Checkpoints remain package-scoped immutable nodes and can serve multiple storylines.
4. Authoring state is no longer forced to be package-global only.
5. Runtime continuation is no longer forced to be package-global only.
6. The editor has a dedicated package/storyline workspace instead of treating console diagnostics as the fourth/fifth page solution.
7. The implementation remains deterministic at the bridge and persistence boundary.
8. Existing Phase 2-era packages remain openable and can be upgraded through lazy bootstrap migration without manual file surgery.
9. Each implementation part has been verified with targeted tests, full regression, and the required UI/UX review for touched surfaces.

## 11. Deferred Items

The following may be valid future work, but are explicitly outside this master design:

- advanced multi-user collaboration semantics
- Git-like manual merge tooling for authoring variants
- arbitrary history rewrite UX
- generalized package publishing/distribution pipeline
- Phase 4 agent import workflows beyond the boundaries already noted in roadmap discussions
