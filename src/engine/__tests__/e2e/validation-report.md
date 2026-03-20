# Phase 07 Validation Report

## Resolved During E2E

- `StateSnapshot.roundState.currentVolume` previously lagged one beat behind `sceneState.currentBeatIndexInPhase` after an accepted beat. The orchestrator now advances both together so the snapshot reflects the next active beat.

## Confirmed Drift

- `Memory Placeholder` currently truncates to the last 5 accepted history entries, while the spec prose describes the window as the last 5 accepted beats. The existing implementation and Phase 01 tests are entry-based, so the E2E suite asserts the implemented behavior and records the mismatch here instead of silently redefining it.
- Force-accept happens after the initial attempt plus 3 retries, which means `generate()` is called 4 times in the `fail-always` scenario. This matches the current `retryCount >= 3` resolver rule, even though some plan prose can be read as 3 total generate attempts.
