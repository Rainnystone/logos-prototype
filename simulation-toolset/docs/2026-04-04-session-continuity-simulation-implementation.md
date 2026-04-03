# Session Continuity Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend simulation-toolset to cover Phase 2 runtime session continuity capabilities with 6 new scenarios.

**Architecture:** Add 3 new observer modules (SessionObserver, SessionSimulator, EditContinuityObserver) that consume formal seams from `runtime-sessions/`, then create 6 scenario files covering checkpoint persistence, restore, reset, stale refresh protection, relationship finalization, and edit continuity view.

**Tech Stack:** TypeScript, Zod, Vitest, existing simulation-toolset patterns

---

## File Map

### Create: Core Modules
- `simulation-toolset/src/session-observer.ts`
- `simulation-toolset/src/session-simulator.ts`
- `simulation-toolset/src/edit-continuity-observer.ts`

### Create: Scenarios
- `simulation-toolset/scenarios/session-checkpoint-persistence.ts`
- `simulation-toolset/scenarios/session-restore.ts`
- `simulation-toolset/scenarios/session-reset.ts`
- `simulation-toolset/scenarios/stale-refresh-protection.ts`
- `simulation-toolset/scenarios/relationship-finalization.ts`
- `simulation-toolset/scenarios/edit-continuity-view.ts`

### Create: Tests
- `simulation-toolset/tests/session-observer.test.ts`
- `simulation-toolset/tests/session-simulator.test.ts`
- `simulation-toolset/tests/edit-continuity-observer.test.ts`
- `simulation-toolset/tests/session-checkpoint-persistence-scenario.test.ts`
- `simulation-toolset/tests/session-restore-scenario.test.ts`
- `simulation-toolset/tests/session-reset-scenario.test.ts`
- `simulation-toolset/tests/stale-refresh-protection-scenario.test.ts`
- `simulation-toolset/tests/relationship-finalization-scenario.test.ts`
- `simulation-toolset/tests/edit-continuity-view-scenario.test.ts`

### Modify
- `simulation-toolset/src/contracts.ts`
- `simulation-toolset/src/scenario-manifest.ts`
- `simulation-toolset/README.md`

---

## Task 1: Add session continuity trace contracts

**Files:**
- Modify: `simulation-toolset/src/contracts.ts`
- Test: `simulation-toolset/tests/session-observer.test.ts` (will use these types)

- [ ] **Step 1: Write the failing test for contract schema validation**

Run: `npm run test:simulation -- simulation-toolset/tests/session-observer.test.ts`
Expected: FAIL - test file does not exist yet

- [ ] **Step 2: Add SimulationSessionTraceSchema to contracts.ts**

Add to `contracts.ts`:
- `SimulationSessionTraceSchema` with sessionId, lifecycle, checkpointCount, activeCheckpointId, relationshipSource
- `SimulationCheckpointTraceSchema` with checkpointId, acceptedBeatOrdinal, phaseIndex, beatIndex, hasTranscript, hasStateSnapshot
- `SimulationEditContinuityTraceSchema` with kind, hasActiveSession, relationshipSummary, exposesRawCheckpoints

- [ ] **Step 3: Run type-check to verify schemas compile**

Run: `npm run type-check:simulation`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/src/contracts.ts
git commit -m "feat(simulation): add session continuity trace contracts"
```

---

## Task 2: Implement SessionObserver

**Files:**
- Create: `simulation-toolset/src/session-observer.ts`
- Test: `simulation-toolset/tests/session-observer.test.ts`

- [ ] **Step 1: Write the failing SessionObserver tests**

Tests should cover:
- `readSession()` returns null when no runtime-sessions.json exists
- `readSession()` returns session observation when file exists
- `readCheckpoint()` returns checkpoint details
- `getTrace()` accumulates observations

Run: `npm run test:simulation -- simulation-toolset/tests/session-observer.test.ts`
Expected: FAIL - module does not exist

- [ ] **Step 2: Implement SessionObserver**

Implementation should:
- Import `readFile` from `runtime-sessions/repository.ts`
- Provide `readSession()` that returns `SessionObservation | null`
- Provide `readCheckpoint(checkpointId)` that returns `CheckpointObservation | null`
- Provide `getTrace()` that returns accumulated observations
- Handle missing file gracefully (return null, not throw)

- [ ] **Step 3: Run tests to verify GREEN**

Run: `npm run test:simulation -- simulation-toolset/tests/session-observer.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/src/session-observer.ts simulation-toolset/tests/session-observer.test.ts
git commit -m "feat(simulation): add SessionObserver module"
```

---

## Task 3: Implement SessionSimulator

**Files:**
- Create: `simulation-toolset/src/session-simulator.ts`
- Test: `simulation-toolset/tests/session-simulator.test.ts`

- [ ] **Step 1: Write the failing SessionSimulator tests**

Tests should cover:
- `attemptRestore()` returns restore result with session state
- `reset()` creates new session and preserves old session
- `verifyStaleRefreshProtection()` verifies isolation

Run: `npm run test:simulation -- simulation-toolset/tests/session-simulator.test.ts`
Expected: FAIL - module does not exist

- [ ] **Step 2: Implement SessionSimulator**

Implementation should:
- Use SessionObserver for reading session state
- Use `runtime-sessions/repository.ts` for reset operation (or call API route)
- Provide `attemptRestore()` that reads current session and returns restore result
- Provide `reset()` that triggers reset and verifies new session creation
- Provide `verifyStaleRefreshProtection()` helper for S4 scenario

- [ ] **Step 3: Run tests to verify GREEN**

Run: `npm run test:simulation -- simulation-toolset/tests/session-simulator.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/src/session-simulator.ts simulation-toolset/tests/session-simulator.test.ts
git commit -m "feat(simulation): add SessionSimulator module"
```

---

## Task 4: Implement EditContinuityObserver

**Files:**
- Create: `simulation-toolset/src/edit-continuity-observer.ts`
- Test: `simulation-toolset/tests/edit-continuity-observer.test.ts`

- [ ] **Step 1: Write the failing EditContinuityObserver tests**

Tests should cover:
- Returns bounded view for package with active session
- Returns empty view for package without session
- Verifies raw checkpoints are not exposed

Run: `npm run test:simulation -- simulation-toolset/tests/edit-continuity-observer.test.ts`
Expected: FAIL - module does not exist

- [ ] **Step 2: Implement EditContinuityObserver**

Implementation should:
- Import `loadEditRuntimeContinuityView` from `runtime-sessions/views.ts`
- Provide `observe()` that returns `EditContinuityObservation`
- Check that returned view does NOT contain `checkpointsById`
- Check that returned view does NOT contain raw transcript

- [ ] **Step 3: Run tests to verify GREEN**

Run: `npm run test:simulation -- simulation-toolset/tests/edit-continuity-observer.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/src/edit-continuity-observer.ts simulation-toolset/tests/edit-continuity-observer.test.ts
git commit -m "feat(simulation): add EditContinuityObserver module"
```

---

## Task 5: Add S1 scenario - Checkpoint Persistence

**Files:**
- Create: `simulation-toolset/scenarios/session-checkpoint-persistence.ts`
- Test: `simulation-toolset/tests/session-checkpoint-persistence-scenario.test.ts`

- [ ] **Step 1: Write the failing scenario test**

Test should verify:
- After accepted beat, checkpoint is created
- Checkpoint has correct beat ordinal
- Checkpoint has state snapshot
- Session lifecycle is `in_progress`

Run: `npm run test:simulation -- simulation-toolset/tests/session-checkpoint-persistence-scenario.test.ts`
Expected: FAIL - scenario does not exist

- [ ] **Step 2: Implement the scenario**

Implementation should:
- Use `createTempStoryPackage` for isolation
- Use `PlayerSimulator` with `ScriptedAdapter` to accept a beat
- Use `SessionObserver` to read session after beat
- Record assertions: checkpoint exists, ordinal correct, lifecycle correct
- Clean up temp package

- [ ] **Step 3: Run test to verify GREEN**

Run: `npm run test:simulation -- simulation-toolset/tests/session-checkpoint-persistence-scenario.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/scenarios/session-checkpoint-persistence.ts simulation-toolset/tests/session-checkpoint-persistence-scenario.test.ts
git commit -m "feat(simulation): add S1 checkpoint persistence scenario"
```

---

## Task 6: Add S2 scenario - Session Restore

**Files:**
- Create: `simulation-toolset/scenarios/session-restore.ts`
- Test: `simulation-toolset/tests/session-restore-scenario.test.ts`

- [ ] **Step 1: Write the failing scenario test**

Test should verify:
- After multiple accepted beats, session state is recorded
- Restore returns matching state
- Beat history is preserved
- Relationship layer is preserved

Run: `npm run test:simulation -- simulation-toolset/tests/session-restore-scenario.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement the scenario**

Implementation should:
- Accept 2-3 beats to create history
- Record beat history and state snapshot
- Use `SessionSimulator.attemptRestore()`
- Verify restored state matches recorded state

- [ ] **Step 3: Run test to verify GREEN**

Run: `npm run test:simulation -- simulation-toolset/tests/session-restore-scenario.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/scenarios/session-restore.ts simulation-toolset/tests/session-restore-scenario.test.ts
git commit -m "feat(simulation): add S2 session restore scenario"
```

---

## Task 7: Add S3 scenario - Session Reset

**Files:**
- Create: `simulation-toolset/scenarios/session-reset.ts`
- Test: `simulation-toolset/tests/session-reset-scenario.test.ts`

- [ ] **Step 1: Write the failing scenario test**

Test should verify:
- Reset creates new session with different ID
- Old session is preserved in sessionsById
- New session has `awaiting_start` lifecycle
- New session has no checkpoints

Run: `npm run test:simulation -- simulation-toolset/tests/session-reset-scenario.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement the scenario**

Implementation should:
- Create active session with accepted beats
- Record old sessionId
- Use `SessionSimulator.reset()`
- Verify new session behavior and old session preservation

- [ ] **Step 3: Run test to verify GREEN**

Run: `npm run test:simulation -- simulation-toolset/tests/session-reset-scenario.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/scenarios/session-reset.ts simulation-toolset/tests/session-reset-scenario.test.ts
git commit -m "feat(simulation): add S3 session reset scenario"
```

---

## Task 8: Add S4 scenario - Stale Refresh Protection

**Files:**
- Create: `simulation-toolset/scenarios/stale-refresh-protection.ts`
- Test: `simulation-toolset/tests/stale-refresh-protection-scenario.test.ts`

- [ ] **Step 1: Write the failing scenario test**

Test should verify:
- Pending gossipelog refresh can be simulated
- Reset during pending refresh
- Completed refresh does not update new session
- Old session checkpoint may be finalized (allowed)

Run: `npm run test:simulation -- simulation-toolset/tests/stale-refresh-protection-scenario.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement the scenario**

Implementation should:
- Use `ScriptedAdapter` with delayed gossipelogUpdate
- Trigger beat acceptance and gossipelog refresh
- Execute reset before refresh completes
- Allow refresh to complete
- Verify new session is not affected

- [ ] **Step 3: Run test to verify GREEN**

Run: `npm run test:simulation -- simulation-toolset/tests/stale-refresh-protection-scenario.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/scenarios/stale-refresh-protection.ts simulation-toolset/tests/stale-refresh-protection-scenario.test.ts
git commit -m "feat(simulation): add S4 stale refresh protection scenario"
```

---

## Task 9: Add S5 scenario - Relationship Finalization

**Files:**
- Create: `simulation-toolset/scenarios/relationship-finalization.ts`
- Test: `simulation-toolset/tests/relationship-finalization-scenario.test.ts`

- [ ] **Step 1: Write the failing scenario test**

Test should verify:
- Gossipelog cycle targets correct sessionId
- Gossipelog cycle targets correct checkpointId
- Session-level and checkpoint-level layers converge after finalization

Run: `npm run test:simulation -- simulation-toolset/tests/relationship-finalization-scenario.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement the scenario**

Implementation should:
- Accept beat with gossipelog cycle
- Use `GossipelogObserver` to capture cycle result
- Use `SessionObserver` to read session and checkpoint layers
- Verify binding and convergence

- [ ] **Step 3: Run test to verify GREEN**

Run: `npm run test:simulation -- simulation-toolset/tests/relationship-finalization-scenario.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/scenarios/relationship-finalization.ts simulation-toolset/tests/relationship-finalization-scenario.test.ts
git commit -m "feat(simulation): add S5 relationship finalization scenario"
```

---

## Task 10: Add S6 scenario - Edit Continuity View

**Files:**
- Create: `simulation-toolset/scenarios/edit-continuity-view.ts`
- Test: `simulation-toolset/tests/edit-continuity-view-scenario.test.ts`

- [ ] **Step 1: Write the failing scenario test**

Test should verify:
- View kind is `active` when session exists
- Relationship summary is present
- Raw `checkpointsById` is NOT exposed
- Raw transcript is NOT exposed

Run: `npm run test:simulation -- simulation-toolset/tests/edit-continuity-view-scenario.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement the scenario**

Implementation should:
- Create package with active session and relationship layer
- Use `EditContinuityObserver` to load view
- Record assertions about bounded projection

- [ ] **Step 3: Run test to verify GREEN**

Run: `npm run test:simulation -- simulation-toolset/tests/edit-continuity-view-scenario.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/scenarios/edit-continuity-view.ts simulation-toolset/tests/edit-continuity-view-scenario.test.ts
git commit -m "feat(simulation): add S6 edit continuity view scenario"
```

---

## Task 11: Update scenario manifest and README

**Files:**
- Modify: `simulation-toolset/src/scenario-manifest.ts`
- Modify: `simulation-toolset/README.md`

- [ ] **Step 1: Add new scenario entries to manifest**

Add entries for all 6 new scenarios with titles and tags.

- [ ] **Step 2: Update README current capabilities**

Add session continuity capabilities to the capabilities list.

- [ ] **Step 3: Run full simulation test suite**

Run: `npm run test:simulation`
Expected: PASS with all new tests

- [ ] **Step 4: Commit**

```bash
git add simulation-toolset/src/scenario-manifest.ts simulation-toolset/README.md
git commit -m "docs(simulation): update manifest and README for session continuity"
```

---

## Task 12: Final verification

**Files:**
- No new files

- [ ] **Step 1: Run full simulation suite**

Run: `npm run test:simulation`
Expected: PASS

- [ ] **Step 2: Run cross-boundary regression**

Run: `npm test -- src/runtime-sessions/__tests__/ src/agents/gossipelog/__tests__/ src/app/play/runtime.test.ts`
Expected: PASS

- [ ] **Step 3: Run type-check**

Run: `npm run type-check:simulation`
Expected: PASS

- [ ] **Step 4: Update progress.md**

Record completion in `simulation-toolset/docs/progress.md`

- [ ] **Step 5: Final commit**

```bash
git add simulation-toolset/docs/progress.md
git commit -m "docs(simulation): complete phase 5 session continuity simulation"
```

---

## Notes For Execution

- Follow TDD strictly: RED → GREEN for each task
- Use `createTempStoryPackage` for isolation in all scenarios
- Clean up temp packages in `finally` blocks
- All scenarios should be story-agnostic
- Do not modify product runtime code