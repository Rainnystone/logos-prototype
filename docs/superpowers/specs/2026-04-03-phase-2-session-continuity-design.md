# Phase 2 Session Continuity Design

Date: 2026-04-03
Status: Ready for implementation planning
Scope: `Phase 2: Session Continuity`

## 1. Goal

Phase 2 exists to make runtime progress durable and resumable without prematurely dragging in storyline management, package-management UI, or a new repository seam ahead of schedule.

This phase should make four things true:

1. Play progress no longer disappears when the user switches between `/play` and `/edit`.
2. Refreshing the page can restore the current active runtime session instead of silently starting over.
3. Every accepted beat becomes a formal checkpoint that later phases can branch from.
4. The Phase 2 substrate already matches the future `checkpoint -> storyline ref` direction, so Phase 3 can build on it instead of replacing it.

This spec is intentionally written in two halves:

1. object model and file contract
2. write, restore, and `Reset Workbench` semantics

They are equal in importance. The order is documentation order only, not a priority ranking.

## 2. What Phase 2 Includes

- Add a package-scoped runtime continuity file separate from the story definition.
- Persist one active runtime session per package in current product behavior.
- Create one full checkpoint for every accepted beat.
- Restore the active workbench state after page refresh.
- Keep play and edit pointed at the same active runtime session by default.
- Add an explicit `Reset Workbench` flow with stable semantics.
- Expose a section-safe continuity view so the character relationship area can start reading current runtime-derived relationship state.
- Preserve enough runtime truth for later checkpoint-driven continuation and branching.

## 3. What Phase 2 Explicitly Does Not Include

- No storyline creation, rename, archive, copy, delete, or switch UI.
- No author-facing checkpoint browser or diagnostics console.
- No human-readable checkpoint labels.
- No event-sourcing or delta replay substrate.
- No continuity state mixed into `StoryPackage`, `authoring-state.json`, or `agents/gossipelog/character-relationships.yaml`.
- No browser-only cache that pretends to be durable continuity.
- No query-param-based checkpoint/session override behavior in `/play` or `/edit`.

These stay out on purpose. Phase 2 is about substrate, not management UI.

## 4. Design Guardrails

### 4.1 Runtime State Is Not Story Definition

`StoryPackage` remains the authored canonical baseline.

Phase 2 continuity data is mutable system state:

- package-scoped
- runtime-owned
- server-mediated
- logically separate from authored content

That separation is mandatory because authored content and current runtime progress evolve on different timelines.

### 4.2 Checkpoints Must Serve Continuation First

Phase 2 checkpoints are not archive snapshots for display polish. They are continuation anchors.

That means a checkpoint must preserve enough truth to:

- restore the active runtime state after refresh
- continue generation from the current line
- later support “start again from an accepted checkpoint” behavior

### 4.3 Do Not Promote Derived Objects Into Truth

`PromptObject` and `BeatHistory` remain derived layers.

- `PromptObject` is rebuilt from runtime facts when needed.
- `BeatHistory` is re-derived for UI from stored checkpoints.

Phase 2 must not turn either into the persistence truth source.

### 4.4 Fit The Current Runtime Chain

The persistence model must align with the runtime chain that already exists:

`acceptedHistory -> historyWindow -> prompt assembler -> memory placeholder`

That is why accepted transcript is stored in full text and why `方案 A` uses full checkpoints instead of mixed delta/event storage.

## 5. Runtime File Contract

### 5.1 File Placement

Phase 2 adds one new package-local runtime state file:

- `src/story-packages/<packageName>/runtime-sessions.json`

Physical placement:

- it sits at the story package root
- next to `authoring-state.json`
- and next to the package-local `agents/` directory

Logical placement:

- it is not part of the `StoryPackage` definition
- it is not loaded through the YAML story-definition loader
- it is runtime-owned mutable state

### 5.2 Chosen Storage Strategy

Phase 2 formally adopts the previously discussed `方案 A`:

- one JSON file per package
- top-level `sessionsById`
- each session stores `checkpointsById`
- one full checkpoint per accepted beat

This is the recommended Phase 2 choice because it is:

- the most direct
- the easiest to verify
- the best fit for the current orchestrator and prompt-assembly flow
- the least likely to create hidden migration debt before Phase 3

### 5.3 Top-Level JSON Shape

`runtime-sessions.json` should use a versioned top-level object:

```json
{
  "version": 1,
  "activeSessionId": "sess_01hxyz...",
  "sessionsById": {
    "sess_01hxyz...": {
      "sessionId": "sess_01hxyz...",
      "createdAt": "2026-04-03T10:15:30.000Z",
      "updatedAt": "2026-04-03T10:18:42.000Z",
      "lifecycle": "in_progress",
      "headCheckpointId": "chk_01hxyz...",
      "activeCheckpointId": "chk_01hxyz...",
      "lastStableRelationshipLayer": {
        "highlightedDeltasText": "...",
        "stableBackgroundText": "..."
      },
      "orderedCheckpointIds": ["chk_01hxyza", "chk_01hxyzb"],
      "checkpointsById": {
        "chk_01hxyzb": {
          "checkpointId": "chk_01hxyzb",
          "acceptedBeatOrdinal": 2,
          "sceneId": "sample_scene",
          "phaseIndex": 1,
          "beatIndex": 2,
          "roundId": "sess_01hxyz...-round-0002",
          "acceptedTranscript": {
            "playerInput": "Player input full text",
            "beatText": "Accepted beat full text"
          },
          "stateSnapshot": {},
          "lastStableRelationshipLayer": {
            "highlightedDeltasText": "...",
            "stableBackgroundText": "..."
          },
          "createdAt": "2026-04-03T10:18:42.000Z"
        }
      }
    }
  }
}
```

`version` is required from the start so later seam work can migrate intentionally instead of guessing file shape.

## 6. Runtime Object Model

### 6.1 Package Repository

Phase 2 repository behavior is:

- schema-level plural
- behavior-level singular

Meaning:

- the file supports `sessionsById`
- the file tracks `activeSessionId`
- current product behavior still only recognizes one active session at a time

This keeps the storage honest about later growth without forcing Phase 3 UI into Phase 2.

### 6.2 Session Object

A session is the runtime container for one current working line.

Minimum session fields:

- `sessionId`
- `createdAt`
- `updatedAt`
- `lifecycle`
- `headCheckpointId`
- `activeCheckpointId`
- `lastStableRelationshipLayer`
- `orderedCheckpointIds`
- `checkpointsById`

`lifecycle` should distinguish at least:

- `awaiting_start`
- `in_progress`
- `complete`

This is needed because the current workbench has meaningful pre-start and scene-complete states that are not fully represented by `StateSnapshot` alone.

Current Phase 2 behavior:

- `headCheckpointId` and `activeCheckpointId` are normally the same
- both exist now so later checkpoint-driven continuation can move `activeCheckpointId` without redefining the session contract

### 6.3 Checkpoint Object

A checkpoint is anchored to one accepted beat event.

Minimum checkpoint fields:

- `checkpointId`
- `acceptedBeatOrdinal`
- `sceneId`
- `phaseIndex`
- `beatIndex`
- `roundId`
- `acceptedTranscript.playerInput`
- `acceptedTranscript.beatText`
- `stateSnapshot`
- `lastStableRelationshipLayer`
- `createdAt`

Checkpoint IDs must be:

- opaque
- stable
- package-scoped

Phase 2 stores checkpoint objects physically inside the current session record for the chosen single-file `方案 A`.

That storage convenience must not be mistaken for the long-term identity model:

- checkpoint identity is still package-scoped
- checkpoint IDs must stay independent from session-local UI order
- later storyline refs must point to checkpoint IDs, not to “the third row in one session list”

They must not encode:

- `storylineId`
- UI labels
- phase/beat text
- human-readable names

### 6.4 Checkpoint Semantics

One checkpoint is written per accepted beat, but the stored `stateSnapshot` represents the stable continuation state after that accepted beat has been incorporated.

This gives Phase 2 two useful properties at once:

- the checkpoint is clearly associated with one accepted beat event
- the active session can resume directly from the head checkpoint without rebuilding a partial runtime state machine in memory

The accepted beat position fields still record the accepted beat that produced this checkpoint:

- `phaseIndex`
- `beatIndex`
- `acceptedBeatOrdinal`

That keeps branching and checkpoint-driven recovery anchored to accepted beat identity even though the stored snapshot is continuation-ready.

There is one bounded Phase 2 exception to “write once and never touch it again”:

- the current head checkpoint may be finalized exactly once after the asynchronous post-accept gossipelog refresh settles
- that finalization only updates `lastStableRelationshipLayer`
- it does not change checkpoint identity, transcript, beat position, or `stateSnapshot`

This exception exists because the relationship layer needed for the next beat may settle slightly after the accepted beat has already been returned to the UI.

## 7. Relationship Layer Semantics

`gossipelog` is not synchronous inline state mutation inside accepted beat persistence.

It produces an asynchronous runtime layer that prepares the next beat.

Phase 2 therefore stores only one gossipelog continuity truth:

- `lastStableRelationshipLayer`

This field is required because restoring only `stateSnapshot + accepted transcript` is not enough to rebuild the next prompt faithfully.

Storage rule:

- each checkpoint stores the stable relationship layer that should be used when continuing from that checkpoint into the next beat
- the active session also keeps a mirrored session-level `lastStableRelationshipLayer` for active-head restoration
- during the short post-accept refresh window, the newly written head checkpoint may temporarily hold the pre-refresh stable layer
- once the refresh settles successfully, the head checkpoint and the session-level mirror must converge to the same settled `lastStableRelationshipLayer`

Important constraint:

- Phase 2 does not add refresh-status, pending-job, or retry-debug fields to the persisted model
- if a refresh fails or times out, the previously stable layer remains the truth

This keeps the persisted runtime model bounded and deterministic while still respecting gossipelog’s asynchronous role.

## 8. Write Semantics

### 8.1 Server-Mediated Writes Only

The browser must never write `runtime-sessions.json` directly.

All writes go through a deterministic server-side repository path, following the same controlled-local-write principle already used elsewhere in the app.

### 8.2 Session Bootstrap Write

When the workbench initializes for a package with no active runtime session, the system should create and persist a new active session in `awaiting_start` state.

Initial session properties:

- empty `orderedCheckpointIds`
- empty `checkpointsById`
- `headCheckpointId = null`
- `activeCheckpointId = null`
- `lastStableRelationshipLayer = empty relationship layer`

This gives Phase 2 a real runtime container even before the first accepted beat.

### 8.3 Accepted Beat Write

The primary Phase 2 write point is the accepted-beat commit path in play runtime.

Write timing:

- after the beat is accepted
- after the continuation-ready `StateSnapshot` is produced
- before the result is treated as durable continuity state

Accepted beat write behavior:

1. build one full checkpoint
2. append its ID to `orderedCheckpointIds`
3. upsert the checkpoint into `checkpointsById`
4. move `headCheckpointId` to that checkpoint
5. move `activeCheckpointId` to that checkpoint in current Phase 2 behavior
6. update session `lifecycle`
7. update session `updatedAt`

### 8.4 Post-Accept Relationship-Layer Write

When the post-accept gossipelog refresh resolves successfully, the active session’s session-level `lastStableRelationshipLayer` should be updated.

This is not a new checkpoint, but it does finalize the current head checkpoint’s continuation payload.

Required behavior:

1. update session-level `lastStableRelationshipLayer`
2. update the current head checkpoint `lastStableRelationshipLayer`
3. keep both values identical after the refresh settles

Writeback binding rule:

- a post-accept refresh result must be bound to the `sessionId` and checkpoint identity that started that refresh
- if that bound session and bound checkpoint still exist, the refresh result may finalize that bound checkpoint’s `lastStableRelationshipLayer` even when the session has already advanced to a newer head
- the session-level `lastStableRelationshipLayer` mirror may only be updated when the bound session is still the current active session and the bound checkpoint is still that session’s active/head checkpoint
- if `Reset Workbench` created a new active session, or the bound session/checkpoint no longer exists, the stale refresh result must not update the new active session’s continuity truth
- a stale refresh result must never overwrite the session-level mirror of a newer active session

If the refresh fails or times out:

- no extra checkpoint is written
- no checkpoint transcript or `stateSnapshot` is changed
- the previous stable relationship layer remains the persisted truth

### 8.5 Reset Write

`Reset Workbench` does not destroy history.

Its persistence behavior is:

1. create a brand-new session object
2. mark it as the new `activeSessionId`
3. leave old sessions untouched in `sessionsById`
4. start the new session in `awaiting_start`

This preserves recoverability and auditability without introducing archive UI in Phase 2.

## 9. Restore Semantics

### 9.1 `/play` Restore Rule

`/play` should always prefer the current package `activeSessionId` when continuity data exists.

Current Phase 2 does not introduce URL-level session or checkpoint override behavior.

Restore behavior:

- if there is no runtime file or no active session, bootstrap a new `awaiting_start` session
- if the active session has no checkpoints, show the opening-hook waiting state
- if the active session has an `activeCheckpointId`, hydrate the workbench from that checkpoint
- if the active session lifecycle is `complete`, restore the completed scene state instead of pretending a new round is available

Restore must also bring back the active session’s stable relationship layer, not just the checkpoint `stateSnapshot`.

### 9.2 Reconstructing Workbench UI State

From the active session, the workbench should reconstruct:

- `currentState` from the active checkpoint `stateSnapshot` when present
- `beatHistory` from ordered checkpoints
- `roundStarted` from whether the session has accepted checkpoints
- scene-complete status from session `lifecycle`
- the active relationship context from:
  1. session-level `lastStableRelationshipLayer`
  2. otherwise active checkpoint `lastStableRelationshipLayer`
  3. otherwise the empty relationship layer

Ephemeral UI-only fields such as transient diagnostics panels remain UI state and do not become persistence truth.

If session-level and active-checkpoint relationship layers ever disagree during restore, the session-level value wins because it represents the latest settled head-session continuation state.

### 9.3 `/edit` Restore Rule

`/edit` should also prefer the current active runtime session for continuity-aware displays.

It should not read `runtime-sessions.json` raw into the page.

Instead, edit loads a server-side section-safe continuity projection that can expose:

- whether an active session exists
- the current accepted progress position
- the current session lifecycle
- the current session-level `lastStableRelationshipLayer` or a reduced relationship view derived from it

If no active session or no usable relationship layer exists, the character relationship area remains a valid empty state.

## 10. `Reset Workbench` Product Semantics

`Reset Workbench` means:

- reset the current line
- return to the opening hook start point
- stop in the pre-`Start Round` waiting state

It does not mean:

- delete old sessions
- delete old checkpoints
- jump to an arbitrary checkpoint
- regenerate a past accepted beat immediately

Those later checkpoint-driven actions belong to future work on top of this substrate.

## 11. Error Handling

### 11.1 Missing Runtime File

Missing `runtime-sessions.json` is normal.

The system should treat it as “no continuity has been created yet,” not as an error.

### 11.2 Invalid Runtime File

An invalid `runtime-sessions.json` is not normal.

Phase 2 should not silently discard or overwrite it on read failure.

Recommended behavior:

- surface an explicit runtime continuity error
- block automatic restore
- avoid destructive fallback that would erase the only persisted progress record

### 11.3 Relationship Refresh Failure

Relationship refresh failure should not invalidate the active session.

The active session continues with the most recent stable relationship layer already persisted.

## 12. Testing And Verification Expectations

### 12.1 Repository-Level Tests

- read missing runtime file as empty continuity state
- reject invalid runtime file shape
- create bootstrap session correctly
- append accepted-beat checkpoints in order
- preserve old sessions on reset
- update session-level `lastStableRelationshipLayer` without creating extra checkpoints
- converge session-level and target head-checkpoint `lastStableRelationshipLayer` after refresh finalization
- discard stale refresh writes that target an older session or older head checkpoint
- allow a bound older checkpoint to finalize by `sessionId + checkpointId` without mutating the session-level mirror of a newer active session

### 12.2 Runtime Integration Tests

- accepted beat creates exactly one full checkpoint
- refresh after accepted beats restores state and beat history
- switching `/play` -> `/edit` -> `/play` preserves the active session
- reset creates a new active session and returns to waiting state
- completed scene restores as completed
- post-accept refresh finalizes the intended head checkpoint instead of whichever session is currently active at resolve time
- reset or head advancement prevents older refresh results from polluting the current active session
- when a session has already advanced, an older bound checkpoint may still finish its own `lastStableRelationshipLayer` finalization without changing the current active-session mirror

### 12.3 Edit Integration Tests

- character relationship area remains empty when there is no active continuity state
- character relationship area renders continuity-backed data when an active session exists
- edit page does not consume raw runtime file data directly

### 12.4 Manual Verification

Before implementation is called complete, verify with a real package flow:

1. run the opening hook and at least two accepted beats
2. refresh `/play` and confirm state restores
3. move to `/edit` and confirm continuity-backed relationship display behaves correctly
4. return to `/play` and confirm the same active session continues
5. hit `Reset Workbench` and confirm:
   - a new active session exists
   - old history is retained
   - the workbench stops at the pre-start waiting state

## 13. Transition To Phase 3

Phase 2 intentionally stops at checkpoint-capable continuity.

Phase 3 should build on this by introducing:

- a repository seam that formalizes mutable package state
- storyline refs that point to checkpoints
- storyline management UI

Phase 2 should therefore be judged successful when:

- checkpoints are already formal nodes
- session continuity is already durable
- each accepted beat checkpoint carries the stable relationship layer needed for continuation from that checkpoint
- later storyline work can point at checkpoint IDs instead of inventing a second history model
