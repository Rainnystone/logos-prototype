# LOGOS — Claude Code Project Instructions

## Project Overview

LOGOS (Linguistic Oriented Game Orchestration Studio) is an AI-driven narrative
orchestration engine for interactive fiction. Built with Next.js (TypeScript).

This is the implementation repo. The read-only design specification is vendored at:
vendor/LOGOS-SPEC/

## Architecture

The engine runs a Beat-level generation loop:
Player Input → State Convergence → Routing → Director Note →
Prompt Assembly → LLM Generation → Audit → (Rewrite Loop) → Output

Core concepts: Scene > Phase (4 beats) > Beat (min generation unit)

## Mandatory Rules

### 1. LOGOS-SPEC is the design authority

- All module implementations must trace back to a spec document
- If code contradicts spec, spec wins unless an ADR overrides
- Never modify the vendored `vendor/LOGOS-SPEC/` files as part of implementation work

### 2. No hardcoded narrative content

- Character names, story text, locations, phase plans = story-packages/
- Code must be 题材无关 (genre-agnostic) and 故事无关 (story-agnostic)
- If you find yourself writing Chinese story text in a .ts file, STOP

### 3. Immutable data patterns

- Never mutate state objects. Always return new copies.
- const newState = { ...oldState, field: newValue }
- Array operations: slice, map, filter — never splice, push, sort in-place

### 4. Module dependency discipline

- All LLM calls go through API Adapter — no direct provider imports in modules
- All prompt construction goes through Prompt Assembler — the single output gate
- Auditor returns booleans, Audit Resolver makes flow decisions
- See: LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md

### 5. LLM vs Code boundary

- Semantic generation, summarization, inference = LLM responsibility
- Orchestration, state management, validation, retry control = code responsibility
- If code needs to "understand text meaning", you need an LLM step, not a heuristic

### 6. Context loading discipline

- Every session: read agent-guide.md, system-map.md, glossary.md, dependency-map
- Per-task: only load spec files listed in the phase PROMPT.md
- Spec text budget: max 40,000 tokens per session
- Never load: Agent Client/, LOGOS Prototype/, SillyTavern调研/

## Key Paths

| What                        | Where                             |
| --------------------------- | --------------------------------- |
| Spec root                   | vendor/LOGOS-SPEC/                |
| Agent routing guide         | LOGOS-SPEC/00_META/agent-guide.md |
| Glossary (terminology lock) | LOGOS-SPEC/02_DOMAIN/glossary.md  |
| Contract schemas            | LOGOS-SPEC/05_CONTRACTS/\*.yaml   |
| Module specs                | LOGOS-SPEC/04_MODULES/            |
| Execution plans             | execution-plans/                  |
| Engine source               | src/engine/                       |
| TypeScript types            | src/types/                        |
| Story packages              | story-packages/                   |
| Tests                       | tests/                            |

## Module → Spec Mapping

| Code File                                          | Spec Document                              |
| -------------------------------------------------- | ------------------------------------------ |
| src/engine/orchestrator.ts                         | 04_MODULES/orchestrator-control-hub.md     |
| src/engine/modules/memory-placeholder.ts           | 04_MODULES/memory-placeholder.md           |
| src/engine/modules/phase-gradient.ts               | 04_MODULES/phase-gradient.md               |
| src/engine/modules/light-cone-collapse.ts          | 04_MODULES/light-cone-collapse.md          |
| src/engine/modules/narrative-router.ts             | 04_MODULES/narrative-router.md             |
| src/engine/modules/director-note-layer.ts          | 04_MODULES/director-note-layer.md          |
| src/engine/modules/option-generator.ts             | 04_MODULES/option-generator.md             |
| src/engine/modules/prompt-assembler.ts             | 04_MODULES/prompt-assembler.md             |
| src/engine/modules/auditor.ts                      | 04_MODULES/auditor.md                      |
| src/engine/modules/audit-resolver.ts               | 04_MODULES/audit-resolver.md               |
| src/engine/modules/phase-consequence-settlement.ts | 04_MODULES/phase-consequence-settlement.md |
| src/engine/api-adapter/                            | 04_MODULES/api-adapter-lite/               |
| src/types/\*.ts                                    | 05_CONTRACTS/\*.yaml                       |
| src/loader/                                        | (no single spec — serves story-packages/)  |

## Blocker Protocol

When blocked during implementation:

1. Field missing producer → add the producer
2. Output has no downstream entry → add to nearest shared contract
3. Code forced to understand semantics → convert to LLM three-stage pattern
4. Naming conflict → follow resolution order in agent-guide.md appendix

STOP and wait for human if the fix would change:

- Author-visible control model
- Core domain object boundaries
- Public API semantics
- Beat / Phase / Scene definitions

## Testing

- TDD mandatory: write test → RED → implement → GREEN
- Coverage minimum: 80%
- Story package content must never appear in test assertions as hardcoded
  strings — load from test fixtures instead

## Git

- Branch per phase: feature/XX-phase-name
- Commit format: <type>: <description>
- Types: feat, fix, refactor, test, docs, chore
- PR required for merge to develop
- Human review required before merge
