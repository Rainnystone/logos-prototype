# Authoring Runtime Bridge

## Document Status

- Date: 2026-03-23
- Status: active draft
- Parent: [master-record.md](master-record.md)
- Related: [coordinator-agent.md](coordinator-agent.md)

## 1. Purpose

This document defines the shared bridge between:

- author-facing section inputs
- coordinator-generated patch candidates
- deterministic persistence code
- runtime-compatible story package files

It exists because the coordinator-first redesign still needs a concrete way to:

- read current section data
- validate patch candidates
- write section-owned data safely
- regenerate runtime-compatible files when necessary
- reload the final `StoryPackage` aggregate

This is a shared infrastructure document.
It is not owned by any single section page or section skill.

## 2. Why This Is A Separate Active Document

The earlier page-first archive already surfaced a real architectural pattern:

- section-specific authoring data
- repository-scoped writes
- runtime-compatible regeneration
- round-trip loader verification

That logic should not stay buried inside one old page plan.

Under the coordinator-first redesign, it becomes a first-class shared bridge
used by:

- all section pages
- all section skills
- the `router-controller`
- the repository and validation layer

So this topic should live in its own active document rather than being folded
into either:

- `coordinator-agent.md`
- a future single section page draft

## 3. Core Bridge Problem

The redesign does not stop at intent interpretation.

The real system problem is:

- how author intent becomes safe, structured package data
- how that package data remains writable by the webapp
- how existing runtime consumers keep working

The bridge therefore owns the path from:

`authoring input` -> `validated section patch` -> `persisted section state` -> `runtime-compatible package view`

## 4. Shared Bridge Principles

1. Coordinator output is never the final persisted truth by itself.
2. All writes remain server-side and repo-scoped.
3. Validation must happen before write, not after damage.
4. A save is not complete until round-trip reload succeeds.
5. UI pages and section skills share the same persistence bridge.
6. Runtime compatibility is preserved during transition; no prompt hardcoding shortcuts.

## 5. Two Supported Persistence Patterns

The bridge should support two section persistence patterns.

This is the most important conclusion carried forward from the archive and
adapted for the new coordinator-first architecture.

### 5.1 Direct-Backed Section

Definition:

- the section-owned authoring model maps closely enough to existing runtime files
- the bridge can validate and write those runtime files directly

Typical fit:

- a section whose stable authoring contract already resembles current runtime schemas

Example candidate:

- `scene-phase-authoring`

This mode means:

- no separate projection file is required
- section patch operations can be applied directly to canonical runtime YAML files
- reload still remains mandatory

### 5.2 Projected Section

Definition:

- the section-owned authoring model is richer or more ergonomic than the current runtime contract
- the bridge stores section-owned authoring data separately
- deterministic projection regenerates runtime-compatible files from that source

Typical fit:

- `worldbase-cast`

This mode means:

- a section-owned authoring file becomes the editable source of truth
- runtime files remain engine inputs until the runtime contract evolves
- projection is mandatory before reload

### 5.3 Why Both Modes Must Exist

If the redesign forces every section into direct-backed mode:

- some sections will inherit bad runtime-era shapes
- authoring UX will stay too constrained

If the redesign forces every section into projected mode:

- the system becomes heavier than necessary
- some sections will gain needless duplication

So the bridge should intentionally support both modes.

## 6. Recommended Bridge Lifecycle

The approved lifecycle is:

1. Load section context
2. Accept page input or coordinator patch candidate
3. Normalize into section patch operations
4. Run deterministic validation
5. Apply patch to section-owned state
6. If section is projected, regenerate runtime-compatible outputs
7. Atomically write all affected files
8. Reload `StoryPackage`
9. Return new section state and runtime impact summary

## 7. Bridge Entry Sources

The bridge should support these entry sources:

### 7.1 Page Save

- a section page submits structured data
- data may or may not have been assisted by coordinator

### 7.2 Coordinator Save

- a coordinator result returns `patch_ready`
- application layer sends patch candidates into the bridge

### 7.3 Repair Save

- validation failed
- repaired patch candidate is resubmitted

All three flows should converge into the same deterministic bridge path.

## 8. Shared Bridge Interfaces

The bridge should expose narrow deterministic interfaces.

### 8.1 `SectionContextProvider`

Responsibilities:

- load current section-owned state
- load only relevant references and schemas
- prepare a reduced context pack for coordinator or page consumers

### 8.2 `SectionPatchValidator`

Responsibilities:

- validate operation shape
- validate section schema
- validate references
- reject writes that cannot be safely applied

### 8.3 `StoryPackageRepository`

Responsibilities:

- resolve package root safely
- read and write repo-owned story package files
- apply validated changes
- coordinate atomic write for all affected files

### 8.4 `RuntimeProjectionService`

Responsibilities:

- regenerate runtime-compatible files for projected sections
- keep current runtime contracts loadable
- avoid prompt hardcoding shortcuts

### 8.5 `StoryPackageReloadService`

Responsibilities:

- reload the package through the canonical aggregate path
- confirm that `loadStoryPackage(packageName)` still succeeds
- surface a structured reload result

## 9. Bridge Success Criteria

A write should be considered successful only when all of the following are true:

1. patch candidate passed validation
2. all affected files were written atomically
3. projected runtime files were regenerated if required
4. `loadStoryPackage(packageName)` succeeded
5. the application received the reloaded state

Anything less is not a successful save.

## 10. Validation Layers Inside The Bridge

The bridge should enforce at least four layers.

### 10.1 Patch Shape Validation

- malformed operations
- unsupported operation type
- missing path

### 10.2 Section Contract Validation

- missing required field
- invalid enum
- wrong type

### 10.3 Cross-File Reference Validation

- `phaseId` no longer lines up
- `selectionPolicy` references missing audit IDs
- `routerHint` references unknown router names

### 10.4 Package Reload Validation

- final package fails to reload
- regenerated files break aggregate parsing

## 11. Bridge Failure Taxonomy

Bridge failures are not identical to coordinator failures.

### 11.1 Coordinator Failure

Examples:

- wrong section detection
- ambiguous intent
- patch candidate not repairable in retry budget

### 11.2 Bridge Validation Failure

Examples:

- invalid patch operation
- invalid section data
- broken reference

### 11.3 Bridge Persistence Failure

Examples:

- atomic write failure
- repository path rejection
- reload failure after write

This distinction matters because:

- coordinator failures go back into skill or human decision flow
- bridge failures stay in deterministic infrastructure handling

## 12. File Ownership Model

The bridge should explicitly model two kinds of files.

### 12.1 Section-Owned Authoring Files

These are files owned by redesign-era authoring surfaces.

Examples:

- future `worldbase-cast` authoring source
- future section-local richer models

### 12.2 Runtime-Compatible Files

These are files consumed by the current engine and loader.

Examples already present in the repo:

- `scene.yaml`
- `phase-plans.yaml`
- `audit-questions.yaml`
- `router-lexicon.yaml`
- `world-base.yaml`

The bridge must always know which class a file belongs to.

## 13. How Pages And Skills Use The Same Bridge

This is the key rule before we design the first section page and section skill
together.

The section page and section skill should not invent different save paths.

Instead:

- the page collects or displays section data
- the skill interprets freeform intent into patch candidates
- the bridge validates and persists both through the same deterministic flow

This keeps page design and skill design aligned.

## 14. Implications For The Next Design Step

Before starting the first active section page and section skill pair, the team
should assume:

1. every section must declare whether it is `direct-backed` or `projected`
2. every section skill must emit operations that the bridge can validate
3. every section page must save through the same bridge path
4. no section may invent its own ad hoc writeback flow

## 15. Coding Agent Constraints

Any future coding plan derived from this bridge document must preserve:

1. no browser filesystem authority
2. no direct file writes from coordinator code
3. no page-specific repository duplication
4. no runtime prompt hardcoding as a fallback for bad projection design
5. no save success state without reload verification

## 16. Follow-Up Work

This bridge document should feed directly into:

1. `section-skills.md`
2. the first section page + section skill pair design
3. a future implementation plan for repository, projection, validation, and reload
