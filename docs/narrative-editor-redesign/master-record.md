# Narrative Editor Redesign Master Record

## Document Status

- Date: 2026-03-23
- Status: active
- Branch scope: `branch/narrative-editor`
- Audience: human author, AI coding agent, implementation reviewer

## 1. Purpose

This file is the active master index for the current redesign direction.

It replaces the earlier page-first redesign path as the primary source of truth.
The current approved direction is now `coordinator-first`.

This document exists to keep AI coding agents from guessing:

- what the primary redesign target now is
- what the coordinator agent is responsible for
- what must stay deterministic in code
- how section skills relate to section pages
- how validation and repair should work before any file write happens

## 1.1 Active Document Index

Current active redesign documents:

- [master-record.md](master-record.md)
- [coordinator-agent.md](coordinator-agent.md)
- [authoring-runtime-bridge.md](authoring-runtime-bridge.md)
- [section-skills.md](section-skills.md)
- [section-map.md](section-map.md)
- [worldbase-and-cast/worldbase-cast-page.md](worldbase-and-cast/worldbase-cast-page.md)
- [worldbase-and-cast/worldbase-cast-skill.md](worldbase-and-cast/worldbase-cast-skill.md)
- [TODO.zh-CN.md](TODO.zh-CN.md)

Coding agents should start from this file, then read the coordinator agent design
before attempting implementation planning.

The first refreshed page + skill pair is now the `世界与角色 (WorldBase & Cast)` section.

Approved section names for UI and design docs:

1. `世界与角色 (WorldBase & Cast)`
2. `故事结构 (Scene & Phase Authoring)`
3. `控制模块 (Control Modules)`
4. `组装与校验 (Package Wiring & Validation)`

Section pages and their matching skills should now live inside per-section
folders instead of remaining as loose top-level files.

## 2. Reset Of Active Direction

The redesign has shifted from:

- page-first authoring page design

to:

- coordinator-first authoring architecture

The reason for this reset is simple:

- the real core problem is not page layout
- the real core problem is how author intent becomes safe, structured, runtime-compatible package data

That means the first-class design object is now the coordinator agent, not the
individual section pages.

Section pages will still exist later, but they are now downstream consumers of
the coordinator flow instead of the architectural starting point.

## 3. Active Assumptions

The following assumptions remain approved:

1. `project = story package`
2. the current play/workbench page remains in the app
3. provider/model/api key configuration stays where it is today
4. `Memory Placeholder` still needs a future expansion slot
5. `Director Note Layer` stays system-generated and is not author-editable
6. the webapp needs controlled local file read/write for repo-owned story package files
7. browser code must not directly access the filesystem
8. runtime orchestration and authoring orchestration are separate concerns

## 4. Current Top-Level Architecture

The approved redesign shape is:

- `1` coordinator agent: `coordinator`
- `4` section skills
- `1` cross-section reconciliation skill
- `1` legacy migration skill
- `1` deterministic authoring runtime bridge
- deterministic code-side validation, writeback, and reload

This is intentionally lightweight.

It is not:

- a team of autonomous long-running agents
- a DOM-driving UI bot
- a prompt-only solution
- a replacement for the existing runtime orchestrator

Important clarification:

- the bridge is infrastructure, not a skill
- section skills interpret intent
- the bridge validates, persists, projects, and reloads

## 5. Coordinator Agent

### 5.1 Name

Approved coordinator name:

- `coordinator`

### 5.2 Coordinator Role

The coordinator is a lightweight semantic router and repair-loop controller.

Its job is to:

- identify which section or sections a user request targets
- gather the minimum necessary section context
- call the correct skill
- collect structured patch output
- send that output into deterministic validation
- handle repair retries when validation fails
- stop and escalate when the issue requires human judgment

### 5.3 Coordinator Must Not Do

The coordinator must not:

- write files directly
- emit raw YAML as the only source of truth
- bypass schema validation
- directly mutate runtime state in the browser
- act as a freeform chat assistant with broad autonomy
- invent new fields outside approved section contracts

### 5.4 Coordinator Design Principle

Treat the coordinator as a small state machine, not as a personality-heavy agent.

The best mental model is:

- semantic router
- patch assembler
- validation failure handler

not:

- autonomous teammate
- general writing assistant
- prompt magician

### 5.5 Coordinator Preservation Rule

The coordinator should preserve human-authored meaning by default.

In practice, this means:

- map author input into approved fields
- keep repair narrow
- fix input-side problems before considering anything broader
- stop and escalate if a valid save would require changing author meaning

Coding agents should not turn the coordinator into a silent rewriting layer.

## 6. Skill Inventory

### 6.1 Required Section Skills

The approved minimum skill set is:

1. `worldbase-cast-skill`
2. `scene-phase-authoring-skill`
3. `control-modules-skill`
4. `package-wiring-validation-skill`

Each section skill is responsible only for its own section-owned authoring model.

Current approved detail level:

- `worldbase-cast-skill` is now defined as a fixed-target skill
- it prepares content for [`world-base.yaml`](../../src/story-packages/sample-scene/world-base.yaml)
- it does not free-write the file
- it relies on deterministic bridge formatting for final block rendering

### 6.2 Required Cross-Cutting Skills

The approved cross-cutting skill set is:

1. `cross-section-reconciler-skill`
2. `legacy-migration-skill`

### 6.3 Skill Boundary Rule

Section skills may interpret intent and propose structured patches.

They may not:

- write files
- repair cross-file references in an unconstrained way
- decide final persistence behavior
- replace deterministic validation

## 7. Code-Side Ownership

The following responsibilities stay in deterministic code:

1. schema validation
2. reference integrity checks
3. path safety and package scoping
4. atomic write behavior
5. runtime-compatible serialization
6. `loadStoryPackage()` round-trip reload verification
7. final success or failure state

This is a hard architectural boundary.

If an AI skill is allowed to do these things freely, the redesign becomes too
fragile to maintain.

### 7.1 Bridge Is Not A Skill

The `authoring runtime bridge` should not be modeled as an additional LLM skill.

It is a deterministic service layer that sits below:

- coordinator routing
- section skills
- page save flows

Its job is engineering control, not semantic interpretation.

### 7.2 Current Webapp Gap

The current webapp does not yet provide a coordinator-usable write path.

Current state:

- story package files can be read on the server
- runtime config can be saved to browser `localStorage`
- there are no section persistence API routes yet
- there are no section persistence server actions yet
- there is no shared server-side write entry for coordinator results

This means the current redesign still has a real infrastructure gap:

- coordinator and section skills can be designed now
- but they cannot safely persist section changes until the webapp gains a server-side write interface

### 7.3 Active Requirement

Because of that gap, adapting the current webapp architecture for coordinator
writeback is now an approved active requirement, not a future nice-to-have.

Coding agents must treat this as part of the redesign foundation.

## 8. Coordinator Request Flow

The approved request flow is:

`Author Intent` -> `Router Controller` -> `Section Skill or Cross-Section Skill` -> `Structured Patch Candidate` -> `Deterministic Validation` -> `Repair Loop or Persist` -> `Writeback` -> `Reload Aggregate` -> `UI Result`

### 8.1 Meaning Of This Flow

- author intent may be natural language or section-scoped partial input
- the coordinator does not persist anything by itself
- the first legal output from a skill is a structured patch candidate
- only validated patches may be written
- successful writes must be followed by reload and aggregation
- repair should prefer input-side fixes over system-side changes

## 9. Coordinator Prompt Contract

The coordinator prompt should follow a contract-first style.

It should say, in substance:

- what the coordinator is allowed to do
- what it must never do
- what structured output shape it must return
- what to do when validation fails
- when to stop and ask for human resolution

### 9.1 Prompt Style Guidance

Use:

- narrow responsibilities
- explicit forbidden actions
- fixed output schema
- bounded retry behavior

Avoid:

- vague helper language
- broad autonomy framing
- long persona prose
- prompt instructions that imply direct file control

### 9.2 Coordinator Output Shape

The coordinator should return a structured result containing at least:

- target sections
- action type
- rationale
- assumptions
- proposed patch payloads
- confidence
- whether human resolution is required

This output is for the application layer, not for direct human prose by default.

## 10. Validation And Repair Loop

Validation failure is a normal path, not an exceptional path.

The approved failure pipeline is:

1. skill returns structured patch candidate
2. code validates candidate
3. if valid, persist
4. if invalid and repairable, return structured errors to coordinator
5. coordinator asks the same skill for a repaired patch
6. retry at most `2` times
7. if still invalid, stop and return a blocking explanation

### 10.1 Validation Layers

Validation should be split at least into:

1. schema validation
2. reference validation
3. package consistency validation
4. round-trip reload validation

### 10.2 Examples Of Repairable Failures

- invalid enum value
- missing required field
- unknown question ID in `selectionPolicy`
- unknown `routerHint`

### 10.3 Examples Of Non-Repairable Failures

- conflicting human intent
- missing domain decision
- request requires a new field not present in approved contracts
- cross-section change with multiple equally valid interpretations

These should stop the loop and surface a clear human decision point.

## 11. Relation To Section Pages

The old page-first design order is no longer active.

The new order is:

1. design coordinator
2. design skill contracts
3. design deterministic validation and persistence boundaries
4. revisit section pages as coordinator-aware authoring surfaces

This means section pages are no longer the architectural root.

They are now expected to become surfaces that:

- collect author input
- optionally invoke coordinator assistance
- display validation failures
- reflect the saved state after reload

## 12. Relation To Existing App Architecture

The coordinator-first redesign should fit the already approved local file access direction:

- repository-owned filesystem access inside the Next.js app
- repo-scoped story package writes only
- server-side writeback
- no browser filesystem access

This means the coordinator should most likely live in an authoring-specific layer,
not inside the existing runtime engine modules.

Recommended high-level ownership split:

- `src/engine/`: runtime orchestration
- `src/authoring/`: coordinator and section-skill logic
- `src/server/` or repository layer: file access, validation, writeback, reload

The current app still needs explicit adaptation work in this area:

- add server-side section persistence entrypoints
- accept page saves and coordinator patch results through the same deterministic bridge
- return reloaded package or section state after persistence

### 12.1 Current `world-base.yaml` Reality

The current runtime reads [`src/story-packages/sample-scene/world-base.yaml`](../../src/story-packages/sample-scene/world-base.yaml)
coarsely, not as deeply structured per-character data.

For the current implementation phase, this matters a lot:

- `worldbase-cast` does not need a heavy separate authoring source file yet
- the bridge can stay lighter by rendering approved section inputs into the existing runtime blocks
- the intended write target in v1 remains `world-base.yaml`
- the coordinator still should not freely write that file; deterministic bridge formatting remains required

### 12.2 Likely Existing Code Areas The Bridge Will Touch

Based on the current codebase, coding agents should expect the bridge-related
work to touch more than one layer of the existing webapp.

The current likely touch list includes:

- application entry surfaces under [`src/app/`](../../src/app)
- package loading and catalog code under [`src/engine/story-loader.ts`](../../src/engine/story-loader.ts) and [`src/app/story-package-catalog.ts`](../../src/app/story-package-catalog.ts)
- read-only package consumers such as [`src/app/page.tsx`](../../src/app/page.tsx), [`src/app/play/page.tsx`](../../src/app/play/page.tsx), and [`src/app/components/FixtureReferencePanel.tsx`](../../src/app/components/FixtureReferencePanel.tsx)
- runtime contract types such as [`src/types/prompt-object.ts`](../../src/types/prompt-object.ts) and [`src/types/story-package.ts`](../../src/types/story-package.ts)
- runtime consumers that still depend on current package shape, including [`src/engine/modules/prompt-assembler.ts`](../../src/engine/modules/prompt-assembler.ts) and [`src/engine/modules/director-note-layer.ts`](../../src/engine/modules/director-note-layer.ts)
- package schema docs and tests such as [`src/story-packages/story-package.schema.md`](../../src/story-packages/story-package.schema.md), [`src/story-packages/__tests__/sample-scene.test.ts`](../../src/story-packages/__tests__/sample-scene.test.ts), and [`src/engine/__tests__/story-loader.test.ts`](../../src/engine/__tests__/story-loader.test.ts)

Likely new code areas include:

- a server-side persistence entry under `src/app/` or server-action equivalents
- repository and rendering/projection code under `src/server/` or another clearly bounded server-side location
- section-owned authoring schemas and tests under `src/types/` and `src/story-packages/`

### 12.3 Coding Agent Search Rule

The list above is a starting map, not an exhaustive file lock.

Coding agents must not assume that only the files named in this document need
to change.

During implementation, a coding agent should actively search for:

- all readers of `loadStoryPackage()`
- all consumers of current `WorldBase`
- all places where package state is displayed or summarized
- all tests and fixtures that encode current package shape assumptions
- all app surfaces that may need a server-side write entry to support bridge-based persistence

If the bridge implementation reveals additional required edits outside the files
named here, the coding agent should expand the touched set deliberately rather
than forcing the design into an incomplete change.

The intended rule is:

- follow the architecture
- start from the active docs
- but keep searching until the real dependency surface is covered

## 13. Active Non-Goals

The current redesign still does not aim to do the following right now:

- replace the play/workbench page
- let the coordinator drive the DOM like a browser robot
- turn every section skill into an autonomous sub-agent
- hardcode giant prompt text instead of structured data
- skip deterministic validation in favor of model confidence

## 14. Active Follow-Up Documents

The next active redesign documents should be:

1. `coordinator-agent.md`
2. `authoring-runtime-bridge.md`
3. `section-skills.md`
4. `section-map.md`
5. `worldbase-and-cast/worldbase-cast-page.md`
6. `worldbase-and-cast/worldbase-cast-skill.md`
7. future section folders that follow the same pattern
8. `TODO.zh-CN.md`
9. a future implementation-facing write-entry note if boundary detail grows

These follow-up documents should all refer back to this master record.

## 15. Archive Policy

Earlier page-first drafts and early plans have been archived.

They remain useful only as historical context and should not be treated as the
current implementation direction.

See:

- [archive/README.md](archive/README.md)

Coding agents should not read archived drafts unless a human explicitly asks for
historical comparison.
