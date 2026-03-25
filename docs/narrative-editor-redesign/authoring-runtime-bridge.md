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
- write runtime-target or section-owned data safely
- regenerate runtime-compatible files when necessary
- reload the final `StoryPackage` aggregate

This is a shared infrastructure document.
It is not owned by any single section page or section skill.

## 1.1 Hard Boundary

The bridge is not a skill.

It is deterministic infrastructure.

This means:

- section skills interpret author intent
- the bridge validates and persists the result
- the bridge may call repository, projection, and reload services
- the bridge must not use LLM reasoning as part of file write control

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
- the `coordinator`
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

## 4.1 Current Webapp Gap

The current app still has a missing piece:

- it can read story package files on the server
- but it does not yet expose a coordinator-usable server-side write entry

As of now:

- there are no section persistence API route handlers
- there are no section persistence server actions
- there is no shared application entry for coordinator patch persistence

So the bridge is not only a design idea.
It also defines required adaptation work for the current webapp architecture.

## 5. Three Supported Persistence Patterns

The bridge should support three section persistence patterns.

This is the most important conclusion carried forward from the archive and
adapted for the new coordinator-first architecture.

### 5.1 Direct-Runtime Section

Definition:

- the section save target is an existing runtime file
- the bridge validates structured input, then writes that runtime file directly
- a deterministic formatter may still be used when the runtime file is coarse-grained

Typical fit:

- a section whose approved page/skill inputs can be rendered straight into the current runtime file without adding a separate authoring source file

Example candidates:

- `scene-phase-authoring`
- `worldbase-cast` v1

This mode means:

- no separate projection file is required
- the bridge may use a small deterministic renderer before writing the canonical runtime YAML file
- reload still remains mandatory
- current runtime contracts stay unchanged

### 5.2 Projected Section

Definition:

- the section-owned authoring model is richer or more ergonomic than the current runtime contract
- the bridge stores section-owned authoring data separately
- deterministic projection regenerates runtime-compatible files from that source

Typical fit:

- a future section whose authoring source genuinely needs to live outside current runtime files

This mode means:

- a section-owned authoring file becomes the editable source of truth
- runtime files remain engine inputs until the runtime contract evolves
- projection is mandatory before reload

### 5.3 Hybrid Multi-Target Section

Definition:

- the section owns several module groups with different runtime destinations
- some module groups can write existing runtime files directly
- some module groups need a section-owned source file and deterministic downstream application
- one page save still enters through one shared bridge, but the bridge fans out by approved module target

Typical fit:

- `control-modules`

This mode means:

- the section still has one authoring surface
- the bridge applies module-scoped persistence rules internally
- coding agents must not let one skill write unrelated target files directly
- reload still remains mandatory after all affected targets are updated

### 5.4 Why All Three Modes Must Exist

If the redesign forces every section into direct-runtime mode:

- some sections will inherit bad runtime-era shapes
- authoring UX will stay too constrained

If the redesign forces every section into projected mode:

- the system becomes heavier than necessary
- some sections will gain needless duplication

If the redesign ignores hybrid multi-target sections:

- sections like `control-modules` will either become artificially heavy
- or their skills will start leaking file-write logic

So the bridge should intentionally support all three modes.

### 5.5 Approved V1 Decision For `worldbase-cast`

For the current redesign phase, `worldbase-cast` should use direct-runtime mode,
not projected mode.

Reason:

- the current runtime reads [`world-base.yaml`](../../src/story-packages/sample-scene/world-base.yaml) as a few coarse text blocks
- that makes a light deterministic renderer practical
- introducing a separate authoring source file right now would add weight without enough payoff

Important boundary:

- this does **not** mean the coordinator freely writes `world-base.yaml`
- it means the bridge owns a fixed rendering rule from approved page/skill inputs into:
  - `mainCharacters`
  - `npcCharacters`
  - `locationPatch`
- for `npcCharacters`, the approved V1 render stays lightweight:
  - one entry per recognized person
  - stable shape: `姓名：一句到两句描述`
  - grouped fallback text only when safe splitting is not possible

This keeps the first implementation lighter while preserving deterministic control.

## 6. Recommended Bridge Lifecycle

The approved lifecycle is:

1. Load section context
2. Accept page input or coordinator patch candidate
3. Normalize into section patch operations
4. Run deterministic validation
5. Apply patch to section-owned state
6. If section is direct-runtime, render runtime file updates deterministically
7. If section is projected, regenerate runtime-compatible outputs
8. If section is hybrid multi-target, apply each approved module group to its mapped targets deterministically
9. Atomically write all affected files
10. Reload `StoryPackage`
11. Return new section state and runtime impact summary

## 6.1 Why Current Webapp Adaptation Is Required

Without webapp-side adaptation, the coordinator stack would stop at:

- intent understanding
- patch candidate generation

and would still be unable to:

- write runtime-target files
- render or project runtime-compatible outputs
- return reloaded state to the UI

So adding server-side persistence entrypoints is a required redesign task.

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

### 7.4 Required Entry Form

For the current webapp, this implies a required new capability:

- a shared server-side entry for section persistence

That entry may later be implemented as:

- route handlers
- server actions
- or a thin application service invoked by one of those

But regardless of transport, coding agents should preserve one rule:

- page save and coordinator save must converge before repository writeback

### 7.5 Approved Shared Server-Side Entry

The redesign should converge on one shared application entry for section
persistence.

Recommended shape in substance:

```ts
type SectionPersistenceRequest = {
  requestId: string;
  packageName: string;
  sectionId: SectionId;
  source: 'page' | 'coordinator' | 'repair';
  payload: {
    uiFields?: Record<string, unknown>;
    patchCandidates?: SectionPatchCandidate[];
  };
  moduleScope?:
    | 'light-cone'
    | 'director-note-additions'
    | 'auditor-question-set'
    | 'beat-volume-definitions'
    | 'router-profile-set';
  dryRun?: boolean;
};
```

Recommended rule set:

- page submit and coordinator-assisted submit both call the same server-side entry
- the entry may accept either page-shaped input or coordinator patch candidates
- the entry must normalize both into the same bridge path before validation and writeback
- `moduleScope` is only required for hybrid multi-target section saves
- `dryRun` is an internal pre-check mode only; it validates and prepares a result envelope without writing files or updating the latest saved state
- user-facing pages should not expose `dryRun` as a normal author action
- browser code must never write repo files directly
- transport choice may vary later, but the persistence contract should stay singular

Recommended naming direction:

- `persistSectionChange`
- or another equally narrow application-level name that clearly means:
  - one section-scoped save request
  - one shared server-side path
  - one deterministic bridge behind it

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

### 8.3.1 Coding Agent Guidance

Do not let each section page invent its own repository write path.

Do not let coordinator code reach into the filesystem directly.

Do not split page-save and coordinator-save into separate persistence stacks.

### 8.3.2 Approved Section Writeback Boundaries

The repository layer should preserve explicit write ownership by section.

Approved V1 boundaries:

- `worldbase-cast`
  - may write:
    - `world-base.yaml`
  - must not write:
    - `scene.yaml`
    - `phase-plans.yaml`
    - `router-lexicon.yaml`
    - `audit-questions.yaml`

- `scene-phase-authoring`
  - may write:
    - `scene.yaml`
    - `phase-plans.yaml`
  - must not write:
    - `world-base.yaml`
    - `router-lexicon.yaml`
    - `audit-questions.yaml`

- `control-modules`
  - may write:
    - `router-lexicon.yaml`
    - `audit-questions.yaml`
    - `control-modules.yaml`
  - must not directly rewrite:
    - `scene.yaml`
    - `phase-plans.yaml`
    - `world-base.yaml`

- `package-wiring-validation`
  - does not own authoring writes
  - may trigger re-check or refresh flows only

Important rule:

- if a future coding agent finds a need to cross these boundaries, that should be treated as a design decision, not as an implementation shortcut

### 8.3.3 Approved `control-modules.yaml` Rule

Current code does not yet provide separate package files for:

- light cone customization
- director note additive author content
- beat volume definitions

Approved V1 direction:

- add one shared section-owned control source file:
  - `control-modules.yaml`
- keep the file package-local under the same story-package root
- split the file internally into three top-level blocks:
  - `lightConeCustomization`
  - `directorNoteAdditions`
  - `beatVolumeDefinitions`

This keeps V1 lighter than three parallel authoring files while still giving
deterministic code a stable place to read and write those controls.

### 8.4 `RuntimeProjectionService`

Responsibilities:

- render runtime-compatible blocks for coarse direct-runtime sections
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
3. runtime-target files were rendered or projected if required
4. `loadStoryPackage(packageName)` succeeded
5. the application received the reloaded state

Anything less is not a successful save.

### 9.1 Saved-State Result Rule

For the current redesign, a successful submit has one more required effect:

- the application should treat the reloaded post-write state as the new default authoring state for that package
- initial sample package content should only appear as first-use showcase content when no newer successful saved state exists
- a successful submit should therefore change what the next package open shows by default
- unsaved draft auto-retention is out of scope for the current redesign and should not be implied by this rule

### 9.2 Round-Trip Reload Result Protocol

The bridge should return a stable post-save result envelope after every save
attempt.

Recommended result families:

```ts
type SectionPersistenceResult =
  | SaveAppliedResult
  | SaveAppliedWithWarningsResult
  | SaveBlockedResult
  | SaveFailedResult;
```

Recommended substance:

- `save_applied`
  - write succeeded
  - reload succeeded
  - current section receives reloaded state
  - package default saved state is updated

- `save_applied_with_warnings`
  - write succeeded
  - reload succeeded
  - current section receives reloaded state
  - unresolved non-local issues or warnings remain
  - current page stays in place
  - result may point to `package-wiring-validation`

- `save_blocked`
  - no write happened
  - blocking validation issues or human-decision issues remain
  - current page should keep unsaved state visible

- `save_failed`
  - deterministic infrastructure failed during write or reload
  - current page should preserve the last successful saved state as the safe fallback

Minimum required result fields in substance:

- `requestId`
- `packageName`
- `sectionId`
- `status`
- `reloadedSectionState` when save succeeded
- `runtimeImpactSummary`
- `blockingIssues`
- `warnings`
- `nextSuggestedAction`
- `showInGlobalDiagnostics`
- `showLocally`

Important rule:

- there should be no "success" result that lacks a successful reload
- there should be no "save blocked" result that silently wrote partial files

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

### 11.4 UI Result Consumption Rule

The UI should not consume raw coordinator patch results as if they were final
save state.

Approved rule:

- the coordinator may return `patch_ready`
- the shared server-side entry then runs validation, writeback, and reload
- the UI should render the resulting `SectionPersistenceResult`, not the raw patch candidate

Recommended V1 page-level view states:

- `ready_to_submit`
  - coordinator or page has produced a valid local candidate
  - no save has happened yet

- `local_blocked`
  - current page has blocking issues
  - stay on current page and explain locally

- `saved`
  - current page refreshes from `reloadedSectionState`
  - clear unsaved markers
  - show success summary in the lower-right `页面助手` block

- `saved_with_global_warnings`
  - current page refreshes from `reloadedSectionState`
  - local save succeeded
  - keep the user on the current page
  - surface a concise pointer to the global diagnostics page
  - mark the result for `组装与校验 (Package Wiring & Validation)`

- `infra_failure`
  - save did not complete safely
  - keep or restore the last successful saved state
  - show deterministic failure summary locally

Important boundary:

- routine current-page issues should remain in the current page's lower-right `页面助手` area
- only unresolved cross-section or package-level issues should be promoted to `package-wiring-validation`

Approved V1 result-promotion rule:

- `save_applied`
  - stays local
  - does not need global diagnostics promotion
- `save_applied_with_warnings`
  - stays local and also appears in global diagnostics
- `save_blocked`
  - stays local unless the unresolved issue is already cross-section or package-scoped
- `save_failed`
  - stays local first
  - may also appear in global diagnostics only when whole-package state becomes uncertain

## 12. File Ownership Model

The bridge should explicitly model two kinds of files.

### 12.1 Section-Owned Authoring Files

These are files owned by redesign-era authoring surfaces.

Examples:

- a future projected section authoring source
- future section-local richer models that should not directly edit runtime files

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

1. every section must declare whether it is `direct-runtime` or `projected`
2. every section skill must emit operations that the bridge can validate
3. every section page must save through the same bridge path
4. no section may invent its own ad hoc writeback flow

## 15. Coding Agent Constraints

Any future coding plan derived from this bridge document must preserve:

1. no browser filesystem authority
2. no direct file writes from coordinator code
3. no page-specific repository duplication
4. no runtime prompt hardcoding as a fallback for bad rendering or projection design
5. no save success state without reload verification
6. no modeling of the bridge as an extra LLM skill
7. no coordinator rollout without adding a server-side write entry to the current webapp

## 16. Follow-Up Work

This bridge document should feed directly into:

1. `section-skills.md`
2. the first section page + section skill pair design
3. a future implementation plan for repository, projection, validation, and reload
