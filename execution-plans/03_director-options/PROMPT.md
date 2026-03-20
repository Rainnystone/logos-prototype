---
phase: "03"
title: "Director Note Layer + Option Generator"
branch: "phase/03-director-options"
depends_on: ["01", "02"]
spec_context_load:
  phase_0:
    - "LOGOS-SPEC/00_META/agent-guide.md"
    - "LOGOS-SPEC/00_META/system-map.md"
    - "LOGOS-SPEC/02_DOMAIN/glossary.md"
    - "LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md"
  phase_specific:
    - "LOGOS-SPEC/04_MODULES/director-note-layer.md"
    - "LOGOS-SPEC/04_MODULES/option-generator.md"
    - "LOGOS-SPEC/03_ORCHESTRATION/runtime-loop.md"
    - "LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml"
    - "LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml"
    - "LOGOS-SPEC/02_DOMAIN/control-primitives.md"
estimated_tokens:
  phase_0: 4500
  phase_specific: 12000
  total: 16500
---

# Phase 03: Director Note Layer + Option Generator

## Objective

Implement the two modules that bridge control signals into generation constraints: Director Note Layer (converts RoundState into `beatConstraints` + `optionConstraints`) and Option Generator (defines the 3-step constraint pipeline for option generation). These modules consume Phase 01 outputs (volume, history) and Phase 02 outputs (boundaries, verb lexicon) and produce the final control text that enters the PromptObject.

## Spec Context

| File | Tokens | Purpose |
|------|--------|---------|
| `00_META/agent-guide.md` | ~2,800 | Blocker protocol |
| `00_META/system-map.md` | ~1,000 | Architecture |
| `02_DOMAIN/glossary.md` | ~1,100 | Director Note, Option Set, Beat Volume terms |
| `05_CONTRACTS/module-dependency-map.md` | ~900 | Director/Option dependency graph |
| `04_MODULES/director-note-layer.md` | ~1,600 | 5 sub-parts, input/output spec |
| `04_MODULES/option-generator.md` | ~1,600 | 3-step pipeline: Router -> Anti-OOC CoT -> Volume |
| `03_ORCHESTRATION/runtime-loop.md` | ~2,500 | Where Director Note fits in the loop |
| `05_CONTRACTS/prompt-object-schema.yaml` | ~2,500 | directorNote object structure |
| `05_CONTRACTS/state-snapshot-schema.yaml` | ~3,000 | RoundState fields consumed by Director |
| `02_DOMAIN/control-primitives.md` | ~2,000 | Volume effects, Router semantics |

## Deliverables

1. **Director Note Layer module** (`src/engine/modules/director-note-layer.ts`)
   - Exports: `buildDirectorNote(roundState: RoundState, sceneState: SceneState, worldBase: WorldBase): DirectorNote`
   - Produces a `DirectorNote` object matching `PromptObject.directorNote` schema:
     - `volume`: current Volume
     - `router`: current router name
     - `verbLexicon`: current verb lexicon array
     - `beatConstraints`: text constraining Beat prose generation
     - `optionConstraints`: text constraining option generation (encodes 3-step pipeline)

2. **Option Generator logic** (integrated into Director Note Layer)
   - Not a separate runtime module (per ADR-001: options + prose co-generated)
   - The 3-step pipeline is encoded as `optionConstraints` text:
     1. Route locking: which 4 verbs from lexicon to use
     2. Anti-OOC CoT: character personality + boundary check
     3. Volume formatting: grain size based on current Volume
   - Exports: `buildOptionConstraints(roundState: RoundState, sceneState: SceneState, characterProfile: string): string`

3. **Unit tests** with >= 80% coverage

## Dependencies

- Phase 00 types: `DirectorNote`, `RoundState`, `SceneState`, `WorldBase`, `Volume`
- Phase 01 outputs: `getCurrentVolume`, `getHistoryWindow`
- Phase 02 outputs: `RouterSelection` (routerName, verbLexicon), alpha/beta boundaries

## Acceptance Criteria

- [ ] `buildDirectorNote` returns a valid `DirectorNote` matching prompt-object-schema.yaml
- [ ] `beatConstraints` text references volume level, time density, and sensory density requirements
- [ ] `beatConstraints` mentions Alpha/Beta boundaries as generation limits
- [ ] `optionConstraints` text encodes all 3 steps of the Option Generator pipeline
- [ ] `optionConstraints` references: verb lexicon for route locking, character personality for Anti-OOC, volume for formatting
- [ ] `buildDirectorNote` correctly passes through `volume`, `router`, `verbLexicon` from RoundState
- [ ] Output DirectorNote is immutable (readonly)
- [ ] No hardcoded narrative content -- all constraint text is dynamically assembled from input data
- [ ] All tests pass, coverage >= 80%
