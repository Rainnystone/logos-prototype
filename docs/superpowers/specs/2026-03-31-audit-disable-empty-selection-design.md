# Audit Disable Via Empty Selection Design

## Goal

Allow authors to disable auditing by selecting no audit questions at all, without adding a parallel enable/disable switch and without introducing any runtime ambiguity.

## Decision

The system will treat an empty selected audit-question set as a first-class, valid state.

- Authoring remains list-driven: the source of truth is still the selected question IDs.
- No new `auditEnabled` flag will be added.
- No editor-only warning or banner will be added when the selection is empty.
- Runtime will short-circuit: if the selected questions for the active round are empty, the orchestrator will skip the audit call entirely and accept the generated beat directly.

This keeps the model simple: "no selected questions" means "no audit for this round."

## Why This Approach

Three implementation styles were considered.

### 1. Canonical empty-selection model with runtime short-circuit

This is the chosen design.

The same data model is used everywhere: selection lists may be empty, and runtime derives behavior directly from that fact. There is no fake audit result, no special UI switch, and no duplicate state to reconcile later.

### 2. Runtime-only patch

Rejected.

Allowing empty selection only in runtime while keeping schemas or persistence biased toward non-empty data would create a split-brain system. The editor would save one semantic state while contracts still describe another.

### 3. Separate `auditEnabled` flag

Rejected.

This creates two truths: the flag and the selected IDs. That would force future code to reconcile contradictory states and adds long-term maintenance cost for no gain.

## Scope

This design affects four boundaries only.

### 1. Contracts and validation

The shared audit-question contracts must allow zero selected questions.

- `selectionPolicy.default` must be allowed to be empty.
- Phase override append lists may also resolve to empty effective selection.
- `AuditPacket.auditQuestions` must be allowed to be empty, because the type system and schema should not contradict the legal runtime state.
- ID integrity checks remain strict: any selected ID that exists must still resolve to a real question.

This change is about allowing an empty selection, not weakening reference validation.

### 2. Authoring and persistence

The editor and bridge should preserve the author's exact selection state, including the empty state.

- Authors can uncheck every default audit question.
- Save and reload must round-trip the empty default selection without silently restoring fallback IDs.
- Question pools themselves do not need to be emptied; only the selected IDs may be empty.
- Existing cleanup logic that removes invalid IDs should remain, but it must not reintroduce a minimum-selection rule.

### 3. Runtime orchestration

The orchestrator becomes the explicit owner of the "skip audit" branch.

Flow:

1. Select audit questions for the active phase.
2. If the selected list is empty:
   - do not call `adapter.audit`
   - do not construct rewrite feedback
   - do not enter the rewrite loop
   - treat the generated beat as accepted
   - keep audit-related state arrays empty
3. If the selected list is non-empty:
   - keep the current audit path unchanged

This keeps the audit module focused on real audit work instead of making it responsible for the absence of audit.

### 4. UI behavior

The editor UI remains minimal.

- No new switch is added.
- No extra explanation block is added.
- The current checkbox-driven selection UI continues to be the only control surface.

The Play Workbench will naturally reflect the result through empty audit answers / no rewrite activity. No dedicated visual label is required by this design.

## Data-Flow Impact

The new flow is:

`selectionPolicy` -> selected question IDs -> selected questions

Then:

- non-empty -> existing audit pipeline
- empty -> orchestrator accept path

No other module should invent a second interpretation of the empty state.

## Testing Strategy

The implementation must prove the following behaviors.

### Contract tests

- Empty default selection validates successfully.
- Empty `auditQuestions` payload validates successfully where relevant.
- Invalid selected IDs still fail validation or are stripped only by existing normalization rules.

### Authoring tests

- Unchecking all default questions survives normalization, save, reload, and bridge round-trip.
- Existing question definitions remain intact even when nothing is selected.

### Runtime tests

- `selectAuditQuestions()` returns an empty list when nothing is selected.
- Orchestrator skips `adapter.audit` when the selected list is empty.
- Accepted beats still advance normally.
- Retry count remains zero and rewrite feedback remains null.

### Regression tests

- Existing non-empty audit flows still behave exactly as before.
- Force-accept and rewrite loops remain unchanged for rounds with active audit questions.

## Non-Goals

This design does not add:

- per-phase explicit on/off toggles
- audit presets
- UI warning banners
- partial "soft audit" semantics
- fake empty audit calls that mimic success

## Implementation Guidance

Keep the change small and centered.

- Let "empty selection" be the only new semantic.
- Put the runtime branch in the orchestrator, not the adapter layer.
- Avoid broad refactors of audit parsing or response formats unless contract alignment truly requires them.
- Prefer removing minimum-count assumptions over layering exceptions on top of them.
