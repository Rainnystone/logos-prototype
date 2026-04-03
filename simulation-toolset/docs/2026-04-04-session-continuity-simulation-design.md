# Session Continuity Simulation Design

Date: 2026-04-04
Status: Ready for implementation
Scope: Phase 5 - Session Continuity + Edit Continuity Simulation

## 1. Goal

Extend `simulation-toolset` to cover Phase 2 runtime session continuity capabilities, enabling structured regression of checkpoint persistence, session restore/reset, stale refresh protection, and edit continuity view.

## 2. Background

Phase 2 introduced `runtime-sessions.json` as a package-scoped continuity substrate. The current simulation-toolset does not cover these capabilities:

- Checkpoint persistence after accepted beats
- Session restore after page refresh
- Reset workbench semantics
- Stale refresh protection
- Relationship layer finalization binding
- Edit continuity view (bounded projection for CharacterSection)

## 3. Scope

### In Scope

| ID | Scenario | Description |
|----|----------|-------------|
| S1 | Checkpoint Persistence | Accepted beat creates checkpoint in `runtime-sessions.json` |
| S2 | Session Restore | Page refresh restores state, history, relationship from active session |
| S3 | Reset Workbench | Reset creates new session, old sessions preserved, returns to `awaiting_start` |
| S4 | Stale Refresh Protection | Old refresh results do not pollute new session after reset/head advancement |
| S5 | Relationship Finalization | Gossipelog refresh correctly finalizes to bound sessionId/checkpointId |
| S6 | Edit Continuity View | CharacterSection shows bounded continuity, does not expose raw checkpoints |

### Out of Scope

- Repository seam migration (future work)
- Browser automation
- Storyline management UI
- Multi-package concurrency

## 4. Architecture

### 4.1 New Modules

| Module | Responsibility |
|--------|---------------|
| `session-observer.ts` | Observe `runtime-sessions.json` reads/writes, provide structured trace |
| `session-simulator.ts` | Coordinate restore/reset flows, verify lifecycle semantics |
| `edit-continuity-observer.ts` | Observe edit page continuity view, verify bounded projection |

### 4.2 Integration with Existing Modules

```
PlayerSimulator ──┐
                  ├──▶ Scenario (coordinates)
SessionObserver ──┤
                  │
SessionSimulator ─┤
                  │
GossipelogObserver┤
                  │
EditContinuityObserver ─┘
```

- `SessionObserver` calls `runtime-sessions/repository.ts` (formal seam)
- `SessionSimulator` coordinates `SessionObserver` + `PlayerSimulator`
- `EditContinuityObserver` uses `loadEditRuntimeContinuityView()` from `runtime-sessions/views.ts`

### 4.3 Contracts Extension

Add to `contracts.ts`:

- `SimulationSessionTrace` - session lifecycle observation
- `SimulationCheckpointTrace` - checkpoint details
- `SimulationEditContinuityTrace` - edit continuity view observation

## 5. Module Specifications

### 5.1 SessionObserver

**Purpose:** Observe runtime-sessions.json state changes without directly modifying product code.

**Inputs:**
- `packageName: string`

**Outputs:**
- `SessionObservation` with sessionId, lifecycle, checkpoint count, active checkpoint, relationship layer
- `CheckpointObservation` with checkpoint details (beat ordinal, state snapshot summary, transcript summary)
- `SessionObserverTrace` for report inclusion

**Behavior:**
- `readSession()` returns current active session state or null if no session exists
- `readCheckpoint(checkpointId)` returns specific checkpoint details
- `getTrace()` accumulates all observations made during scenario

### 5.2 SessionSimulator

**Purpose:** Coordinate session lifecycle operations (restore/reset) and verify semantics.

**Inputs:**
- `packageName: string`
- `sessionObserver: SessionObserver`
- `playerSimulator: PlayerSimulator` (optional, for coordinated runs)

**Outputs:**
- `RestoreResult` with success status, restored state summary, failure reason if applicable
- `ResetResult` with new sessionId, old sessionId preservation status
- `StaleRefreshCheckResult` with protection verification outcome

**Behavior:**
- `attemptRestore()` triggers restore flow and verifies state recovery
- `reset()` calls runtime-session route to reset, verifies new session creation
- `verifyStaleRefreshProtection()` simulates stale refresh scenario, verifies isolation

### 5.3 EditContinuityObserver

**Purpose:** Verify edit page receives bounded continuity view without raw checkpoint exposure.

**Inputs:**
- `packageName: string`

**Outputs:**
- `EditContinuityObservation` with view kind, relationship summary, checkpoint count (not content)
- Verification that raw `checkpointsById` is not exposed

**Behavior:**
- Calls `loadEditRuntimeContinuityView()` with package name
- Returns bounded view summary
- Asserts no raw checkpoint data in returned view

## 6. Scenario Specifications

### 6.1 S1: Checkpoint Persistence

**Flow:**
1. Create temp package
2. Run PlayerSimulator to accept a beat
3. Use SessionObserver to read session
4. Verify checkpoint exists with correct beat ordinal, phase/beat index, transcript

**Assertions:**
- Checkpoint count increased by 1
- Checkpoint has correct acceptedBeatOrdinal
- Checkpoint has stateSnapshot
- Session lifecycle is `in_progress`

### 6.2 S2: Session Restore

**Flow:**
1. Create temp package with existing accepted beats (>= 2)
2. Record current state: beat history, state snapshot, relationship layer
3. Use SessionSimulator.attemptRestore()
4. Verify restored state matches recorded state

**Assertions:**
- Restore succeeds
- Beat history matches
- State snapshot matches
- Relationship layer matches
- activeCheckpointId points to latest checkpoint

### 6.3 S3: Reset Workbench

**Flow:**
1. Create temp package with active session (in_progress)
2. Record old sessionId
3. Use SessionSimulator.reset()
4. Verify new session behavior

**Assertions:**
- New sessionId is different from old
- Old session still exists in sessionsById
- New session lifecycle is `awaiting_start`
- New session has no checkpoints

### 6.4 S4: Stale Refresh Protection

**Flow:**
1. Create temp package with active session
2. Accept beat, trigger gossipelog refresh (simulated)
3. Before refresh completes, execute reset
4. Complete the pending refresh
5. Verify refresh result does not update new session

**Assertions:**
- New session's relationship layer is not affected by stale refresh
- Old session's checkpoint may be finalized (allowed)
- sessionId/checkpointId binding is respected

### 6.5 S5: Relationship Finalization

**Flow:**
1. Create temp package with active session
2. Accept beat, observe gossipelog cycle
3. Verify finalization targets correct sessionId and checkpointId
4. Verify session-level and checkpoint-level relationship layers converge

**Assertions:**
- Finalization targets current active session
- Finalization targets head checkpoint
- Session-level and checkpoint-level layers match after finalization

### 6.6 S6: Edit Continuity View

**Flow:**
1. Create temp package with active session and relationship layer
2. Use EditContinuityObserver to load continuity view
3. Verify view structure

**Assertions:**
- View kind is `active` (not `empty` or `unavailable`)
- Relationship summary is present
- `checkpointsById` is NOT present in the view
- Raw transcript is NOT present in the view

## 7. Test Coverage

| Test File | Coverage |
|-----------|----------|
| `tests/session-observer.test.ts` | SessionObserver read operations |
| `tests/session-simulator.test.ts` | Restore/reset/stale refresh flows |
| `tests/edit-continuity-observer.test.ts` | Edit continuity bounded view |
| `tests/session-checkpoint-persistence-scenario.test.ts` | S1 scenario |
| `tests/session-restore-scenario.test.ts` | S2 scenario |
| `tests/session-reset-scenario.test.ts` | S3 scenario |
| `tests/stale-refresh-protection-scenario.test.ts` | S4 scenario |
| `tests/relationship-finalization-scenario.test.ts` | S5 scenario |
| `tests/edit-continuity-view-scenario.test.ts` | S6 scenario |

## 8. File Map

### Create

- `simulation-toolset/src/session-observer.ts`
- `simulation-toolset/src/session-simulator.ts`
- `simulation-toolset/src/edit-continuity-observer.ts`
- `simulation-toolset/scenarios/session-checkpoint-persistence.ts`
- `simulation-toolset/scenarios/session-restore.ts`
- `simulation-toolset/scenarios/session-reset.ts`
- `simulation-toolset/scenarios/stale-refresh-protection.ts`
- `simulation-toolset/scenarios/relationship-finalization.ts`
- `simulation-toolset/scenarios/edit-continuity-view.ts`
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

- `simulation-toolset/src/contracts.ts` - Add session/edit continuity trace schemas
- `simulation-toolset/src/scenario-manifest.ts` - Add new scenario entries
- `simulation-toolset/README.md` - Update current capabilities

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Stale refresh simulation complexity | Use ScriptedAdapter with controlled delay/timing |
| Session state timing | Ensure writes complete before observation |
| Temp package cleanup | Use existing fixture cleanup pattern |

## 10. Success Criteria

- All 6 scenario tests pass
- `npm run test:simulation` passes with new tests
- Cross-boundary regression (`npm test -- src/runtime-sessions/`) passes
- No modification to product runtime code