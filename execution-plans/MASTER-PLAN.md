# LOGOS Execution Master Plan

## Purpose

This document is the top-level orchestration plan for implementing the LOGOS narrative engine. It defines the phase dependency graph, git flow, milestone gates, and execution rules. Ralph (autonomous Claude Code agent) uses this as the entry point for every implementation session.

All spec references are relative to the vendored spec root `vendor/LOGOS-SPEC/`.

---

## Phase Dependency Graph

```
                     ┌──────────────────────┐
                     │   Phase 00           │
                     │   Foundation          │
                     │   (scaffold + types)  │
                     └──────────┬───────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
        ┌────────▼─────────┐         ┌────────▼─────────┐
        │   Phase 01       │         │   Phase 02       │
        │   Memory +       │         │   Collapse +     │
        │   Gradient       │         │   Router         │
        └────────┬─────────┘         └────────┬─────────┘
                 │                             │
                 └──────────────┬──────────────┘
                                │
                     ┌──────────▼───────────┐
                     │   Phase 03           │
                     │   Director +         │
                     │   Options            │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │   Phase 04           │
                     │   Prompt Assembler   │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │   Phase 05           │
                     │   API Adapter        │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │   Phase 06           │
                     │   Audit Loop +       │
                     │   Orchestrator       │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │   Phase 07           │
                     │   E2E Validation     │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │   Phase 08           │
                     │   Workbench UI       │
                     └──────────────────────┘
```

### Parallel Windows

- **Phase 01 and Phase 02** may execute in parallel. They share no code dependencies; both depend only on Phase 00 outputs (TypeScript types + project scaffold).
- All other phases are strictly sequential.

---

## Git Flow Map

### Branch Naming

```
main
 ├── phase/00-foundation
 ├── phase/01-memory-gradient
 ├── phase/02-collapse-router
 ├── phase/03-director-options
 ├── phase/04-prompt-assembler
 ├── phase/05-api-adapter
 ├── phase/06-audit-loop
 ├── phase/07-e2e-validation
 └── phase/08-workbench-ui
```

### Branch Rules

1. Each phase branches from `main` after the prior phase PR has been merged.
2. Parallel phases (01 and 02) both branch from `main` after Phase 00 merges.
3. Phase 03 branches from `main` after both Phase 01 and Phase 02 PRs merge.
4. No direct commits to `main`. All work enters via PR.
5. Commit format: `<type>: <description>` (types: feat, fix, refactor, test, chore, docs).

### PR Template

```markdown
## Summary

- [1-3 bullet points describing what this phase delivers]

## Spec Alignment

- [List of LOGOS-SPEC files verified against]

## Test Coverage

- [ ] Unit tests pass
- [ ] Integration tests pass (where applicable)
- [ ] Coverage >= 80%

## Checklist

- [ ] Types match YAML contract schemas exactly
- [ ] No hardcoded narrative content
- [ ] Immutable data patterns used
- [ ] All module exports match orchestrator-input-output.md names
```

---

## Milestone Definitions

### M0: Foundation Complete

- **Gate**: Phase 00 PR merged
- **Criteria**:
  - Next.js App Router project scaffolded with TypeScript strict
  - All YAML contract schemas converted to TypeScript types
  - Story package loader reads and validates sample-scene
  - Vitest configured with >= 0 coverage baseline
  - ESLint + Prettier configured and passing

### M1: Control Modules Online

- **Gate**: Phase 01 + Phase 02 PRs merged
- **Criteria**:
  - `MemoryPlaceholder` returns 5-beat sliding window
  - `PhaseGradient` maps all 7 gradient types to volume sequences
  - `LightConeCollapse` infers initial Alpha/Beta boundaries
  - `NarrativeRouter` selects router and returns verb lexicon
  - All modules have unit tests with >= 80% coverage

### M2: Generation Pipeline Ready

- **Gate**: Phase 03 + Phase 04 PRs merged
- **Criteria**:
  - `DirectorNoteLayer` produces `beatConstraints` + `optionConstraints`
  - `OptionGenerator` constraint logic encoded in `optionConstraints`
  - `PromptAssembler` outputs `PromptObject` matching schema exactly
  - L1 -> L2 -> L3 -> L4 layer ordering enforced
  - `generationControl` attached correctly on rewrite path

### M3: External Calls Operational

- **Gate**: Phase 05 PR merged
- **Criteria**:
  - API Adapter supports `generate`, `audit`, `settlement`, `collapse` modes
  - Anthropic + OpenAI-compatible providers implemented
  - `SchemaMapper` converts `PromptObject` to provider format
  - Provider abstraction allows easy addition of new providers

### M4: Engine Loop Closed

- **Gate**: Phase 06 PR merged
- **Criteria**:
  - `Auditor` returns boolean answers matching `AuditQuestionSet`
  - `AuditResolver` implements 5-rule resolution logic
  - `PhaseConsequenceSettlement` produces `phaseConsequences[]`
  - `OrchestratorControlHub` runs the full runtime loop
  - Rewrite loop operates within 3-retry limit
  - Phase-end processing chain: settlement -> collapse -> next Phase

### M5: Validated

- **Gate**: Phase 07 PR merged
- **Criteria**:
  - Sample scene (6 Phases, 4 Beats each) runs through complete loop
  - State transitions verified at each Phase boundary
  - Audit behavior verified (pass, fail, rewrite, force-accept)
  - Phase-end collapse produces new Alpha/Beta boundaries
  - No spec drift detected against LOGOS-SPEC contracts

### Release: Workbench Shipped

- **Gate**: Phase 08 PR merged
- **Criteria**:
  - Story package selector functional
  - Beat generation view shows real-time output
  - State inspector displays Phase, Beat, Alpha/Beta
  - Player input interface accepts option selection and free text
  - Full engine loop accessible from UI

---

## Timeline Visualization

```
Week   1    2    3    4    5    6    7    8    9   10   11   12
      ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
P00   ████████ M0
P01        ░░░░████████
P02        ░░░░████████ M1
P03                  ████████ M2
P04                       ████████
P05                            ████████ M3
P06                                 ████████████ M4
P07                                          ████████ M5
P08                                               ████████████ Release

████ = active development
░░░░ = parallel execution window (P01 || P02)
```

Estimated durations:

- Phase 00: ~1.5 weeks (scaffold + types + story loader)
- Phase 01: ~1 week (memory + gradient, simple modules)
- Phase 02: ~1.5 weeks (collapse + router, LLM stub needed)
- Phase 03: ~1 week (director + options)
- Phase 04: ~1 week (prompt assembler)
- Phase 05: ~1.5 weeks (API adapter, provider integration)
- Phase 06: ~2 weeks (audit loop + orchestrator, closes the loop)
- Phase 07: ~1 week (E2E validation)
- Phase 08: ~2 weeks (workbench UI)

Total estimated: ~12 weeks

---

## Phase Execution Rules

### Pre-flight (every phase)

1. Verify the dependency phase PR is merged to `main`.
2. Pull latest `main` and create the phase branch.
3. Load Phase 0 spec context: `agent-guide.md`, `system-map.md`, `glossary.md`, `module-dependency-map.md`.
4. Load phase-specific spec context per `PROMPT.md` frontmatter.
5. Confirm total spec token load is <= 40,000.

### During Execution

1. Follow TDD: write tests first (RED), implement (GREEN), refactor (IMPROVE).
2. Maintain immutable data patterns -- never mutate existing objects.
3. No hardcoded narrative content. All story data comes from story packages.
4. All exported interfaces must match names in `orchestrator-input-output.md`.
5. If blocked: follow Blocker Protocol in `agent-guide.md` appendix.
6. No module may bypass `PromptAssembler` to call API directly.
7. No module may bypass `APIAdapterLite` to call an LLM provider directly.

### Post-flight (every phase)

1. Run full test suite. Verify >= 80% coverage on new code.
2. Run `eslint` and `prettier` -- zero errors, zero warnings.
3. Commit with conventional format: `feat: <description>`.
4. Push branch and create PR against `main`.
5. **STOP**: Do not proceed to the next phase until the PR is reviewed and merged.

### Human Review Checkpoints

The following phases require explicit human approval before the next phase begins:

- **M0** (Phase 00): Verify project scaffold matches expectations
- **M2** (Phase 04): Verify PromptObject output matches spec exactly
- **M4** (Phase 06): Verify the complete engine loop before E2E
- **Release** (Phase 08): Final acceptance

---

## Prohibited Patterns

1. **No implicit heuristics substituting for LLM calls.** If a step requires semantic understanding (collapse inference, consequence settlement, content generation), it must go through `APIAdapterLite`.
2. **No circular dependencies.** Module dependency direction must match `module-dependency-map.md`.
3. **No narrative content in code.** Story packages provide all narrative material.
4. **No skipping the audit loop.** Every generated Beat must pass through `Auditor` + `AuditResolver` or be force-accepted after 3 retries.
5. **No mutating state objects.** All state transitions produce new objects.
6. **No provider-specific code outside `APIAdapterLite`.** All LLM calls go through the adapter.
7. **No proceeding past STOP gates.** Phase N+1 cannot begin until Phase N PR is merged.
