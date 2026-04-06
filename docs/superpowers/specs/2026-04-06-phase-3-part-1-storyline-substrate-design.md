# Phase 3 Part 1 Storyline Substrate Design

Date: 2026-04-06
Status: Reviewed, pending user confirmation
Scope: `Phase 3 Part 1`
Depends on: `docs/superpowers/specs/2026-04-06-phase-3-master-design.md`

## 1. Goal

Part 1 exists to make `storyline` a real first-class substrate in the current repo, not just a future UI concept.

This part should establish:

1. a package-local storyline repository seam
2. storyline-bound materialized authoring variant workspaces
3. storyline-bound runtime session ownership
4. lazy bootstrap compatibility for existing Phase 2-era packages
5. default `/play` and `/edit` resolution through `activeStorylineId`

Part 1 is successful when the product can already behave as “one package, many storylines” at the substrate level, even before the dedicated package/storyline management UI lands.

## 2. Includes

- Add a package-local storyline repository file.
- Introduce storyline metadata, variant metadata, and package-level active storyline selection.
- Introduce storyline-bound materialized authoring workspaces.
- Introduce non-UI repository/service primitives for:
  - bootstrap default storyline substrate
  - switch active storyline
  - create storyline from a source storyline
  - branch storyline from a selected checkpoint
- Resolve `/edit` authored reads and writes through the active storyline variant workspace.
- Resolve `/play` runtime continuity through the active storyline’s bound session.
- Add lazy bootstrap migration from Phase 2-era packages with no storyline repository yet.
- Preserve deterministic bridge behavior while changing the target authored workspace.

## 3. Explicitly Does Not Include

- No dedicated package/storyline management page yet.
- No author-visible storyline list or checkpoint picker UI yet.
- No rename / archive / duplicate / delete storyline actions yet.
- No new story package scaffolding workflow yet.
- No first-class duplicate-storyline command yet, even though the underlying variant clone contract is frozen for later reuse.
- No overlay-based authoring inheritance model.
- No checkpoint-owned authoring snapshots.
- No story-specific branching logic or any package-specific special case behavior.

Part 1 must stay system-agnostic and story-agnostic.
It defines substrate rules that work for any story package that matches the shared contracts.

## 4. Design Guardrails

### 4.1 Keep System And Story Decoupled

This part must not introduce logic that depends on:

- one specific story package
- one specific cast arrangement
- one specific scene naming scheme
- hardcoded narrative content

All new repository, variant, storyline, and migration behavior must remain package-generic.

### 4.2 Checkpoint Continues To Mean Runtime Truth

`checkpoint` remains package-scoped immutable runtime continuity truth.

Part 1 must not turn checkpoint into:

- a storyline-owned object
- an authoring variant container
- a place to stash authored YAML snapshots

### 4.3 Variant Continues To Mean Authored Truth

`authoring variant` is the storyline-bound authored truth surface.

That means:

- authored YAML reads and writes must go through the active variant workspace
- package-root baseline YAMLs stop being the normal storyline-aware write target
- bridge validation remains deterministic

### 4.4 Prefer One Simple Ownership Chain

Part 1 should keep the main chain simple:

- package selects one `activeStorylineId`
- storyline points to one `variantId`
- storyline points to one `activeSessionId`
- session points to one `activeCheckpointId`
- storyline keeps one `headCheckpointId`

Anything more complex belongs to a later phase.

## 5. Primary Data Model

### 5.1 Package-Level Storyline Repository

Part 1 introduces:

- `src/story-packages/<packageName>/storyline-repository.json`

Its job is to hold:

- package-level `activeStorylineId`
- `storylinesById`
- `variantsById`
- storyline/session binding
- branch provenance metadata

Recommended top-level shape:

```json
{
  "version": 1,
  "activeStorylineId": "storyline_main",
  "storylinesById": {
    "storyline_main": {
      "storylineId": "storyline_main",
      "name": "Main Line",
      "status": "active",
      "sourceCheckpointId": null,
      "headCheckpointId": "chk_01",
      "variantId": "variant_main",
      "activeSessionId": "sess_01",
      "createdAt": "2026-04-06T10:00:00.000Z",
      "updatedAt": "2026-04-06T10:05:00.000Z"
    }
  },
  "variantsById": {
    "variant_main": {
      "variantId": "variant_main",
      "workspaceRoot": "variants/variant_main",
      "createdFromStorylineId": null,
      "createdAt": "2026-04-06T10:00:00.000Z",
      "updatedAt": "2026-04-06T10:00:00.000Z"
    }
  }
}
```

This file should remain metadata-first.
It must not duplicate runtime checkpoint truth or raw authored YAML content.
Once `storyline-repository.json` exists, `activeStorylineId` must be non-null and resolve to exactly one entry in `storylinesById`; only pre-bootstrap legacy packages are allowed to lack an explicit active storyline record.

### 5.2 Storyline Object

Minimum storyline fields for Part 1:

- `storylineId`
- `name`
- `status`
- `sourceCheckpointId`
- `headCheckpointId`
- `variantId`
- `activeSessionId`
- `createdAt`
- `updatedAt`

Part 1 only requires enough metadata to support:

- one active storyline
- one active session per storyline
- future branch origin display

`headCheckpointId` is allowed to be `null` only when the storyline has not produced or adopted any checkpoint yet.
That case is limited to bootstrap or not-yet-started storyline states.

### 5.3 Variant Object

Minimum variant fields for Part 1:

- `variantId`
- `workspaceRoot`
- `createdFromStorylineId`
- `createdAt`
- `updatedAt`

The variant object is metadata only.
The actual authored content lives in the workspace directory it points to.

### 5.4 Runtime Session Ownership

Part 1 does not replace `runtime-sessions.json`.
It re-anchors it.

The owning fact for storyline/session binding is:

- `storyline-repository.json`

`runtime-sessions.json` remains responsible for:

- session continuity truth
- checkpoint graph
- active checkpoint truth inside the session

That means Part 1 should avoid adding duplicated storyline metadata to runtime session storage as a separate second source of truth.

Part 1 also freezes two mirror rules:

- `runtime-sessions.json.activeSessionId` is a package-level compatibility mirror of the active storyline's `activeSessionId`, not an independent source of truth for storyline binding.
- `storyline.headCheckpointId` is a storyline-facing mirror of the bound session's current checkpoint pointer, not an independent checkpoint graph.

## 6. Filesystem Topology

### 6.1 Package Root

Package root continues to hold:

- authored baseline YAMLs
- `runtime-sessions.json`
- `authoring-state.json`
- `agents/`

Part 1 adds:

- `storyline-repository.json`
- `variants/`

### 6.2 Variant Workspace Layout

Each variant workspace should be materialized at:

- `src/story-packages/<packageName>/variants/<variantId>/`

Each workspace should contain the concrete authored files currently handled by the deterministic bridge:

- `world-base.yaml`
- `scene.yaml`
- `phase-plans.yaml`
- `router-lexicon.yaml`
- `audit-questions.yaml`
- `control-modules.yaml`

This mirrors the authored package baseline file family on purpose.
It allows the bridge and loader to stay deterministic and file-oriented.

### 6.3 Variant Workspace Canonical Contract

Part 1 freezes the following workspace invariants:

1. `variantId` is package-unique and immutable after creation.
2. `workspaceRoot` must be exactly the relative path `variants/<variantId>`.
3. Part 1 loaders and bridge writers only treat the following files as the managed authored contract:
   - `world-base.yaml`
   - `scene.yaml`
   - `phase-plans.yaml`
   - `router-lexicon.yaml`
   - `audit-questions.yaml`
   - `control-modules.yaml`
4. Additional files or subdirectories may exist under a variant workspace, but Part 1 treats them as opaque package-local assets.
5. Bootstrap from package-root baseline copies only the managed authored contract files into the default variant workspace.
6. Variant-to-variant copy operations must copy the entire workspace directory recursively so opaque adjunct files are not silently dropped.

### 6.4 Write Boundary Matrix

| Location | Reads by default after Part 1 | Writes by default after Part 1 | Purpose |
|---|---|---|---|
| package-root baseline YAMLs | bootstrap, scaffold, import/export, compatibility reads | no regular storyline-aware writes | baseline anchor |
| `storyline-repository.json` | yes | yes | storyline/variant/session binding metadata |
| `variants/<variantId>/...` | yes | yes | active storyline authored truth |
| `runtime-sessions.json` | yes | yes | runtime continuity truth |
| `authoring-state.json` | yes | yes | editor save helper state, not storyline truth |

## 7. Default Resolution Semantics

### 7.1 `/edit`

After Part 1, default `/edit` behavior should become:

1. read `storyline-repository.json`
2. resolve package `activeStorylineId`
3. resolve the active storyline’s `variantId`
4. load authored section data from `variants/<variantId>/...`
5. save authored edits back into that same variant workspace through the deterministic bridge

`/edit` should no longer treat package-root baseline YAMLs as the normal authored source once storyline substrate exists.

### 7.2 `/play`

After Part 1, default `/play` behavior should become:

1. read `storyline-repository.json`
2. resolve package `activeStorylineId`
3. resolve that storyline’s `activeSessionId`
4. use that session as the continuity source from `runtime-sessions.json`
5. resolve authored inputs through that storyline’s `variantId`

This means play is storyline-aware even before the storylines page exists.

## 8. Storyline / Runtime Consistency Contract

### 8.1 Source-Of-Truth Split

Part 1 freezes the cross-file ownership split as follows:

- `storyline-repository.json` is canonical for:
  - `activeStorylineId`
  - storyline existence and metadata
  - `storyline.variantId`
  - `storyline.activeSessionId`
- `runtime-sessions.json` is canonical for:
  - `sessionsById`
  - checkpoint graphs
  - session lifecycle
  - `session.activeCheckpointId`
  - `session.headCheckpointId`
- `runtime-sessions.json.activeSessionId` is only a compatibility mirror of the active storyline binding.
- `storyline.headCheckpointId` is only a storyline-facing mirror of the bound session's checkpoint position.

### 8.2 Write Ordering For Mutating Operations

Any storyline-aware operation that mutates session continuity, checkpoint position, or storyline/session binding must use this order:

1. ensure the explicit storyline substrate exists, performing bootstrap first when the package is still legacy-only
2. validate that the active storyline, active variant, and targeted session resolution are coherent for the operation
3. persist `runtime-sessions.json` first
4. persist `storyline-repository.json` second if the operation changes storyline-bound mirror fields or session binding
5. return success only after every required file write has completed

This ordering is required for:

- `ensure_active_session`
- `record_accepted_beat`
- `reset_workbench`
- `switch_active_storyline`
- `create_storyline_from_source`
- future restart-from-checkpoint commands
- `branch_storyline_from_checkpoint`

`finalize_relationship_layer` may skip the storyline repository write when it does not change:

- `storyline.activeSessionId`
- `storyline.headCheckpointId`

For operations that also create or copy a variant workspace, the ordering becomes:

1. prepare the variant workspace in a temporary staging location that is not yet referenced by `variantsById`
2. persist `runtime-sessions.json`
3. promote the staged workspace into its canonical `variants/<variantId>` location
4. persist `storyline-repository.json` last

This ordering applies to:

- legacy bootstrap that materializes the default variant workspace
- `create_storyline_from_source`
- `branch_storyline_from_checkpoint`

### 8.3 Failure Handling And Load-Time Repair

Part 1 does not attempt a two-file transaction abstraction.
Instead, it freezes a narrow repair model.

If the `runtime-sessions.json` write fails:

- the command fails
- `storyline-repository.json` must remain unchanged

If the `runtime-sessions.json` write succeeds but the `storyline-repository.json` write fails:

- the command fails
- runtime continuity remains canonical
- the next storyline-aware load or write preflight must attempt a narrow repair before returning success
- if that repair write also fails, the load or write must fail loudly instead of continuing on a partially repaired view

If a staged variant workspace exists and the operation fails before promotion:

- the staged workspace must be deleted as part of failure handling

If a canonical `variants/<variantId>` workspace was already promoted but the final `storyline-repository.json` write fails:

- the command fails
- the promoted workspace is allowed to remain as an orphaned directory
- normal storyline resolution must ignore any variant workspace that is not registered in `variantsById`
- best-effort cleanup is allowed, but correctness must not depend on cleanup succeeding

If a new runtime session was created for create / branch and the final storyline repository write fails:

- the command fails
- the new session is allowed to remain in `runtime-sessions.json` as an unbound session record
- normal storyline resolution must ignore any session that is not bound by `storyline-repository.json`, except for legacy implicit-default-storyline compatibility before bootstrap completes

Only the following mismatch classes are repairable:

1. `runtime-sessions.json.activeSessionId` differs from the active storyline's `activeSessionId`
2. `storyline.headCheckpointId` differs from the bound session's resolved checkpoint pointer

The repair direction is frozen:

- storyline/session binding comes from `storyline-repository.json`
- runtime checkpoint position comes from the bound session in `runtime-sessions.json`
- therefore repair rewrites:
  - `runtime-sessions.json.activeSessionId` to match the active storyline binding
  - `storyline.headCheckpointId` to match the bound session's `activeCheckpointId`, or `headCheckpointId` when `activeCheckpointId` is `null`

If a mismatch is structural rather than mirror drift, Part 1 must fail loudly instead of guessing.
That includes:

- missing `activeStorylineId`
- missing `variantId`
- `storyline.activeSessionId` that does not resolve in `runtime-sessions.json`
- a bound session whose checkpoint pointers do not resolve

### 8.4 Storyline Head And Session Invariants

Part 1 must freeze the following runtime/storyline invariants.

1. One package has one package-level `activeStorylineId`.
2. Once the explicit storyline repository exists, `activeStorylineId` must be non-null and resolve to an existing storyline record.
3. One storyline has one stable `variantId` binding for Phase 3 v1; create / branch / bootstrap may assign it, but later parts must not rebind an existing storyline to a different variant.
4. One storyline has at most one `activeSessionId`.
5. One storyline stores one `headCheckpointId`, which may be `null` only before the first bound checkpoint exists.
6. A storyline’s active session must resolve to the same checkpoint as `storyline.headCheckpointId`, except for the bootstrap not-yet-started case where both may be `null`.
7. When a continued run accepts a new beat:
   - `session.activeCheckpointId` advances
   - `storyline.headCheckpointId` advances
   - both still point to the same checkpoint after the write completes
8. Part 1 does not define or require an in-place same-storyline restart-from-checkpoint primitive.
   - historical checkpoint fallback in later workspace layers must use `branch_storyline_from_checkpoint`
   - that fallback creates a new storyline instead of rebinding the existing storyline identity
9. Archiving rules and multi-session-per-storyline behavior are not Part 1 substrate requirements.

These invariants are intentionally strict so Part 2 can build UI on them without redefining lifecycle rules.

## 9. Variant Creation Rules

The variant creation model is frozen in Part 1.

### 9.1 New Storyline

Creating a new storyline must:

- choose a source storyline
- copy the source storyline’s current variant workspace immediately
- assign a new `variantId`
- bind the new storyline to that new variant workspace

### 9.2 Duplicate Storyline

Duplicating a storyline must:

- copy the duplicated storyline’s current variant workspace immediately
- assign a new `variantId`
- create a new storyline record

### 9.3 Branch From Checkpoint

Branching from a checkpoint must:

- still copy the source storyline’s current variant workspace immediately
- assign a new `variantId`
- set the new storyline’s `sourceCheckpointId` and `headCheckpointId` to the selected checkpoint
- create a storyline-bound session rooted at that checkpoint

This is deliberate.

Checkpoint carries runtime history.
Variant carries authored intent.

Part 1 should not try to reconstruct “the authored state that existed at the moment of that historical checkpoint.”

### 9.4 Primitive Success Contracts

`create_storyline_from_source` is frozen as a branch-from-current-head primitive.

It must:

- take a source storyline whose current `headCheckpointId` is non-null
- use that source storyline head as the new storyline's continuation anchor
- create a fresh `variantId` and copied workspace
- create a fresh storyline-bound session rooted at that same checkpoint
- persist the new storyline with:
  - `sourceCheckpointId = sourceStoryline.headCheckpointId`
  - `headCheckpointId = sourceStoryline.headCheckpointId`
  - `activeSessionId = <new session id>`
- leave package `activeStorylineId` unchanged

If the source storyline has no bound checkpoint yet, the command must fail deterministically instead of inventing one.

`branch_storyline_from_checkpoint` is frozen as the explicit historical-anchor primitive.

It must:

- require a checkpoint id that resolves in the package checkpoint graph
- create a fresh `variantId` and copied workspace
- create a fresh storyline-bound session rooted at the selected checkpoint
- persist the new storyline with:
  - `sourceCheckpointId = <selected checkpoint id>`
  - `headCheckpointId = <selected checkpoint id>`
  - `activeSessionId = <new session id>`
- leave package `activeStorylineId` unchanged

`switch_active_storyline` is frozen as a separate primitive.

It must:

- change only package `activeStorylineId`
- update the compatibility mirror `runtime-sessions.json.activeSessionId` to the target storyline's bound `activeSessionId`
- not create a new storyline
- not create a new variant
- not create a new session

### 9.5 Explicit Non-Choices

Part 1 must not use:

- overlay inheritance
- parent-linked variant trees
- first-write lazy materialization

Those models would add complexity without solving an actual repo-scale problem yet.

## 10. Lazy Bootstrap Migration

### 10.1 Legacy Read Behavior

If `storyline-repository.json` does not exist yet:

- the package should still open
- the system should treat it as one implicit default storyline
- package-root baseline YAMLs act as that implicit storyline’s authored source
- current Phase 2 active session, if present, acts as that implicit storyline’s active session
- read-only `/edit`, `/play`, diagnostics, and validation flows must not materialize new Phase 3 files yet

This keeps old packages readable.

### 10.2 Materialization Triggers

Legacy-only packages become explicit Phase 3 packages only when a storyline-aware write begins.

Part 1 freezes the following triggers:

- the first deterministic bridge save in `/edit`
- the first mutating runtime-session command in `/play`, including:
  - `ensure_active_session`
  - `record_accepted_beat`
  - `finalize_relationship_layer`
  - `reset_workbench`
- future storyline-aware restart or branch commands

The following do not trigger materialization by themselves:

- loading `/edit`
- loading `/play`
- diagnostics reads
- schema validation reads
- package existence checks

### 10.3 Bootstrap Sequencing

Once a materialization trigger fires, bootstrap must run before the initiating write continues.

Bootstrap should:

1. prepare the default storyline and variant metadata in memory, but do not write `storyline-repository.json` yet
2. stage the default variant workspace by copying the package-root baseline authored files into a temporary location
3. bind the default storyline to the current active session if one already exists in `runtime-sessions.json`
4. otherwise create one storyline-bound `awaiting_start` session through the runtime session layer, persisting `runtime-sessions.json` before workspace promotion
5. promote the staged variant workspace into canonical `variants/<variantId>`
6. write `storyline-repository.json` last
7. switch further storyline-aware reads and writes to the explicit repository/variant model

### 10.4 Minimal Migration Sequence

Part 1 implementation and tests should cover this exact story:

1. open old package in read mode
2. confirm it resolves as one implicit default storyline
3. perform first storyline-aware write
4. verify:
   - storyline repository now exists
   - default variant workspace now exists
   - existing active session is bound or a fresh storyline-bound session is created
5. reopen `/edit`
6. reopen `/play`
7. verify both now resolve through the explicit storyline substrate

## 11. Deterministic Bridge Impact

Part 1 must not weaken the authoring bridge.

The bridge should remain responsible for:

- structured save requests
- deterministic validation
- atomic-like writeback behavior at the workspace level
- reload
- diagnostics

What changes is only the write target:

- from package-root baseline authored files
- to the active storyline’s variant workspace

This should be implemented as a target-resolution seam, not as a second freeform writing path.

## 12. Part 1 Substrate Primitive Boundary

Part 1 is not UI-only preparation.
It must deliver the server-owned substrate primitives that later UI work will call.

Required Part 1 primitives:

- resolve active storyline
- bootstrap explicit default storyline substrate for legacy packages
- switch the package `activeStorylineId`
- create a new storyline from a source storyline
- branch a new storyline from a selected checkpoint

These primitives may be exposed as repository functions, service-layer commands, or another deterministic server-owned seam.
Part 1 does not require author-visible UI for them yet.

Explicitly deferred:

- broad storyline rename management flows
- archive storyline
- delete storyline
- first-class duplicate storyline command

Even though duplicate storyline is deferred as a command, Part 1 should still shape the lower-level workspace-clone behavior so Part 3 can reuse it without redefining variant semantics.
Later workspace layers may still add a narrow metadata-only `storyline.name` update command without changing these Part 1 substrate acceptance criteria.

## 13. Part 1 Acceptance Criteria

Part 1 is complete only when all of the following are true:

1. a package can formally contain multiple storyline records
2. storyline metadata, variant metadata, and active storyline selection are persisted in `storyline-repository.json`
3. storyline-bound variant workspaces are materialized under `variants/<variantId>/...`
4. `/edit` resolves authored reads and writes through the active storyline’s variant workspace
5. `/play` resolves continuity through the active storyline’s bound session
6. package-root baseline YAMLs are no longer the default storyline-aware write target
7. old Phase 2-era packages remain openable before migration
8. first storyline-aware write performs lazy bootstrap migration correctly
9. packages with no prior runtime session still materialize one storyline-bound `awaiting_start` session during bootstrap
10. non-UI substrate primitives exist for active storyline resolution, create-from-source, switch, and branch-from-checkpoint
11. checkpoint remains package-scoped immutable runtime truth
12. no story-specific logic or story-specific fields are introduced

## 14. Verification Expectations

Part 1 implementation planning should include tests for at least:

- storyline repository schema and consistency checks
- variant workspace creation and copy rules
- default `/edit` storyline-aware resolution
- default `/play` storyline-aware resolution
- lazy bootstrap migration from old packages
- bootstrap creation of a storyline-bound `awaiting_start` session when legacy runtime state is empty
- storyline head and active session invariant enforcement
- deterministic bridge writes targeting variant workspaces instead of package-root baseline
- non-UI substrate primitives for switch / create-from-source / branch-from-checkpoint

Part 1 should also include:

- targeted regression tests
- full repo test run before completion
- required UI/UX review for any touched surfaces in `/edit` or `/play`
