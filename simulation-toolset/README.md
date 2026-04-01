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
- Batch scenario execution through `runSimulationScenarioBatch(...)`
- Optional JSON report persistence under `simulation-toolset/reports/` or a caller-provided output directory

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

For a cloud-agent operational workflow, see [agent-guide.md](agent-guide.md).
