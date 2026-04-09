# Phase 4 Weaver Import Contract Optimization Design

Date: 2026-04-09
Status: Approved after review
Scope: `March Dev Update Phase 4` post-delivery optimization for `weaver` import reliability

## 1. Why This Follow-Up Exists

`March Dev Update Phase 4` already delivered the `weaver` sidecar, text-import package creation, shared sidecar reference loading, and the built-in `agent 管理` surface.

That baseline is working, but the current `weaver` import path still carries a reliability tax:

- the reference is principle-heavy but shape-light
- the prompt `Output Contract` lists top-level keys without enough field-level meaning
- the provider response schema still treats the inner import objects as broad passthrough objects
- the deterministic seed-mapping layer expects a more concrete intermediate structure than the model-facing materials explicitly describe

This creates a contract gap:

- the model is told to return JSON
- the adapter is told to accept JSON
- the seed-mapping layer quietly depends on specific inner fields
- but those inner fields are not frozen in one clear, model-facing place

This document defines how to close that gap without widening scope, introducing a second persistence path, or turning `weaver` into a rigid template-only importer.

## 2. Product Goal

This optimization should make the following statements true:

1. `weaver` remains a bounded text-import sidecar, not a second authoring schema writer.
2. `weaver` should attempt as much bounded extraction as the source text reasonably supports instead of defaulting to sparse output.
3. The model-facing contract becomes explicit enough that the first-pass hit rate improves on free-form manuscript-like input.
4. The import contract remains lighter than the final persisted authoring schema.
5. Minimal viable shapes exist as fallback floors, not as the preferred output target.
6. The existing package-naming exception remains explicit: import may still fail in a bounded way when neither author input nor a validated `suggestedPackageName` can produce a usable display name candidate for deterministic package creation.

## 3. Frozen Product Conclusions

The following are frozen by product intent and should not be reopened in this optimization pass:

1. `weaver` may fail partially and leave import fields empty.
2. Partial extraction must not block package creation by default.
3. The system should not stop and demand immediate author correction just because some fields were not extracted.
4. `openingHook` remains the widest narrative landing zone.
5. The product still accepts free-form pasted text and does not require a rigid author input template.
6. Character-like and location-like objects may use a minimal viable shape where a name is enough.
7. The existing package-naming precedence remains unchanged:
   - explicit author `displayName` wins
   - validated `weaver` `suggestedPackageName` may be used only when the author leaves the name empty
   - `suggestedPackageName` is a display-name suggestion, not the final persisted slug or package identifier
   - if neither path yields a valid usable display name candidate, creation may fail with bounded feedback
8. “最小可用结构”是保底，不是目标；`weaver` 仍应尽可能抽取更多有证据支持的字段。

## 4. Non-Goals

This optimization does not attempt to:

- redesign `weaver` into multiple skills
- add a visual import preview
- force imported text into `phase` / `beat`
- add a blocking “fix these fields before continue” workflow
- replace the current deterministic scaffold/create path
- expand `weaver` into “import into existing package”
- require structured manuscript markup from the author

## 5. Problem Statement

The current implementation effectively uses a hidden intermediate import contract.

Model-facing materials currently say:

- return JSON only
- include top-level keys such as `worldBase`, `hero`, `coreCast`, `locations`

But the deterministic import seed layer actually works best when it receives specific inner keys such as:

- `worldBase.settingSummary`
- `worldBase.worldRules`
- `worldBase.toneBaseline`
- `worldBase.locationPatch`
- `worldBase.npcCharactersSummary`
- `hero.displayName`
- `hero.roleSummary`
- `locations[*].displayName`
- `locations[*].summary`

So the real optimization target is not “make the prompt louder.”

The real target is:

- freeze the lightweight intermediate contract
- make the reference, prompt, response schema, and seed-mapping all describe the same structure
- keep that structure intentionally smaller than the final persisted schema

## 6. Design Approaches Considered

### Approach A: Push `weaver` toward the final persisted authoring schema

Make the model return something much closer to the final `WorldBaseSchema`, character profiles, and location schema.

Pros:

- less translation logic in the deterministic seed-mapping layer
- stronger apparent explicitness

Cons:

- much harder for the model to hit consistently from free-form text
- encourages hallucinated detail to satisfy a heavy schema
- works against the product rule that missing structure should not block creation

Recommendation:

- reject

### Approach B: Freeze a lightweight intermediate import contract and align every layer to it

Keep `weaver` output intentionally smaller than the final persisted schema. Define one clear intermediate contract and reuse that same language in the reference, prompt contract, response schema, tests, and seed-mapping code.

Pros:

- best match for free-form input
- improves first-pass reliability without narrowing the product entry
- preserves deterministic code ownership of normalization and defaults
- makes partial extraction a first-class success case

Cons:

- still requires a mapping layer from intermediate contract into persisted package data
- needs careful wording so `worldBase` is not misread as the final world schema

Recommendation:

- choose this approach

### Approach C: Keep the current contract loose but add more heuristic fallback logic in code

Leave the model-facing contract vague and increase code-side tolerance / guessing when fields are absent or oddly shaped.

Pros:

- lower prompt-edit effort
- may rescue some malformed outputs

Cons:

- hides ambiguity instead of resolving it
- makes behavior harder to reason about
- increases silent drift between prompt, schema, and deterministic import

Recommendation:

- reject

## 7. Recommended Design

### 7.1 Contract Philosophy

`weaver` should emit a lightweight import seed contract.

It should not emit the final persisted authoring schema directly.

The most important design rule is:

- top-level contract stays strict
- inner object shapes become explicit but intentionally small
- extraction should be as complete as the evidence allows
- minimal shapes are fallback floors, not the preferred stopping point

### 7.2 Extraction Maximization Rule

This optimization is intended to improve extraction success rate, not to make sparse output easier.

The model-facing guidance should explicitly prefer:

- extracting more supported structure over returning a mostly empty shell
- filling each supported field to the deepest bounded level that the source text clearly supports
- using the minimal viable shape only when the source cannot justify richer detail

The intended behavior is:

- if a character has a clear name and role, emit both
- if a location has a clear name and a short functional or atmospheric description, emit both
- if the text clearly supports multiple world foundation fields, fill all of them
- only fall back to name-only or sparse objects when the source truly does not support more

In other words:

- under-extraction is not the optimization target
- bounded completeness is the optimization target

### 7.3 Failure Semantics

This optimization freezes the following non-blocking rule:

- extraction gaps are normal
- empty structures are acceptable
- `weaver` should prefer omission or emptiness over invention

The system should treat these as valid outcomes:

- `worldBase` is present but only one field is populated
- `hero` is absent
- `coreCast` is empty
- `locations` is empty
- `warnings` explains the uncertainty
- `unresolvedGaps` records what is missing for higher-confidence bootstrap

This is a better fit than “schema-complete but semantically invented.”

The package-name rule is the explicit bounded exception:

- extraction sparsity should not block creation
- but missing, invalid, or conflicting final display-name input may still require bounded failure and manual author naming

### 7.4 Lightweight Intermediate Output Contract

Top-level keys should stay:

- `suggestedPackageName`
- `sourceSummary`
- `importSummary`
- `openingHook`
- `worldBase`
- `hero`
- `coreCast`
- `antagonists`
- `npcCharacters`
- `locations`

But the inner meaning should be frozen more clearly.

`suggestedPackageName` should be documented as:

- a candidate author-facing display name
- usable only when the explicit request `displayName` is absent
- never the final package slug algorithm itself

#### `worldBase`

`worldBase` should be explicitly defined as a seed object, not the final persisted `WorldBaseSchema`.

Recommended lightweight fields:

- `settingSummary?`
- `worldRules?`
- `toneBaseline?`
- `locationPatch?`
- `npcCharactersSummary?`

This is enough for deterministic mapping to the existing package scaffold without forcing the model to synthesize a full final-world schema.

#### `hero`

Optional object.

Recommended fields:

- `displayName`
- `roleSummary?`

If the text does not support a confident protagonist extraction, omit the field instead of inventing one.

#### `coreCast[]`

Recommended per-item fields:

- `displayName`
- `roleSummary?`

#### `antagonists[]`

Recommended per-item fields:

- `displayName`
- `roleSummary?`

#### `npcCharacters[]`

Recommended per-item fields:

- `displayName`
- `summary?`
- `roleSummary?`

This keeps NPC handling consistent with the rest of the cast while still allowing deterministic code to collapse the result into existing package fields.

This is a target optimization rule, not a claim that the current implementation already does it.

Current code still consumes summary-like text, not name-only entries by themselves.

If this optimization keeps the product rule that “name-only NPC entries are valid,” then the implementation must explicitly update deterministic seed-mapping and tests so that this becomes true in code rather than just in prose.

That means deterministic mapping will need to treat:

- `summary` or `roleSummary` as the preferred NPC summary text
- `displayName` as the fallback bounded text when no summary-like field is present

This preserves the “name-only is valid” product rule without requiring the model to fabricate extra NPC detail.

#### `locations[]`

Recommended per-item fields:

- `displayName`
- `summary?`

### 7.5 Output Discipline

The next version of the contract should clearly state:

- which fields are required
- which fields are optional
- which collection fields should default to `[]`
- which objects may be `{}` or omitted
- what “attempt full bounded extraction first” means in practice

Recommended guidance:

- `sourceSummary`, `importSummary`, and `openingHook` remain always present
- `coreCast`, `antagonists`, `npcCharacters`, and `locations` remain always present arrays
- `hero` remains optional
- `worldBase` remains always present but may be sparse
- minimal shapes are valid fallbacks, but should not replace richer evidence-backed extraction

If compatibility requires keeping `warnings` or `unresolvedGaps` in the transport contract during implementation, they should remain secondary compatibility fields, not the main prompt/reference emphasis.

### 7.6 Reference Improvement

The `weaver` heavy reference should become more explicit, but not dramatically longer.

It should add:

1. a field map for the lightweight intermediate contract
2. short “do not invent, but do attempt full bounded extraction” rules
3. one or two manuscript-like extraction examples
4. explicit examples of richer extraction versus minimal fallback extraction

The examples should show:

- a free-form long paragraph or book-like opening
- the resulting lightweight JSON payload
- how the model should still try to populate `worldBase`, cast, and locations before falling back to sparse output

The reference should not attempt to define a rigid input syntax.

### 7.7 Opening Hook Ownership

This optimization must keep the existing Phase 4 ownership rule explicit:

- `payload.openingHook` is an import-field output for extraction quality, comparison, or diagnostics
- the authoritative persisted `scene.yaml -> openingHook` continues to come from the original request `sourceText`
- `weaver` must not be allowed to rewrite the author's pasted text as the persisted package opening hook

### 7.8 Prompt Improvement

The user prompt’s `[Output Contract]` section should stop at neither:

- purely abstract principles
- nor a key list without field semantics

Instead it should describe each top-level field with lightweight shape expectations.

The prompt should explicitly say that:

- `worldBase` is a lightweight seed object
- character and location objects may be name-only only as a fallback floor
- richer extraction is preferred whenever the text supports it
- sparse output is valid only when the source really does not support more

The prompt should also avoid over-emphasizing secondary diagnostics fields, because that can accidentally teach the model to explain missing data instead of extracting more structure.

### 7.9 Schema Improvement

The provider-facing response schema should become more informative than broad passthrough objects.

It does not need to mirror the full final package schemas.

It should instead describe the lightweight intermediate seed contract with:

- field-level properties
- explicit required vs optional fields
- no extra top-level keys
- inner object shapes that are light but real

Where supported by the provider schema layer, titles and descriptions should be added for important fields to improve model adherence.

## 8. Optional Diagnostics Fields

This optimization does not treat `warnings` and `unresolvedGaps` as the center of the design.

Their original meaning was:

- `warnings`: bounded caveats about extracted output
- `unresolvedGaps`: important facts the model could not confidently recover

However, they should not become the main model-facing escape hatch.

Recommended direction:

- extraction guidance remains primary
- contract clarity remains primary
- examples remain primary
- diagnostics, if kept for compatibility, remain secondary
- this optimization does not define new author-facing reminder behavior around missing extracted fields

If a later implementation chooses to retain these fields for transport or summary compatibility, they should be framed as optional or low-emphasis diagnostics rather than core success outputs.

## 9. Contract Alignment Boundaries

This optimization should preserve the existing responsibility split:

- `weaver` extracts a bounded import seed payload
- deterministic code maps that payload into the staged scaffold
- scaffold creation and persistence remain code-owned

This means:

- no provider-side validation of final package persistence rules
- no LLM responsibility for final file correctness
- no schema inflation just to reduce mapping code

The single contract owner for the lightweight intermediate import payload should be:

- shared `WeaverImportPayloadSchema` in `src/types/weaver.ts`

Other layers should project from that shared contract instead of silently co-owning divergent shapes.

“One unified contract” in this design therefore means alignment across all of these layers:

1. `weaver` heavy reference
2. prompt `[Output Contract]`
3. shared `WeaverImportPayloadSchema` / `src/types/weaver.ts`
4. provider-facing response schema
5. adapter/parser validation schema
6. deterministic import-seed mapping

The optimization is not complete if only one or two of these layers are updated.

## 10. Validation Strategy

This design should be considered successful when:

1. `src/types/weaver.ts` remains the single contract owner, and the reference, prompt contract, response schema, parser, and import-seed layer all stay aligned to it
2. the intermediate structure is lighter than the final persisted package schema
3. extraction guidance clearly pushes toward fuller bounded extraction instead of sparse minimal output
4. the design explicitly supports manuscript-like free-form text input
5. missing data defaults to bounded emptiness instead of invented completion
6. the package-name exception remains explicit and bounded instead of being blurred into general import failure semantics
7. `payload.openingHook` and persisted `scene openingHook` ownership remain unambiguous
8. `suggestedPackageName` is treated consistently as a display-name suggestion, while deterministic code retains slug / package-identity ownership
9. if “name-only NPC entries are valid” remains in scope, deterministic seed-mapping and tests are updated alongside the model-facing contract
10. diagnostics fields, if retained for compatibility, are clearly secondary to extraction guidance rather than promoted as the main outcome
11. the optimized design does not require any new author-facing reminder flow for non-extracted fields; absence remains non-blocking by default

## 11. Recommended Next Step

If this design is approved, the next planning step should be a small implementation plan focused only on:

1. freezing the lightweight `weaver` intermediate contract in docs and schema
2. updating the heavy reference and prompt contract
3. tightening tests around sparse-but-valid import payloads
4. confirming that partial extraction remains non-blocking all the way through package creation
5. deciding whether `warnings` / `unresolvedGaps` remain as compatibility-only fields or are removed from the model-facing optimization scope
