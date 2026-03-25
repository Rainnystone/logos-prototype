# Control Modules Runtime Adaptation

## Document Status

- Date: 2026-03-25
- Status: active
- Scope: first control-modules design document under the coordinator-first redesign
- Global section map: [../section-map.md](../section-map.md)
- Related master record: [../master-record.md](../master-record.md)
- Related bridge doc: [../authoring-runtime-bridge.md](../authoring-runtime-bridge.md)

## 1. Purpose

This document defines what the existing system must adapt in order to support
the future `控制模块 (Control Modules)` section.

It exists to answer one practical question:

- if the page and skill are approved later, what has to change in the current system so those controls can actually work

This document is not:

- the page doc
- the skill doc
- the global bridge doc
- an implementation plan

It is the section-local runtime adaptation guide for future coding agents.

## 2. Why This Is A Separate Document

`bridge` is a shared system document.

It should keep cross-section rules such as:

- validation-before-write
- server-side persistence entry
- atomic write
- reload verification

`控制模块` is different.

This section will touch multiple control chains at once:

- light cone collapse
- director note layer
- audit question selection
- beat volume semantics
- router profiles

If all of that is folded into the bridge:

- the bridge becomes too heavy
- section-local runtime impact gets mixed with global persistence rules
- future coding agents will have a harder time telling what is reusable versus what is unique to this section

Approved recommendation:

- keep `bridge` global
- keep `page` and `skill` section-local
- add this third section-local runtime adaptation document

## 3. Approved Section Scope

The approved `控制模块 (Control Modules)` section should own these five areas:

1. light cone collapse: replacement-style customization
2. director note layer: additive customization
3. auditor question set: structured customization
4. beat volume definitions: structured definition of `Low / Med / High`
5. router profile set: structured create/edit for route profiles

This section should not own:

- scene / phase story skeleton editing
- direct selection of `gradientType`
- direct selection of `routerHint`
- beat-count editing

Those stay with `故事结构 (Scene & Phase Authoring)`.

## 4. Correct Light Cone Interpretation

The approved understanding for this redesign is:

- the player's current story state is the light cone apex
- `endLine` sits at the far convergence end
- `alpha` and `beta` are the currently allowed side boundaries
- boundary collapse happens on phase settlement, not every beat

This matters because light cone customization should not be treated as prose
styling.

It is a boundary-reinference customization.

Any future coding agent that treats light cone customization as "just a better
prompt paragraph" is implementing the wrong thing.

## 5. Recommended Persistence Model

This section should **not** be treated as a simple direct-runtime section.

Recommended V1 decision:

- treat `control-modules` as the first clearly hybrid multi-target section
- let deterministic code route each approved module group to its correct runtime-facing consumer
- keep one shared page save / coordinator save path, but allow section-internal fan-out by module target

Reason:

- some target areas already have runtime-facing files
- some target areas still live mainly in system code
- one page should not force authors to edit several unrelated runtime files directly

This section therefore differs from:

- `worldbase-cast` v1
- `scene-phase-authoring`

which can stay closer to current runtime files.

Concretely, the current direction is:

- `router profile` edits can continue to write the existing `router-lexicon.yaml`
- `auditor question set` edits can continue to write the existing `audit-questions.yaml`
- `light cone`, `director note additions`, and `beat volume definitions` should use a section-owned control source and deterministic downstream application

## 6. Module-By-Module Adaptation Impact

### 6.1 Light Cone Collapse

Approved customization mode:

- replacement-style customization

Current reality:

- the module already exists
- the system already runs initial inference and phase-end re-inference
- current prompt construction is fixed in runtime code

Required adaptation:

- introduce a section-owned authoring surface for collapse behavior
- feed that authoring result into the collapse request construction path
- keep phase-end re-inference as a real re-evaluation step, not a mechanical shrink rule

What must not happen:

- do not degrade collapse into static boundary text
- do not move collapse into freeform story editing
- do not let authors edit raw runtime state directly

Impact estimate:

- medium to high

### 6.2 Director Note Layer

Approved customization mode:

- additive customization

Current reality:

- the system already builds director note from current runtime state
- there is already a local hard-rule input path

Required adaptation:

- expose an author-managed additive layer
- keep system-captured control content as the base
- merge author additions after deterministic validation

What must not happen:

- do not let authors replace the whole system-generated layer
- do not erase system-captured safety and control signals

Impact estimate:

- medium

### 6.3 Auditor Question Set

Approved customization mode:

- structured customization

Current reality:

- audit questions already exist as structured data
- selection policy already exists

Required adaptation:

- expose author editing for global questions
- expose author editing for control questions
- expose author editing for phase-specific questions
- expose author editing for selection rules

Important runtime note:

- future tracking should rely on stable IDs and structure
- it should not rely only on question text matching

Impact estimate:

- medium

### 6.4 Beat Volume Definitions

Approved customization mode:

- structured definition

Current reality:

- `Low / Med / High` already exist
- their behavioral meaning is still mostly written inside runtime code

Required adaptation:

- move those meanings out of hardcoded runtime-only wording
- define them as author-editable control semantics
- feed those definitions into the places that currently describe pacing, density, and option phrasing

What this does **not** mean:

- no beat-count customization here
- no extra volume levels in V1
- no change to the `Low / Med / High` label set in V1

Impact estimate:

- medium

### 6.5 Router Profiles

Approved customization mode:

- structured create/edit

Current reality:

- router profiles are already data-shaped
- route selection already consumes router names and verb lexicons

Required adaptation:

- allow authors to add and edit router profiles
- validate router names, semantic cores, and verb lexicons
- ensure downstream selectors read the updated route list
- ensure `故事结构 (Scene & Phase Authoring)` consumes that updated router-profile set for its `routerHint` dropdown
- treat the router-profile set as the upstream source for route selection, not as page-local static options

What this does **not** mean in V1:

- no new routing algorithm
- no new router-selection engine
- only create/edit of route profiles

Impact estimate:

- medium

### 6.6 Prompt Assembler Coupling

Current reality:

- prompt assembly already has a fixed four-layer output structure
- not every control-module item maps to its own visible prompt layer
- some control-module items feed prompt assembly directly, while others stay in a parallel control chain

Required adaptation understanding:

- light cone customization ultimately affects `PromptObject.narrative.alpha` and `PromptObject.narrative.beta`
- director note customization ultimately affects `PromptObject.directorNote.beatConstraints` and `PromptObject.directorNote.optionConstraints`
- beat volume definitions affect how `directorNote.volume` is interpreted and described downstream
- router profiles affect `currentRouter` and `verbLexicon`, which then enter `PromptObject.directorNote`
- auditor question customization does **not** become a prompt layer; it stays a parallel audit control path

Important page-design consequence:

- the future `控制模块` page may reference prompt-assembler layering as a visual skeleton
- but it must not falsely present every control item as a direct prompt layer
- especially, auditor customization should remain visibly parallel to prompt-layer controls

What must not happen:

- do not imply that audit questions belong inside the prompt assembler's four-layer stack
- do not imply that router profiles are themselves a standalone prompt layer
- do not imply that beat volume definitions create a fifth prompt layer

## 7. Existing System Areas That Will Be Touched

This section is expected to affect four kinds of system areas:

1. authoring data and validation
2. runtime control assembly
3. persistence, writeback, and reload
4. workbench-side inspection and traceability

Typical examples include:

- light cone input assembly
- director note construction
- audit question selection and result mapping
- volume-definition wording currently held in runtime code
- router profile loading and selection

Future coding agents should read the current codebase broadly enough to catch
nearby consumers.

Do not assume this document is an exhaustive file checklist.

## 8. Bridge Relationship

This section does **not** require a new bridge concept.

But it does require the bridge to support a more complex section than the first
two approved sections.

Current recommendation:

- do not expand the bridge into a section-specific mega document
- keep bridge rules global
- let `control-modules-runtime-adaptation.md` own the section-specific runtime impact

Likely bridge consequence:

- this section will use the bridge's hybrid multi-target mode
- one section save may update more than one approved target
- the bridge must remain the only place where that fan-out is applied

That is a real extension in usage, but not a reason to collapse this document
back into the bridge.

## 9. Coding Agent Guardrails

When future coding agents implement this section, they should follow these
rules:

1. do not turn this section into a second story-structure editor
2. do not replace the full director note base layer with author text
3. do not reduce light cone collapse to a static formatting tweak
4. do not mix beat-count editing into beat-volume definition work
5. do not treat router-profile editing as permission to redesign the routing algorithm
6. do not assume the bridge document alone is enough to implement this section
7. do inspect nearby runtime consumers beyond the files named in this document

## 10. Recommended Skill Decomposition

This section should not be implemented as one oversized skill.

Approved direction:

- one section-local skill family
- five narrow module skills

The approved module skill split is:

1. `light-cone-customization-skill`
2. `director-note-additions-skill`
3. `auditor-question-set-skill`
4. `beat-volume-definition-skill`
5. `router-profile-skill`

Reason:

- these five modules have different runtime targets
- they also have different authoring boundaries
- one large skill would make it too easy to blur replacement, additive, and structured-edit modes

The page may still feel unified to the author, but coding agents should treat the
skill layer as five bounded workers rather than one all-knowing control writer.

## 10. Recommended Next Documents

After this document, the recommended order remains:

1. `control-modules-page.md`
2. `control-modules-skill.md`
3. the five module skill docs

Reason:

- runtime adaptation should define the system boundary first
- page should then define the author-facing surface
- skill family and module skill docs should finally define how coordinator interprets that surface
