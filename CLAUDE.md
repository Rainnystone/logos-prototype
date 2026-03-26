# LOGOS — Claude Code Project Instructions

## Project Overview

LOGOS (Linguistic Oriented Game Orchestration Studio) is an AI-driven narrative
orchestration engine for interactive fiction. Built with Next.js (TypeScript).

This is the implementation repo for
`https://github.com/Rainnystone/LOGOS-Narrative-Editor`. The canonical working
branch is `branch/narrative-editor`.

On this repo, archived design/spec materials now live under
`archive/vendor/LOGOS-SPEC/` and `archive/docs/`.
They are reference records, not a higher-priority bible than direct human
instructions, current code, or current tests.

Branch transition rules live at `archive/docs/narrative-editor-branch.md`.

## Architecture

The engine runs a Beat-level generation loop:
Player Input → State Convergence → Routing → Director Note →
Prompt Assembly → LLM Generation → Audit → (Rewrite Loop) → Output

Core concepts: Scene > Phase (4 beats) > Beat (min generation unit)

## Mandatory Rules

### 1. Narrative editor branch uses spec co-evolution

- New work on `branch/narrative-editor` may start from product intent and
  implementation discoveries, even when no existing spec document covers it
- `archive/vendor/LOGOS-SPEC/` remains editable when a task explicitly needs the
  archived spec snapshot brought back into sync with implementation behavior
- If code, tests, and spec disagree, resolve the intended behavior first, then
  bring all three back into sync in the same branch

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
- See: archive/vendor/LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md

### 5. LLM vs Code boundary

- Semantic generation, summarization, inference = LLM responsibility
- Orchestration, state management, validation, retry control = code responsibility
- If code needs to "understand text meaning", you need an LLM step, not a heuristic

### 6. Context loading discipline

- Every session: read this file plus `archive/docs/narrative-editor-branch.md`
- Load `archive/vendor/LOGOS-SPEC/` selectively as reference context, not as a hard gate
- `branch/narrative-editor` is the only default development branch
- Spec text budget: max 40,000 tokens per session
- Never load: Agent Client/, LOGOS Prototype/, SillyTavern调研/

## Key Paths

| What                        | Where                             |
| --------------------------- | --------------------------------- |
| Archived spec root          | archive/vendor/LOGOS-SPEC/                |
| Branch transition guide     | archive/docs/narrative-editor-branch.md   |
| Agent routing guide         | archive/vendor/LOGOS-SPEC/00_META/agent-guide.md |
| Glossary (terminology lock) | archive/vendor/LOGOS-SPEC/02_DOMAIN/glossary.md  |
| Contract schemas            | archive/vendor/LOGOS-SPEC/05_CONTRACTS/\*.yaml   |
| Module specs                | archive/vendor/LOGOS-SPEC/04_MODULES/            |
| Engine source               | src/engine/                       |
| TypeScript types            | src/types/                        |
| Story packages              | story-packages/                   |
| Tests                       | src/**/__tests__/, src/**/*.test.* |

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
4. Naming conflict → prefer the current branch canonical name, then sync code/spec/tests

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
- Prefer targeted suites while iterating: `npm run test:core`, `npm run test:ui`,
  `npm run test:e2e`; run full `npm test` before calling work complete

## Git

- Canonical GitHub repo: `Rainnystone/LOGOS-Narrative-Editor`
- Active development branch: `branch/narrative-editor`
- `main` is a compatibility mirror of the same baseline, not the primary branch
- Commit format: <type>: <description>
- Types: feat, fix, refactor, test, docs, chore
- PRs should target `branch/narrative-editor` unless the human explicitly says otherwise
- Human review required before merge
