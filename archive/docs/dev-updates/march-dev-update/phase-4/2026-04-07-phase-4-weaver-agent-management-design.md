# March Dev Update Phase 4 Weaver Import & Agent Management Design

Date: 2026-04-07
Status: Archived after implementation complete
Scope: `March Dev Update Phase 4: Weaver import sidecar + agent management surface`

Implementation status:

- This document preserved the intended design baseline before implementation started.
- `March Dev Update Phase 4` has since been implemented, verified, and archived as complete.

## 1. Why Phase 4 Exists

`Phase 3` made story package and storyline management real.
Authors can now create packages safely, manage storylines inside a package, and treat storyline as the main mutable workline.

What the product still cannot do is the next practical author job:

- take a block of externally written text
- turn it into a usable LOGOS package baseline
- initialize the built-in sidecar layer around that package
- expose sidecars through a product surface that is no longer diagnostics-first

At the moment, this gap shows up in two ways:

1. New package creation is still empty-scaffold-first, which makes external text import a manual authoring chore.
2. The first real sidecar agent, `gossipelog`, exists architecturally, but the editor surface still treats the old console/diagnostics model as the main frame instead of a real agent system.

Phase 4 exists to close those two gaps together:

- add `weaver agent` as the first author-facing import sidecar
- turn the current console into a real `agent management` surface for built-in sidecars
- define a reusable sidecar reference-loading architecture that future built-in sidecars can share

## 2. Product Goal

Phase 4 should make the following product statements true:

1. `新建故事包` supports two creation modes: `空白创建` and `文本导入`.
2. `文本导入` uses `weaver agent` to turn pasted author text into a new LOGOS-compatible package.
3. `weaver` fills reliable structured authoring fields without pretending to solve deep storyline planning.
4. The author's original pasted text is preserved as the package `opening hook`, not force-sliced into `phase` or `beat`.
5. Built-in sidecars are shown through an `agent 管理页面`, not a diagnostics-first console.
6. Built-in sidecars remain always-on and display-only in Phase 4.
7. `gossipelog` receives an explicit initial bootstrap path so it does not start from an empty understanding of the package.
8. Sidecar-specific references can be loaded through one shared framework without inventing a separate agent architecture per sidecar.

## 3. Non-Goals

Phase 4 is intentionally narrow.

Explicit non-goals:

- no `extension agent` system yet
- no import into an existing package
- no conflict-resolution workflow for merging imported content into an existing package
- no author-visible import preview step
- no force-generated `phase` / `beat` structure from imported text
- no built-in sidecar enable/disable toggle
- no second persistence path outside the current scaffold / create / deterministic validation flow
- no sidecar-private `AGENTS.md`, `CLAUDE.md`, or standalone prompt markdown system
- no splitting `weaver` into multiple field-specific LLM skills in Phase 4
- no broad refactor of runtime prompting beyond what is needed to support sidecar-specific reference loading

## 4. Design Principles

### 4.1 Import Must Reuse The Existing Deterministic Package Creation Path

`weaver` is allowed to interpret text.
It is not allowed to become a second package-writing system.

The correct responsibility split is:

- LLM: parse author text into a structured import payload
- code: validate, normalize, fill defaults, create the package, and persist sidecar state

### 4.2 Opening Hook Is The Widest Safe Narrative Boundary

The imported text may imply setting, cast, conflict, and dramatic direction, but that does not mean it can be safely decomposed into detailed `phase` / `beat` structure.

The widest safe narrative landing zone is `opening hook`.

Therefore Phase 4 should:

- parse what is reliably extractable into structured authoring fields
- preserve the full author input as the package `opening hook`
- refuse to fake deeper structure when the source text does not deterministically support it

### 4.3 Built-In Sidecars Must Share One Architecture

`weaver` should not introduce a one-off agent shape.

It should match the existing `gossipelog` pattern:

- registered in the central sidecar registry
- package-owned config and state files
- read-only surface exposure through the shared agent surface loader
- code-owned instructions and bounded summaries

### 4.4 Sidecar References Must Be Unified, But Not Flattened

Different sidecars will need different references.
That does not justify a separate loader infrastructure per sidecar.

The shared rule is:

- one common reference-loading framework owns caching, token budget, injection order, and permission boundaries
- each sidecar declares its own manifest / resolver so the actual loaded references remain sidecar-specific

### 4.5 Prompt Assembly Remains The Single Prompt Boundary

`prompt assembly` should remain the unified outward boundary for model calls.

It should not become a growing switchboard full of sidecar-specific reference logic.

The correct layering is:

- `definition / registry` declares what a sidecar needs
- shared reference resolution prepares the bounded reference bundle
- prompt assembly combines instructions, runtime context, resolved references, and output contract

### 4.6 Built-In Agent Management Is A Product Surface, Not A Toggle Surface

In Phase 4, built-in sidecars are not extensions.
They do not need on/off controls.

The `agent 管理页面` exists to:

- explain what each built-in sidecar does
- show the latest bounded state summary
- expose limited navigation into the workflows that actually use those sidecars

It does not exist to manage built-in lifecycle switches.

## 5. Product Surface Design

### 5.1 New Story Package Flow

The main entry stays inside `故事包管理`.

The flow becomes:

1. Author clicks `新建故事包`
2. System asks the author to choose:
   - `空白创建`
   - `文本导入`
3. If `空白创建` is chosen, the current Phase 3 scaffold flow continues
4. If `文本导入` is chosen, a `weaver` import window opens in the same package-management workflow

Phase 4 should not move the main `weaver` action into the agent page.

### 5.2 Weaver Import Window

The import window should stay minimal:

- editable package display name field
- large pasted-text input area
- concise copy explaining that LOGOS will create a new package from the text
- no multi-step wizard
- no preview screen

The import window may accept both:

- free-form natural text
- semi-structured author text

but it should present only one primary text input flow.

Package display name rules:

- the field is optional for `文本导入`
- if the author supplies a non-empty display name, that value is authoritative
- if the author leaves it empty, `weaver` may provide `suggestedPackageName`
- if the fallback `suggestedPackageName` is empty, invalid, or conflicts with an existing package, the request should fail with bounded feedback asking the author to enter a package name manually

### 5.3 Input Limits And Request Shape

To keep latency and failure behavior bounded, Phase 4 should enforce an explicit request-edge limit.

Phase 4 default:

- input cap: `12,000` Unicode characters
- empty or whitespace-only input: reject with bounded validation feedback
- oversize input: reject before the LLM call with bounded validation feedback

This is the Phase 4 product-and-safety bound, even if a later phase chooses to revisit it.

### 5.4 Creation Feedback

Phase 4 keeps the interaction simple:

- one pending state
- one success path
- one bounded error path

Recommended pending copy direction:

- `Weaver 正在整理文本并创建故事包…`

Recommended failure copy direction:

- invalid input
- package naming conflict
- import parse failure
- package creation failure
- bootstrap warning after successful creation

No streaming partial preview is required.

### 5.5 Completion Path

On success, the product should:

1. create the new package
2. initialize `weaver` state summary
3. attempt `gossipelog` bootstrap
4. route the author to the new package's `故事包管理` view

### 5.5A Package Creation API Shape

Phase 4 should keep one unified package-creation API boundary.

Recommended direction:

- continue using the existing package-creation route
- extend its request schema into a bounded discriminated union

Recommended logical shape:

- `mode: "blank"` with package display name input
- `mode: "text_import"` with optional package display name input plus pasted source text

This is preferable to creating a second unrelated `weaver`-specific package-creation route because the product action is still one thing:

- create a new story package

The creation mode changes, but the package-creation boundary should remain one boundary.

Package naming precedence for `text_import` must be:

1. explicit author-supplied display name
2. validated `weaver` `suggestedPackageName`
3. otherwise fail and request explicit author naming

### 5.6 Agent Management Page

The current console becomes an `agent 管理页面`.

The page should follow the package-management visual language, with a slightly wider left column.

Recommended structure:

- left column:
  - built-in sidecar list
  - English display name
  - Chinese responsibility summary
  - latest bounded state line
- right column:
  - selected sidecar details
  - Chinese skill names and short descriptions
  - limited navigation action if applicable

For Phase 4:

- `weaver` should expose navigation toward package creation / text import
- `gossipelog` should remain display-first
- built-in sidecars must not show disable toggles

### 5.7 Diagnostics Demotion

The old diagnostics page is not preserved as a first-class page.

Instead, a small bounded status hint remains in the page's top-right area.

That hint should summarize only lightweight operational state, such as:

- whether built-in sidecar summaries are readable
- whether the current package has missing sidecar state
- whether the last bootstrap/import ended with a warning

This hint is not a raw diagnostics dump.

## 6. Weaver Architecture

### 6.1 Sidecar Shape

`weaver` should mirror the current `gossipelog` sidecar pattern.

Recommended file ownership:

- `src/agents/weaver/index.ts`
- `src/agents/weaver/definition.ts`
- `src/agents/weaver/agent.ts`
- `src/agents/weaver/contracts.ts`
- `src/agents/weaver/repository.ts`
- `src/agents/registry.ts`

Package-owned files:

- `src/story-packages/<package>/agents/weaver/config.yaml`
- `src/story-packages/<package>/agents/weaver/import-summary.yaml`

### 6.2 Identity And Instructions

`weaver` should not get its own private markdown-based agent-doc system.

Its identity and durable behavior constraints should live in code-owned instructions.

Those instructions should define:

- this agent is a LOGOS import sidecar
- its only job is to produce a structured import payload
- it may suggest a package name
- it may extract structured world/cast/location information
- it must not fabricate `phase` / `beat` structure
- it must not perform persistence decisions or write files
- it must return structured output only

Those instructions should be implemented as code-owned static prompt builders or static instruction assets inside the repo.

They are not the same thing as sidecar-loaded references.

### 6.3 Skill Shape

Phase 4 should keep exactly one `weaver` skill:

- `weaver-import-skill`

This is the correct scope because the task is one bounded transformation:

- read author text once
- produce one unified import payload

Field differences should be handled by:

- structured output sections
- deterministic validation
- code-side field mapping

not by spawning multiple specialized import skills.

## 7. Weaver Reference Design

### 7.1 Why Weaver Needs A Heavy Reference

`weaver` is not difficult because it needs many steps.
It is difficult because it must obey many field-specific constraints.

That means the design should keep:

- `SKILL.md` concise
- one heavy supporting reference loaded only when needed

For Phase 4, that heavy reference should be a repo-local static reference asset owned by the sidecar implementation, for example under a bounded sidecar-owned `references/` directory.

It is not a sidecar-private prompt markdown system and it does not replace code-owned identity instructions.

### 7.2 Weaver Reference Contents

The first `weaver` reference should include:

- field mapping from source text to LOGOS authoring structures
- output contract expectations
- forbidden inferences
- fallback and uncertainty rules
- one or two canonical import examples

It should not include:

- broad product history
- unrelated sidecar behavior
- deep `gossipelog` bootstrap logic

### 7.3 Sidecar-Wide Reference Loading

The reference mechanism should not be a `weaver` exception.

Phase 4 should introduce a sidecar-wide pattern:

- each sidecar can declare references
- each sidecar can load them on demand
- all sidecars still use the same loading framework

This is important because `gossipelog` may later need its own relationship-analysis reference.

For Phase 4:

- `weaver` reference loading is `required`
- if the required `weaver` reference cannot be resolved, the import request must hard fail before the model call
- degraded import without the required `weaver` reference is not allowed

## 8. Shared Sidecar Reference Loading

### 8.1 Separation Of Roles

The architecture should separate:

- sidecar declaration
- reference resolution
- prompt assembly

Recommended shape:

1. `AgentDefinition` grows reference-manifest metadata
2. a shared sidecar reference loader resolves those references for a specific operation
3. prompt assembly receives already-resolved references and stays generic

This Phase 4 slice should stay intentionally narrow:

- only built-in sidecar reference loading is in scope
- no extension-agent or plugin-generalized reference platform is introduced here

### 8.2 Manifest / Resolver Minimum Contract

The first manifest / resolver contract should be intentionally small.

Minimum required declaration fields:

- `referenceId`
- `loadPolicy`
- `required`
- `injectionLabel`
- `resolverKey` or equivalent resolver selector
- `priority`

Recommended supported semantics:

- `loadPolicy`: `always`, `operation-scoped`, or equivalent bounded policy
- `required`: whether failure blocks the operation or only downgrades it with a warning
- `priority`: used when references must be trimmed to stay inside budget

### 8.3 Cache Key And Budget Rules

The shared loader should own caching and budget control.

Phase 4 should start with a bounded deterministic policy:

- cache key basis: `agentId + operationKind + referenceRevision`
- default per-call reference budget: bounded and explicit
- trimming rule: lower-priority references drop first

Phase 4 default:

- reserve up to `4,000` tokens for resolved references in a single sidecar call
- if the declared references exceed budget, trim by ascending priority after required references are satisfied

This is the Phase 4 default policy and keeps the first implementation simple and predictable.

### 8.4 Injection Order

Prompt assembly should keep one stable section order:

1. instructions
2. bounded runtime context
3. resolved references
4. output contract

This ordering should be consistent across sidecars.

## 9. Import Payload Contract

### 9.1 High-Level Output Shape

`weaver-import-skill` should return one structured payload.

Recommended top-level shape:

```json
{
  "suggestedPackageName": "string",
  "sourceSummary": "string",
  "importSummary": "string",
  "openingHook": "string",
  "worldBase": {},
  "hero": {},
  "coreCast": [],
  "antagonists": [],
  "npcCharacters": [],
  "locations": [],
  "warnings": [],
  "unresolvedGaps": []
}
```

### 9.2 Field Landing Rules

Phase 4 should treat the payload as a proposal that code validates and maps.

Landing rules:

- `openingHook`: full pasted text, minimally normalized, no creative rewrite
- `worldBase`: structured world-setting fields if clearly supported
- `hero`: only if the protagonist can be reliably identified
- `coreCast`: only clearly important recurring characters
- `antagonists`: only clearly opposed named or role-stable entities
- `npcCharacters`: lighter-weight extracted supporting entities
- `locations`: only distinct places with stable enough identity

### 9.3 Confidence Discipline

When information is weak or ambiguous, the system should:

- prefer omission over invention
- record a bounded warning
- let deterministic scaffold defaults fill the gap

This rule is more important than aggressive extraction coverage.

## 10. Mapping To Package Files

### 10.1 Package Files That Must Still Exist

The created package must still validate through the current package-loading and storyline substrate expectations.

Phase 4 continues to rely on the existing authored file family:

- `world-base.yaml`
- `scene.yaml`
- `phase-plans.yaml`
- `router-lexicon.yaml`
- `audit-questions.yaml`
- `control-modules.yaml`

plus existing repository/runtime files created by the scaffold service.

### 10.2 Import Mapping Strategy

`weaver` should only override the parts it can safely populate.

Recommended mapping:

- `world-base.yaml`
  - `worldBaseSetting`
  - `worldRules`
  - `toneBaseline`
  - `hero`
  - `coreCast`
  - `antagonists`
  - `npcCharacters`
  - `locations`
  - `locationPatch` when a bounded location summary is possible
- `scene.yaml`
  - `sceneName` seeded from display name / suggested package name
  - `openingHook` seeded from full source text
- `phase-plans.yaml`
  - retain scaffold baseline in Phase 4
- `router-lexicon.yaml`
  - retain scaffold baseline in Phase 4
- `audit-questions.yaml`
  - retain scaffold baseline in Phase 4
- `control-modules.yaml`
  - retain scaffold baseline in Phase 4

### 10.2A Atomic Creation Integration

The import flow should not create a blank package first and then run a second authoring write pass as the mainline path.

Phase 4 should instead extend the staged scaffold/create service so that:

1. scaffold defaults are prepared
2. validated `weaver` seed values are applied into the staged authored files
3. the staged package is validated
4. the package is promoted atomically

This preserves one deterministic creation path and avoids a partially initialized package becoming the normal success path.

### 10.3 Opening Hook Field Decision

The imported raw text should land in `scene.yaml -> openingHook`.

Phase 4 should not duplicate the raw text into multiple authored scene fields unless later evidence shows that duplication is necessary.

`openingSituation` and other scene-structure fields should remain scaffold-owned unless later phases explicitly redesign that mapping.

## 11. End-To-End Flow

### 11.1 Text Import Success Path

1. Author selects `文本导入`
2. Client validates bounded local requirements
3. Client submits package name draft and raw text
4. Server invokes `weaver-import-skill`
5. Server validates the returned import payload
6. Server applies scaffold defaults to missing fields
7. Server creates the package through the existing scaffold / create path
8. Server writes `weaver` summary state
9. Server triggers `gossipelog` bootstrap
10. Server returns success
11. Client routes to the new package management view

### 11.2 Failure Handling

Bounded failure rules:

- invalid input: reject before LLM call
- malformed import payload: fail the import request
- partial extraction gaps: continue with scaffold defaults
- package scaffold failure: fail the request
- `gossipelog` bootstrap failure after package creation: keep package creation successful, persist warning status, and rely on bounded first-play fallback

The last case is intentional.
Package creation and `gossipelog` initialization are related, but not equal in severity.

## 12. Gossipelog Bootstrap Design

### 12.1 Required Behavior

`gossipelog` must not be expected to infer the package's initial relationship baseline only through later play traffic.

Phase 4 should establish:

- immediate post-create bootstrap
- bounded first-play fallback only when the sidecar state is missing or unreadable

### 12.2 Bootstrap Input

The bootstrap operation should consume:

- the created package's structured cast/world context
- the imported opening hook text
- any bounded `weaver` import warnings relevant to relationship confidence

### 12.3 Failure Semantics

If bootstrap fails:

- the package remains created
- `weaver` state summary should record the bounded warning
- the agent surface should show that the bootstrap is pending or degraded
- the first play request may retry once when the state is missing or unreadable

This preserves usability without silently pretending the initial relationship layer is healthy.

## 13. Agent Surface Contract Changes

Phase 4 should extend the sidecar surface model without breaking its bounded-read nature.

The surface should be able to expose:

- sidecar display name
- responsibility summary
- skill names and short descriptions
- latest bounded state line
- bounded operational hint such as `ready`, `warning`, or `pending bootstrap`

Built-in sidecars still remain read-only in this surface.

### 13.1 Built-In Visibility Rule

Registered built-in sidecars should remain visible in the agent management surface even when their state file is missing.

Recommended rule:

- built-in sidecars are listed from the registry
- missing state is rendered as a bounded status, not as absence
- missing or unreadable config/state should degrade the status line, not remove the sidecar card

For new packages created in Phase 4, scaffold creation should materialize config files for all built-in sidecars that the product expects to display.

## 14. Weaver State Summary Schema

`weaver` should persist a lightweight summary file, not the raw source text.

Recommended `import-summary.yaml` fields:

- `schemaVersion`
- `lastRunAt`
- `sourceKind`
- `sourceSummary`
- `importSummary`
- `warningCount`
- `warnings`
- `bootstrapStatus`

Optional bounded metadata:

- `inputDigest`
- `suggestedPackageName`

Forbidden content:

- full pasted text
- unbounded raw model output
- detailed debug traces

## 15. Error Handling And Guardrails

Phase 4 should explicitly prefer safe omission over magical recovery.

Guardrails:

- no import into existing package
- no model-driven file writes
- no uncontrolled raw reference dumps into prompt assembly
- no raw sidecar state dumps into the management UI
- no fabricated phase plans or beat breakdowns
- no hallucinated characters or locations when the source is too weak

## 16. Testing Strategy

Implementation planning should cover at least these verification groups:

### 16.1 Unit / Contract Tests

- `weaver` payload validation
- sidecar reference manifest parsing
- reference loader priority trimming
- `weaver` summary repository read/write behavior

### 16.2 Service / Route Tests

- text import package creation route
- invalid payload handling
- oversize input rejection
- duplicate package handling
- bootstrap warning handling

### 16.3 UI Tests

- story package creation mode switch
- text import pending/error/success states
- redirect to new package management view
- agent management page rendering for built-in sidecars
- no built-in disable toggle

### 16.4 Integration Tests

- imported package validates through current story loader
- imported package receives a readable `weaver` summary state
- `gossipelog` bootstrap runs or records a bounded degraded state

## 17. Implementation Slices

The expected implementation slices should be:

1. `weaver` sidecar substrate and shared reference-loading substrate
2. import contract + package creation integration
3. agent management page conversion and bounded status surface
4. `gossipelog` bootstrap integration and fallback semantics

This order keeps architecture ahead of UI and keeps persistence ahead of interaction polish.

## 18. Open Questions Intentionally Left To The Implementation Plan

These are no longer product-blocking questions, but they still belong in the implementation plan:

- exact route naming and module ownership for the import request
- exact TypeScript shapes for `reference manifest` and `weaver` summary schemas
- exact bounded Chinese UI copy
- exact bootstrap service ownership and timeout policy
- whether import warnings should surface only in the agent page or also in package-management completion copy

## 19. Acceptance Bar For Phase 4

Phase 4 is complete only when all of the following are true:

1. Authors can create a new package from pasted text through `故事包管理`.
2. The import path reuses the deterministic package creation flow instead of inventing a second persistence path.
3. The imported package lands with structured `world-base` data where reliable, and the full raw input as `openingHook`.
4. `weaver` exists as a real built-in sidecar in the shared registry/surface architecture.
5. The editor console has been replaced by a built-in `agent 管理页面`.
6. Built-in sidecars are displayed without disable controls.
7. A shared sidecar reference-loading substrate exists, and `weaver` uses it.
8. `gossipelog` is initialized on package creation or clearly marked for bounded fallback.
9. All new behavior is covered by deterministic tests and the affected editor surface passes build and test verification.
