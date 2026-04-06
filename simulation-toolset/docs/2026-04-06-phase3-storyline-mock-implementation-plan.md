# Phase 3 Storyline Mock & E2E Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `simulation-toolset` with an in-memory storyline mock stack so Cloud Codex can simulate create / switch / branch / continue flows, record and replay them, and regress the Phase 3 Part 1/2 storyline substrate without browser-first automation.

**Architecture:** Build one shared `MockKernel` as the single in-memory state and trace source. Layer `SubstrateMock` on top for storyline / variant / session mutations, then `RouteMock` and `StorylineE2ESimulator` for higher-level flows. Keep the current toolset extensible by refactoring `session-simulator`, `temp-package`, `scripted-adapter`, and `scenario-runner` instead of creating a parallel simulation stack.

**Tech Stack:** TypeScript, Zod, Vitest, Node `fs/path`, existing `simulation-toolset` patterns, existing `src/storylines/*` seams.

---

## File Map

### Create: new storyline mock modules
- `simulation-toolset/src/mock-kernel.ts`
- `simulation-toolset/src/substrate-mock.ts`
- `simulation-toolset/src/route-mock.ts`
- `simulation-toolset/src/storyline-e2e-simulator.ts`
- `simulation-toolset/src/storyline-observer.ts`
- `simulation-toolset/src/mock-fixture-builder.ts`
- `simulation-toolset/src/serialized-trace.ts`

### Modify: existing toolset modules
- `simulation-toolset/src/contracts.ts`
- `simulation-toolset/src/session-simulator.ts`
- `simulation-toolset/src/temp-package.ts`
- `simulation-toolset/src/scripted-adapter.ts`
- `simulation-toolset/src/scenario-runner.ts`
- `simulation-toolset/src/scenario-manifest.ts`
- `simulation-toolset/README.md`

### Create: focused tests
- `simulation-toolset/tests/serialized-trace.test.ts`
- `simulation-toolset/tests/mock-kernel.test.ts`
- `simulation-toolset/tests/substrate-mock.test.ts`
- `simulation-toolset/tests/mock-fixture-builder.test.ts`
- `simulation-toolset/tests/storyline-observer.test.ts`
- `simulation-toolset/tests/route-mock.test.ts`
- `simulation-toolset/tests/storyline-e2e-simulator.test.ts`
- `simulation-toolset/tests/create-from-source-and-continue-scenario.test.ts`
- `simulation-toolset/tests/switch-and-continue-scenario.test.ts`
- `simulation-toolset/tests/branch-from-checkpoint-flow-scenario.test.ts`
- `simulation-toolset/tests/rename-and-verify-scenario.test.ts`
- `simulation-toolset/tests/legacy-bootstrap-flow-scenario.test.ts`
- `simulation-toolset/tests/full-storyline-runtime-flow-scenario.test.ts`

### Modify: existing tests
- `simulation-toolset/tests/session-simulator.test.ts`
- `simulation-toolset/tests/scripted-adapter.test.ts`
- `simulation-toolset/tests/scenario-runner.test.ts`

### Create: scenarios
- `simulation-toolset/scenarios/storyline-flows/create-from-source-and-continue.ts`
- `simulation-toolset/scenarios/storyline-flows/switch-and-continue.ts`
- `simulation-toolset/scenarios/storyline-flows/branch-from-checkpoint-flow.ts`
- `simulation-toolset/scenarios/storyline-flows/rename-and-verify.ts`
- `simulation-toolset/scenarios/storyline-flows/legacy-bootstrap-flow.ts`
- `simulation-toolset/scenarios/storyline-flows/full-storyline-runtime-flow.ts`
- `simulation-toolset/scenarios/storyline-scenario-manifest.ts`

---

## Task 1: Freeze shared trace contracts

**Files:**
- Modify: `simulation-toolset/src/contracts.ts`
- Create: `simulation-toolset/src/serialized-trace.ts`
- Test: `simulation-toolset/tests/serialized-trace.test.ts`

- [ ] **Step 1: Write the failing trace-schema tests**

Run: `npm run test:simulation -- simulation-toolset/tests/serialized-trace.test.ts`
Expected: FAIL because `SerializedTrace` helpers and storyline trace schemas do not exist yet.

- [ ] **Step 2: Add the minimal trace contract layer**

Implement:
- `SerializedStateSnapshotSchema`
- `SerializedOperationTraceSchema`
- `SerializedFlowTraceSchema`
- helpers to convert `MockKernel` snapshots and trace entries into JSON-safe records

- [ ] **Step 3: Re-run the focused test**

Run: `npm run test:simulation -- simulation-toolset/tests/serialized-trace.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/src/contracts.ts simulation-toolset/src/serialized-trace.ts simulation-toolset/tests/serialized-trace.test.ts
git commit -m "feat(simulation): freeze storyline trace contracts"
```

---

## Task 2: Implement MockKernel

**Files:**
- Create: `simulation-toolset/src/mock-kernel.ts`
- Test: `simulation-toolset/tests/mock-kernel.test.ts`

- [ ] **Step 1: Write failing MockKernel tests**

Tests should cover:
- snapshot / restore
- `execute()` state logging
- `scriptNext()` and `scriptSequence()`
- `getTrace()` / `exportTrace()`
- `reset()` and `cleanup()`

Run: `npm run test:simulation -- simulation-toolset/tests/mock-kernel.test.ts`
Expected: FAIL because `MockKernel` does not exist yet.

- [ ] **Step 2: Implement the smallest in-memory state machine**

Keep the kernel focused on:
- package name
- storyline repository state
- runtime session state
- operation trace
- state snapshots
- scripted mode queue (all 8 variants: `success`, `failure`, `error`, `validation_error`, `conflict`, `stale_state`, `timeout`, `delayed`)

Reference spec Section 3.2 for the exact type definitions:
- `MockKernelState` with `Record<string, VariantWorkspaceState>` (not Map)
- `OperationTraceEntry` with `StateSnapshotRef` and `layer` semantics
- `ScriptedMode` discriminated union with all 8 variants

Do not let the kernel know about UI concerns or browser flows.

- [ ] **Step 3: Re-run the focused test**

Run: `npm run test:simulation -- simulation-toolset/tests/mock-kernel.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/src/mock-kernel.ts simulation-toolset/tests/mock-kernel.test.ts
git commit -m "feat(simulation): add MockKernel core"
```

---

## Task 3: Implement SubstrateMock, StorylineObserver, and fixture building

**Files:**
- Create: `simulation-toolset/src/substrate-mock.ts`
- Create: `simulation-toolset/src/storyline-observer.ts`
- Create: `simulation-toolset/src/mock-fixture-builder.ts`
- Test: `simulation-toolset/tests/substrate-mock.test.ts`
- Test: `simulation-toolset/tests/storyline-observer.test.ts`
- Test: `simulation-toolset/tests/mock-fixture-builder.test.ts`

- [ ] **Step 1: Write failing tests for the storyline substrate layer**

Tests should cover:
- resolve active storyline context
- create storyline from source
- branch storyline from checkpoint
- switch active storyline
- update storyline display name
- **ensure storyline aware active session**
- **execute storyline runtime session commands**:
  - `ensure_active_session`
  - `record_accepted_beat`
  - `finalize_relationship_layer`
  - `reset_workbench`
- legacy bootstrap behavior when `storyline-repository.json` is absent
- bounded storyline observation without raw repository leakage
- in-memory fixture construction for Phase 3 storyline state

**Reference spec Section 4.3 for state transition rules** - each operation's preconditions, state changes, and outputs must match the spec.

Run: `npm run test:simulation -- simulation-toolset/tests/substrate-mock.test.ts simulation-toolset/tests/storyline-observer.test.ts simulation-toolset/tests/mock-fixture-builder.test.ts`
Expected: FAIL because the modules do not exist yet.

- [ ] **Step 2: Implement the minimal substrate layer**

Implement:
- `SubstrateMock` as the operation boundary over `MockKernel`
- `StorylineObserver` as a read-only projection helper
- `MockFixtureBuilder` for phase 3 storyline repository / variant / session state

Keep the mock layer in-memory by default. Only model on-disk legacy bootstrap where the spec requires it.

- [ ] **Step 3: Re-run the focused tests**

Run: `npm run test:simulation -- simulation-toolset/tests/substrate-mock.test.ts simulation-toolset/tests/storyline-observer.test.ts simulation-toolset/tests/mock-fixture-builder.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/src/substrate-mock.ts simulation-toolset/src/storyline-observer.ts simulation-toolset/src/mock-fixture-builder.ts simulation-toolset/tests/substrate-mock.test.ts simulation-toolset/tests/storyline-observer.test.ts simulation-toolset/tests/mock-fixture-builder.test.ts
git commit -m "feat(simulation): add storyline substrate mock"
```

---

## Task 4: Implement RouteMock and StorylineE2ESimulator

**Files:**
- Create: `simulation-toolset/src/route-mock.ts`
- Create: `simulation-toolset/src/storyline-e2e-simulator.ts`
- Test: `simulation-toolset/tests/route-mock.test.ts`
- Test: `simulation-toolset/tests/storyline-e2e-simulator.test.ts`

- [ ] **Step 1: Write the failing route / E2E tests**

Tests should cover:
- route-level parsing and response formatting
- `create_from_source`
- `branch_from_checkpoint`
- `switch_active_storyline`
- `rename_display_name`
- `runFlow()` for the main storyline flows
- `recordFlow()` / `replayFlow()`
- state assertions that stay separate from raw filesystem concerns

Run: `npm run test:simulation -- simulation-toolset/tests/route-mock.test.ts simulation-toolset/tests/storyline-e2e-simulator.test.ts`
Expected: FAIL because the modules do not exist yet.

- [ ] **Step 2: Implement the minimal route and E2E layers**

Implement:
- `RouteMock` as a thin request/response wrapper around `SubstrateMock`
- `StorylineE2ESimulator` as the orchestration layer for complete author-style flows
- replay support backed by serialized trace data

- [ ] **Step 3: Re-run the focused tests**

Run: `npm run test:simulation -- simulation-toolset/tests/route-mock.test.ts simulation-toolset/tests/storyline-e2e-simulator.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/src/route-mock.ts simulation-toolset/src/storyline-e2e-simulator.ts simulation-toolset/tests/route-mock.test.ts simulation-toolset/tests/storyline-e2e-simulator.test.ts
git commit -m "feat(simulation): add storyline route and E2E mocks"
```

---

## Task 5: Refactor existing toolset consumers onto the shared kernel

**Files:**
- Modify: `simulation-toolset/src/session-simulator.ts`
- Modify: `simulation-toolset/src/temp-package.ts`
- Modify: `simulation-toolset/src/scripted-adapter.ts`
- Modify: `simulation-toolset/src/scenario-runner.ts`
- Modify: `simulation-toolset/src/scenario-manifest.ts`
- Test: `simulation-toolset/tests/session-simulator.test.ts`
- Test: `simulation-toolset/tests/scripted-adapter.test.ts`
- Test: `simulation-toolset/tests/scenario-runner.test.ts`

- [ ] **Step 1: Write the failing regression tests**

Tests should cover:
- `SessionSimulator` binding to `MockKernel`
- `temp-package` support for storyline repository / variant fixture shape
- `ScriptedAdapter` trace entries staying compatible with the shared storyline trace format
- `ScenarioRunner` accepting kernel-backed scenarios and still writing manifests / run indexes correctly

Run: `npm run test:simulation -- simulation-toolset/tests/session-simulator.test.ts simulation-toolset/tests/scripted-adapter.test.ts simulation-toolset/tests/scenario-runner.test.ts`
Expected: FAIL on the new storyline-aware behavior.

- [ ] **Step 2: Update the existing modules without adding a second simulation stack**

Keep the changes narrow:
- `SessionSimulator` should bind to `MockKernel` instead of reading raw state directly
- `temp-package` should carry the Phase 3 storyline fixture shape
- `ScriptedAdapter` should feed the shared trace model
- `ScenarioRunner` should support record / replay metadata without changing the existing report shape
- `scenario-manifest` should expose the new storyline flow labels

- [ ] **Step 3: Re-run the focused tests**

Run: `npm run test:simulation -- simulation-toolset/tests/session-simulator.test.ts simulation-toolset/tests/scripted-adapter.test.ts simulation-toolset/tests/scenario-runner.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/src/session-simulator.ts simulation-toolset/src/temp-package.ts simulation-toolset/src/scripted-adapter.ts simulation-toolset/src/scenario-runner.ts simulation-toolset/src/scenario-manifest.ts simulation-toolset/tests/session-simulator.test.ts simulation-toolset/tests/scripted-adapter.test.ts simulation-toolset/tests/scenario-runner.test.ts
git commit -m "feat(simulation): bind existing toolset to storyline kernel"
```

---

## Task 6: Add create / switch storyline flows

**Files:**
- Create: `simulation-toolset/scenarios/storyline-flows/create-from-source-and-continue.ts`
- Create: `simulation-toolset/scenarios/storyline-flows/switch-and-continue.ts`
- Test: `simulation-toolset/tests/create-from-source-and-continue-scenario.test.ts`
- Test: `simulation-toolset/tests/switch-and-continue-scenario.test.ts`

- [ ] **Step 1: Write the failing scenario tests**

The tests should verify:
- a new storyline can be created from a source storyline and immediately continued
- switching a storyline updates the active storyline without inventing a separate selected-row state
- the resulting trace stays story-agnostic and kernel-backed

**Reference spec Section 6.2 for detailed flow steps.**

Run: `npm run test:simulation -- simulation-toolset/tests/create-from-source-and-continue-scenario.test.ts simulation-toolset/tests/switch-and-continue-scenario.test.ts`
Expected: FAIL because the scenario files do not exist yet.

- [ ] **Step 2: Implement the two scenarios**

Keep the scenarios small and deterministic. They should reuse the shared kernel / mock fixture instead of creating one-off helpers.

- [ ] **Step 3: Re-run the focused tests**

Run: `npm run test:simulation -- simulation-toolset/tests/create-from-source-and-continue-scenario.test.ts simulation-toolset/tests/switch-and-continue-scenario.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/scenarios/storyline-flows/create-from-source-and-continue.ts simulation-toolset/scenarios/storyline-flows/switch-and-continue.ts simulation-toolset/tests/create-from-source-and-continue-scenario.test.ts simulation-toolset/tests/switch-and-continue-scenario.test.ts
git commit -m "feat(simulation): add create and switch storyline flows"
```

---

## Task 7: Add branch / rename / legacy bootstrap flows

**Files:**
- Create: `simulation-toolset/scenarios/storyline-flows/branch-from-checkpoint-flow.ts`
- Create: `simulation-toolset/scenarios/storyline-flows/rename-and-verify.ts`
- Create: `simulation-toolset/scenarios/storyline-flows/legacy-bootstrap-flow.ts`
- Test: `simulation-toolset/tests/branch-from-checkpoint-flow-scenario.test.ts`
- Test: `simulation-toolset/tests/rename-and-verify-scenario.test.ts`
- Test: `simulation-toolset/tests/legacy-bootstrap-flow-scenario.test.ts`

- [ ] **Step 1: Write the failing scenario tests**

The tests should verify:
- branching from a reachable checkpoint creates a new storyline rooted at that checkpoint
- renaming only changes storyline metadata and does not affect ids, sessions, or variant files
- legacy bootstrap still works when the repository file is absent

**Reference spec Section 6.2 for detailed flow steps.**

Run: `npm run test:simulation -- simulation-toolset/tests/branch-from-checkpoint-flow-scenario.test.ts simulation-toolset/tests/rename-and-verify-scenario.test.ts simulation-toolset/tests/legacy-bootstrap-flow-scenario.test.ts`
Expected: FAIL because the scenario files do not exist yet.

- [ ] **Step 2: Implement the three scenarios**

Keep the flows independent. Do not let rename testing rely on branch-specific state.

- [ ] **Step 3: Re-run the focused tests**

Run: `npm run test:simulation -- simulation-toolset/tests/branch-from-checkpoint-flow-scenario.test.ts simulation-toolset/tests/rename-and-verify-scenario.test.ts simulation-toolset/tests/legacy-bootstrap-flow-scenario.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/scenarios/storyline-flows/branch-from-checkpoint-flow.ts simulation-toolset/scenarios/storyline-flows/rename-and-verify.ts simulation-toolset/scenarios/storyline-flows/legacy-bootstrap-flow.ts simulation-toolset/tests/branch-from-checkpoint-flow-scenario.test.ts simulation-toolset/tests/rename-and-verify-scenario.test.ts simulation-toolset/tests/legacy-bootstrap-flow-scenario.test.ts
git commit -m "feat(simulation): add branch rename and bootstrap flows"
```

---

## Task 8: Add the full runtime flow and finish documentation / regression

**Files:**
- Create: `simulation-toolset/scenarios/storyline-flows/full-storyline-runtime-flow.ts`
- Test: `simulation-toolset/tests/full-storyline-runtime-flow-scenario.test.ts`
- Modify: `simulation-toolset/README.md`
- Modify: `simulation-toolset/src/scenario-manifest.ts`
- Create: `simulation-toolset/scenarios/storyline-scenario-manifest.ts`

- [ ] **Step 1: Write the failing full-flow test**

The test should verify:
- a storyline can continue into runtime
- accepted beats update the storyline head checkpoint
- a branch from an accepted checkpoint gets a copied variant workspace and a fresh session
- the trace remains replayable

**Reference spec Section 6.2 Flow 6 for detailed steps.**

Run: `npm run test:simulation -- simulation-toolset/tests/full-storyline-runtime-flow-scenario.test.ts`
Expected: FAIL because the scenario file does not exist yet.

- [ ] **Step 2: Implement the scenario and refresh manifest / README**

Update the manifest so batch reports show the new storyline flow metadata.
Update the README so the cloud workflow documents the storyline mock stack as a first-class simulation layer.

- [ ] **Step 3: Run the full simulation regression**

Run:
```bash
npm run type-check:simulation
npm run test:simulation
npm test -- src/storylines/__tests__/ src/runtime-sessions/__tests__/ src/app/edit/sections/__tests__/StoryPackageManagementSection.test.tsx src/app/api/authoring/packages/[packageName]/storylines/actions/route.test.ts
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/scenarios/storyline-flows/full-storyline-runtime-flow.ts simulation-toolset/scenarios/storyline-scenario-manifest.ts simulation-toolset/tests/full-storyline-runtime-flow-scenario.test.ts simulation-toolset/README.md simulation-toolset/src/scenario-manifest.ts
git commit -m "feat(simulation): complete storyline mock flow coverage"
```

---

## Completion Standard

- `MockKernel` is the single in-memory source of truth for storyline simulation state.
- `SubstrateMock` owns storyline / variant / session mutations and preserves the existing formal seams.
- `RouteMock` and `StorylineE2ESimulator` exercise complete storyline flows without browser-first automation.
- The existing toolset modules are extended, not replaced.
- All six storyline flows have deterministic scenario coverage.
- `npm run type-check:simulation` and `npm run test:simulation` pass.
- The storyline-related product regression suite passes without changing product semantics.
