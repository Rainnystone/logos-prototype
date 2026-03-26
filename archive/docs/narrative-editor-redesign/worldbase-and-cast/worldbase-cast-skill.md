# WorldBase Cast Skill

## Document Status

- Date: 2026-03-23
- Status: active
- Scope: first detailed section skill under the coordinator-first redesign
- Global section map: [../section-map.md](../section-map.md)
- Related page: [worldbase-cast-page.md](worldbase-cast-page.md)
- Related bridge doc: [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)

## 1. Purpose

This document defines the approved boundary for `worldbase-cast-skill`.

This skill is responsible for semantic interpretation and structured patch
generation for the `WorldBase & Cast` section.

It is not responsible for:

- file writes
- final rendering into runtime files
- deterministic validation
- final save success state

## 2. Section Role

This skill supports the section that owns:

- world base text blocks
- hero
- core cast
- antagonists
- ordinary supporting cast text
- location pool text

This section should be treated as a direct-runtime section in V1.

That means:

- the page and skill can use richer structured inputs than the current runtime file exposes
- the bridge later renders runtime-compatible output directly into [`world-base.yaml`](../../../src/story-packages/sample-scene/world-base.yaml)
- the skill should not free-write `world-base.yaml`; deterministic bridge formatting still owns that step

## 3. Approved Responsibilities

The skill may do the following:

1. interpret author free text for the section
2. normalize world-base text blocks
3. propose structured updates for hero / core-cast / antagonist cards
4. repair incomplete or inconsistent card content when the error is repairable
5. generate concise left-rail summary content from full card data if needed
6. preserve section boundaries while translating author intent into patch candidates

## 4. Skill Must Not Do

The skill must not:

1. write files directly
2. emit raw YAML as the only result
3. bypass the bridge
4. invent fields outside the approved section contract
5. force unrelated cross-section edits
6. decide final persistence success
7. replace deterministic validation with model confidence

## 5. Approved Input Areas

The skill should expect inputs related to these page surfaces:

- world base textarea
- world rules textarea
- tone / prose baseline textarea
- hero summary selection and full-card edits
- core-cast rail items
- antagonist rail items
- ordinary supporting cast textarea
- location pool textarea

It should also be able to consume:

- current section draft state
- current selected character identity
- validation repair payloads returned by deterministic code

## 6. Approved Output Shape

The first legal skill output is a structured patch candidate.

That patch candidate should be shaped for the coordinator + bridge pipeline, not
for direct filesystem write.

The output should, in substance, be able to describe:

- which subsection changed
- which character entry changed, if any
- whether the change targets text blocks or structured card fields
- what assumptions were made
- whether the skill needs a human decision

### 6.1 Approved V1 Target Mapping

In V1, this skill should aim at a fixed runtime target shape in
[`world-base.yaml`](../../../src/story-packages/sample-scene/world-base.yaml).

The approved mapping is:

- `mainCharacters`
  - world base setting
  - world rules / prohibitions / anomalous properties
  - genre tone and prose baseline
  - hero
  - core cast
  - antagonists
- `npcCharacters`
  - ordinary supporting cast
- `locationPatch`
  - location pool / scene elements

This means the skill should organize content for those three runtime targets,
but it should still return structured patch data rather than directly writing the
file.

### 6.2 Approved V1 Block Order

For `mainCharacters`, the block order should be fixed:

1. world header block
2. hero block
3. core cast blocks
4. antagonist blocks

Coding agents should treat this order as part of the approved behavior, not as a
stylistic preference.

## 7. Relation To The Page

The page and the skill have different jobs.

### 7.1 Page Responsibilities

The page is responsible for:

- rendering the summary rails
- selecting the active character
- presenting the full editor
- collecting button presses such as submit / reset
- keeping local unsaved state visible

### 7.2 Skill Responsibilities

The skill is responsible for:

- understanding author intent
- turning natural-language author input into structured section updates
- filling missing card detail when the request is clear enough
- repairing section-scoped inconsistencies

### 7.3 Important Boundary

The page decides which character is selected.

The skill does not choose the UI selection model.

The page adds or removes card slots.

The skill helps fill or normalize the contents of those slots.

## 8. Approved V1 Behavior By Content Type

### 8.1 World Text Blocks

For:

- world base setting
- world rules / prohibitions / anomalies
- genre tone and prose baseline

the skill should:

- preserve freeform author control
- help normalize phrasing when asked
- avoid collapsing these into over-structured micro-fields too early

For V1 rendering, these three textareas should be merged into one fixed
`world header block` before the hero block:

1. world base setting
2. world rules / prohibitions / anomalous properties
3. genre tone and prose baseline

### 8.2 Hero

The hero is unique.

The skill should:

- support one hero only
- patch the hero card as a single entity
- reject attempts to create multiple hero cards through silent inference

### 8.3 Core Cast

The skill should:

- support repeated structured character entries
- patch one or more core-cast entries when clearly requested
- preserve existing entry identity when only details change

### 8.4 Antagonists

The skill should follow the same repeated-entry model as core cast.

It may also support the optional antagonist-only field:

- fatal weakness

### 8.5 Ordinary Supporting Cast

V1 should remain lightweight here.

Ordinary supporting cast can remain a freeform section input.

The skill may normalize or reorganize that text when asked, but it should not
silently force all ordinary supporting cast into the same detailed structured
card model as hero / core cast / antagonists.

### 8.5.1 Ordinary Supporting Cast Normalization Rule

Although the page stays lightweight, the saved output should not remain a raw
unshaped text dump.

The skill should:

- split ordinary supporting cast into person-level entries when the author input makes that possible
- preserve leftover ambiguous text instead of inventing missing facts
- keep each recognized person lightweight
- prepare content for a stable bridge-owned render rule

Recommended per-person output shape:

1. one entry per recognized person
2. stable shape: `姓名：一句到两句描述`
3. optional parenthetical short qualifier only when the author already provided it
4. no forced full card-style field expansion

If the input is too ambiguous to split safely:

- keep it as a grouped fallback block
- do not fabricate extra characters
- do not guess missing relationships as facts

### 8.6 Location Pool

Location pool / scene elements remain a freeform text block in V1.

The skill may help organize or clarify it, but should not require a deeper
schema before the section is saved.

## 9. Approved Runtime Rendering Intent

This skill is designed around one practical fact:

- the current runtime does not read per-character structured objects from `world-base.yaml`
- it reads a few larger text blocks

So the skill should optimize for:

- stable block composition
- stable order
- stable labels

not for:

- preserving raw textarea shape at all costs
- inventing a hidden second authoring source
- free-writing final prose without fixed structure

## 10. Approved Summary-Card Rule

Left-rail character cards are summary cards.

The skill may help derive summary content from the full structured card.

Recommended summary content:

- name
- gender
- personality

The skill should not try to force the summary card to mirror every detailed
field from the full editor.

This applies to the hero as well.

The hero still appears as a summary card on the left and opens in the right-side
full editor when selected.

## 11. Repair Expectations

When deterministic validation returns a repairable issue, this skill may help
repair:

- missing required character fields
- invalid or incomplete role-card structure
- section-local inconsistencies in character data

It should not freely repair:

- unrelated sections
- cross-file persistence contracts
- bridge ownership issues
- runtime projection contracts
- runtime rendering rules inside the bridge

## 12. Sample Guidance For Coding Agents

Coding agents should think of this skill as producing a patch like this in
substance:

```text
targetSection: worldbase-cast
targetSubsection: core-cast
targetEntity: character-02
changeType: update-card
patch:
  personality: ...
  occupation: ...
  behaviorBoundary: ...
assumptions:
  - ...
needsHumanDecision: false
```

For freeform text updates, the same idea applies:

```text
targetSection: worldbase-cast
targetSubsection: world-rules
changeType: replace-text-block
patch:
  text: ...
assumptions:
  - ...
needsHumanDecision: false
```

These are shape examples only.

Do not treat them as the final persistence format.

### 12.1 Additional V1 Rendering Guidance

Coding agents should assume:

- the skill prepares content for `mainCharacters`, `npcCharacters`, and `locationPatch`
- the bridge applies the final deterministic formatting
- the skill may restructure author input into the approved block order
- the skill must not silently change meaning while doing that restructuring

## 13. Coding Agent Rules

When implementing or prompting this skill:

1. keep it section-scoped
2. keep it compatible with the coordinator contract
3. keep it compatible with the deterministic bridge
4. keep ordinary supporting cast lightweight in V1
5. do not hardcode sample story prose into prompts or code
6. do not let the skill become a file writer
7. do not let the skill become a cross-section planner by default
8. do not let the skill output arbitrary prose order for `mainCharacters`
9. do not leave ordinary supporting cast as an unstable raw dump when the input can be safely split
10. do not fabricate missing character facts just to complete a nicer block

## 14. Relationship To Runtime

This skill should not be coupled directly to current runtime prose layout.

The correct ownership split is:

- page gathers author inputs
- skill interprets and patches section-owned data
- bridge validates and persists
- bridge rendering generates runtime-compatible output
- runtime continues consuming the rendered form

That split is the main reason this skill should not directly author the final
runtime world-base file.
