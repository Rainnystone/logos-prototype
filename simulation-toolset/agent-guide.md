# Simulation Toolset Agent Guide

This guide is for cloud-run Codex agents using `simulation-toolset/` as an analysis and verification workflow.

It assumes the cloud environment does not provide local skills. The workflow below therefore bakes in the most important discipline directly, including a simplified debugging protocol adapted from `systematic-debugging`.

## 1. Purpose

Use this toolset to:

- run structured simulation regressions against the formal authoring, runtime, adapter, and sidecar seams
- collect structured evidence for long-flow failures
- produce run artifacts and change suggestions without directly modifying product code

Do not use this workflow to:

- redesign product architecture on the fly
- add ad-hoc browser automation as the primary verification layer
- patch product source files during a cloud simulation run

## 2. Isolation Requirement

Run this workflow only in an isolated workspace.

Preferred:

- dedicated worktree from `branch/narrative-editor`

Fallback:

- dedicated clone plus a dedicated branch such as `codex/sim-<run-id>`

Why:

- the current formal package-loading seam still resolves packages from `src/story-packages/`
- interrupted runs can leave `.tmp-simulation-*` directories behind
- cloud verification should never share a writable workspace with a human’s active branch

If repository policy requires human approval before creating a worktree or branch, obtain that approval first.

## 3. Files To Read First

Load these files before running anything:

1. [README.md](../README.md)
2. [AGENTS.md](../AGENTS.md)
3. [simulation-toolset/README.md](README.md)
4. [simulation-toolset/docs/2026-04-01-cloud-simulation-toolset-design.md](docs/2026-04-01-cloud-simulation-toolset-design.md)
5. [simulation-toolset/docs/findings.md](docs/findings.md)

## 4. Standard Run Workflow

### Step 1: Create a Run Directory

Each run should get its own artifact directory:

- `simulation-toolset/reports/<yyyy-mm-dd>-<run-id>/`

At minimum, create these files:

- `summary.md`
- `commands.log`
- `suggested-changes.md`

Optional:

- `debug.log`
- `reports/` for JSON outputs
- `screens/` or `scratch/` only if the run absolutely needs them

### Step 2: Record the Run Intent

In `summary.md`, write:

- run id
- workspace path
- branch or worktree name
- target scenarios or suites
- why this run is being executed
- whether the run is verification-only or investigation-only

### Step 3: Run Existing Entry Points First

Prefer existing commands before inventing anything custom:

- `npm run type-check:simulation`
- `npm run test:simulation`
- targeted suites such as:
  - `npm run test:simulation -- simulation-toolset/tests/scripted-adapter.test.ts`
  - `npm run test:simulation -- simulation-toolset/tests/scenario-runner.test.ts`

If you need to re-check formal seams after a simulation finding, use the existing cross-boundary suite:

- `npm test -- src/authoring/persistence/__tests__/bridge.test.ts src/engine/__tests__/orchestrator.test.ts src/agents/gossipelog/__tests__/agent.test.ts src/app/play/runtime.test.ts`

### Step 4: Use Programmatic Batch Mode Carefully

The toolset currently exposes `runSimulationScenarioBatch(...)` programmatically.

Best practice:

- prefer repository-owned entry points when they exist
- do not add permanent source files just to launch a batch
- if a one-off harness is absolutely required, keep it inside the run artifact directory and delete it before finishing

### Step 5: Record Evidence, Not Just Conclusions

In `commands.log`, record:

- exact command
- start/end time
- exit code
- high-signal output summary

In `debug.log`, record only if useful:

- failing test names
- adapter trace excerpts
- report paths
- temp directory evidence
- cross-boundary verification evidence

## 5. Debug Discipline For Cloud Runs

Adapt the following rules from `systematic-debugging`.

### Phase 1: Root Cause First

Before proposing any fix:

- read the exact error output
- reproduce the issue consistently
- identify which boundary failed:
  - authoring bridge
  - runtime orchestrator
  - adapter simulation
  - sidecar observation
  - report persistence

Do not jump straight to a patch suggestion.

### Phase 2: Compare Against a Working Path

For any failing run, compare it against:

- a passing scenario
- a passing suite
- the expected trace shape

Do not infer root cause from a single broken log line.

### Phase 3: One Hypothesis At A Time

In `summary.md` or `debug.log`, record:

- hypothesis
- evidence supporting it
- what would disprove it

Do not bundle multiple unrelated causes into one suggestion.

### Phase 4: Suggestions, Not Code Changes

If the run reveals a product issue:

- write the recommendation in `suggested-changes.md`
- include file targets, rationale, and expected effect
- do not modify code as part of this cloud run workflow

The toolset run is for evidence generation and structured review, not direct code editing.

## 6. Suggested Change Format

Each suggested change should include:

- title
- affected files or modules
- observed symptom
- root-cause hypothesis
- minimal suggested change
- verification to run after implementation

Prefer small, testable suggestions over architecture-sized rewrites.

## 7. Cleanup Checklist

Before closing a run:

1. confirm scenario-owned cleanup has completed
2. inspect `src/story-packages/` for leftover `.tmp-simulation-*` directories
3. remove any temporary harness files created under the run directory
4. finalize `summary.md` with:
   - what passed
   - what failed
   - what remains uncertain
   - what should happen next

Important:

- cleanup happens only inside the isolated workspace
- do not perform destructive cleanup in a shared workspace

## 8. Known Current Constraints

- there is not yet a formal repository seam for package roots
- current formal loading still resolves from `src/story-packages/`
- batch mode is sequential, not concurrent orchestration
- `duplicate` and `out-of-order` remain structured simulation modes, not true callback scheduling

These are known boundaries, not reasons to improvise product changes during a run.

## 9. Future Compatibility Rule

As product work adds `Storage / Repository Substrate`, this guide should evolve toward:

- `package definition` vs `mutable state`
- `storylineId`, `checkpointId`, `sessionId`
- repository-backed targets instead of direct directory assumptions

Until that substrate exists, this guide should be treated as a disciplined transitional workflow rather than the final architecture.
