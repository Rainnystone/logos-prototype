# Gossipelog Agent Design

## Document Status

- Date: 2026-03-31
- Status: draft skeleton
- Scope: `branch/narrative-editor`
- Agent name: `gossipelog agent`

## Purpose

This document defines the current Phase 1 design for `gossipelog agent`.

The goal of this agent is to maintain a lightweight, runtime-facing
relationship layer for important roles without turning the existing narrative
engine into a broad autonomous agent system.

The first-class object is not a generic memory archive. The first-class object
is directional relationship state.

Character-side memory traces still matter, but in this design they exist as the
supporting basis that explains why relationship change happened.

This agent is not just a prompt.

It should be designed as:

- a thin deterministic agent shell in code
- plus two narrow semantic skills

The code shell owns timing, candidate-role bounding, validation, persistence,
fallback, and prompt-assembly handoff.

The skills own bounded semantic judgment only.

This means Phase 1 requires explicit skill-invocation capability.

`gossipelog agent` is not complete if it only contains prompt text.

The shell must be able to call:

- `relationship-update-skill`
- `relationship-injection-skill`

as named workflow steps inside the agent loop.

## Agent Scope In This Repository

In this repository, an "agent" is a bounded helper that handles tasks requiring
semantic judgment which deterministic code cannot safely replace.

This does not mean story writing.

Authors still own authored story content, and the main narrative engine remains
the system that generates beats.

This document therefore treats `gossipelog agent` as an auxiliary semantic
sidecar, not as a co-author.

The current authoring `coordinator` is also not the storage or taxonomy
precedent for future agents.

It remains a bridge-facing workflow entrypoint in landed code, not the shared
agent skeleton this document is defining.

## Non-Goals

`gossipelog agent` is not intended to do the following in Phase 1:

- replace the current orchestrator
- become the main narrative generator
- rewrite author-authored static cast definitions
- serve as a full generic memory platform
- infer or store every possible world fact
- manage beat routing, volume control, audit logic, or persistence for unrelated systems
- introduce a heavyweight autonomous multi-agent runtime

`gossipelog agent` is also not intended to:

- read the current round's raw player input directly
- decide Scene cast membership
- perform freeform identity matching outside the current Scene candidate set
- patch prior prompt injection text incrementally across rounds
- introduce an agent management page, toggle UI, or any other new UI/UX surface
  in Phase 1
- redesign Play Workbench or editor UI while implementing this sidecar

## System Position

The current narrative engine remains orchestration code.

`gossipelog agent` is a lightweight sidecar agent that runs beside the existing
generation flow.

Its Phase 1 role is:

1. observe newly accepted beat output
2. read the full current directional relationship baseline for the roles
   involved in that beat
3. update package-owned long-term directional relationship state
4. rebuild a runtime-consumable relationship layer for the next prompt assembly

This keeps semantic interpretation inside a narrow agent boundary while the
orchestrator, save paths, and prompt lifecycle remain code-owned.

The recommended runtime integration point is the orchestrator-side
accepted-beat path, not the API adapter layer.

The API adapter only sees raw model requests and raw model outputs.

`gossipelog agent` needs the accepted beat after audit/rewrite resolution, so
the accepted-beat handoff belongs near `runBeat()` lifecycle control rather
than inside provider-facing adapter code.

## Shared Agent Layout

To keep future agent work discoverable, true agent code should converge under
`src/agents/` rather than being scattered across unrelated runtime folders.

The current recommended layout is:

```text
src/
  agents/
    registry.ts
    gossipelog/
      index.ts
      definition.ts
      agent.ts
      repository.ts
      merge.ts
      skills/
        relationship-update/
        relationship-injection/
```

`src/agents/registry.ts` is the intended shared listing point for later agent
management work.

Phase 1 only needs enough structure for later tooling to discover agent
identity, purpose, owned skills, and package-state paths.

## Management Skeleton Without UI

Phase 1 should leave a management skeleton, not a management surface.

This phase should:

- reserve a shared agent registry entrypoint
- keep each agent's skill definitions colocated with that agent
- keep package-owned state discoverable from stable paths

This phase should not:

- design an agent management page
- add on/off switches to the UI
- revise Play Workbench or editor UI/UX just because the agent exists

## Relation To Existing Memory Placeholder

Phase 1 should treat `Memory Placeholder` and `gossipelog agent` as two
separate memory layers with different purposes.

`Memory Placeholder` remains the narrative engine's accepted-history window.

`gossipelog agent` maintains its own package-owned long-term directional
relationship state.

These two layers may both influence the next generation cycle, but they should
not be collapsed into one shared system.

In Phase 1, the sidecar still uses the current Scene cast as its active working
set, but the state it updates is not Scene-local temporary state.

The updated relationship state belongs to the story package and must support
cross-Scene continuity from the beginning.

## Core Object Model

The approved current model is directional relationship state.

Core rules:

1. relationship is the first-class object
2. memory is a supporting basis for relationship change, not the primary output
3. relationship is directional
4. `A -> B` is stored from A's perspective only
5. `B -> A` is stored separately from B's perspective

This means the system must not assume symmetry or flatten both sides into one
shared neutral edge.

All persisted relationship records should use the existing authored stable
`characterId` values as their identity anchors.

## Phase 1 Scope

Phase 1 is designed for long-term relationship continuity, but its active
runtime scope is intentionally narrower.

Approved Phase 1 scope:

- the model shape should support long-term accumulation
- Phase 1 must already support cross-Scene continuity instead of a temporary
  runtime-only stopgap
- the active runtime working set should only cover the current Scene cast
- the Scene cast boundary is determined by the already implemented
  `scene.yaml.cast` runtime projection
- the hero remains implicitly included by current engine rules
- the relationship layer should still focus on directional role-to-role records
  rather than static authoring data

This keeps the design future-safe without making the first implementation
depend on whole-story semantic reads every round.

## Runtime Lifecycle

The current intended lifecycle is:

1. a beat is generated and accepted by the main narrative engine
2. the player can start reading the accepted result immediately
3. `gossipelog agent` runs asynchronously after acceptance
4. the deterministic shell resolves the current Scene candidate-role set using
   stable `characterId` anchors
5. the shell loads the current role definitions for the roles relevant to the
   beat from world-base plus current Scene-cast framing
6. the shell loads the full current directional relationship state for the
   roles relevant to the beat
7. the shell calls `relationship-update-skill`
8. the skill returns:
   - the involved role ID subset it identified for the current beat
   - structured incremental directional relationship updates
   - full initialization payloads only when a directional edge is genuinely new
9. the shell validates that returned role IDs stay inside the bounded candidate
   set
10. the shell validates the update payload
11. the shell merges the accepted incremental updates into the existing
    package-owned long-term relationship state
12. the shell writes the merged result back to the story package
13. the shell calls `relationship-injection-skill`
14. the injection skill reads the current full relationship state for the
    working-set roles and rebuilds:
    - highlighted relationship deltas
    - stable relationship background
15. the next generation cycle reads the refreshed relationship layer during
    prompt assembly

This lifecycle needs one explicit fallback rule for player experience:

- returning the accepted beat to the player should not wait for the sidecar
  refresh when there is still player reading time available
- but if the player submits the next option or free input before the pending
  sidecar refresh has finished, the orchestrator must wait for that refresh to
  finish before assembling the next beat prompt

This keeps the accepted beat responsive while still guaranteeing that the next
prompt cycle never runs against stale relationship state.

This means the accepted beat can be pushed into the sidecar directly by code at
the orchestrator stage.

No extra discovery skill is required just to fetch the current beat.

The current approved timing principle is:

- update after each accepted beat
- do not wait until the next player submission to begin the work
- keep the relationship update path parallel to player reading time whenever
  possible
- if the next player submission arrives before the pending refresh completes,
  block that next submission until the refresh finishes
- do not read the current round's raw player input directly; rely on the
  accepted beat to carry the narratively relevant effect of that input

Phase 1 should not attempt to optimize this with provider-level streaming.

The current providers and adapter pipeline are request/response oriented, and
the sidecar is defined around the accepted beat after audit/rewrite resolution
rather than an in-flight partial draft.

Because of that, streaming beat text directly from the API adapter into
`gossipelog agent` would add significant complexity while producing little real
benefit in Phase 1.

If a later phase needs more latency optimization, it can revisit earlier
sidecar kickoff after full beat acceptance, but provider-stream coupling is not
part of the current design.

## Agent Boundary

`gossipelog agent` should be treated as a thin controller, not as one more
freeform narrator.

The deterministic shell should own:

- trigger timing after beat acceptance
- Scene-cast-bounded candidate-role resolution
- stable `characterId` anchoring
- loading the current role definitions for the relevant roles from package data
- loading the relevant current relationship state from the story package
- assembling the bounded update-skill context pack before invocation
- explicitly invoking the update and injection skills at the correct workflow points
- validating the skill-returned involved role IDs against the candidate set
- validating the skill-returned incremental update payload
- merging accepted updates into the existing relationship state
- validating and persisting accepted relationship updates
- calling the injection skill after persistence
- handing the prompt-facing relationship layer to `Prompt Assembler`
- falling back to last known stable relationship state when needed

The semantic skills should own:

- deciding which bounded candidate roles are actually involved in the accepted beat
- judging whether directional relationship shifts occurred
- deciding which updates are stable enough to write versus too weak to harden
- formatting prompt-facing relationship text from the current relationship state

This boundary keeps deterministic facts in code and semantic interpretation in
the skills.

## Skill Set

Phase 1 currently assumes two core skills.

### 1. `relationship-update-skill`

This skill is responsible for the semantic update path.

It should be treated as a narrow reusable skill, not a loose freeform prompt.

The design goal is:

- one clear bounded responsibility
- one fixed input contract
- one fixed structured output contract
- no direct persistence power

The shell should invoke it explicitly as a named step in the sidecar workflow
rather than hoping an unconstrained model run will "decide" to use it.

Current approved responsibilities:

- read the newly accepted beat-level material
- work only inside the candidate-role set bounded by the agent shell
- read the current role definitions for the relevant candidate roles
- read the full existing directional relationship state for the roles relevant
  to the current beat
- identify which roles from the candidate set are actually involved in the
  accepted beat
- infer whether directional relationship changes occurred
- return structured incremental directional relationship updates
- distinguish updates strong enough to write from temporary fluctuation that
  should not harden into long-term state
- return a full initialization payload only when a directional edge is new and
  has no prior persisted record

Current rule:

- extraction and integration stay inside one skill for Phase 1
- do not split them into separate semantic passes yet
- the skill does not read the current round's raw player input directly
- the skill must explicitly return the involved role ID subset it identified
  for the current beat
- the skill does not rewrite the full relationship file directly

### `relationship-update-skill` Design Guidance

The skill should be written in a way that matches agent-workflow best practice:

- accept a bounded candidate-role roster instead of open-world character search
- operate on current accepted evidence plus current persisted relationship state
- return strict structured output rather than prose paragraphs
- prefer omission over speculative overreach
- keep its role local to relationship update judgment only

The intended shell-to-skill handoff is:

1. shell provides accepted beat text
2. shell provides the bounded candidate-role set with stable `characterId`
   anchors
3. shell provides the current relevant directional relationship records
4. skill returns:
   - involved role IDs
   - incremental directional changes
   - full initialization payloads only for genuinely new directional edges

This keeps the skill modular and reusable while preserving deterministic state
assembly in code.

### `relationship-update-skill` Minimum Input Contract

At minimum, each invocation should receive:

- the accepted beat text for the current round
- the bounded candidate-role roster for the current Scene working set
- stable `characterId` anchors for that roster
- the current role definitions for the relevant roles from world-base
- current Scene-cast framing for those roles
- the current persisted directional relationship records for the relevant roles

The skill should not depend on hidden state outside this invocation contract.

This candidate context pack should be assembled by the agent shell, not by a
separate discovery skill.

The shell pushes bounded context into the skill.

The skill judges semantic involvement and directional change inside that bounded
context.

### `relationship-update-skill` Decision Policy

The update skill should behave conservatively.

Its job is not to "be insightful" at all costs.

Its job is to decide whether the current accepted beat contains enough evidence
to justify a durable directional relationship update.

That means:

- if the evidence is strong enough, return a structured incremental update
- if the evidence is weak, ambiguous, or purely atmospheric, return no durable
  update for that edge
- if the beat supports asymmetry, update only the directional edge supported by
  the evidence instead of forcing mirrored change
- if the beat introduces a genuinely new directional edge, create only a thin
  initial baseline plus the current-round change
- do not create a thick fully elaborated relationship record at first contact

This policy is important because Phase 1 state is long-term package-owned data,
not disposable runtime scratch text.

### `relationship-update-skill` Prompt Contract

The prompt contract for this skill should be narrow and explicit.

In substance, it should tell the skill:

- you are updating directional relationship state only
- you are not writing files
- you are not rewriting the whole relationship dataset
- you must stay inside the provided candidate-role set
- you must use the accepted beat as the only round-event evidence input
- you must prefer no update over weak speculative update
- you must preserve asymmetry when the evidence supports asymmetry
- you must return strict structured output only

The prompt contract should also explicitly forbid:

- inventing roles outside the provided candidate set
- silently widening scope to off-scene roles
- converting weak hints into hard permanent judgments
- flattening `A -> B` and `B -> A` into one shared edge
- returning prose-only summaries instead of structured payload
- creating a thick fully elaborated initial relationship record from first
  contact alone

The prompt style should stay procedural and contract-first, not persona-heavy.

### 2. `relationship-injection-skill`

This skill is responsible for transforming current relationship state into a
prompt-consumable dynamic layer.

It should be treated as a narrow reusable skill, not as a vague formatting
afterthought.

The design goal is:

- one clear bounded responsibility
- one fixed input contract
- one fixed structured output contract
- prompt-ready relationship control text as its final product
- no direct persistence power

Current approved responsibilities:

- read the complete current directional relationship state for the current
  working-set roles after updates have been persisted
- rebuild the prompt-facing relationship layer from current state each round
- surface highlighted recent relationship deltas
- surface stable directional relationship background
- format output for prompt assembly without rewriting static cast data

Current rule:

- do not expand a third skill in this skeleton
- long-term compaction or summarization may become a later concern, but it is
  intentionally outside the current draft scope
- do not patch prior injected text incrementally; rebuild from current
  relationship state each round

### `relationship-injection-skill` Design Guidance

The injection skill should be responsible for semantic phrasing of the
relationship layer.

`Prompt Assembler` should not receive a half-finished semantic structure and
then be forced to do a second round of interpretive writing in code.

The intended shell-to-skill handoff is:

1. shell provides the current working-set roles for the next prompt cycle
2. shell provides the current full directional relationship state for those
   roles
3. skill returns a structured payload containing:
   - prompt-ready highlighted-delta text
   - prompt-ready stable-background text

This keeps semantic text formation in the skill while keeping insertion order
and prompt-layer placement deterministic in code.

### `relationship-injection-skill` Decision Policy

The injection skill should optimize for prompt usefulness, not for human-facing
recap quality.

That means:

- compress for salience, not for completeness
- make recent durable change easy for the narrative engine to notice
- preserve enough stable baseline that the engine understands current
  relationship context
- do not collapse the whole layer into one vague summary paragraph
- do not restate static cast facts that already belong to authored role
  definitions
- treat highlighted deltas as a single-round emphasis layer, not a multi-round
  rolling summary

The output should read as relationship-control guidance for the narrative
engine, not as general-purpose relationship notes.

The highlighted-delta block should carry change-only content rather than
explanatory prose.

Any broader instruction telling the narrative engine to notice and respond to
relationship change should live in deterministic prompt assembly rather than
inside the delta block itself.

### `relationship-injection-skill` Prompt Contract

The prompt contract for this skill should be narrow and explicit.

In substance, it should tell the skill:

- you are formatting a prompt-facing dynamic relationship layer only
- you are not updating or persisting relationship state
- you must use the current persisted relationship state as the source of truth
- you must preserve the two-layer split between highlighted deltas and stable
  background
- you must write prompt-ready relationship control text
- you must not rewrite static cast definitions
- you must return strict structured output only

The prompt contract should also explicitly forbid:

- freeform recap that ignores prompt usefulness
- collapsing delta and baseline into one undifferentiated block
- inventing relationship facts not supported by current persisted state
- outputting raw internal state dumps as a substitute for prompt-ready text

### `relationship-injection-skill` Minimum Input Contract

At minimum, each invocation should receive:

- the current working-set role IDs for the next prompt cycle
- the current role definitions needed to keep role references clear in the
  prompt-facing text
- the current full directional relationship state for those working-set roles
- any persisted recent-change markers needed to decide what still belongs in
  the highlighted-delta block

The skill should not depend on hidden state outside this invocation contract.

### `relationship-injection-skill` Minimum Output Contract

At minimum, the returned structured payload should support:

- one named prompt-ready text block for highlighted recent deltas
- one named prompt-ready text block for stable relationship background
- deterministic insertion into `Prompt Assembler` without extra semantic
  rewriting in code

The naming direction for the first implementation should stay explicit, for
example:

- `highlightedDeltasText`
- `stableBackgroundText`

The exact Phase 1 injection payload contract should be:

Illustrative example only:

```yaml
highlightedDeltasText: |
  宫下藤花 -> 雾间凪：本轮信任显著上升，应在下一 beat 中反映为更主动的依赖与靠近。
stableBackgroundText: |
  宫下藤花 -> 雾间凪：长期基调为谨慎依赖。
  灰谷烈 -> 雾间凪：长期基调为高关注下的敌意与试探。
```

The highlighted-delta block should represent only the current just-updated
round and should be intended for the next prompt cycle only.

After that next prompt cycle, the same change should no longer remain in the
highlighted-delta block and should instead live only in the stable background
state unless a newer update creates a fresh delta.

The skill should not return:

- raw file-shaped relationship data
- prose that requires code to interpret meaning before insertion
- a single merged block that erases the delta/background distinction

## Agent Prompt Contract

`gossipelog agent` should be prompted as a narrow semantic interpreter, not as a
freeform co-author.

The prompt contract should reinforce the following:

- the agent updates directional relationship state only
- the agent does not seize plot control from the narrative engine
- the agent must prefer explicit accepted evidence over broad speculation
- the agent must preserve asymmetry where the evidence supports asymmetry
- the agent should not silently convert uncertain shifts into hard permanent
  judgments

Detailed wording remains open, but the contract should clearly frame the agent
as lightweight, bounded, and relationship-focused.

## Update Skill Context Pack

The current intended update context pack is deliberately narrow.

Phase 1 should include only the minimum needed inputs such as:

- the newly accepted beat result
- the current Scene candidate-role subset with stable `characterId` anchors
- the current role definitions for the relevant roles from world-base plus
  current Scene-cast framing
- the full current directional relationship state for the roles relevant to the
  current beat
- minimal role identity hints needed to keep references clear inside the
  candidate set

Current approved rule:

- this agent does not need the same full history context as the main narrative
  engine by default
- it should work from the current accepted beat plus existing relationship state
- it should include current role-definition context for the relevant roles so
  relationship updates remain grounded in who those roles are
- full current role definitions for the involved roles are acceptable here
  because this context serves the sidecar agent rather than the narrative
  engine
- broader historical loading should remain an explicit later decision, not a
  hidden default
- it should not read the current round's raw player input directly

## Injection Skill Context Pack

The injection skill should read:

- the current working-set roles for the next prompt cycle
- the full current directional relationship state for those working-set roles
- any persisted recent-delta markers needed to distinguish fresh change from
  stable baseline

The injection skill should not depend on:

- raw player input
- prior injected prompt text
- hidden incremental patch state outside the persisted relationship data

## Output Contract

The output should be structured, not prose-only.

The current skeleton assumes two output classes:

1. relationship state updates
2. prompt injection material

Relationship state updates should preserve directional ownership, meaning the
record for `A -> B` remains distinct from `B -> A`.

For `relationship-update-skill`, the output should include at least:

- the involved role ID subset for the current beat
- structured incremental directional edge updates for the affected `A -> B`
  records
- enough structured information to tell:
  - what changed
  - what remained unchanged
  - what was too uncertain to harden into long-term state

The default output mode should be delta-based.

When a directional edge is new, the skill may return the full initial payload
required to create that edge, but this still remains part of the shell-owned
merge flow rather than a direct full-file rewrite.

That initial payload should still remain thin.

It should establish the existence of the new edge and the minimal baseline
needed to carry forward future updates, then attach the current-round change as
the first durable shift.

The output contract should be designed as a strict structured payload boundary,
not as an informal narrative explanation that later code tries to parse.

At the design level, the payload should be understood as a workflow handoff
object, not as user-facing prose.

### `relationship-update-skill` Minimum Output Contract

At minimum, the returned structured payload should support:

- the involved role ID subset for the beat
- per-edge update entries for affected directional records
- explicit no-op behavior when no durable change should be written
- explicit new-edge initialization behavior when a directional edge does not yet
  exist
- enough edge-level detail for the shell to merge deterministically into
  package-owned state

The skill should not return:

- direct file content for the full relationship dataset
- unbounded natural-language notes that code must interpret heuristically
- role IDs outside the provided candidate set

Not every accepted beat needs to produce a durable relationship update.

Explicit invocation-level no-op is a normal and expected result.

The top-level naming direction for the first implementation should stay compact
and explicit, for example:

- `involvedRoleIds`
- `edgeUpdates`
- `invocationNoOp`

Per-edge update entries should use a small explicit mode set, for example:

- `noop`
- `delta`
- `new_edge`

The exact Phase 1 update payload contract should be:

Illustrative example only:

```yaml
involvedRoleIds:
  - chr_core01
  - chr_hero01
invocationNoOp: false
edgeUpdates:
  - sourceRoleId: chr_core01
    targetRoleId: chr_hero01
    mode: delta
    replaceBaseline: false
    baseline:
      state: wary trust
      lastAbsorbedRound: round-0007
    recentDelta:
      state: trust increased after direct protection
      sourceRound: round-0008
```

Rules:

- `invocationNoOp: true` means the accepted beat produces no durable
  relationship write
- `edgeUpdates` may be empty only when `invocationNoOp: true`
- `mode: noop` is allowed for explicit per-edge no-op entries when needed
- `mode: new_edge` is used when the directional edge does not yet exist
- `replaceBaseline: true` explicitly signals a fundamental directional shift
  that should replace the stable baseline

Prompt injection material should distinguish:

- recent highlighted deltas
- stable relationship background

For `relationship-injection-skill`, the output should rebuild the prompt-facing
dynamic relationship layer from current state, not from prior injected text.

That output should remain a structured payload whose block contents are already
prompt-ready relationship control text.

Detailed field schemas remain open and should be finalized after design review.

## Prompt Injection Design

The dynamic relationship layer should not be merged into the static cast text as
if it were original authoring data.

The current approved placement is:

1. static world and cast information first
2. dynamic relationship layer second
3. beat history after that

In the current codebase shape, the cleanest implementation direction is to add
this as a dedicated dynamic relationship field in `PromptObject` rather than
folding it into `worldBase`, `history`, or `directorNote`.

The naming direction for this dedicated field should stay explicit and
layer-oriented, for example `relationshipLayer`.

The exact Phase 1 `PromptObject` field shape should be:

```yaml
relationshipLayer:
  highlightedDeltasText: string
  stableBackgroundText: string
```

Within the dynamic relationship layer, the current approved structure is:

### Highlighted Relationship Deltas

This block should foreground the most relevant recent directional relationship
changes that the next beat may need to respond to.

### Stable Relationship Background

This block should preserve enough directional relationship context that the
generator can understand the current baseline instead of seeing isolated deltas
without prior state.

The purpose of this two-layer design is to avoid a false choice between:

- delta only, which loses context
- static summary only, which loses recency and urgency

The injection layer should be recomputed each round from the current
relationship state for the active working set.

`Prompt Assembler` should insert this returned relationship layer as a dedicated
dynamic block.

It should not do a second semantic rewrite of the returned relationship text.

This means the delta layer is intentionally short-lived:

- current round update creates next-round highlighted delta
- next prompt cycle consumes that highlighted delta
- later rounds treat that same change as part of stable background unless a new
  update supersedes it

## Package-Owned Long-Term State

Phase 1 should not treat relationship state as transient runtime memory.

The approved direction is:

- long-term directional relationship state belongs to the story package
- each story package stores its own `gossipelog agent` state inside
  `agents/gossipelog/` within that package folder
- agent code and skills remain system-level, not package-bound
- the persistence shape should follow the same broad principle as
  `world-base.yaml`:
  - one package-level file
  - high-granularity internal records
  - stable `characterId` anchors

The current recommended package-local files are:

- `agents/gossipelog/config.yaml`
- `agents/gossipelog/character-relationships.yaml`

`config.yaml` is reserved for package-local enablement or settings.

`agents/gossipelog/character-relationships.yaml` should be separate from
`world-base.yaml`.

`world-base.yaml` remains static authored role and world definition.

`agents/gossipelog/character-relationships.yaml` holds package-owned long-term
dynamic relationship state.

The current relationship scope includes:

- core role -> player
- core role -> core role
- core role -> antagonist
- antagonist -> antagonist
- antagonist -> player

The current rule is:

- player-directed records from authored non-player roles are in scope
- player-authored outward records are not treated as a first-class authored role
  perspective in the same way as non-player roles

When the current player-facing role is the authored hero, other roles may point
to that hero using the hero's existing stable `characterId`.

Phase 1 still does not persist the hero as a full outgoing source-role
perspective.

## Relationship State File Structure

The structure in this section refers to the file at
`agents/gossipelog/character-relationships.yaml` inside each story package.

The current recommended structure for `character-relationships.yaml` is a
middle-weight layout:

1. a thin file-level metadata block
2. a relationship-data block organized by source role

This is intentionally not the thinnest possible layout and not the heaviest
possible layout.

It keeps the file readable and extensible while preserving the directional
organization the system actually needs.

### File-Level Metadata Block

The metadata block should stay thin.

Its job is only to identify the file contract clearly enough for safe loading
and migration.

At minimum, this block should support concepts such as:

- what file this is
- contract or schema version
- which story package it belongs to

The current recommended top-level shape is:

- `meta`
- `relationshipsBySource`

The `meta` block should stay minimal and focus only on file identity, schema
version, and owning story-package identity.

The exact Phase 1 top-level file contract should be:

Illustrative example only:

```yaml
meta:
  fileType: character-relationships
  schemaVersion: 1
  storyPackage: sample-scene
relationshipsBySource: {}
```

It should not become a dumping ground for runtime-only state.

### Relationship-Data Block

The main body of the file should be organized by source role.

That means:

- each source role gets its own top-level relationship owner entry
- each source role entry expands into key-addressable outgoing directional
  targets
- `A -> B` and `B -> A` remain separate records in separate source-role
  branches

This matches the approved asymmetry model directly.

In practical terms, the organization should follow the mental model:

- source role `B`
  - target `player-facing hero`
  - target `C`
- source role `C`
  - target `B`

This means the recommended design is still the per-role directional structure
already discussed, but wrapped in one clearer package-level file contract.

Within each source-role branch, target relationships should be stored as
key-addressable target-role entries rather than as an array of edge objects.

This keeps direct lookup and deterministic update logic simple in Phase 1 while
still allowing later transformation for visualization surfaces.

### Directional Edge Record Shape

Each `A -> B` edge record should be layered instead of flattened into one
undifferentiated block.

The current recommended shape is:

1. a thin stable baseline
2. recent change data

At minimum, each edge record should support:

- source-role identity anchoring
- target-role identity anchoring
- one thin stable baseline block
- one recent-change block
- one marker indicating whether that recent change should be emphasized in the
  next prompt cycle

The naming direction for the first implementation should stay direct and
readable, for example:

- `sourceRoleId`
- `targetRoleId`
- `baseline`
- `recentDelta`
- `highlightNextPrompt`

The exact Phase 1 edge record contract should be:

Illustrative example only:

```yaml
sourceRoleId: chr_core01
targetRoleId: chr_hero01
baseline:
  state: cautious dependence
  lastAbsorbedRound: round-0008
recentDelta:
  state: trust increased after direct protection
  sourceRound: round-0009
highlightNextPrompt: true
```

The thin stable baseline exists to say:

- this edge exists
- the long-term relationship baseline currently leans in a certain direction
- the baseline is intentionally conservative
- the last absorbed stable state can be identified cleanly for later merge
  behavior

The minimal baseline naming direction should center on concepts such as:

- `state`
- `lastAbsorbedRound`

Recent change data exists to say:

- what the latest durable change was
- whether it should still be highlighted in prompt injection

Recent change data should carry change-only content rather than extra
explanatory prose.

The minimal recent-delta naming direction should center on concepts such as:

- `state`
- `sourceRound`

The exact Phase 1 relationship file organization should therefore be:

Illustrative example only:

```yaml
meta:
  fileType: character-relationships
  schemaVersion: 1
  storyPackage: sample-scene
relationshipsBySource:
  chr_core01:
    targets:
      chr_hero01:
        sourceRoleId: chr_core01
        targetRoleId: chr_hero01
        baseline:
          state: cautious dependence
          lastAbsorbedRound: round-0008
        recentDelta:
          state: trust increased after direct protection
          sourceRound: round-0009
        highlightNextPrompt: true
      chr_ant01:
        sourceRoleId: chr_core01
        targetRoleId: chr_ant01
        baseline:
          state: fear with incomplete recognition
          lastAbsorbedRound: round-0006
        recentDelta: null
        highlightNextPrompt: false
```

The next-prompt emphasis marker exists to say:

- whether this recent change belongs in the next prompt cycle's highlighted
  delta layer
- when it should stop being treated as highlighted delta and be treated only as
  part of stable background

This layered design is important because:

- new edges should start thin rather than overfilled
- existing edges should accumulate incremental updates without constant
  full-record rewrite
- injection needs both baseline and freshness

When a returned update represents a fundamental directional shift, merge logic
may replace the stable baseline state rather than merely nudging it.

That replacement should be triggered by explicit structured output from the
update skill rather than by heuristic shell-side guesswork.

### New Edge Rule Inside The File

When a directional edge is created for the first time, the persisted result
should not be a thick fully elaborated profile.

Instead, the file should store:

- a thin initial baseline for that new edge
- plus the current round's first durable change

This keeps first-contact relationships honest and leaves room for later rounds
to shape them further.

### Hero As Target, Not Full Source

Phase 1 should allow authored non-player roles to target the player-facing hero
through the hero's existing authored `characterId`.

That means records such as:

- core role -> hero
- antagonist -> hero

are in scope.

Phase 1 should not persist a full hero-outgoing source branch such as:

- hero -> core role
- hero -> antagonist

as part of this package-owned long-term relationship file.

This preserves the approved scope while still giving other roles a stable and
fully anchored target for their directional records.

## Failure And Degradation

Phase 1 should not allow `gossipelog agent` failure to block the main narrative
loop catastrophically.

The current intended degradation principles are:

- if no confident relationship change is available, keep prior stable state
- if the update path fails, the next beat may fall back to the last known
  stable relationship layer
- the system should prefer omission over fabricated certainty
- dynamic relationship injection should remain removable without breaking the
  baseline prompt structure
- if the skill returns role IDs outside the bounded candidate set, reject the
  invalid selection rather than silently widening scope
- if update output is invalid, keep prior persisted relationship state rather
  than writing partial speculative corruption

Detailed retry policy and timeout behavior remain open.

## Phase 1 Acceptance

Phase 1 should be considered complete only if all of the following are true:

1. the system can run a relationship update after each accepted beat
2. the update path preserves directional records instead of flattening them
3. the update path is scoped to the current Scene cast working set
4. Phase 1 writes story-package-owned long-term relationship state rather than
   a temporary runtime-only cache
5. `relationship-update-skill` returns the involved role ID subset explicitly
6. prompt assembly can consume a dynamic relationship layer without mutating
   static cast definitions
7. the injected layer distinguishes highlighted recent deltas from stable
   relationship background
8. the injection layer is rebuilt each round from current relationship state
   for the working set rather than patched incrementally
9. the orchestrator remains code-owned rather than being replaced by a broad
   new narrative agent
10. the implementation can operate without a new agent-management UI or any
    discretionary UI/UX redesign

## Open Questions

The following questions remain intentionally open in this draft:

1. what exact runtime round identifier format should fields such as
   `sourceRound` and `lastAbsorbedRound` use
2. how should uncertainty, contradiction, and temporary fluctuation be encoded
   inside the already frozen layered edge shape
3. what exact prompt wording should govern the agent's confidence discipline
4. what exact optional fields, if any, should be allowed beyond the frozen
   minimal Phase 1 contracts
