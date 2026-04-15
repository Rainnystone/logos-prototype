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

## Workspace Navigation

Keep this file focused on stable workspace rules and execution discipline.

For detailed current structure, task routing, and concrete entry files, read:

- [coding-agent-guide.md](coding-agent-guide.md)
- [documentation-governance.md](documentation-governance.md)
- `docs/codemaps/*.md`

If a task needs historical context, read archive materials only after the current
workspace docs above.

## Architecture

The system operates on two distinct, strictly separated loops.

### 1. Runtime Loop (Play Workbench)
The engine runs a Beat-level generation loop:
`Player Input` → `State Convergence` → `Routing` → `Director Note` → `Prompt Assembly` → `LLM Generation` → `Audit` → `(Rewrite Loop)` → `Output`

Core concepts: Scene > Phase (4 beats) > Beat (min generation unit)

### 2. Authoring Loop (Narrative Editor)
The editor runs a coordinator-first structured authoring loop:
`Page Draft / Author Intent` → `Structured Save Request` → `Coordinator / Bridge` → `Deterministic Validation` → `Writeback` → `Reload` → `Diagnostics`

**Key Redesign Principle:** The `Coordinator` is a narrow authoring coordinator role, not a first-class sidecar agent. It routes semantic intent, but file writing and validation are handled by a **deterministic code bridge** (`src/authoring/persistence/bridge.ts`). AI skills must **never** directly write to filesystem or bypass schema validation. `gossipelog agent` was the first true sidecar agent introduced in the repo, and the current built-in sidecar layer now includes both `gossipelog` and `weaver`.

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
- **For Runtime tasks:** Start with `coding-agent-guide.md`, then load `docs/codemaps/*.md` and `src/engine/`. Load `archive/vendor/LOGOS-SPEC/04_MODULES/` only when historical runtime design context is needed.
- **For Editor/Authoring tasks:** Start with `coding-agent-guide.md`, root `task_plan.md`, `findings.md`, and `progress.md`, then load `docs/codemaps/*.md` and `src/authoring/`. Load `archive/docs/narrative-editor-redesign/master-record.md` only when historical architecture context is needed.
- **For roadmap / multi-phase tasks:** Also load root `task_plan.md`, `findings.md`, and `progress.md` before proposing order changes or new implementation slices.
- **For simulation or cloud-verification tasks:** Load `simulation-toolset/README.md`, `simulation-toolset/agent-guide.md`, and `simulation-toolset/docs/`.
- Spec text budget: max 40,000 tokens per session.

### 7. Subagent Delegation Discipline

#### Dispatch

- For complex work, prefer decomposing the implementation into bounded tasks and dispatching subagents rather than keeping the whole execution on the main thread.
- Subagent dispatch must follow `subagent-driven-development`; do not improvise a parallel workflow outside that discipline when the task has already been decomposed.
- Choose the subagent model according to task complexity instead of defaulting to the largest model. Valid deployment options include:
  - `gpt-5.4` with `medium` / `high` / `xhigh`
  - `gpt-5.4-mini` with `medium` / `high` / `xhigh`
  - `gpt-5.3-codex` with `medium` / `high` / `xhigh`
  - `gpt-5.3-codex-spark` with `medium` / `high` / `xhigh`
- Dispatch instructions must explicitly tell the worker that it is a subagent, not the main thread.
- Prefer giving the subagent a clean task brief, file boundary, and success criteria instead of forwarding raw main-thread conversation history.
- Each dispatch should clearly state:
  - whether the subagent is read-only review or write-authorized implementation
  - which files or modules it owns
  - which actions are forbidden, especially spawning more subagents, reverting unrelated work, or broadening scope without approval

#### Waiting and Inquiry

- The first `wait_agent` call must use `timeout_ms=120000`.
- If the first wait times out but there is new output, such as new replies, `git diff` changes, or changes in owned files, the next wait must use `timeout_ms=180000`.
- If the second wait also times out and new output is still appearing, the next wait must use `timeout_ms=300000`.
- `timed_out` is not the same as `blocked`; a timeout only means that the current wait window ended without a final result, not that the subagent is stalled, invalid, or ready to terminate.
- Status inquiry is allowed only after two consecutive rounds with both no new output and no file changes.
- Status inquiry must be phrased as “report progress and blockers only, without pausing the current task”; it must not ask the subagent to stop implementation, pause work, immediately hand over, or abandon its current context.

#### Replacement and Termination

- Do not close a subagent just because a wait timed out.
- Before replacing or closing a subagent, first confirm its actual work status, current progress, latest conclusion, and whether keeping it alive still reduces risk or rework.
- Replace or close a subagent only after three rounds with no output and a status inquiry that also confirms there is no meaningful progress.

### 8. Implementation Packet Discipline

- Decompose implementation work into bounded packets before dispatch.
- Prefer one primary objective, one main module or surface area, and one verification path per packet.
- The default implementation packet should be the smallest unit that can complete one TDD loop and one review/fix/re-review loop without widening scope mid-flight.
- Each packet should explicitly declare its user-facing goal, owned files, default verification command, and whether it is safe to run in parallel with other packets.
- Prefer dispatching subagent packets that can own their focused tests, implement against them, run targeted verification, and return a reviewable result.
- If two packets share the same primary production file or the same primary test file, default to serial execution unless the plan explains why parallel work is still safe.
- If a packet grows across unrelated concerns, long execution chains, or multiple verification paths, split it again.

## Key Paths
| What                                  | Where                                                             |
| ------------------------------------- | ----------------------------------------------------------------- |
| Workspace recovery docs              | root `task_plan.md`, `findings.md`, `progress.md`                 |
| Detailed task-routing guide          | `coding-agent-guide.md`                                           |
| Documentation lifecycle contract     | `documentation-governance.md`                                     |
| Active Implementation Plans          | `docs/superpowers/plans/`                                         |
| Active Design Specs                  | `docs/superpowers/specs/`                                         |
| Current code map                     | `docs/codemaps/`                                                  |
| Primary archive root                 | `archive/`                                                        |
## System Mapping
For code-area routing, entry files, default verification, and parallelization hints, start with [coding-agent-guide.md](coding-agent-guide.md); for documentation lifecycle and archive transition rules, start with [documentation-governance.md](documentation-governance.md). Load `docs/codemaps/*.md` only when the first routing pass is insufficient and you need deeper module relationships.

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
