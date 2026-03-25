# Coordinator Agent

## Document Status

- Date: 2026-03-23
- Status: active draft
- Parent: [master-record.md](master-record.md)
- Scope: `router-controller` coordinator only

## 1. Purpose

This document defines the approved contract-first design for the redesign's
coordinator agent.

It is written for:

- human reviewers
- AI coding agents
- future implementation plans

It does not describe page layout.
It does not describe section-specific field catalogs in full detail.
It describes how author intent is routed, interpreted, repaired, validated, and
handed off to deterministic persistence code.

## 2. Coordinator Identity

### 2.1 Name

Approved coordinator name:

- `router-controller`

### 2.2 Role

`router-controller` is a lightweight semantic router and repair-loop controller.

Its responsibilities are:

- detect the target section or sections
- build the minimum context pack needed for interpretation
- invoke one section skill or one cross-section skill
- collect a structured patch candidate
- send that candidate into deterministic validation
- coordinate repair retries when validation fails
- stop and escalate when the issue requires human judgment

### 2.3 Non-Responsibilities

`router-controller` must not:

- write files directly
- emit YAML as the system source of truth
- bypass schema or reference validation
- directly mutate browser runtime state
- perform broad autonomous exploration
- invent non-approved authoring fields

## 3. Design Principles

The coordinator should follow these principles:

1. Keep the LLM-facing surface narrow.
2. Prefer section-scoped work over cross-section work.
3. Only pass the minimum context needed for the current task.
4. Preserve human-authored input by default instead of rewriting it.
5. Treat validation failure as a normal loop, not an exception.
6. Keep file access, serialization, and reload deterministic.
7. Return structured outputs before any human-facing prose summary.

The intended mental model is:

- small state machine
- semantic router
- patch candidate controller

not:

- freeform co-writer
- prompt-only automation layer
- autonomous implementation agent

### 3.1 Human Input Preservation Rule

The coordinator exists to route and structure author input, not to silently
rewrite the author's meaning.

Default behavior:

- preserve original author input
- map it into approved fields
- keep scope narrow
- repair only when deterministic validation requires repair

Default non-goals:

- stylistic rewrite
- tone rewrite
- semantic expansion
- semantic compression
- changing story meaning to make data look cleaner

If a save would require meaning-changing edits, the coordinator should stop and
return a human decision point instead of guessing.

## 4. Lifecycle

The approved coordinator lifecycle is:

1. Receive invocation
2. Detect scope
3. Build context pack
4. Invoke section skill or cross-section skill
5. Receive structured patch candidate
6. Run deterministic validation
7. If valid, persist and reload
8. If invalid and repairable, run repair loop
9. If still invalid or non-repairable, return escalation

## 5. Invocation Modes

The coordinator should support three modes.

### 5.1 `intent`

Natural-language author request, such as:

- “让第三阶段更偏追踪，不要过早正面对抗”
- “把主角的能力边界写清楚，不能出现超自然攻击”

This is the primary mode.

### 5.2 `section-assist`

User is already in a known section and asks the coordinator to interpret or
repair section-local input.

Example:

- current page is `scene-phase-authoring`
- author entered text blocks
- coordinator converts them to structured patch operations

### 5.3 `repair`

Validation failed after a prior skill pass, and the coordinator must ask the
same skill to repair the patch candidate using structured errors.

## 6. Input Contract

The coordinator input should be a strict application-level envelope.

Recommended top-level shape:

```ts
type CoordinatorInvocation = {
  requestId: string;
  packageName: string;
  mode: 'intent' | 'section-assist' | 'repair';
  actorInput: AuthorInputPayload;
  activeSection?: SectionId;
  currentFormState?: Record<string, unknown>;
  repairContext?: RepairContext;
  options?: {
    allowCrossSection?: boolean;
    dryRun?: boolean;
  };
};
```

### 6.1 `AuthorInputPayload`

```ts
type AuthorInputPayload = {
  rawText?: string;
  normalizedText?: string;
  uiFields?: Record<string, unknown>;
  source: 'chat' | 'form' | 'migration';
};
```

Rules:

- `rawText` is the original author intent and remains authoritative
- `uiFields` is optional structured partial input from a page
- `source` is required for traceability
- the coordinator should not require both free text and UI fields every time
- `normalizedText` is optional derived helper text, not a replacement for `rawText`
- `normalizedText` must not silently override the meaning of `rawText`
- if `rawText` and `normalizedText` conflict, prefer `rawText` and escalate if needed

### 6.2 `SectionId`

Approved section identifiers:

```ts
type SectionId =
  | 'worldbase-cast'
  | 'scene-phase-authoring'
  | 'control-modules'
  | 'package-wiring-validation';
```

### 6.3 `Context Pack`

The coordinator should not receive raw repository state blindly.

It should receive a reduced context pack:

```ts
type CoordinatorContextPack = {
  packageSummary: PackageSummary;
  allowedSections: SectionId[];
  relevantSectionData: Partial<Record<SectionId, unknown>>;
  relevantSchemas: Partial<Record<SectionId, unknown>>;
  relevantReferences: ReferenceHints;
  runtimeImpactHints: RuntimeImpactHints;
};
```

The point of this pack is:

- keep token usage small
- prevent unrelated section drift
- make repair deterministic

## 7. Output Contract

The coordinator output should be a strict machine-first result.

Recommended top-level shape:

```ts
type CoordinatorResult =
  | PatchReadyResult
  | NoChangeResult
  | NeedsHumanDecisionResult
  | InfraFailureResult;
```

### 7.1 `PatchReadyResult`

```ts
type PatchReadyResult = {
  status: 'patch_ready';
  requestId: string;
  targetSections: SectionId[];
  actionType: 'create' | 'update' | 'remove' | 'reorder' | 'normalize';
  rationale: string;
  assumptions: string[];
  confidence: number;
  patchCandidates: SectionPatchCandidate[];
  humanSummary: string;
  runtimeImpactSummary: string[];
};
```

### 7.2 `NoChangeResult`

```ts
type NoChangeResult = {
  status: 'no_change';
  requestId: string;
  targetSections: SectionId[];
  rationale: string;
  humanSummary: string;
};
```

### 7.3 `NeedsHumanDecisionResult`

```ts
type NeedsHumanDecisionResult = {
  status: 'needs_human_decision';
  requestId: string;
  targetSections: SectionId[];
  blockingReason: string;
  decisionType:
    | 'conflicting_intent'
    | 'missing_domain_rule'
    | 'new_field_required'
    | 'ambiguous_cross_section_change';
  humanSummary: string;
};
```

### 7.4 `InfraFailureResult`

```ts
type InfraFailureResult = {
  status: 'infra_failure';
  requestId: string;
  targetSections: SectionId[];
  message: string;
  recoverable: boolean;
};
```

## 8. Patch Candidate Contract

The coordinator should not emit a full replacement blob unless the section
contract explicitly allows it.

Recommended patch shape:

```ts
type SectionPatchCandidate = {
  section: SectionId;
  modelVersion: string;
  operations: SectionPatchOperation[];
};
```

Recommended operation family:

```ts
type SectionPatchOperation =
  | { op: 'set_field'; path: string; value: unknown }
  | { op: 'append_item'; path: string; value: unknown }
  | { op: 'update_item'; path: string; value: unknown }
  | { op: 'remove_item'; path: string }
  | { op: 'reorder_items'; path: string; order: string[] };
```

This is intentionally more constrained than arbitrary JSON Patch.

It is easier to:

- validate
- repair
- log
- reason about in a section-owned model

## 9. Prompt Skeleton

The coordinator and skills should use contract-first prompts.

### 9.1 Coordinator System Prompt Skeleton

```text
You are the LOGOS router-controller coordinator.

Your job is to route author intent into section-scoped structured patch candidates.

You may:
- detect target sections
- select one section skill or the cross-section skill
- return structured patch candidate results
- coordinate repair retries using validation errors

You must not:
- write files
- emit raw YAML as source of truth
- bypass deterministic validation
- invent fields outside approved section contracts
- silently rewrite human-authored meaning

Return only a structured CoordinatorResult.
If the request is ambiguous or requires a new domain decision, return needs_human_decision.
If validation errors are supplied in repair mode, repair only the reported problems unless another change is required for consistency.
Preserve author meaning by default and prefer narrow structural mapping over content rewrite.
```

### 9.2 Section Skill Prompt Skeleton

```text
You are the LOGOS <section-name> skill.

You only operate on the <section-id> authoring model.

You may:
- interpret author intent for this section
- produce section-scoped patch operations
- normalize section-local language into approved fields

You must not:
- edit other sections
- write files
- bypass validation
- create new fields not present in the approved contract
- silently rewrite author meaning to make the patch cleaner

Return only a SectionPatchCandidate.
```

### 9.3 Cross-Section Skill Prompt Skeleton

```text
You are the LOGOS cross-section reconciler skill.

Your job is to split or align changes that genuinely affect multiple sections.

You must:
- keep section boundaries explicit
- return multiple section patch candidates when needed
- stop and escalate if the change has multiple equally valid interpretations
```

### 9.4 Repair Prompt Skeleton

```text
You are repairing a previously rejected patch candidate.

Use only:
- the original raw author input when available
- the original author intent summary
- the last patch candidate
- the supplied validation failures
- the current section contract

Do not rewrite unrelated fields.
Do not widen scope unless a reported error requires it.
Do not change author meaning unless the request explicitly asks for that change.
Return only a repaired SectionPatchCandidate.
```

## 10. Validation And Repair Payloads

Validation failure is a standard part of the architecture.

### 10.1 Validation Error Payload

Recommended shape:

```ts
type ValidationFailurePayload = {
  status: 'validation_failed';
  requestId: string;
  section: SectionId;
  repairable: boolean;
  retryCount: number;
  maxRetries: number;
  errors: ValidationErrorItem[];
};

type ValidationErrorItem = {
  code:
    | 'MISSING_FIELD'
    | 'INVALID_TYPE'
    | 'INVALID_ENUM'
    | 'UNKNOWN_REFERENCE'
    | 'BROKEN_ORDERING'
    | 'PACKAGE_INCONSISTENCY'
    | 'ROUNDTRIP_RELOAD_FAILURE';
  path: string;
  message: string;
  currentValue?: unknown;
  allowedValues?: unknown[];
  hint?: string;
};
```

### 10.2 Repair Context

```ts
type RepairContext = {
  rawAuthorInput?: string;
  originalIntentSummary: string;
  lastPatchCandidate: SectionPatchCandidate[];
  validationFailure: ValidationFailurePayload;
};
```

### 10.3 Repair Rules

The repair loop should follow these rules:

1. Retry budget is `2`.
2. Repair uses the same skill that produced the failed candidate.
3. Repair scope should remain as narrow as possible.
4. Non-repairable failures skip retry and escalate immediately.
5. If repair changes target sections unexpectedly, escalate unless cross-section mode is already active.

### 10.4 Allowed Versus Disallowed Input Repair

Allowed repair scope:

- add missing required input fields when the intent is already explicit
- fix formatting, ordering, and enum problems
- fix broken references
- restructure text into approved fields without changing meaning
- add the smallest missing wrapper structure needed for a valid save

Disallowed repair scope:

- rewrite tone or style for polish
- compress or expand meaning to make data cleaner
- change character facts, world facts, or story intent without explicit author request
- modify bridge behavior, schemas, or system code just to force a patch through

If a valid save would require meaning-changing edits, the coordinator must stop
and return `needs_human_decision`.

## 11. Validation Layers

Deterministic validation should be separated into four layers.

### 11.1 Schema Validation

Examples:

- missing required field
- invalid primitive type
- invalid enum member

### 11.2 Reference Validation

Examples:

- missing `phaseId`
- missing audit question ID in `selectionPolicy`
- `routerHint` that cannot map to a known router profile

### 11.3 Package Consistency Validation

Examples:

- section patch applies locally but breaks story package invariants
- derived runtime-compatible files become inconsistent

### 11.4 Round-Trip Reload Validation

Final persistence is not complete until the app can:

- write the data
- regenerate runtime-compatible outputs if needed
- call `loadStoryPackage(packageName)`
- receive a valid aggregate again

## 12. Code-Side Interface Boundaries

The coordinator should talk to deterministic code through narrow interfaces.

Recommended boundary set:

### 12.1 `SectionContextProvider`

Responsibilities:

- load reduced context for the target section
- expose schemas, current authoring data, and relevant references
- avoid leaking unrelated package content

### 12.2 `CoordinatorValidator`

Responsibilities:

- validate coordinator result envelope
- validate patch candidate shape before section-level validation

### 12.3 `SectionPatchValidator`

Responsibilities:

- schema validation
- reference validation
- section-local consistency checks

### 12.4 `StoryPackageRepository`

Responsibilities:

- resolve package paths
- apply validated section patches
- perform atomic write
- keep writes scoped to repo-owned packages

### 12.5 `RuntimeProjectionService`

Responsibilities:

- regenerate runtime-compatible files from section-owned authoring data
- preserve compatibility with existing runtime contracts

### 12.6 `StoryPackageReloadService`

Responsibilities:

- reload the final story package aggregate
- confirm that runtime consumers can still read the package

## 13. Failure Taxonomy

Failures should be classified before they are surfaced.

### 13.1 Repairable

- bad enum
- missing field
- broken reference that can be deterministically fixed

### 13.2 Needs Human Decision

- conflicting author intent
- two or more equally valid section interpretations
- request implies a new contract field
- a valid save would require changing author meaning

### 13.3 Infrastructure Failure

- repository unavailable
- write failure
- unexpected reload error
- LLM call failure after retry budget

## 14. Observability

The coordinator flow should leave a minimal audit trail.

Recommended trace fields:

- `requestId`
- `packageName`
- invocation mode
- target sections
- selected skill
- retry count
- validation error codes
- final result status

Avoid logging:

- full raw prompt bodies by default
- secrets
- provider keys
- unnecessary story payload duplication

## 15. Implementation Constraints For Coding Agents

Any coding plan derived from this document must preserve these rules:

1. Do not hardcode giant prompts as a substitute for structured authoring data.
2. Do not let the coordinator write files directly.
3. Do not skip deterministic validation because model confidence looks high.
4. Do not let the browser become the file authority.
5. Do not collapse section boundaries just because user input is freeform.
6. Do not treat archived page-first drafts as the current architecture.
7. Do not modify bridge rules, schemas, or system code just to make one patch candidate pass validation.

## 16. Open Follow-Up Documents

This document should be followed by:

1. `section-skills.md`
2. a validation/writeback note if boundary detail grows too large
3. refreshed page drafts only after the coordinator path is stable
