# Cloud-Friendly Simulation Toolset Implementation Plan

> For implementation work in this repository, execute by phase, follow TDD strictly, and prefer subagents for bounded tasks that do not overlap in write scope.

## Goal

Build a minimal, scriptable simulation harness for LOGOS that exercises the formal authoring loop, runtime loop, adapter boundary, and initial sidecar lifecycle without relying on browser-first automation.

## Architecture Decision

Use a root-level isolated workspace at `simulation-toolset/` rather than mixing the toolset into product runtime code under `src/`.

This workspace should:

- wrap existing formal seams instead of redefining them
- keep its own minimal `tsconfig` and `vitest` config
- expose a thin script entry from the root repo only when needed
- leave existing product tests in place

Core seams consumed by the toolset:

- `saveSectionDraft()` for authoring
- `createOrchestrator()` for runtime
- `LLMAdapter` for fake / loopback adapter behavior
- `runGossipelogCycle()` for sidecar observation

Important runtime note:

- `audit()` is conditional, not mandatory.
- If a package selects no audit questions, the runtime may legally skip the auditor step.
- Phase 2 tests and reports should record whether audit was invoked rather than assuming it always runs.

## Out Of Scope

- browser-first automation
- Play Workbench redesign
- editor UI redesign
- moving existing dispersed tests into the toolset
- adding a new provider framework
- adding heavy dependencies

## File Map

### Create: workspace shell

- `simulation-toolset/README.md`
- `simulation-toolset/tsconfig.json`
- `simulation-toolset/vitest.config.ts`

### Create: simulation source

- `simulation-toolset/src/contracts.ts`
- `simulation-toolset/src/recorder.ts`
- `simulation-toolset/src/report-writer.ts`
- `simulation-toolset/src/temp-package.ts`
- `simulation-toolset/src/scripted-adapter.ts`
- `simulation-toolset/src/author-simulator.ts`
- `simulation-toolset/src/player-simulator.ts`
- `simulation-toolset/src/gossipelog-observer.ts`
- `simulation-toolset/src/scenario-runner.ts`

### Create: simulation tests

- `simulation-toolset/tests/scripted-adapter.test.ts`
- `simulation-toolset/tests/author-simulator.test.ts`
- `simulation-toolset/tests/player-simulator.test.ts`
- `simulation-toolset/tests/scenario-runner.test.ts`
- `simulation-toolset/tests/happy-path-scenario.test.ts`
- `simulation-toolset/tests/validation-failure-scenario.test.ts`
- `simulation-toolset/tests/adapter-failure-scenario.test.ts`

### Create later when needed

- `simulation-toolset/scenarios/*`
- `simulation-toolset/reports/*`

### Modify only if a missing seam is proven

- `src/authoring/persistence/bridge.ts`
- `src/engine/orchestrator.ts`
- `src/agents/gossipelog/agent.ts`

### Prefer not to modify in phase 1

- `src/app/edit/*`
- `src/app/play/*`
- `src/engine/api-adapter/providers/*`

## Phase Breakdown

| Phase | Goal | Completion Standard |
|---|---|---|
| Phase 2A | Freeze workspace and configs | `simulation-toolset/` can run its own tests without expanding root `vitest` or root `tsconfig` |
| Phase 2B | Freeze shared contracts and fixtures | contracts, recorder skeleton, temp package helper, scripted adapter all have focused passing tests |
| Phase 2C | Add core simulators | author simulator and player simulator pass targeted tests through formal seams |
| Phase 2D | Add observer and scenario runner | gossipelog observer and report assembly pass targeted tests |
| Phase 2E | Add three MVP scenarios | happy path, validation failure, adapter or sidecar failure all pass and emit structured assertions |
| Phase 2F | Regression verification | focused toolset suite and cross-boundary existing suites both pass |

## Execution Rules

- No production simulation code before a failing test exists.
- Each phase must go RED -> GREEN -> REFACTOR before the next phase.
- Use subagents only for bounded tasks with disjoint write scopes or read-only review work.
- Do not change product architecture to fit the toolset unless tests prove a missing seam.

## Detailed Steps

### Phase 2A: Freeze Workspace And Config

**Files**

- `simulation-toolset/README.md`
- `simulation-toolset/tsconfig.json`
- `simulation-toolset/vitest.config.ts`
- `package.json`

- [ ] Add the workspace README and directory contract.
- [ ] Add a local `tsconfig.json` for the toolset that can type-check toolset source and tests while importing project code from `src/`.
- [ ] Add a local `vitest.config.ts` that includes only `simulation-toolset/tests/**/*.test.ts`.
- [ ] Add a thin root script entry such as `test:simulation`.
- [ ] Verify the empty workspace can invoke Vitest successfully, even before feature tests are added.

Suggested verification:

- `npx vitest run --config simulation-toolset/vitest.config.ts`

### Phase 2B: Freeze Shared Contracts And Fixture Helpers

**Files**

- `simulation-toolset/src/contracts.ts`
- `simulation-toolset/src/recorder.ts`
- `simulation-toolset/src/temp-package.ts`
- `simulation-toolset/src/scripted-adapter.ts`
- `simulation-toolset/tests/scripted-adapter.test.ts`
- `simulation-toolset/tests/scenario-runner.test.ts`
- `simulation-toolset/tests/author-simulator.test.ts`

- [ ] Write failing tests for minimal scenario schema and report schema.
- [ ] Write a failing test for temp package creation and cleanup.
- [ ] Write a failing test for scripted adapter outbound/inbound trace recording.
- [ ] Run the focused tests and confirm they fail for the expected reasons.
- [ ] Implement minimal contracts, recorder skeleton, temp package helper, and scripted adapter.
- [ ] Re-run the same tests until green.

Suggested verification:

- `npx vitest run --config simulation-toolset/vitest.config.ts simulation-toolset/tests/scripted-adapter.test.ts simulation-toolset/tests/scenario-runner.test.ts simulation-toolset/tests/author-simulator.test.ts`

Required failure modes for scripted adapter:

- timeout
- malformed response
- provider error
- duplicate response
- out-of-order response

### Phase 2C: Add Core Simulators

**Files**

- `simulation-toolset/src/author-simulator.ts`
- `simulation-toolset/src/player-simulator.ts`
- `simulation-toolset/tests/author-simulator.test.ts`
- `simulation-toolset/tests/player-simulator.test.ts`

- [ ] Write a failing test that drives a section save through the shared bridge and captures trace.
- [ ] Write a failing test that initializes runtime and runs one beat with a scripted adapter.
- [ ] Make the runtime test cover the allowed no-audit branch when no audit questions are selected.
- [ ] Run both tests and confirm RED.
- [ ] Implement the smallest author simulator and player simulator that satisfy the tests.
- [ ] Re-run until both tests pass.

Suggested verification:

- `npx vitest run --config simulation-toolset/vitest.config.ts simulation-toolset/tests/author-simulator.test.ts simulation-toolset/tests/player-simulator.test.ts`

### Phase 2D: Add Gossipelog Observer And Scenario Runner

**Files**

- `simulation-toolset/src/gossipelog-observer.ts`
- `simulation-toolset/src/report-writer.ts`
- `simulation-toolset/src/scenario-runner.ts`
- `simulation-toolset/tests/scenario-runner.test.ts`

- [ ] Write a failing test for gossipelog lifecycle observation.
- [ ] Write a failing test for end-to-end report assembly.
- [ ] Confirm RED.
- [ ] Implement the smallest observer and scenario runner that produce structured report data.
- [ ] Re-run until green.

Suggested verification:

- `npx vitest run --config simulation-toolset/vitest.config.ts simulation-toolset/tests/scenario-runner.test.ts`

### Phase 2E: Add Three MVP Scenarios

**Files**

- `simulation-toolset/tests/happy-path-scenario.test.ts`
- `simulation-toolset/tests/validation-failure-scenario.test.ts`
- `simulation-toolset/tests/adapter-failure-scenario.test.ts`

- [ ] Write the failing happy path scenario first.
- [ ] In the happy path scenario, record whether audit was invoked and explicitly support the no-audit branch.
- [ ] Confirm RED, then implement the minimal scenario definition.
- [ ] Write the failing validation failure scenario.
- [ ] Confirm RED, then implement the minimal scenario definition.
- [ ] Write the failing adapter or sidecar failure scenario.
- [ ] Confirm RED, then implement the minimal scenario definition.
- [ ] Ensure each scenario records assertions and final state summary.

Suggested verification:

- `npx vitest run --config simulation-toolset/vitest.config.ts simulation-toolset/tests/happy-path-scenario.test.ts simulation-toolset/tests/validation-failure-scenario.test.ts simulation-toolset/tests/adapter-failure-scenario.test.ts`

### Phase 2F: Regression Verification

- [ ] Run the focused toolset suite.
- [ ] Run cross-boundary existing suites.
- [ ] Run broader quality gates only after the focused suites are green.

Suggested verification:

- `npx vitest run --config simulation-toolset/vitest.config.ts`
- `npm test -- src/authoring/persistence/__tests__/bridge.test.ts src/engine/__tests__/orchestrator.test.ts src/agents/gossipelog/__tests__/agent.test.ts src/app/play/runtime.test.ts`
- `npm run test:core`
- `npm test`

## Trace And Report Expectations

Every scenario report should be JSON-ready and include:

- `scenarioMeta`
- `actions`
- `authoringTrace`
- `runtimeTrace`
- `adapterTrace`
- `agentTrace`
- `assertions`
- `finalState`

The report should optimize for fast human replay in cloud environments. Prefer summaries and stable identifiers over dumping raw prompts or large logs.

## Subagent Strategy

Recommended use of subagents after Phase 2A is stable:

1. One implementer for workspace config or contract slice.
2. One spec reviewer after that slice lands.
3. One code quality reviewer after spec compliance is clean.

Do not run two implementation subagents in parallel against the same write scope.

Good candidate task boundaries:

- workspace config
- contracts plus recorder skeleton
- temp package helper plus scripted adapter
- author simulator
- player simulator
- observer plus scenario runner
- scenario tests

## Notes

- Keep all behavior story-agnostic.
- Do not hardcode story text in the toolset.
- Prefer persisted reports under `simulation-toolset/reports/` only when explicitly requested by a scenario or CLI flag.
- Route-level smoke can be added later, but it is not part of the first MVP closure.
