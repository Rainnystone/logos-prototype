# Play Latency Audit Scope And Streaming Design

Date: 2026-04-09
Status: Draft for review
Scope: `/play` runtime latency optimization first implementation slice

## 1. Why This Follow-Up Exists

The current `/play` experience still makes the player wait too long between choosing an option and seeing the next beat body.

The investigation already confirmed three important facts:

1. The perceived latency is dominated by remote LLM work, not local Next.js route time.
2. Turning audit off helps, but does not remove the longest wait because `route + generate` still remain.
3. The current runtime is fully buffered end-to-end:
   - generate returns only after the full payload is available
   - the proxy waits for full JSON
   - the workbench updates only after `runBeat()` fully resolves

This document defines the first implementation slice that improves perceived latency without changing narrative control semantics.

It intentionally stays narrow.

## 2. Product Goal

This optimization should make the following statements true:

1. Audit semantics become narrower and cheaper: audit should only judge the newly generated beat and its four options.
2. When audit is not active for the current beat, the player can see the beat body appear earlier through true streaming rather than waiting for the full final payload.
3. Options remain gated until the final structured result is complete.
4. Input remains locked until options are ready, so visible prose never creates a false-ready state.
5. Existing narrative control modules continue to mean the same thing after the change.

## 3. Frozen Product Conclusions

The following conclusions are already fixed and should not be reopened in this pass:

1. `beat streaming` means actual streamed beat-body reveal, not merely showing a fully generated beat earlier in a different UI order.
2. Streaming is only allowed on the `audit off` path.
3. `audit on` must keep the current non-streaming behavior.
4. Stream updates should arrive in coarse chunks, not token-by-token typing animation.
5. The workbench status text should continue to use the existing `Generating...` language.
6. Auto-scroll should only follow the stream when the player is already at the bottom.
7. Options must appear only after a complete final `GenerateResult` is available.
8. Input stays locked from submit time until final options are ready.
9. If streaming generation ultimately fails, the temporary streamed beat body is rolled back and the existing error state is shown.
10. Failed streamed prose does not enter continuity, accepted history, checkpoint state, or runtime persistence.
11. This pass is for latency optimization only and must not change narrative control semantics.
12. This pass must not modify the meaning of:
    - `router`
    - memory / `memory placeholder`
    - phase / beat orchestration semantics
    - the current audit enable/disable product switch itself

## 4. Non-Goals

This work does not attempt to:

- redesign router behavior
- reduce the history window
- change phase-end processing semantics
- make `route`, `audit`, `settlement`, or `collapse` stream
- remove `routerHint`
- split models by mode
- redesign option generation into a separate runtime call
- preserve failed streamed drafts as recoverable artifacts
- optimize total round-trip time beyond the two scoped changes in this spec

## 5. Problem Statement

Today the runtime treats a beat as an all-or-nothing buffered operation.

For a normal player choice:

1. `runBeat()` computes `route`
2. it builds the director note and prompt object
3. it calls `generate`
4. if audit is selected, it calls `audit`
5. on audit failure, it may rewrite
6. only then does the workbench receive the accepted beat and options

This creates two separate latency problems:

### 5.1 Audit Contract Is Wider Than The Intended Product Boundary

Current audit packets still include `precedingBeats`, and the current audit prompt renders them into the model request.

That means audit is still paying for context that the product no longer wants it to use.

### 5.2 The Workbench Cannot Reveal Beat Text Incrementally

Even when audit is absent, the workbench still waits for the final structured payload before any player-visible prose appears.

So the player experiences a blank wait even in the simpler path.

## 6. Design Approaches Considered

### Approach A: Narrow audit scope and add a dedicated `audit off` streaming path

Change audit to operate only on current generated output, and add a separate generate-stream path that is only used when no audit questions are selected for the current beat.

Pros:

- directly targets the allowed latency optimization scope
- keeps `audit on` behavior stable
- avoids touching router or memory semantics
- lets streaming be implemented as a dedicated path instead of forcing every mode into a streaming abstraction immediately

Cons:

- generate temporarily has two runtime paths
- requires new stream contracts across several layers

Recommendation:

- choose this approach

### Approach B: Narrow audit scope but only reorder final reveal

Keep generate fully buffered, but show the finished beat body before options as soon as the final payload arrives.

Pros:

- smaller implementation
- minimal infrastructure change

Cons:

- this is not true streaming
- does not deliver the product intent already approved in this thread

Recommendation:

- reject

### Approach C: Build a universal streaming runtime for all modes first

Introduce a full streaming abstraction for generate, route, audit, settlement, and collapse in one pass.

Pros:

- long-term conceptual uniformity

Cons:

- far too broad for the current latency slice
- highly likely to drag narrative control changes into scope
- increases planning and regression risk

Recommendation:

- reject

## 7. Recommended Design

### 7.1 High-Level Runtime Split

The runtime should treat the current beat path as two execution modes:

1. **Audited mode**
   - selected audit questions exist
   - behavior remains fully buffered
   - no visible prose streaming
   - current rewrite / force-accept / accepted-state flow remains unchanged

2. **Non-audited mode**
   - no selected audit questions exist for the current beat
   - generate may expose incremental beat-body chunks to the workbench
   - options remain hidden until the final structured result is complete
   - accepted persistence still happens only after the final result is validated

This split is a runtime execution distinction, not a product-surface redesign.

### 7.2 Audit Contract Narrowing

`AuditPacket` should no longer model or transmit `precedingBeats`.

The new audit contract should include only:

- generated `beatText`
- generated `options`
- selected audit questions

This means:

1. the schema contract must shrink
2. `buildAuditPacket()` must stop accepting history
3. `executeAudit()` must stop forwarding history
4. the audit user prompt must stop rendering `[Preceding Beats]`

The new contract is intentionally narrower, not “smarter.”

It should not try to recreate continuity checks through hidden alternative inputs.

### 7.3 Audit Question Compatibility Rule

Once audit input is narrowed, some existing questions may become invalid because they implicitly depend on cross-beat history.

Best practice for this pass is:

- do not add a second audit path
- do not preserve hidden history-only checks behind the scenes
- do not redesign the entire audit system

Instead, apply a limited compatibility pass:

1. inventory current audit questions and fixtures that depend on earlier beats
2. rewrite only the questions that directly conflict with the new contract
3. keep all questions that can already be judged from the current beat and options

So this pass performs a **targeted audit-question cleanup**, not a full audit redesign.

### 7.4 Generate Streaming Contract

The current buffered `generate(): Promise<GenerateResult>` path should remain intact.

For the `audit off` path, add a separate optional streaming contract rather than overloading the existing method.

Recommended shape:

- provider layer gains an optional generate-stream capability
- adapter layer gains an optional generate-stream capability
- orchestrator gains an optional beat-text streaming callback path

The streaming contract should expose two kinds of information:

1. **beat body deltas**
   - coarse, append-only chunks safe to show to the player
2. **terminal final result**
   - the complete validated `GenerateResult`
   - includes final `beatText` and the four options

The final result remains the only source of truth for:

- options
- accepted history
- runtime persistence
- continuity state
- checkpoint recording

### 7.5 Why Streaming Must Stay Generate-Only In This Pass

`route`, `audit`, `settlement`, and `collapse` do not directly improve player-perceived latency through visible prose reveal in the same way generate does.

Trying to stream them now would:

- broaden scope
- complicate orchestration
- risk changing narrative control semantics

Therefore this pass intentionally limits streaming infrastructure to the generate path used in the player-visible beat body.

### 7.6 Parsing Strategy

The current generate path expects a final structured payload containing both `beatText` and `options`.

This spec does not require token-level JSON parsing or flashy typing effects.

Instead, the streaming path should be designed so that:

1. the adapter may surface safe coarse beat-text increments while the response is still in flight
2. the final payload is still fully validated as a normal `GenerateResult`
3. if a valid final structured result never materializes, the stream is treated as failed and rolled back from the UI

This keeps the player-visible behavior useful while preserving the existing structured-output boundary at acceptance time.

### 7.7 Workbench Behavior

On the `audit off` streaming path, the workbench should behave like this:

1. player submits input
2. status becomes `Generating...`
3. input locks immediately
4. beat body begins appearing in coarse streamed chunks
5. if the player is still at the bottom, scroll follows the new content
6. options remain hidden during streaming
7. when the final result succeeds:
   - streamed beat body resolves into the final accepted beat body
   - options appear once
   - normal accepted flow continues
8. if generation fails:
   - temporary streamed text is removed
   - existing error surface is shown
   - no continuity state is mutated

On the `audit on` path, the workbench should continue using the current buffered path with no visible streaming.

## 8. Module Boundaries

### 8.1 Audit Scope Packet

This packet owns:

- audit packet schema
- audit packet builder
- audit prompt assembly
- audit-related tests and fixtures
- only the audit questions that are invalid under the new narrowed contract

This packet does **not** own:

- router semantics
- memory behavior
- streaming transport

### 8.2 Streaming Packet

This packet owns:

- provider generate-stream contract
- proxy transport needed for streamed generate responses
- adapter generate-stream contract
- orchestrator streaming hook for `audit off`
- workbench temporary streamed beat state

This packet does **not** own:

- audited rewrite semantics
- route / settlement / collapse streaming
- option-generation redesign

## 9. Documentation Synchronization Strategy

The active implementation spec in `docs/superpowers/specs/` is the driver for this work.

Archive documents should only be updated where they are directly contradicted by the new runtime contract.

That means this pass may need to synchronize archive/runtime documents such as:

- the auditor module spec
- the audit packet contract
- any adapter/interface contract text that still states audit consumes preceding beats

This pass should **not** reopen unrelated archive specs such as:

- router semantics
- memory placeholder semantics
- director note semantics
- phase gradient semantics

This keeps the archive sync bounded to the new latency-focused contract change.

## 10. Testing And Verification

Implementation planning should assume at least these verification layers:

### 10.1 Audit Scope Verification

- unit tests for `AuditPacket` schema
- unit tests for `buildAuditPacket()`
- prompt template / schema-mapper tests proving no preceding-beat context is sent
- e2e audit behavior tests proving `audit on` still behaves correctly under the narrower contract

### 10.2 Streaming Verification

- workbench tests for streamed beat-body reveal
- tests that options remain hidden until final success
- tests that input stays locked during streaming
- tests that failure rolls back temporary streamed prose
- tests that `audit on` still uses the old buffered path

### 10.3 Final Verification

- targeted suites for audit, adapter, orchestrator, and play workbench
- full `npm test`
- `npm run build` before calling implementation complete

## 11. Risks And Trade-Offs

### 11.1 Main Benefit

The main expected benefit is reduced **perceived** latency on the `audit off` path because the player sees prose earlier.

This spec does not promise a proportional reduction in full round completion time.

### 11.2 Main Risk

The largest implementation risk is transport and parser complexity in the new streaming path.

That risk is why the design:

- keeps the existing buffered generate path
- keeps `audit on` fully unchanged
- keeps accepted state tied to the final structured result only

### 11.3 Audit Narrowing Risk

Narrowing audit input means some former continuity-style checks no longer belong in audit.

That is an intentional product trade:

- lower latency and tighter contract
- fewer hidden cross-beat checks inside audit

## 12. Implementation Readiness

This spec is ready for implementation planning once reviewed.

The expected next step is:

1. create an implementation plan with separate packets for:
   - audit contract narrowing
   - non-audited generate streaming
   - regression verification
2. execute those packets without widening scope into router, memory, or broader runtime redesign
