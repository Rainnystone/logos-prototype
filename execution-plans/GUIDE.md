# LOGOS Execution Plan Writing Guide

## Purpose

This guide defines the format and rules for writing LOGOS execution plan files. Each phase has two files:

- **PROMPT.md** -- The context entry point Ralph loads at session start
- **fix_plan.md** -- The detailed task breakdown Ralph executes

---

## PROMPT.md Format

### YAML Frontmatter (required)

Every PROMPT.md must begin with this frontmatter block:

```yaml
---
phase: '00' # Two-digit phase number
title: 'Phase Title' # Human-readable phase name
branch: 'phase/00-foundation' # Git branch name
depends_on: [] # List of phase numbers that must be complete
spec_context_load:
  phase_0: # Always loaded (mandatory)
    - 'LOGOS-SPEC/00_META/agent-guide.md'
    - 'LOGOS-SPEC/00_META/system-map.md'
    - 'LOGOS-SPEC/02_DOMAIN/glossary.md'
    - 'LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md'
  phase_specific: # Loaded for this phase only
    - 'LOGOS-SPEC/04_MODULES/memory-placeholder.md'
    - 'LOGOS-SPEC/05_CONTRACTS/state-snapshot-schema.yaml'
estimated_tokens:
  phase_0: 4500 # Fixed cost of mandatory context
  phase_specific: 8000 # Variable cost per phase
  total: 12500 # Must be <= 40000
---
```

### Required Sections

```markdown
# Phase NN: Title

## Objective

One paragraph describing what this phase delivers and why.

## Spec Context

Table listing every spec file loaded, its token estimate, and why it is needed.

## Deliverables

Numbered list of concrete outputs (files, types, modules, tests).

## Dependencies

What must exist before this phase can begin.

## Acceptance Criteria

Checkboxes that must all pass before the phase PR can be merged.
```

---

## fix_plan.md Format

### Structure

Every fix_plan.md follows this three-part structure:

```markdown
# Phase NN Fix Plan

## Pre-flight

### 1. Branch Setup

- [ ] Verify dependency phase PR is merged to `main`
- [ ] `git pull origin main`
- [ ] `git checkout -b phase/NN-name`

### 2. Dependency Verification

- [ ] Verify [specific files/types from prior phases exist]
- [ ] Run `npm test` -- all prior tests pass

### 3. Spec Context Load

- [ ] Load Phase 0 context (~4,500 tokens)
- [ ] Load phase-specific context (~N tokens)
- [ ] Confirm total <= 40,000 tokens

---

## Tasks

### Task 1: [Module/Feature Name]

#### 1.1 RED -- Write Tests

- Create `src/engine/modules/__tests__/module-name.test.ts`
- Test case: [specific scenario]
- Test case: [specific scenario]
- Expected: all tests FAIL (module not yet implemented)

#### 1.2 GREEN -- Implement

- Create `src/engine/modules/module-name.ts`
- Export `function/class` with signature matching orchestrator-input-output.md
- [Specific implementation requirements]

#### 1.3 IMPROVE -- Refactor

- Extract constants if needed
- Verify immutability (no mutation of input objects)
- Verify no hardcoded narrative content

### Task 2: [Next Module]

[Same RED/GREEN/IMPROVE structure]

---

## Post-flight

### 1. Quality Gate

- [ ] `npm test` -- all tests pass
- [ ] Coverage >= 80% on new code
- [ ] `npm run lint` -- zero errors
- [ ] `npm run format:check` -- zero issues

### 2. Commit and PR

- [ ] `git add [specific files]`
- [ ] `git commit -m "feat: [description]"`
- [ ] `git push -u origin phase/NN-name`
- [ ] Create PR against `main`

### 3. STOP

Do not proceed to Phase NN+1 until this PR is reviewed and merged.
```

---

## Considerations When Writing Plans

### 1. Context Budget

- Spec text per session must not exceed **40,000 tokens**.
- Phase 0 context (always loaded) costs ~4,500 tokens.
- Remaining budget: ~35,500 tokens for phase-specific context.
- If over budget, drop files in this order:
  1. `implementation-guide.md` (non-normative)
  2. `06_FIXTURES/` (load on demand)
  3. Never drop `glossary.md` or `module-dependency-map.md`

### 2. Spec Mapping

- Every task must cite the specific LOGOS-SPEC file it implements.
- Every exported interface name must match `orchestrator-input-output.md`.
- Every TypeScript type must match the corresponding `05_CONTRACTS/*.yaml` schema.
- Field names in code must exactly match schema field names (camelCase as defined in YAML).

### 3. Immutability

- All functions must return new objects, never mutate inputs.
- State transitions produce new `StateSnapshot` objects.
- History window operations return new arrays.

### 4. No Hardcoded Narrative Content

- Zero story text, character names, or scene-specific strings in module code.
- All narrative content comes from story packages loaded at runtime.
- Test fixtures may contain sample data, but module logic must be genre-agnostic.

### 5. LLM vs Code Boundary

- Code handles: orchestration, state management, contract validation, retry control, protocol mapping.
- LLM handles: content generation, semantic extraction, boundary inference, consequence settlement.
- If a step requires "understanding text semantics," it must go through an LLM call via `APIAdapterLite`.
- Never substitute implicit heuristics for LLM semantic work.

### 6. Blocker Protocol

When a plan task encounters any of these blockers, the agent must:

- **Missing producer for a required field**: Add the producer, do not silently skip.
- **Module output has no downstream entry point**: Add entry to nearest shared contract.
- **Code forced to do semantic understanding**: Convert to "code packs -> LLM executes -> code validates" pattern.
- **Naming conflict**: Resolve per `agent-guide.md` appendix conflict resolution hierarchy.

**STOP and wait for human review if the fix would change**:

- Author-visible control model
- Core domain object boundaries
- Public API semantics
- Beat / Phase / Scene basic definitions

### 7. Dependency Verification

Every fix_plan.md pre-flight must verify:

- Prior phase branch is merged to `main`
- Specific types/modules from prior phases exist and export correctly
- Prior phase tests still pass after pulling latest `main`

### 8. Testing Requirements

- **Minimum 80% coverage** on new code per phase.
- TDD is mandatory: RED -> GREEN -> IMPROVE.
- Test types required:
  - **Unit tests**: Every exported function, every edge case
  - **Integration tests**: Module interactions (Phase 06+)
  - **E2E tests**: Phase 07 specifically
- Test file naming: `src/engine/modules/__tests__/module-name.test.ts`
- Use Vitest as the test runner.

---

## Git Flow Rules

### Branch Naming

```
phase/NN-short-name
```

Examples:

- `phase/00-foundation`
- `phase/01-memory-gradient`
- `phase/06-audit-loop`

### Commit Format

```
<type>: <description>
```

Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `perf`, `ci`

Examples:

- `feat: add PhaseGradient module with 7 gradient type mappings`
- `test: add unit tests for MemoryPlaceholder sliding window`
- `fix: correct PromptObject layer ordering to match schema`

### PR Process

1. Push branch with `-u` flag.
2. Create PR against `main`.
3. PR title: `Phase NN: Short Description`
4. PR body must include:
   - Summary (1-3 bullets)
   - Spec files verified against
   - Test coverage report
   - Checklist (types match schema, no hardcoded content, immutable patterns)
5. Wait for human review before proceeding.

---

## Human Review Checkpoints

These milestones require explicit human approval:

| Milestone | After Phase | What to Review                                                |
| --------- | ----------- | ------------------------------------------------------------- |
| M0        | 00          | Project scaffold, TypeScript types match YAML schemas         |
| M2        | 04          | PromptObject output matches prompt-object-schema.yaml exactly |
| M4        | 06          | Full engine loop closes correctly                             |
| Release   | 08          | UI works, full integration functional                         |

---

## Prohibited Patterns

### In Code

- Mutating input parameters or shared state objects
- Hardcoded narrative text (character names, scene descriptions, etc.)
- Direct LLM provider calls outside `APIAdapterLite`
- Bypassing `PromptAssembler` for generation requests
- Circular module dependencies
- Files exceeding 800 lines
- Functions exceeding 50 lines
- Nesting deeper than 4 levels

### In Plans

- Skipping the RED step in TDD (writing implementation before tests)
- Combining multiple unrelated modules in a single task
- Omitting spec file references for any task
- Proceeding past a STOP gate without PR merge
- Loading more than 40,000 tokens of spec context
- Writing plans that assume future phases are already complete

### In Git

- Direct commits to `main`
- Force pushes to any shared branch
- Skipping pre-commit hooks
- Amending published commits
- Merging without passing CI checks
