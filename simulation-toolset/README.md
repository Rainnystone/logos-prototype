# Simulation Toolset Workspace

This directory is an isolated workspace for the cloud-friendly simulation toolset.

## Purpose

- Keep simulation harness work separate from product runtime code and formal planning docs.
- Host the scriptable system-regression layer for authoring, runtime, adapter, and sidecar validation.
- Support future cloud batch execution with structured reports.

## Planned Structure

- `docs/`: design, implementation plan, findings, and progress for this thread
- `src/`: simulation harness source
- `tests/`: TDD-driven simulation tests
- `scenarios/`: reusable scenario definitions
- `reports/`: optional persisted JSON reports

## Boundary

- Product code remains under `src/`.
- Existing tests remain in place unless a shared helper is intentionally extracted.
- This workspace consumes formal seams such as `saveSectionDraft()`, `createOrchestrator()`, `LLMAdapter`, and `runGossipelogCycle()`; it does not redefine them.
- Runtime simulation must treat `audit()` as a conditional branch, not a guaranteed step. If a package selects no audit questions, the simulator should accept a no-auditor path as valid behavior.

## Current Capabilities

- Per-fixture temp story package isolation with fixture-owned `cleanup()`
- Author simulator cleanup via `simulator.cleanup()`
- Scripted adapter modes for result, timeout, malformed, provider error, duplicate, delayed, and out-of-order simulation
- Normalized sidecar trace via `agentId`, `stage`, `outcome`, and `sideEffectSummary`
- Batch scenario execution through `runSimulationScenarioBatch(...)`
- Built-in scenario manifest plus batch `run-index.json`
- Report `schemaVersion` for artifact evolution
- Temp package scavenging for list / dry-run / remove cleanup flows
- Programmatic route smoke through:
  - authoring `sections/[sectionId]`
  - scene-phase location selection -> runtime location projection -> prompt location patch
  - authoring `diagnostics`
  - play `gossipelog`
- Lightweight UI smoke through:
  - edit workbench `保存本页 -> shared save route path`
  - play workbench `Start Round -> runtime loop -> sidecar hook`
- Session continuity simulation:
  - Checkpoint persistence after accepted beats
  - Session restore with state/history preservation
  - Reset workbench semantics (new session, old session preserved)
  - Stale refresh protection (reset isolation from pending operations)
  - Relationship finalization (gossipelog -> session/checkpoint binding)
  - Edit continuity bounded view (no raw checkpoint exposure)
- Optional JSON report persistence under `simulation-toolset/reports/` or a caller-provided output directory
- **Storyline Mock Stack** (Phase 3):
  - MockKernel: in-memory state machine with operation tracing and replay
  - SubstrateMock: storyline substrate operations (create, branch, switch, rename, ensure session, runtime commands)
  - RouteMock: HTTP route layer over SubstrateMock
  - MockFixtureBuilder: in-memory fixture construction for storyline state
  - StorylineObserver: state assertions and summary queries
  - StorylineE2ESimulator: complete human workflow simulation
  - Six E2E flow scenarios:
    - `create_from_source_and_continue`: Create new storyline from source and continue
    - `branch_from_checkpoint_flow`: Branch from a reachable checkpoint
    - `switch_and_continue`: Switch to existing storyline
    - `rename_and_verify`: Rename storyline and verify consistency
    - `legacy_bootstrap_flow`: Bootstrap from legacy runtime-sessions
    - `full_storyline_runtime_flow`: Complete runtime flow with checkpoint branching
  - Serialized trace support for record/replay
  - Story-agnostic test fixtures

## Cloud Usage Direction

The current Phase 3 entry point is programmatic rather than browser-driven:

```ts
import { createHappyPathScenario } from '../scenarios/happy-path';
import { createValidationFailureScenario } from '../scenarios/validation-failure';
import { runSimulationScenarioBatch } from '../src/scenario-runner';

const result = await runSimulationScenarioBatch({
  scenarios: [
    createHappyPathScenario(),
    createValidationFailureScenario(),
  ],
  outputDir: 'simulation-toolset/reports/batch-run',
});
```

This keeps the first cloud-facing version boundary-first:

- no browser automation requirement
- no direct file writes outside the formal authoring bridge
- no story-specific logic baked into the harness

For the cloud Codex run workflow, artifact discipline, debugging protocol, and cleanup expectations, see [agent-guide.md](agent-guide.md).
