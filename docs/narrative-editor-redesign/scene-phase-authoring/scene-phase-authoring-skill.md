# Scene Phase Authoring Skill

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: second detailed section skill under the coordinator-first redesign
- Global section map: [../section-map.md](../section-map.md)
- Related page: [scene-phase-authoring-page.md](scene-phase-authoring-page.md)
- Related bridge doc: [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)

## 1. Purpose

This document defines the approved boundary for
`scene-phase-authoring-skill`.

This skill is responsible for semantic interpretation and structured patch
generation for the `故事结构 (Scene & Phase Authoring)` section.

It is not responsible for:

- file writes
- final YAML rendering
- deterministic validation
- `phaseId` generation
- `phaseIndex` generation
- final save success state

## 2. Section Role

This skill supports the section that owns:

- one scene-level narrative frame
- a list of phase entries
- per-phase bounded control choices
- note fields that capture extra author intent not covered elsewhere

This section should be treated as a field-driven section in V1.

That means:

- the current runtime already consumes scene and phase data as named fields
- the skill should optimize for precise field placement, not prose block generation
- bridge formatting here is lighter than in `worldbase-cast`
- deterministic code still owns persistence and reload verification

## 3. Approved Responsibilities

The skill may do the following:

1. interpret author input for scene-level fields
2. interpret author input for phase-level fields
3. propose structured updates for one or more phase entries
4. support phase list operations such as create, update, remove, and reorder
5. preserve the narrative spine while translating author intent into patch candidates
6. repair incomplete or inconsistent scene/phase input when the error is repairable

## 4. Skill Must Not Do

The skill must not:

1. write files directly
2. emit raw YAML as the only result
3. bypass the bridge
4. invent fields outside the approved section contract
5. generate `phaseId`
6. generate `phaseIndex`
7. invent new gradient values outside the approved bounded list
8. invent new router names outside the currently loaded route list
9. silently rewrite author meaning just to make the data cleaner
10. force unrelated cross-section edits

## 5. Approved Input Areas

The skill should expect inputs related to these page surfaces:

- scene name
- scene start / opening situation
- main axis
- end line
- opening hook
- global note / sample purpose
- selected phase name
- selected phase goal
- selected phase end point
- selected phase note
- selected phase gradient selection
- selected phase router selection
- phase rail operations such as add, remove, reorder, and select

It should also be able to consume:

- current section draft state
- current selected phase identity from the page
- current allowed gradient options
- current available route names from the active story package's effective router-profile set, for example from [`router-lexicon.yaml`](../../../src/story-packages/sample-scene/router-lexicon.yaml)
- validation repair payloads returned by deterministic code

Cross-section dependency note:

- this skill consumes router-profile outputs
- it does not define or edit router profiles itself
- router-profile create/edit belongs to `控制模块 (Control Modules)`

## 6. Approved Output Shape

The first legal skill output is a structured patch candidate.

That patch candidate should be shaped for the coordinator + bridge pipeline, not
for direct filesystem write.

The output should, in substance, be able to describe:

- which scene fields changed
- which phase entries changed
- what list operation is requested, if any
- whether the change touches bounded control fields
- what assumptions were made
- whether the skill needs a human decision

### 6.1 Approved V1 Patch Families

The skill should organize its output into two main groups:

- `scenePatch`
- `phasePatches`

Recommended phase patch operation types:

1. `create`
2. `update`
3. `remove`
4. `reorder`

The skill should not collapse all phase changes into one undifferentiated blob.

### 6.2 Approved V1 Field Ownership

The skill may patch these scene-level fields:

- `sceneName`
- `openingSituation`
- `mainAxis`
- `endLine`
- `openingHook`
- `samplePurpose`

The skill may patch these phase-level fields:

- display phase name
- `phaseGoal`
- phase end point
- `gradientType`
- `routerHint`
- `notes`

The skill must not own:

- `phaseId`
- `phaseIndex`
- editable beat count in V1

## 7. Relation To The Page

The page and the skill have different jobs.

### 7.1 Page Responsibilities

The page is responsible for:

- rendering the scene block
- rendering the phase rail
- rendering the selected phase editor
- presenting bounded selectors for `gradientType` and `routerHint`
- collecting button presses such as submit / reset
- keeping local unsaved state visible

### 7.2 Skill Responsibilities

The skill is responsible for:

- understanding author intent
- turning author input into structured scene and phase updates
- helping route natural-language edits into the right field
- repairing section-scoped inconsistencies
- keeping the narrative spine coherent

### 7.3 Important Boundary

The page owns current UI selection.

The skill does not choose which phase card is selected.

The page exposes the currently allowed selectors.

The skill does not invent selector options.

The page may let the author reorder phase cards.

The skill helps translate the intended list operation into structured patches.

## 8. Approved V1 Behavior By Content Type

### 8.1 Scene-Level Narrative Frame

For:

- scene name
- scene start / opening situation
- main axis
- end line
- opening hook
- global note / sample purpose

the skill should:

- preserve author meaning
- map content to the correct scene-level field
- avoid rewriting the scene frame as unrelated prose
- keep the destination line separate from per-phase local goals

### 8.2 Phase Identity

The author enters a normal phase name.

The skill may patch that author-facing name, but it must not generate storage IDs.

Approved rule:

- code generates stable `phaseId`
- code derives `phaseIndex` from current order
- skill operates on selected or referenced phase entries without becoming the ID authority

### 8.3 Phase Goal And End Point

For each phase, the skill should treat:

- `phaseGoal`
- phase end point

as high-value narrative fields, not as throwaway summary text.

The skill should preserve clear movement from:

- scene start
- to current phase goal
- to current phase end point
- toward the final `endLine`

### 8.4 Gradient Type

`gradientType` is a bounded control field.

The skill should:

- accept the selected value from the page
- preserve it accurately in the patch
- never treat it as open prose
- never invent a new gradient value

### 8.5 Router Hint

`routerHint` is also a bounded control field.

The skill should:

- accept the selected route name from the page dropdown
- preserve it accurately in the patch
- never treat it as open prose
- never invent a router name outside the currently effective router-profile set

### 8.6 Note

`note` remains the page's freeform escape hatch.

The skill should:

- preserve it as free text
- help normalize it only when requested or when repair requires minimal structural cleanup
- avoid forcing `note` into over-structured subfields too early

## 9. Approved Narrative Spine Rule

This skill must preserve the section's narrative spine.

The spine is:

1. scene start / opening situation
2. `mainAxis`
3. each `phaseGoal`
4. `endLine`

That means the skill should not treat scene and phase updates as unrelated form
islands.

If one edit would obviously destabilize the spine, the skill should:

- keep the change narrow when possible
- mark the change as low confidence when necessary
- request human judgment rather than silently distorting the story path

## 10. Relation To Runtime

This skill is designed around one practical fact:

- scene and phase files are loaded as package data
- their fields are later consumed at field level by runtime control modules

So this skill should optimize for:

- stable field ownership
- stable list operations
- stable bounded-control handling

not for:

- generating big prose blocks
- inventing shadow authoring files without approval
- using free-text repair where deterministic field repair is enough

## 11. Repair Expectations

When deterministic validation returns a repairable issue, this skill may help
repair:

- missing scene-level required fields
- missing phase-level required fields
- invalid list operations on phases
- invalid or missing bounded control selections
- section-local inconsistencies after phase reorder or removal

It should not freely repair:

- unrelated sections
- cross-file persistence contracts
- bridge ownership issues
- runtime rules outside the section contract
- system code

## 12. Sample Guidance For Coding Agents

If you implement against this document:

1. treat this skill as a field orchestrator, not a writer
2. keep `phaseId` and `phaseIndex` in deterministic code
3. treat `gradientType` and `routerHint` as selector-backed values
4. preserve the scene/phase narrative spine before optimizing anything else
5. return structured patch data, not final YAML
6. let deterministic code decide save success
