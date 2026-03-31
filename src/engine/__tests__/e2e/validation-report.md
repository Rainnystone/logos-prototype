# Phase 07 Validation Report

## Resolved During E2E

- `StateSnapshot.roundState.currentVolume` previously lagged one beat behind `sceneState.currentBeatIndexInPhase` after an accepted beat. The orchestrator now advances both together so the snapshot reflects the next active beat.

## Confirmed Drift

- `Memory Placeholder` now returns the full accepted history by default, while still allowing explicit window sizing for targeted cases. The E2E suite now asserts the full-history behavior instead of carrying the earlier five-entry cap.
- Force-accept happens after the initial attempt plus 3 retries, which means `generate()` is called 4 times in the `fail-always` scenario. This matches the current `retryCount >= 3` resolver rule, even though some plan prose can be read as 3 total generate attempts.
