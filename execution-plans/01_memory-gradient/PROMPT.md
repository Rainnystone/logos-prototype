---
phase: '01'
title: 'Memory Placeholder + Phase Gradient'
branch: 'phase/01-memory-gradient'
depends_on: ['00']
spec_context_load:
  phase_0:
    - 'LOGOS-SPEC/00_META/agent-guide.md'
    - 'LOGOS-SPEC/00_META/system-map.md'
    - 'LOGOS-SPEC/02_DOMAIN/glossary.md'
    - 'LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md'
  phase_specific:
    - 'LOGOS-SPEC/04_MODULES/memory-placeholder.md'
    - 'LOGOS-SPEC/04_MODULES/phase-gradient.md'
    - 'LOGOS-SPEC/02_DOMAIN/control-primitives.md'
    - 'LOGOS-SPEC/02_DOMAIN/state-model.md'
    - 'LOGOS-SPEC/03_ORCHESTRATION/scene-phase-beat-lifecycle.md'
    - 'LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/phase-plan-schema.yaml'
estimated_tokens:
  phase_0: 4500
  phase_specific: 12500
  total: 17000
---

# Phase 01: Memory Placeholder + Phase Gradient

## Objective

Implement the two modules with no upstream module dependencies: Memory Placeholder (5-beat sliding window over accepted history) and Phase Gradient (gradient type to volume sequence mapping). These are the foundational control signal providers that all downstream modules consume. This phase may execute in parallel with Phase 02.

## Spec Context

| File                                             | Tokens | Purpose                                                  |
| ------------------------------------------------ | ------ | -------------------------------------------------------- |
| `00_META/agent-guide.md`                         | ~2,800 | Session workflow, blocker protocol                       |
| `00_META/system-map.md`                          | ~1,000 | Architecture overview                                    |
| `02_DOMAIN/glossary.md`                          | ~1,100 | Terms: Beat, Phase, Volume, Gradient, History Window     |
| `05_CONTRACTS/module-dependency-map.md`          | ~900   | Memory/Gradient dependency constraints                   |
| `04_MODULES/memory-placeholder.md`               | ~1,100 | Memory module spec: 5-beat window, accepted history only |
| `04_MODULES/phase-gradient.md`                   | ~1,500 | Gradient spec: 7 types, 4-beat sequences                 |
| `02_DOMAIN/control-primitives.md`                | ~2,000 | Volume (Low/Med/High), gradient mappings table           |
| `02_DOMAIN/state-model.md`                       | ~1,400 | historyWindow, currentVolume, state update rules         |
| `03_ORCHESTRATION/scene-phase-beat-lifecycle.md` | ~1,500 | Phase lifecycle: enter, advance, end                     |
| `05_CONTRACTS/state-snapshot-schema.yaml`        | ~3,000 | HistoryEntry structure, roundState.historyWindow         |
| `05_CONTRACTS/phase-plan-schema.yaml`            | ~1,100 | PhasePlan.gradientType enum, beatCount const 4           |

## Deliverables

1. **Memory Placeholder module** (`src/engine/modules/memory-placeholder.ts`)
   - Exports: `getHistoryWindow(acceptedHistory: readonly HistoryEntry[], windowSize?: number): readonly HistoryEntry[]`
   - Default window size: 5 beats
   - Returns full history when fewer than 5 beats exist
   - Never includes unaccepted/failed drafts
   - Output field name: `precedingBeats` (per orchestrator-input-output.md)

2. **Phase Gradient module** (`src/engine/modules/phase-gradient.ts`)
   - Exports: `buildVolumeSequence(gradientType: GradientType): readonly Volume[]`
   - Exports: `getCurrentVolume(gradientType: GradientType, beatIndex: number): Volume`
   - Maps all 7 gradient types to 4-element volume sequences
   - `beatIndex` is 0-based within the Phase (0-3)

3. **Unit tests** with >= 80% coverage for both modules

## Dependencies

- Phase 00 types: `HistoryEntry`, `Volume`, `GradientType`, `PhasePlan`
- Phase 00 project scaffold: Vitest, ESLint, Prettier

## Acceptance Criteria

- [ ] `getHistoryWindow` returns last 5 entries from accepted history
- [ ] `getHistoryWindow` returns all entries when history has fewer than 5 beats
- [ ] `getHistoryWindow` returns empty array when history is empty
- [ ] `getHistoryWindow` never mutates the input array
- [ ] `buildVolumeSequence("Rising")` returns `["Low", "Med", "Med", "High"]`
- [ ] `buildVolumeSequence("Falling")` returns `["High", "Med", "Med", "Low"]`
- [ ] `buildVolumeSequence("Static High")` returns `["High", "High", "High", "High"]`
- [ ] `buildVolumeSequence("U-Shape")` returns `["High", "Low", "Low", "High"]`
- [ ] `buildVolumeSequence("Arch")` returns `["Low", "High", "High", "Low"]`
- [ ] `buildVolumeSequence("Pulse")` returns `["High", "Low", "High", "Low"]`
- [ ] `buildVolumeSequence("Steady")` returns `["Med", "Med", "Med", "Med"]`
- [ ] `getCurrentVolume` throws on invalid beatIndex (< 0 or > 3)
- [ ] All tests pass, coverage >= 80%
- [ ] No hardcoded narrative content in module code
