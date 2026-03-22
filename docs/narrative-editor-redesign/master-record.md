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

- `1` coordinator agent: `router-controller`
- `4` section skills
- `1` cross-section reconciliation skill
- `1` legacy migration skill
- deterministic code-side validation, writeback, and reload

This is intentionally lightweight.

It is not:

- a team of autonomous long-running agents
- a DOM-driving UI bot
- a prompt-only solution
- a replacement for the existing runtime orchestrator

## 5. Coordinator Agent

### 5.1 Name

Approved coordinator name:

- `router-controller`

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

## 6. Skill Inventory

### 6.1 Required Section Skills

The approved minimum skill set is:

1. `worldbase-cast-skill`
2. `scene-phase-authoring-skill`
3. `control-modules-skill`
4. `package-wiring-validation-skill`

Each section skill is responsible only for its own section-owned authoring model.

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

## 8. Coordinator Request Flow

The approved request flow is:

`Author Intent` -> `Router Controller` -> `Section Skill or Cross-Section Skill` -> `Structured Patch Candidate` -> `Deterministic Validation` -> `Repair Loop or Persist` -> `Writeback` -> `Reload Aggregate` -> `UI Result`

### 8.1 Meaning Of This Flow

- author intent may be natural language or section-scoped partial input
- the coordinator does not persist anything by itself
- the first legal output from a skill is a structured patch candidate
- only validated patches may be written
- successful writes must be followed by reload and aggregation

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
2. `section-skills.md`
3. a future validation/writeback design note if needed
4. only after that, refreshed section page drafts

These follow-up documents should all refer back to this master record.

## 15. Archive Policy

Earlier page-first drafts and early plans have been archived.

They remain useful only as historical context and should not be treated as the
current implementation direction.

See:

- [archive/README.md](/Users/tachikoma/Desktop/DEV/LOGOS%20DEV/docs/narrative-editor-redesign/archive/README.md)

Coding agents should not read archived drafts unless a human explicitly asks for
historical comparison.
