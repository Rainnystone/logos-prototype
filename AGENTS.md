# LOGOS — Agent Instructions

## Project Overview

LOGOS (Linguistic Oriented Game Orchestration Studio) is an AI-driven narrative
orchestration engine and authoring environment for interactive fiction. Built with
Next.js (TypeScript) and React 19.

This workspace currently tracks the active implementation repo at
`https://github.com/talespark-global/logos-narrative-editor`. Historical lineage
and older references may still point to
`https://github.com/Rainnystone/LOGOS-Narrative-Editor`, but execution should
follow the checked-out repo and its current remote. The canonical working branch
is `branch/narrative-editor`.

The project has evolved from a pure runtime engine into a **dual-track system**:
a Runtime Engine and a Narrative Editor (Authoring System). 
Archived design/spec materials live under `archive/vendor/LOGOS-SPEC/` and `archive/docs/`.
They are **reference records**, not a higher-priority bible than direct human
instructions, current code, or current tests. 
Active planning and design documents now live under `docs/superpowers/plans/` and `docs/superpowers/specs/`.

## Architecture

The system operates on two distinct, strictly separated loops.

### 1. Runtime Loop (Play Workbench)
The engine runs a Beat-level generation loop:
`Player Input` → `State Convergence` → `Routing` → `Director Note` → `Prompt Assembly` → `LLM Generation` → `Audit` → `(Rewrite Loop)` → `Output`

Core concepts: Scene > Phase (4 beats) > Beat (min generation unit)

### 2. Authoring Loop (Narrative Editor)
The editor runs a coordinator-first structured authoring loop:
`Page Draft / Author Intent` → `Structured Save Request` → `Coordinator / Bridge` → `Deterministic Validation` → `Writeback` → `Reload` → `Diagnostics`

**Key Redesign Principle:** The `Coordinator` is a narrow authoring coordinator role, not a first-class sidecar agent. It routes semantic intent, but file writing and validation are handled by a **deterministic code bridge** (`src/authoring/persistence/bridge.ts`). AI skills must **never** directly write to filesystem or bypass schema validation. The first true sidecar agent currently in the repo is `gossipelog agent`.

See `archive/docs/narrative-editor-redesign/master-record.md` for the current canonical authoring architecture.

## Mandatory Rules

### 1. Spec Co-evolution & Active Plans
- New work on `branch/narrative-editor` is driven by execution plans in `docs/superpowers/plans/` and specs in `docs/superpowers/specs/`.
- Multi-session roadmap and recovery notes live in root `task_plan.md`, `findings.md`, and `progress.md`; when the work spans phases or threads, keep those files aligned with the active plan/spec set.
- If code, tests, and active plans disagree, resolve the intended behavior first, then bring all three back into sync.
- `archive/vendor/LOGOS-SPEC/` may be edited if an archived spec snapshot explicitly needs to be brought back into sync, but it is no longer the primary driver of new features.

### 2. No Hardcoded Narrative Content
- Character names, story text, locations, phase plans = `story-packages/`
- Code must be 题材无关 (genre-agnostic) and 故事无关 (story-agnostic)
- If you find yourself writing Chinese story text in a `.ts` file, STOP.

### 3. Immutable Data Patterns
- Never mutate state objects. Always return new copies.
- `const newState = { ...oldState, field: newValue }`
- Array operations: `slice`, `map`, `filter` — never `splice`, `push`, `sort` in-place.

### 4. Module & Bridge Dependency Discipline
- **Runtime:** All LLM calls go through API Adapter. All prompt construction goes through Prompt Assembler. Auditor returns booleans, Audit Resolver makes flow decisions.
- **Authoring:** Editor pages submit structured data to the Bridge. The Bridge handles schema validation, reference integrity, and atomic writes. Coordinator skills propose patches; they do not write files.

### 5. LLM vs Code Boundary
- Semantic generation, summarization, inference = LLM responsibility.
- Orchestration, state management, validation, retry control = Code responsibility.
- If code needs to "understand text meaning", you need an LLM step.
- If an LLM is asked to validate a schema or verify a path, it's an architecture violation—use deterministic code.

### 6. Context Loading Discipline
- **For Runtime tasks:** Load `archive/vendor/LOGOS-SPEC/04_MODULES/` and `src/engine/`.
- **For Editor/Authoring tasks:** **Must** load `archive/docs/narrative-editor-redesign/master-record.md`, active `docs/superpowers/specs/`, and `src/authoring/`.
- **For roadmap / multi-phase tasks:** Also load root `task_plan.md`, `findings.md`, and `progress.md` before proposing order changes or new implementation slices.
- **For simulation or cloud-verification tasks:** Load `simulation-toolset/README.md`, `simulation-toolset/agent-guide.md`, and `simulation-toolset/docs/`.
- Spec text budget: max 40,000 tokens per session.
- Never load: `Agent Client/`, `LOGOS Prototype/`, `SillyTavern调研/`.

### 7. Subagent Delegation Discipline
- For complex work, prefer decomposing the implementation into bounded tasks and dispatching subagents rather than keeping the whole execution on the main thread.
- Subagent dispatch must follow `subagent-driven-development`; do not improvise a parallel workflow outside that discipline when the task has already been decomposed.
- Choose the subagent model according to task complexity instead of defaulting to the largest model. Valid deployment options include:
  - `gpt-5.4` with `medium` / `high` / `xhigh`
  - `gpt-5.4-mini` with `medium` / `high` / `xhigh`
  - `gpt-5.3-codex` with `medium` / `high` / `xhigh`
  - `gpt-5.3-codex-spark` with `medium` / `high` / `xhigh`
- Dispatch instructions must explicitly tell the worker that it is a subagent, not the main thread.
- Prefer giving the subagent a clean task brief, file boundary, and success criteria instead of forwarding raw main-thread conversation history.
- Do not close a subagent just because a wait timed out. Before closing, first confirm its actual work status, current progress, latest conclusion, and whether keeping it alive still reduces risk or rework.
- Each dispatch should clearly state:
  - whether the subagent is read-only review or write-authorized implementation
  - which files or modules it owns
  - which actions are forbidden, especially spawning more subagents, reverting unrelated work, or broadening scope without approval

## Key Paths

| What                                  | Where                                                             |
| ------------------------------------- | ----------------------------------------------------------------- |
| Active Implementation Plans           | `docs/superpowers/plans/`                                         |
| Active Design Specs                   | `docs/superpowers/specs/`                                         |
| Rolling roadmap / recovery log        | root `task_plan.md`, `findings.md`, `progress.md`                 |
| Authoring Redesign Master Record      | `archive/docs/narrative-editor-redesign/master-record.md`         |
| Branch transition guide               | `archive/docs/narrative-editor-branch.md`                         |
| Archived spec root                    | `archive/vendor/LOGOS-SPEC/`                                      |
| Contract schemas / Types              | `src/types/`                                                      |
| Engine source (Runtime Loop)          | `src/engine/`                                                     |
| Authoring source (Editor Loop)        | `src/authoring/` (persistence, sections, coordinator)             |
| Next.js App (Pages & Components)      | `src/app/` (edit/, play/, components/)                            |
| Story packages (Fixtures/Content)     | `src/story-packages/` and `/story-packages/`                      |
| Simulation / cloud verification       | `simulation-toolset/` and `simulation-toolset/docs/`              |
| Tests                                 | `src/**/__tests__/`, `src/**/*.test.*`                            |

## System Mapping

| Code Area                                          | Responsibility / Spec Reference                            |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `src/engine/orchestrator.ts`                       | Runtime main loop (`04_MODULES/orchestrator-control-hub`)  |
| `src/engine/modules/*`                             | 11 Runtime control modules (Router, Auditor, etc.)         |
| `src/engine/api-adapter/`                          | LLM Provider adaptation                                    |
| `src/authoring/persistence/bridge.ts`              | Deterministic save, validation, and writeback              |
| `src/authoring/sections/*`                         | Section-specific data normalization and draft state        |
| `src/app/edit/`                                    | Narrative Editor surfaces (`世界`, `角色`, `场景与阶段`, `控制模块`, `控制台`) |
| `src/app/play/`                                    | Play Workbench UI                                          |
| `simulation-toolset/src/*`                         | Structured route, UI, and loop simulation for regression checks |
| `src/types/*.ts`                                   | Shared Contracts (Zod schemas & TS types)                  |

## Blocker Protocol

When blocked during implementation:

1. Field missing producer → add the producer.
2. Output has no downstream entry → add to nearest shared contract.
3. Code forced to understand semantics → convert to LLM three-stage pattern.
4. Naming conflict → prefer the current branch canonical name, then sync code/spec/tests.

STOP and wait for human if the fix would change:

- Author-visible control model or Editor Page boundaries.
- Core domain object boundaries (Scene, Phase, Beat).
- Public API semantics or the Deterministic Bridge persistence flow.

## Testing

- **TDD mandatory**: write test → RED → implement → GREEN.
- Coverage minimum: 80%.
- Story package content must never appear in test assertions as hardcoded strings — load from test fixtures instead.
- Prefer targeted suites while iterating:
  - `npm run test:core`
  - `npm run test:ui`
  - `npm run test:e2e`
  - `npm run type-check:simulation`
  - `npm run test:simulation`
- If the work touches route integrity, authoring/runtime boundaries, prompt projection, or cloud-verification harnesses, include the relevant `simulation-toolset` suite in the verification loop.
- Run `npm run build` for app-surface changes before calling work complete.
- Run full `npm test` before calling work complete.

## Git

- Active GitHub repo for this workspace: `talespark-global/logos-narrative-editor`
- Active development branch: `branch/narrative-editor`
- `main` is a compatibility mirror, not the primary branch.
- Commit format: `<type>: <description>` (e.g., `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- PRs should target `branch/narrative-editor` unless the human explicitly says otherwise.
- Human review required before merge.
- When working from a Plan in `docs/superpowers/plans/`, check off tasks as you complete them.
