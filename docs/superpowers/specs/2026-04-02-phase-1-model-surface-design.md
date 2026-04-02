# Phase 1 Model & Surface Design

Date: 2026-04-02
Status: Ready for implementation planning
Scope: `Phase 1: Model & Surface`

## 1. Goal

Phase 1 exists to stabilize the object boundaries and page boundaries that all later stages depend on, without dragging in continuity, storyline management, or new agent control flows ahead of schedule.

This phase should make three things true:

1. The editor no longer treats `world` and `character` authoring as one mixed workspace.
2. Locations become first-class authored objects instead of a single text blob.
3. The UI makes those changes while staying inside the repository's existing neue brutalism editor language.

## 2. What Phase 1 Includes

- Split the current mixed `世界与角色` experience into separate `世界` and `角色` pages.
- Keep `场景与阶段`, `控制模块`, and `控制台` as existing workspaces.
- Restructure the world page so it owns:
  - world text
  - world rules
  - tone baseline
  - locations
  - NPC / supporting cast
- Restructure the character page so it owns:
  - hero
  - core cast
  - antagonists
- Promote locations into structured objects with system-generated IDs.
- Let scenes optionally reference locations.
- Keep a relationship area on the character page, but allow it to render as a valid empty state in Phase 1.
- Add a read-only agent surface that exposes the current agent layer without introducing management actions.
- Move page-level errors, blockers, and save feedback to the current page top area while preserving the right-side helper panel.

## 3. What Phase 1 Explicitly Does Not Include

- No continuity across play and edit.
- No checkpoint model.
- No storyline or branch management.
- No replacement of the current `控制台` with `故事包管理`.
- No package root / repository seam refactor.
- No temporary bridge for relationship data just to avoid an empty relationship area.
- No agent creation, editing, toggling, or run control.

These remain in later phases by design.

## 4. Design Guardrails

### 4.1 Product Guardrails

- Phase 1 is a boundary-setting phase, not a feature-sprawl phase.
- Every added element must either:
  - clarify page responsibility
  - formalize a domain object
  - preserve future landing space for later phases

If a change does not serve one of those three purposes, it does not belong in Phase 1.

### 4.2 Visual Guardrails

Phase 1 must strictly preserve the editor's current neue brutalism visual language.

Required carry-over traits:

- black heavy borders
- zero-radius corners
- hard block segmentation
- direct, dense desktop layout
- low decoration
- strong contrast
- restrained motion

Unacceptable drift:

- softer SaaS-style cards
- rounded, polished dashboard styling
- diluted contrast
- font swaps that change the editor's tone
- decorative gradients or elevated visual polish that weakens the existing raw desktop feel

`ui-ux-pro-max` is used here only as a boundary check, not as a source for a replacement design system.

## 5. Information Architecture

The Phase 1 editor shell should use five workspaces:

1. `世界`
2. `角色`
3. `场景与阶段`
4. `控制模块`
5. `控制台`

This is intentionally conservative.

`控制台` remains in Phase 1 because replacing it with `故事包管理` would prematurely pull Phase 3 concerns into this phase.

Important Phase 1 boundary:

- this five-workspace shell is a UI decomposition, not a full authoring contract decomposition
- Phase 1 does not introduce a fifth save contract family beyond the existing four section families
- `世界` and `角色` are two UI routes over the existing `worldbase-cast` authoring boundary in Phase 1
- coordinator routing, bridge handling, diagnostics ownership, and save contract families remain aligned to the current four-section deterministic model
- if deeper section boundary changes are desired later, they belong to a later architecture pass rather than Phase 1

### 5.1 Workspace Responsibilities

### 5.1.1 UI Workspace to Existing Section Mapping

Phase 1 uses the following mapping:

| UI workspace | Existing authoring boundary | Section ID / family |
|---|---|---|
| `世界` | shared world/role deterministic boundary | `worldbase-cast` |
| `角色` | shared world/role deterministic boundary | `worldbase-cast` |
| `场景与阶段` | existing scene authoring boundary | `scene-phase-authoring` |
| `控制模块` | existing control boundary | `control-modules` |
| `控制台` | existing diagnostics boundary | `package-wiring-validation` |

This means:

- `控制台` in Phase 1 is the current `package-wiring-validation` workspace as it already exists in the app
- Phase 1 does not rename or split the underlying deterministic section families
- the shell grows from four visible tabs to five visible workspaces only because `worldbase-cast` is decomposed into two UI routes

This is a routing and surface change, not a coordinator-family or bridge-family expansion.

### 5.1.2 Route and Shared-Draft Contract

Phase 1 should make the route contract explicit instead of overloading the visible workspace split into new save families.

Canonical rule:

- `section` remains the authoritative deterministic boundary selector
- `世界` and `角色` both remain under `section=worldbase-cast`
- a secondary UI selector such as `surface=world|character` may be used for deep-linking the visible subpage
- if `surface` is omitted, Phase 1 defaults to `world`
- if `section` is not `worldbase-cast`, the `surface` selector is ignored

Canonical examples:

- `/edit?storyPackage=<pkg>&section=worldbase-cast&surface=world`
- `/edit?storyPackage=<pkg>&section=worldbase-cast&surface=character`
- `/edit?storyPackage=<pkg>&section=scene-phase-authoring`

Draft-state rule:

- `世界` and `角色` share one in-memory `worldbase-cast` draft
- switching between `世界` and `角色` must not clear unsaved edits inside that shared draft
- explicit `Save` and `Reset` continue to act on the full shared `worldbase-cast` boundary, not just the visible half
- leaving `worldbase-cast` entirely still follows the existing page-family navigation model; Phase 1 does not add broader continuity semantics beyond the shared world/character draft

This keeps the product truthful:

- separate visible pages
- one authored boundary
- one save/reset boundary
- no fake fifth contract family

#### 世界

Owns:

- world base text
- world rules / taboos / abnormality logic
- tone baseline
- locations
- NPC / supporting cast

Does not own:

- hero / core cast / antagonists editing
- relationship runtime content

#### 角色

Owns:

- hero
- core cast
- antagonists
- relationship area

Does not own:

- world rules
- location authoring
- NPC / supporting cast text

#### 场景与阶段

Owns:

- scene structure
- scene cast
- phase rail
- optional scene location references

#### 控制模块

Owns the existing control-layer editing surface with no new Phase 1 domain expansion.

#### 控制台

Remains the existing diagnostics-oriented workspace in Phase 1.

Recommended Phase 1 addition:

- place the read-only agent surface here rather than inventing a sixth workspace

This keeps the shell stable while still exposing the existing agent layer.

## 6. World Page Design

The world page should be split into two major bands:

1. world text authoring
2. location and support authoring

### 6.1 World Text Band

Preserve the current editing pattern for:

- world base setting
- world rules
- tone baseline

This area should look and behave like a direct continuation of the current editor, not a new form style.

### 6.2 Location Band

Locations move from one freeform text block to a structured list + detail editor model.

Interaction pattern:

- left side: location rail / list
- right side: current location detail form

This must inherit the same interaction rhythm as the existing core-cast pattern:

- select an item on the left
- edit full detail on the right
- add a new item from the list rail

### 6.3 Location Fields

Phase 1 location object fields:

- `locationId` (system-generated)
- `name`
- `description`
- `environmentAppearance`
- `atmosphereDescription`
- `humanContextDescription`

Notes:

- authors do not manually write `locationId`
- `locationId` generation should follow the same product logic as character IDs
- Phase 1 deliberately avoids adding extra fields such as trigger mechanics, danger metadata, or route semantics

### 6.3.1 Phase 1 Compatibility Strategy

Phase 1 location structuring is authoring-first and compatibility-preserving.

That means:

- the authoring surface edits structured locations
- the runtime prompt path continues to rely on a compatibility projection until a later contract upgrade explicitly replaces it
- `worldBase.locationPatch` remains available in Phase 1 as the runtime-compatible projection target rather than being removed immediately

This keeps Phase 1 from turning into a full runtime-schema migration.

### 6.3.2 Persistence Rule

Phase 1 planning should assume:

- the world authoring model gains authoritative structured location entries
- deterministic persistence remains responsible for rendering any required compatibility output for the runtime-facing shape
- there is still one deterministic save path, not separate authoring/runtime write paths

### 6.3.3 Contract Shape

Planning should assume the authoring source of truth becomes a structured location collection on the world-side contract.

Recommended Phase 1 contract shape:

- `worldBase.locations: Location[]` as the authored source of truth
- `worldBase.locationPatch: string` retained as a compatibility projection for the current runtime path

Where:

- `locations[]` is what the world page edits
- `locationPatch` is derived output, not the primary authored representation

This keeps the authoring model truthful while preserving runtime compatibility.

### 6.3.4 Legacy Compatibility

For existing story packages that only have `locationPatch`:

- the editor should hydrate a deterministic authoring view from legacy data on load
- the first save writes the structured location collection plus the derived compatibility projection

Phase 1 therefore remains backward-compatible without requiring an all-at-once runtime migration.

### 6.3.5 Deterministic Legacy Hydration Rule

Phase 1 should not use heuristics to guess multiple structured locations out of a legacy freeform blob.

Required rule for packages that have legacy `locationPatch` content but no structured `locations[]` yet:

- hydrate exactly one structured location entry
- store the normalized legacy `locationPatch` text in `description`
- initialize `name`, `environmentAppearance`, `atmosphereDescription`, and `humanContextDescription` as empty strings
- use a draft-only UI key before the first successful structured save rather than exposing a provisional persisted `locationId`

Important lossiness rule:

- initial hydration must preserve the legacy text content rather than trying to reinterpret it
- the first structured save may normalize the compatibility projection format and does not need to be byte-for-byte identical to the original legacy blob
- however, no pre-existing legacy location text may be silently discarded during hydration

ID rule:

- hydrated legacy content receives its durable persisted `locationId` on the first successful structured save, not before
- once saved, that `locationId` becomes the durable identity used by scene references
- implementation should use the same random-ID product pattern as character IDs while keeping the location namespace distinct

Compatibility projection rule for untouched legacy content:

- if the structured collection still represents one imported location whose only non-empty authored field is `description`, the derived `locationPatch` should write that `description` back unchanged after normalization
- once authors split that imported content into multiple locations or start filling the additional structured fields, Phase 1 only guarantees deterministic projection rather than byte-for-byte legacy preservation

### 6.4 NPC / Supporting Cast

NPC / supporting cast remains on the world page as authored world context rather than being promoted into the main character page.

That preserves the distinction between:

- structured main dramatic roles
- looser world-level supporting population

## 7. Character Page Design

The character page should inherit the current role-editing layout rather than inventing a new interface language.

### 7.1 Character Scope

This page owns:

- hero
- core cast
- antagonists

The page should reuse the existing rhythm:

- role rail / character selection on one side
- detailed editing form on the other

The hero remains a first-class major role, but the page should still read as one unified major-character workspace rather than three unrelated editors.

### 7.2 Relationship Area

The relationship area must exist in Phase 1, but it is intentionally allowed to be empty.

Required semantics:

- empty state is valid
- empty state is not an error
- empty state is not a blocker
- empty state should explain that continuity-backed relationship carryover is not part of this phase

Forbidden Phase 1 behavior:

- adding a temporary relationship cache just for the editor
- reading ad-hoc fallback data that introduces a second relationship source of truth
- stitching together pseudo-runtime relationship state outside the later continuity model

This keeps the page truthful and avoids Phase 1 technical debt.

## 8. Scene & Phase Page Adjustment

Phase 1 adds optional location reference support to the scene page.

### 8.1 Authoring Rule

Scene-to-location binding follows the same product logic as scene cast selection:

- the author may choose locations
- the author may also choose none
- the selection model is multi-select rather than single-select
- there is no Phase 1 distinction between “primary” and “secondary” location

### 8.2 Validation Rule

If a scene does not reference any location:

- do not error
- do not block saving
- do not present it as missing required data

The narrative engine is still allowed to infer location context from other authored material.

This protects the project from turning structured locations into an over-constrained mandatory form system.

### 8.3 Contract Rule

Phase 1 planning should treat scene location references as an optional authored list of location IDs.

Required contract behavior:

- the field is optional
- when no locations are chosen, it may be omitted entirely
- when present, every referenced location ID must resolve against the structured world-page location set
- the cardinality is `0..n`, not `0..1`

Recommended Phase 1 field shape:

- `sceneSpec.locationIds?: string[]`

Phase 1 does not require the runtime engine to depend on this field yet.

The safe planning assumption is:

- authoring persists the structured reference
- validation checks referential integrity
- runtime behavior may continue to rely on existing world/context input until a later explicit runtime upgrade consumes the field directly

### 8.4 Delete / Invalid Reference Rule

Phase 1 should not silently persist broken scene-to-location references.

If an author attempts to delete a location that is still referenced by one or more scenes:

- deterministic save should block the deletion
- the current page top area should surface the blocker
- the helper panel may summarize which scene references must be cleared first

This is preferred over silent cleanup in Phase 1 because it preserves explicit author intent and avoids hidden cross-page mutation.

## 9. Diagnostics, Status, and Helper Surfaces

Phase 1 changes where page-level status appears, not the fundamental save philosophy.

### 9.1 Top-of-Page Status Area

Each active page should surface:

- save result
- page-level blocker
- current-page warning

This status should appear near the top of the current page so the author sees it in the context of the work they are doing.

### 9.2 Right Helper Panel

The helper panel remains.

Its role becomes:

- summary / context
- helper guidance
- secondary status visibility

The top status area should not eliminate the helper panel; the two surfaces should divide responsibility rather than duplicate everything blindly.

## 10. Read-Only Agent Surface

Phase 1 should expose the existing agent layer as an information surface, not a management console.

Minimum visible content:

- agent name
- role / responsibility summary
- associated skills
- state file location
- latest known state summary

Recommended placement in Phase 1:

- inside the current `控制台` workspace

This gives the agent layer a clear landing zone without forcing Phase 1 to solve package management or agent operations prematurely.

### 10.1 Latest State Summary Rule

`latest known state summary` should be a fixed summary view, not a raw file dump.

For planning purposes, that means the Phase 1 agent surface should show a bounded summary such as:

- whether a state file is present
- when it was last updated, if known
- a compact human-readable status line

It should not expand into:

- arbitrary file browsing
- freeform state inspection
- editable operational controls

Bounded summary contract:

- `statePresence`: present / missing / unreadable
- `lastUpdatedAt`: optional timestamp, typically from filesystem metadata when available
- `statusLine`: one compact human-readable line derived from parsed state or a bounded fallback

For the current `gossipelog agent`, `statusLine` may summarize high-level relationship coverage, such as whether tracked links exist, but it must stay to a compact single-line summary rather than exposing raw YAML payloads.

### 10.2 Scope of the Agent Surface

The Phase 1 agent surface shows only true sidecar agents.

It does not list:

- `coordinator`
- section skills
- bridge infrastructure

In the current repository, that means the Phase 1 surface is expected to start from the real sidecar-agent registry and currently expose the existing `gossipelog agent`.

### 10.3 Data Sources

Planning should assume the read-only agent surface is assembled from bounded existing sources:

- agent identity and role metadata from the shared agent registry
- associated skills from the agent definition / linked metadata
- config path and state path from registered package-relative metadata
- latest state summary from the existing agent state file, if present, rendered as a bounded summary rather than raw file content

Minimum Phase 1 metadata contract per surfaced agent:

- `agentId`
- `displayName`
- `responsibilitySummary`
- `skillIds`
- `packageConfigPath`
- `packageStatePath`

Planning should assume `latestStateSummary` is derived view data rather than static registry metadata.

## 11. Persistence and Save Flow

Phase 1 must keep the existing persistence philosophy intact:

- page submits structured changes
- deterministic bridge validates and writes
- latest saved state reloads cleanly

### 11.1 Save Principles

- no second save path for locations
- no page-specific bypasses
- no special one-off flow for the relationship area

### 11.2 New Save Coverage Needed

The existing save flow must be extended to cover:

- structured locations on the world page
- scene location references on the scene page
- split page routing for world vs character editing

### 11.2.1 Save Boundary Clarification

Phase 1 does not require `世界` and `角色` to become separate save-contract families.

Planning should assume:

- both UI pages still roll up to the existing `worldbase-cast` deterministic bridge boundary
- `scene-phase-authoring`, `control-modules`, and `package-wiring-validation` remain the other three section families
- page routing may split while the save contract family stays shared

This is the intended scope-control move for Phase 1.

Shared-draft consequence:

- a save triggered from either `世界` or `角色` persists the current shared `worldbase-cast` draft
- a reset triggered from either `世界` or `角色` restores the latest saved version of that same shared draft
- Phase 1 should not fork separate reset semantics or separate unsaved buffers for the two visible subpages

### 11.3 Reset Principles

Reset continues to mean:

- return to latest saved version

Phase 1 does not introduce new historical restore semantics.

## 12. Error Handling and Empty-State Rules

### 12.1 Valid Empty States

These are valid and should not be treated as errors:

- no scene location selected
- empty relationship area on the character page
- no extra relationship data yet available in Phase 1

### 12.2 Real Errors

These should still behave as errors:

- invalid structured location payload
- broken reference to a removed or malformed location ID
- deterministic save validation failures

The UI must distinguish clearly between:

- valid absence
- warning
- actual blocking error

## 13. Acceptance Criteria

Phase 1 is complete when all of the following are true:

### 13.1 Page Boundaries

- the editor exposes separate `世界` and `角色` pages
- their responsibilities are clearly differentiated
- the UI split does not require a full replacement of the current four-family save contract model

### 13.2 Object Boundaries

- locations are structured entries rather than a single text patch
- locations have system-generated IDs
- scenes can optionally reference locations
- Phase 1 keeps a compatibility path so runtime-facing behavior does not depend on a full immediate schema replacement

### 13.3 Character Page Truthfulness

- the relationship area exists
- it renders a valid empty state without pretending to have continuity data

### 13.4 Agent Surface

- the agent layer is visible as a read-only information surface

### 13.5 Persistence

- world edits, location edits, scene location references, and character edits all save and reset through the existing deterministic path

### 13.6 UI Integrity

- the editor still reads visually as the same neue brutalism product
- the split does not feel like a style-system fork

## 14. Phase 1 UI / UX Review Checklist

Each Phase 1 slice should end with the same review:

1. Are page responsibilities clearer than before?
2. Did the interaction path become longer or more confusing?
3. Is information density still appropriate for desktop?
4. Are top status and helper panel responsibilities both clear?
5. Does the page still look like the same editor?
6. Did any new surface drift toward soft SaaS styling?

If the answer to the last two questions is yes, the slice is not ready.

## 15. Testing Expectations for Planning

Implementation planning for Phase 1 should include coverage for:

- split page routing and section activation
- structured location create / edit / reset / save
- scene location reference save behavior
- referential integrity for scene location IDs
- no-error behavior when no location is selected
- no-error empty relationship state on the character page
- read-only agent surface rendering
- bounded latest-state summary rendering for the agent surface
- page-level status rendering at the top area
- right helper panel still showing corresponding guidance

## 16. Deferred to Later Phases

### Phase 2

- relationship area populated by continuity-backed session state
- play/edit non-reset behavior
- explicit reset workbench
- accepted beat checkpoints

### Phase 3

- story package management page
- storyline management
- checkpoint-branch organization
- repository seam / mutable state substrate rollout

### Phase 4

- new import agent
- real agent management operations
