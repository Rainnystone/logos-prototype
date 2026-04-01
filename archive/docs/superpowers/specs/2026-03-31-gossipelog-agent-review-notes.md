# Gossipelog Agent Review Notes

## Status

- Date: 2026-03-31
- Purpose: capture my current review conclusions and recommended follow-up changes
- Scope: review notes only
- Important: this file does **not** replace the current design spec or implementation plan

## Why This File Exists

This note records:

- my current interpretation of the `gossipelog agent` architecture
- the main issues found while cross-checking the current spec and plan
- the smallest follow-up changes I would recommend before implementation starts

This was written so another Codex session can review the same conclusions
without having to reconstruct the whole conversation.

## My Current Position

### 1. What Counts As The Agent

My current view is:

- `gossipelog agent` should be treated as one complete workflow unit
- that workflow unit includes both:
  - control-flow code
  - semantic analysis capability
- the control-flow layer is **part of the agent**, not something outside the
  agent
- `relationship-update-skill` and `relationship-injection-skill` are
  sub-capabilities inside that same agent workflow

This matches the working direction discussed in-session:

- accepted beat is pushed into the agent
- the agent reads package/runtime context
- the agent invokes skills
- the agent merges and persists state
- the agent prepares the next-round relationship layer

### 2. Package And Repository Layout

The current layout direction I support is:

- system-level agent code under `src/agents/`
- `gossipelog agent` under `src/agents/gossipelog/`
- package-local agent state under
  `src/story-packages/<package>/agents/gossipelog/`

Current approved package-local files:

- `agents/gossipelog/config.yaml`
- `agents/gossipelog/character-relationships.yaml`

### 3. UI / UX Scope

Phase 1 should **not**:

- add an agent management page
- add toggle UI
- redesign Play Workbench
- redesign editor UI

Phase 1 should only leave the structural foundation for later management work.

## Main Review Findings

These points came from a direct review of:

- `archive/docs/superpowers/specs/2026-03-31-gossipelog-agent-design.md`
- `archive/docs/superpowers/specs/2026-03-31-gossipelog-agent-log.md`
- `archive/docs/superpowers/plans/2026-03-31-gossipelog-agent.md`

### A. The Workflow Is Mostly Present, But Not Fully Closed Yet

The intended workflow is:

1. accepted beat enters `gossipelog agent`
2. agent reads candidate role set, role definitions, and current relationship state
3. agent invokes `relationship-update-skill`
4. agent validates and merges result
5. agent writes package-local relationship state
6. agent invokes `relationship-injection-skill`
7. next prompt cycle consumes refreshed `relationshipLayer`

The current documents already describe most of this.

However, they still leave some key steps underspecified.

### B. Candidate Role Loading Is Not Fully Nailed Down

The current spec still drifts between two ideas:

- the agent first loads only the roles "relevant to the beat"
- the update skill decides which roles were actually involved in the beat

Those two statements conflict unless the spec clearly says:

- the agent first loads the **current Scene candidate set**
- the update skill then decides which roles inside that candidate set were
  actually involved

That is the cleanest closure point and should be written explicitly.

### C. No-Op Update Must Not Mean "Skip Everything"

I agree with the conversation decision:

- if no durable relationship change is needed, do not write an update

But the docs should still make clear:

- no-op update does **not** mean the entire sidecar lifecycle disappears
- the agent may still need to handle delta aging / highlight absorption logic
- the next-round relationship layer still needs a valid source of truth

### D. Highlight Consumption Needs A Clearly Assigned Owner

The docs currently say highlighted deltas should only live for one prompt cycle.

My recommendation is to make this explicit:

- the agent's deterministic control-flow layer owns this lifecycle step
- not `Prompt Assembler`
- not a semantic skill

In practice, that means the agent should absorb consumed highlighted deltas into
stable background at a deterministic point in the loop.

### E. Failure Fallback Is Still Too Fuzzy

The current materials still leave one important ambiguity:

- next prompt should not run on stale relationship state
- but failure fallback may still reuse the last stable relationship layer

That exception path needs to be frozen more clearly.

The docs should explicitly say what happens if:

- update skill fails
- update payload is invalid
- writeback fails
- injection skill fails

At minimum, the documents should answer:

- does the next round block
- does it fall back to last stable relationship layer
- does it continue with a no-op layer
- does it abort generation

### F. Skill Delivery In The Plan Is Still Too Soft

The current plan now includes:

- skill directories
- skill IDs
- adapter entry points

That is better than before.

But I still think the plan should freeze the actual deliverable more clearly.

Today it would still be possible for an implementer to produce:

- folders
- adapter methods
- prompt template logic

without really delivering two well-defined skill units.

The plan should make it impossible to "complete" this work with empty or
informal skill shells.

### G. End-To-End Verification Needs To Be Stronger

The current plan checks whether later prompt objects contain
`relationshipLayer`, but that alone is not enough.

Best-practice verification should prove the full chain:

1. accepted beat arrived
2. agent loaded source context
3. update skill was called
4. result was merged
5. package file was written, or explicit no-op was preserved
6. injection skill was called against current state
7. next prompt used that refreshed state

Without that, a weaker implementation could still pass by keeping data only in
memory.

## Recommended Follow-Up Changes

I would **not** rewrite the documents again.

I would make a focused follow-up patch only in the spec and the plan.

### Spec Changes I Recommend

1. Explicitly define the start of the update loop as:
   - agent receives accepted beat
   - agent loads current Scene candidate roles
   - agent loads full role-definition documents for that candidate set
   - agent loads current relationship subgraph for that candidate set
   - update skill decides actual involved roles within that bounded set

2. Explicitly state:
   - no-op update means no durable relationship write
   - no-op does not erase the rest of the lifecycle

3. Explicitly assign highlighted-delta aging / absorption to the agent's
   deterministic control-flow layer

4. Explicitly freeze failure behavior for:
   - invalid skill output
   - update failure
   - write failure
   - injection failure

5. Explicitly freeze how round identifiers are supplied and owned:
   - whether `roundId` enters the skill input directly
   - whether fields such as `sourceRound` and `lastAbsorbedRound` are authored
     by the skill or stamped by deterministic code

6. Explicitly state the invocation channel for the two skills, so the
   implementation is not forced to invent that boundary during coding

### Plan Changes I Recommend

1. Upgrade the skill-related tasks from "directories exist" to "real skill
   deliverables exist"

2. Add explicit steps for:
   - invalid update payload fallback
   - update failure fallback
   - injection failure fallback

3. Add at least one stronger regression proving:
   - package file write happened
   - the next cycle consumed the refreshed state from the correct source

4. Add a regression proving:
   - no-op update does not write noise
   - the agent still returns a valid next-round relationship layer

5. Add a regression proving:
   - background refresh failure does not silently deadlock the next cycle
   - the chosen fallback behavior matches the spec

## Suggested Decision Wording

If I were tightening the spec, I would try to freeze the following ideas very
plainly:

- `gossipelog agent` is one agent workflow, not a prompt plus unrelated helper code
- the agent receives accepted beat input directly
- the agent loads the current Scene candidate set before semantic narrowing
- `relationship-update-skill` performs semantic narrowing inside that bounded set
- deterministic agent logic owns merge, persistence, fallback, and highlight aging
- `relationship-injection-skill` builds the prompt-facing relationship layer from
  the current persisted state
- `Prompt Assembler` consumes the returned layer but does not reinterpret its meaning

## Practical Bottom Line

If implementation started from the current documents today, the team would
probably still land roughly in the intended direction.

But I do **not** think the current spec/plan are fully safe yet for the exact
workflow closure requirement:

- beat acquisition
- agent read
- update skill call
- merge / writeback
- injection skill call
- next prompt consumption

The missing parts are no longer "what is this project trying to do?"

The missing parts are now mostly:

- precise ownership
- precise fallback behavior
- precise verification

That is why I recommend a final small tightening pass before execution.
