# Phase 3 Part 2 Package & Storyline Workspace Design

Date: 2026-04-06
Status: Reviewed, pending user confirmation
Scope: `Phase 3 Part 2`
Depends on:
- `docs/superpowers/specs/2026-04-06-phase-3-master-design.md`
- `docs/superpowers/specs/2026-04-06-phase-3-part-1-storyline-substrate-design.md`

Reference inputs:
- `docs/superpowers/phase-3/结构布局示意图.png`
- `docs/superpowers/phase-3/截屏2026-04-06 17.55.50.png`

## 1. Goal

Part 2 exists to turn the Phase 3 storyline substrate into a real author-facing workspace.

This part should make the following product statements true:

1. the editor has a dedicated `故事包管理` page
2. `故事包管理` becomes the default first page inside `/edit`
3. authors can see package-level storyline structure directly instead of inferring it from hidden state
4. authors can create, switch, and branch storylines through the workspace UI
5. authors can branch from a historical beat checkpoint by clicking a beat dot and confirming the action
6. authors can edit storyline display names without touching internal ids

Part 2 is successful when the package/storyline workspace becomes the primary authoring entry surface, while continuing to consume the already-frozen Part 1 substrate.

## 2. Includes

- Add a new editor section for `故事包管理`.
- Make `故事包管理` the default `/edit` landing section.
- Add a top navigation tab placed before `世界`.
- Keep the existing diagnostics console as a separate page.
- Show a left-side story package selector.
- Show a right-side list-first storyline workspace for the selected package.
- Show current storyline state, including:
  - display name
  - active state
  - head checkpoint summary
  - branch provenance summary
  - checkpoint rail
- Allow storyline creation from a source storyline.
- Allow switching the active storyline.
- Allow inline storyline display-name editing.
- Allow checkpoint-driven branch-and-switch from a beat dot.
- Reuse Part 1 substrate primitives instead of inventing a second persistence model.

## 3. Explicitly Does Not Include

- No removal of the diagnostics console page.
- No archive storyline action yet.
- No generic duplicate storyline action yet.
- No delete storyline action yet.
- No new story package scaffolding as a mainline requirement.
- No new authoring variant model beyond the Part 1 materialized workspace contract.
- No story-specific UI, labels, rules, or hardcoded package assumptions.

Part 2 must remain system-agnostic and story-agnostic.

## 4. Design Guardrails

### 4.1 Consume Part 1, Do Not Redefine It

Part 2 must only consume the frozen substrate seams from Part 1:

- resolve active storyline
- create storyline from source storyline
- branch storyline from checkpoint
- switch active storyline
- storyline-aware `/edit` and `/play` default resolution

Part 2 may add workspace-facing orchestration around those primitives, but it must not redefine:

- checkpoint ownership
- storyline/session ownership
- variant workspace semantics
- lazy bootstrap rules

Part 2 may introduce two additional server-owned seams that Part 1 did not need:

- a metadata-only `update_storyline_display_name` mutation
- a bounded workspace read model for package/storyline management

### 4.2 Keep System And Story Decoupled

Nothing in this page may depend on:

- one specific story package
- one specific cast arrangement
- one specific phase naming convention
- one specific language of story content

The page must be able to render any package that satisfies the shared contracts.

### 4.3 Preserve The Existing Editor Shell

Part 2 should extend the existing editor shell instead of replacing it wholesale.

That means:

- keep the existing top-level editor frame
- add one new section tab
- keep the current diagnostics console page reachable
- keep the rest of the editing sections structurally intact

### 4.4 Preserve The Existing Brutalist Visual Language

Part 2 must follow the current LOGOS editor visual language:

- `JetBrains Mono` remains the primary UI typeface
- `Space Grotesk` remains limited to the places the current system already uses it
- square corners only
- hard 2px black borders
- black offset box shadows
- high-contrast surfaces
- no soft SaaS cards
- no rounded modals
- no glossy gradients

This page must feel like the same product, not a design-system fork.

### 4.5 Storyline Names Are Editable, Ids Are Not

Part 2 freezes the distinction between:

- internal `storylineId`
- author-facing `storyline.name`

The rules are:

- the code layer keeps opaque ids
- ids remain hidden from the workspace UI
- the system assigns a generated default display name when a new storyline is created
- the author may edit the display name later
- editing the name must never mutate the id

This is the one management capability promoted into Part 2 because unreadable system-generated names would make the workspace materially worse to use.

## 5. Entry, Routing, And Navigation

### 5.1 New Editor Section

Part 2 introduces a new editor section id:

- `story-package-management`

User-facing label:

- `故事包管理`

### 5.2 Navigation Order

The top tab order should become:

1. `故事包管理`
2. `世界`
3. `角色`
4. `场景与阶段`
5. `控制模块`
6. `控制台`

This does not remove the diagnostics page.
It only changes which page acts as the default editor entry.

### 5.3 Default Landing Rule

When the user enters `/edit` without an explicit section parameter, the page should resolve to:

- `section=story-package-management`

Package selection still resolves through the existing package selection logic.

## 6. Workspace Information Architecture

### 6.1 Overall Layout

The page should use a two-column workspace layout:

- left column: story package selector
- right column: selected package storyline workspace

This should fit inside the current editor shell and panel rhythm.

### 6.2 Left Column: Story Package Selector

The left column is a package-first index.

It should:

- list available story packages
- make the active package visually obvious
- use slight press / state-change animation on selection
- support overflow through vertical scrolling

It should not try to show detailed storyline structure itself.

### 6.3 Right Column: Storyline Workspace

The right column is the main work surface for the selected package.

It should contain:

- package headline
- package status / metadata summary
- primary workspace actions
- a vertical list of storyline rows

The right column is `list-first`, not `detail-first`.
Authors should see the whole set of worklines before drilling into one.

### 6.4 Workspace Read Model Contract

Part 2 must not make the page assemble raw repository files or runtime graphs directly in the client surface.

Instead, it should consume a server-owned bounded read model dedicated to the workspace.

The recommended seam is a query equivalent to:

- `loadStoryPackageManagementWorkspaceView(packageName)`

This query may internally compose:

- the existing story package catalog entry
- `storyline-repository.json`
- storyline-bound runtime session data

But its output must already be shaped for the workspace UI.

Minimum package-level view fields:

- `packageName`
- `activeStorylineId`
- `storylines`

Minimum storyline-row view fields:

- `storylineId`
- `displayName`
- `status`
- `isActive`
- `sourceCheckpointId`
- `headCheckpointId`
- `headSummary`
- `canCreateFromSource`
- `canContinue`
- `checkpointRail`

Minimum checkpoint-rail node fields:

- `checkpointId`
- `acceptedBeatOrdinal`
- `phaseIndex`
- `beatIndex`
- `isHead`
- `isBranchSource`

The query must expose only bounded presentation data required by the workspace.
It must not require the page to parse raw `checkpointsById` maps or other low-level repository internals.

## 7. Storyline Row Contract

Each storyline row should show enough information to make comparison and branching legible at a glance.

Minimum row content:

- editable display name
- active / inactive status
- lightweight provenance summary
- head checkpoint summary
- checkpoint rail
- row-level actions for switching / continuing

Preferred row rhythm:

- left: storyline identity and controls
- right: horizontal checkpoint rail

The row itself should not depend on story-specific labels.

## 8. Checkpoint Rail And Branch Interaction

### 8.1 Beat Dot Representation

Each accepted beat checkpoint should be rendered as a small clickable dot on the storyline rail.

The rail may group beats visually by phase, but the interactive unit is still the beat checkpoint dot.

The rail should support horizontal scrolling inside each storyline row without breaking the vertical list layout.

### 8.2 Interaction Contract

When the author clicks a beat dot:

1. that dot becomes the selected checkpoint target
2. the row opens downward from that point
3. a small embedded confirmation drawer appears below the rail
4. the drawer shows only:
   - `确认`
   - `取消`

This is not a modal dialog.
It is a split-down row expansion anchored to the clicked dot.

### 8.3 Confirm Behavior

On `确认`, the workspace performs a composite action:

1. generate a default display name for the new storyline
2. call the Part 1 `branch_storyline_from_checkpoint` substrate primitive with that generated name and the clicked checkpoint
3. rely on that substrate primitive to:
   - use the clicked checkpoint as the new storyline anchor
   - copy the source storyline’s current variant workspace
   - create the fresh storyline-bound session
4. call `switch_active_storyline` for the newly created storyline
5. keep the user in the workspace with the new storyline visible and active

This workflow intentionally preserves the source storyline.
It is a fast branch-and-switch flow, not an in-place restart.

### 8.4 Cancel Behavior

On `取消`:

- no mutation occurs
- no new storyline is created
- the drawer closes
- selection returns to the normal row state

### 8.5 Reachability Rule

The UI must only present beat dots that correspond to checkpoints actually reachable from that storyline’s bound session history.

Part 2 must not bypass the Part 1 rule that forbids branching a storyline from some unrelated session’s checkpoint.

## 9. Storyline Naming

### 9.1 Default Naming

New storylines should receive a system-generated default display name.

The exact label can evolve, but it should remain:

- human-readable
- source-aware
- independent from internal ids

Examples of acceptable direction:

- `故事线 2`
- `从 Beat 2 分出`
- `故事线 2 · 从 Beat 2 分出`

### 9.2 Editable Display Name

The workspace should allow the author to edit the display name inline.

This is a metadata-only action.

The recommended server-owned mutation is equivalent to:

- `update_storyline_display_name(packageName, storylineId, nextDisplayName)`

This action updates only:

- `storyline.name`
- `storyline.updatedAt`

It must not update:

- `storylineId`
- `variantId`
- `activeSessionId`
- checkpoint ids
- `runtime-sessions.json`
- variant workspace files

Validation rules for this mutation are frozen as:

- trim leading and trailing whitespace before persistence
- reject empty names after trimming
- allow duplicate display names; uniqueness is not required because ids remain opaque and canonical
- if the normalized name is unchanged, treat the command as a no-op success rather than an error

The deterministic bridge is not the right place for this write.
This mutation belongs to the package/storyline metadata seam.

## 10. Continue And Switch Semantics

Part 2 should still expose a direct way to work on an existing storyline without creating a new one.

There should be no second persistent “selected storyline row” state that competes with package-level `activeStorylineId`.

The rules are:

- row-local actions act on the row they are rendered inside
- package-level active resolution continues to be driven by `activeStorylineId`
- temporary checkpoint selection is allowed only as a transient per-row UI state while the confirm drawer is open

That means the workspace should support:

- switching the active storyline from a row action
- continuing a row by first ensuring it is the active storyline
- creating a new storyline from the row that triggered the create action

### 10.1 Continue Row Action

`continue storyline` in Part 2 means:

1. if the row is not currently active, call `switch_active_storyline`
2. once that switch succeeds, navigate into the standard editor authoring flow at:
   - `/edit?storyPackage=<packageName>&section=worldbase-cast&surface=world`

This freezes `continue` as an editor-entry action, not a second hidden state change.
If the author later enters `/play`, that route will already resolve through the same active storyline.

### 10.2 Create From Source Row Action

`create storyline from source storyline` is a row-local action.

Its source is always:

- the row that owns the button the author clicked

It must never infer a separate hidden source from some other selected row.

This action may only be enabled when the source row has a non-null `headCheckpointId`.

On success, the workspace should:

1. generate a default display name for the new storyline
2. call `create_storyline_from_source` using the clicked row as the explicit source
3. call `switch_active_storyline` for the newly created storyline
4. keep the user inside `故事包管理` so they can immediately inspect or rename the new line

If the source row has no `headCheckpointId`, the action should be disabled rather than attempting a speculative write.

However, checkpoint fallback no longer uses an in-place same-storyline restart model.
Checkpoint fallback always creates a new storyline first.

## 11. Visual And Motion Direction

### 11.1 Visual Surface

The page should look like a hard editorial workbench, not a card dashboard.

Expected traits:

- compressed horizontal rhythm
- strong black edges
- printed-label style text
- visible active-state contrast
- simple, deliberate accent color use only where the current product already permits it

### 11.2 Motion

The most important motion in Part 2 is the checkpoint confirm reveal.

The intended feeling is:

- the rail is “cut” at the clicked dot
- the page opens downward from that seam
- the confirm / cancel drawer sits slightly lower than the base rail
- motion is short, direct, and mechanical rather than floaty

Recommended motion character:

- quick open / close
- small vertical travel
- no elastic bounce
- emphasis on seam-opening rather than fade-only animation

### 11.3 Package Selector Motion

Package buttons on the left may use small state-change motion:

- press-in feeling
- slight offset or contrast shift
- no soft hover bloom

## 12. Companion Slice: New Story Package

`new story package` remains a valid companion slice for Part 2, but it is not required for the main workspace to succeed.

If included later, it should be:

- template-backed
- server-mediated
- path-safe
- cross-platform-name-safe

It must not delay the main workspace spec or implementation.

## 13. Acceptance Criteria

Part 2 is only complete when all of the following are true:

1. `/edit` defaults to `故事包管理`.
2. The new tab appears before `世界`.
3. The console remains reachable as a diagnostics page.
4. Authors can switch packages from the left column.
5. Authors can see a list of storylines for the selected package.
6. Each storyline row can render its checkpoint rail.
7. Clicking a beat dot opens the split-down confirm / cancel drawer anchored to that dot.
8. Confirming from a beat dot creates a new storyline, copies the source variant, and switches the active storyline to the new one.
9. Storyline display names are editable without exposing or mutating internal ids.
10. The workspace consumes a bounded server-owned read model instead of assembling raw repository/runtime files in the page layer.
11. `continue storyline` first aligns `activeStorylineId`, then enters the standard editor flow.
12. The page preserves the current LOGOS brutalist visual system instead of introducing a new UI language.

## 14. Deferred To Part 3

The following stay out of Part 2:

- archive storyline
- generic duplicate storyline
- delete storyline
- broader management cleanup flows
- final empty-state and failure-state UX closure
