---
phase: '02'
title: 'Light Cone Collapse + Narrative Router'
branch: 'phase/02-collapse-router'
depends_on: ['00']
spec_context_load:
  phase_0:
    - 'LOGOS-SPEC/00_META/agent-guide.md'
    - 'LOGOS-SPEC/00_META/system-map.md'
    - 'LOGOS-SPEC/02_DOMAIN/glossary.md'
    - 'LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md'
  phase_specific:
    - 'LOGOS-SPEC/04_MODULES/light-cone-collapse.md'
    - 'LOGOS-SPEC/04_MODULES/narrative-router.md'
    - 'LOGOS-SPEC/02_DOMAIN/control-primitives.md'
    - 'LOGOS-SPEC/02_DOMAIN/state-model.md'
    - 'LOGOS-SPEC/05_CONTRACTS/collapse-packet-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/phase-consequence-packet-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml'
    - 'LOGOS-SPEC/03_ORCHESTRATION/scene-phase-beat-lifecycle.md'
    - 'LOGOS-SPEC/06_FIXTURES/sample-scene/router-lexicon.yaml'
estimated_tokens:
  phase_0: 4500
  phase_specific: 16000
  total: 20500
---

# Phase 02: Light Cone Collapse + Narrative Router

## Objective

Implement the two domain-dependent control modules: Light Cone Collapse (Alpha/Beta boundary inference at Scene init and Phase-end re-inference) and Narrative Router (scene-based verb lexicon selection). This phase may execute in parallel with Phase 01. Note: Light Cone Collapse involves LLM calls for boundary inference, which will use a mock/stub API adapter until Phase 05 provides the real implementation.

## Spec Context

| File                                                | Tokens | Purpose                                                                 |
| --------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `00_META/agent-guide.md`                            | ~2,800 | Blocker protocol, conflict resolution                                   |
| `00_META/system-map.md`                             | ~1,000 | Architecture overview                                                   |
| `02_DOMAIN/glossary.md`                             | ~1,100 | Terms: Light Cone, Alpha, Beta, Causal Elasticity, Router, Verb Lexicon |
| `05_CONTRACTS/module-dependency-map.md`             | ~900   | Collapse + Router dependency constraints                                |
| `04_MODULES/light-cone-collapse.md`                 | ~1,500 | Two work points: Scene init + Phase-end re-inference                    |
| `04_MODULES/narrative-router.md`                    | ~3,000 | 6 base routers with verb lexicons                                       |
| `02_DOMAIN/control-primitives.md`                   | ~2,000 | Main Axis, End Line, Alpha, Beta, Router                                |
| `02_DOMAIN/state-model.md`                          | ~1,400 | alpha/beta in sceneState, routerName in roundState                      |
| `05_CONTRACTS/collapse-packet-schema.yaml`          | ~1,500 | CollapsePacket request/response                                         |
| `05_CONTRACTS/phase-consequence-packet-schema.yaml` | ~1,800 | PhaseConsequencePacket (settlement output feeds collapse)               |
| `05_CONTRACTS/state-snapshot-schema.yaml`           | ~3,000 | StateSnapshot with phaseConsequences                                    |
| `03_ORCHESTRATION/scene-phase-beat-lifecycle.md`    | ~1,500 | Phase-end processing: settlement -> collapse                            |
| `06_FIXTURES/sample-scene/router-lexicon.yaml`      | ~400   | Sample router profiles for testing                                      |

## Deliverables

1. **Light Cone Collapse module** (`src/engine/modules/light-cone-collapse.ts`)
   - Exports: `inferInitialBoundaries(sceneSpec: SceneSpec): Promise<CollapseResponse>`
   - Exports: `reInferBoundaries(collapseRequest: CollapseRequest): Promise<CollapseResponse>`
   - Both functions call an LLM via an injected adapter interface (mock until Phase 05)
   - Returns: `{ alpha, beta, inferenceTrace }`

2. **Narrative Router module** (`src/engine/modules/narrative-router.ts`)
   - Exports: `selectRouter(routerProfiles: readonly RouterProfile[], routerHint?: string): RouterSelection`
   - Exports: `getVerbLexicon(routerProfiles: readonly RouterProfile[], routerName: string): readonly string[]`
   - `RouterSelection = { routerName: string; routerSemanticCore: string; verbLexicon: readonly string[] }`

3. **LLM Adapter interface** (`src/engine/types/adapter-interface.ts`)
   - Define the interface that Light Cone Collapse depends on
   - This interface will be implemented by the real API Adapter in Phase 05

4. **Mock LLM Adapter** (`src/engine/__mocks__/mock-adapter.ts`)
   - Returns deterministic fake responses for collapse mode
   - Used in tests until Phase 05

5. **Unit tests** with >= 80% coverage for both modules

## Dependencies

- Phase 00 types: `SceneSpec`, `CollapseRequest`, `CollapseResponse`, `RouterProfile`, `StateSnapshot`
- Phase 00 project scaffold
- Phase 00 schema validator (for validating CollapseResponse)

## Acceptance Criteria

- [ ] `inferInitialBoundaries` accepts SceneSpec and returns CollapseResponse with alpha, beta, inferenceTrace
- [ ] `inferInitialBoundaries` calls the adapter with properly formed initial collapse context
- [ ] `reInferBoundaries` accepts CollapseRequest (with phaseConsequences) and returns new alpha/beta
- [ ] `reInferBoundaries` validates that phaseConsequences has at least 1 item
- [ ] Both collapse functions validate their output against CollapseResponse schema
- [ ] `selectRouter` returns the matching RouterProfile when routerHint matches
- [ ] `selectRouter` returns the first RouterProfile when no hint is provided
- [ ] `getVerbLexicon` returns the correct verb array for a given routerName
- [ ] `getVerbLexicon` throws when routerName does not match any profile
- [ ] All returned objects are immutable (readonly types)
- [ ] Mock adapter is properly injectable via dependency injection
- [ ] All tests pass, coverage >= 80%
