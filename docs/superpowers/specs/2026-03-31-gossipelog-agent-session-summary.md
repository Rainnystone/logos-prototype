# Gossipelog Agent Session Summary

## Document Status

- Date: 2026-03-31
- Status: active working summary
- Scope: `branch/narrative-editor`
- Audience: future coding agents and human reviewers

## Purpose

This document summarizes the discussion that led to the current `gossipelog agent`
design skeleton.

Its purpose is to give later agents a compact briefing so they can understand:

- what repository state was confirmed during discussion
- what architectural direction was chosen
- what has already been decided
- what remains intentionally open

Read this together with:

- [2026-03-31-gossipelog-agent-design.md](2026-03-31-gossipelog-agent-design.md)
- [2026-03-31-gossipelog-agent-log.md](2026-03-31-gossipelog-agent-log.md)

## Repository State Confirmed During Discussion

The following repo facts were verified during the session:

1. Work is happening on `branch/narrative-editor`.
2. Character granularity has already been implemented.
3. Characters already have stable independent IDs.
4. Scene-level cast control has already been implemented.
5. `scene.yaml.cast` already works as a Scene availability boundary.
6. The editor can already edit and save Scene cast.
7. Runtime loading already filters cast members according to `scene.yaml.cast`.
8. The current branch was updated to read full accepted history by default in
   the memory placeholder path.
9. The storyteller prompt addition was also merged into the current branch.

Important interpretation:

- the repository already has a usable Scene cast boundary
- this means Phase 1 of `gossipelog agent` can safely scope itself to the
  current Scene cast working set instead of the whole story package

## Main Problem Framing

The original discussion started from the idea of letting important roles
accumulate their own memory-like traces, but the direction changed after
further clarification.

The final framing for this design cycle is:

- the first-class object should be relationship, not generic memory
- character-side memory traces still matter, but only as the supporting basis
  that explains relationship change
- the current orchestrator is still orchestration code, not a broad autonomous
  agent
- because relationship change is semantically fuzzy, it should not be forced
  into hard-coded deterministic interpretation logic
- a lightweight sidecar agent is preferred over turning the full narrative
  engine into a new agent-centric architecture

## Chosen High-Level Direction

The chosen direction is to introduce a lightweight sidecar called
`gossipelog agent`.

Current architectural intention:

1. the main narrative engine remains code-owned orchestration
2. `gossipelog agent` runs beside it as a narrow semantic interpreter
3. after each accepted beat, the sidecar updates directional relationship state
4. the next prompt assembly reads a dynamic relationship layer produced from
   that state

This direction was chosen specifically to avoid:

- patch-like short-term hacks
- overloading the orchestrator with fuzzy semantic judgment
- prematurely building a full memory platform
- tightly coupling future memory-system work to this first implementation

## Relationship Model Decisions

The most important conceptual decisions reached in the session were:

1. Relationship is the first-class object.
2. Memory is a supporting basis for relationship change.
3. Relationship is directional, not symmetric.
4. `A -> B` is stored from A's perspective only.
5. `B -> A` is stored separately from B's perspective.
6. The system must support all important pair types in principle:
   - core role to core role
   - core role to antagonist
   - antagonist to antagonist
   - core role to player
   - antagonist to player
7. The player role is not treated as a persisted authored role record in the
   same way as non-player roles, but other roles' directional relationships
   toward the player are still in scope.

## Phase 1 Scope Decisions

Although the relationship model is intended to support long-term continuity, the
first implementation is intentionally narrower.

Approved Phase 1 scope:

- design for long-term relationship continuity
- actively operate only on the current Scene cast working set
- update after every accepted beat
- do not wait until the next player submission to begin the update
- run the relationship update in parallel while the player is reading the newly
  accepted beat whenever possible

Reasoning behind this scope:

- large player choices can cause immediate relationship shifts
- waiting too long would make the system feel stale
- Scene cast already provides a clean boundary for the first implementation

## Skill Direction Chosen

The discussion explicitly rejected splitting semantic extraction and semantic
integration into separate Phase 1 skills.

Current intended skill layout:

1. `relationship-update-skill`
   - reads newly accepted material plus relevant existing relationship state
   - infers whether directional relationship change occurred
   - integrates the result into runtime-facing relationship state
2. `relationship-injection-skill`
   - prepares prompt-facing relationship material
   - separates highlighted recent deltas from stable relationship background

Current rule:

- do not expand a third skill in the design skeleton yet

## Prompt Injection Direction Chosen

The discussion spent significant time on where the relationship layer should be
placed in prompt assembly.

The chosen direction is:

- do not merge dynamic relationship content into static cast text as if it were
  original author-authored setting
- keep the dynamic relationship layer separate from static role definition
- place the dynamic relationship layer after static world and cast information
  and before beat history

The chosen internal shape for that injected layer is:

1. highlighted relationship deltas
2. stable relationship background

Reasoning:

- delta-only loses prior context
- stable-summary-only loses urgency and recency
- the generator needs both the new change and the baseline relationship context

## Open Questions Identified During Discussion

The following questions were identified but intentionally left open:

1. what exact schema should represent a directional relationship record
2. how much prior relationship state should the update skill read each time
3. how uncertainty, contradiction, and temporary fluctuation should be encoded
4. what exact system prompt wording should govern `gossipelog agent`
5. what exact prompt-object or template boundary should carry the dynamic
   relationship layer
6. where long-term directional relationship state should live before any future
   larger memory system arrives

## Document Creation Outcome

This session produced two active design support documents:

- [2026-03-31-gossipelog-agent-design.md](2026-03-31-gossipelog-agent-design.md)
- [2026-03-31-gossipelog-agent-log.md](2026-03-31-gossipelog-agent-log.md)

This session summary exists to help later agents read the reasoning path without
reconstructing the full chat thread.
