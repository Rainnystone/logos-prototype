---
phase: "07"
title: "End-to-End Validation"
branch: "phase/07-e2e-validation"
depends_on: ["06"]
spec_context_load:
  phase_0:
    - "LOGOS-SPEC/00_META/agent-guide.md"
    - "LOGOS-SPEC/00_META/system-map.md"
    - "LOGOS-SPEC/02_DOMAIN/glossary.md"
    - "LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md"
  phase_specific:
    - "LOGOS-SPEC/03_ORCHESTRATION/runtime-loop.md"
    - "LOGOS-SPEC/03_ORCHESTRATION/scene-phase-beat-lifecycle.md"
    - "LOGOS-SPEC/03_ORCHESTRATION/control-flow-and-decision-points.md"
    - "LOGOS-SPEC/06_FIXTURES/sample-scene/scene-overview.md"
    - "LOGOS-SPEC/06_FIXTURES/sample-scene/phase-plan.yaml"
    - "LOGOS-SPEC/06_FIXTURES/sample-scene/router-lexicon.yaml"
    - "LOGOS-SPEC/06_FIXTURES/sample-scene/audit-questions.yaml"
    - "LOGOS-SPEC/06_FIXTURES/sample-scene/state-snapshots.yaml"
    - "LOGOS-SPEC/04_MODULES/orchestrator-control-hub.md"
    - "LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml"
estimated_tokens:
  phase_0: 4500
  phase_specific: 17000
  total: 21500
---

# Phase 07: End-to-End Validation

## Objective

Run the complete LOGOS engine through the sample-scene story package, executing at least one full Phase (4 Beats) through the entire runtime loop. Verify state transitions, audit behavior, rewrite loop mechanics, and Phase-end collapse processing. This phase produces no new modules; it validates that all prior phases integrate correctly.

## Spec Context

| File | Tokens | Purpose |
|------|--------|---------|
| `00_META/agent-guide.md` | ~2,800 | Blocker protocol |
| `00_META/system-map.md` | ~1,000 | Architecture |
| `02_DOMAIN/glossary.md` | ~1,100 | Terminology |
| `05_CONTRACTS/module-dependency-map.md` | ~900 | Integration verification |
| `03_ORCHESTRATION/runtime-loop.md` | ~2,500 | Full loop spec |
| `03_ORCHESTRATION/scene-phase-beat-lifecycle.md` | ~1,500 | Lifecycle events |
| `03_ORCHESTRATION/control-flow-and-decision-points.md` | ~1,500 | Decision points |
| `06_FIXTURES/sample-scene/scene-overview.md` | ~800 | Scene definition |
| `06_FIXTURES/sample-scene/phase-plan.yaml` | ~500 | 6 PhasePlan objects |
| `06_FIXTURES/sample-scene/router-lexicon.yaml` | ~400 | Router profiles |
| `06_FIXTURES/sample-scene/audit-questions.yaml` | ~600 | Audit question set |
| `06_FIXTURES/sample-scene/state-snapshots.yaml` | ~400 | Expected state shapes |
| `04_MODULES/orchestrator-control-hub.md` | ~1,400 | Orchestrator spec |
| `05_CONTRACTS/state-snapshot-schema.yaml` | ~3,000 | StateSnapshot validation |

## Deliverables

1. **E2E test suite** (`src/engine/__tests__/e2e/`)
   - `full-phase-run.test.ts`: Run complete Phase 1 (4 Beats)
   - `audit-behavior.test.ts`: Verify audit pass, fail, rewrite, force-accept scenarios
   - `phase-end-processing.test.ts`: Verify settlement -> collapse chain
   - `state-transitions.test.ts`: Verify StateSnapshot correctness at each step

2. **Test helpers**:
   - Deterministic mock adapter that simulates realistic LLM responses
   - Player input sequences for automated testing
   - State assertion utilities

3. **Validation report**: Document any spec drift or integration issues discovered

## Dependencies

- All Phase 00-06 modules, fully integrated
- Sample scene story package
- Mock adapter (enhanced from Phase 02 mock to support all 4 modes)

## Acceptance Criteria

- [ ] Scene initializes with sample-scene story package (sceneId: "sample-yanshang-live-room")
- [ ] Initial Alpha/Beta boundaries are inferred from mainAxis + endLine
- [ ] Phase 1 starts with correct gradientType and volume sequence
- [ ] Beat 1: player input -> state collect -> route -> direct -> assemble -> generate -> audit -> accept
- [ ] Beat 2-4: same cycle, volume changes per gradient sequence
- [ ] History window grows correctly (1 beat after Beat 1, 2 after Beat 2, etc.)
- [ ] Audit pass scenario: Beat accepted, written to history
- [ ] Audit fail scenario: rewrite loop triggered, feedback generated
- [ ] Force accept scenario: after 3 retries, Beat force-accepted with warning
- [ ] Phase end: settlement produces phaseConsequences (1-6 items)
- [ ] Phase end: collapse produces new Alpha/Beta from consequences
- [ ] StateSnapshot after Phase 1: `currentPhaseIndex` = 2, new alpha/beta, phaseConsequences populated
- [ ] All state transitions produce new objects (immutability verified)
- [ ] No spec drift: all field names match contract schemas
