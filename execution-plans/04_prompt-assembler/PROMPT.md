---
phase: '04'
title: 'Prompt Assembler'
branch: 'phase/04-prompt-assembler'
depends_on: ['03']
spec_context_load:
  phase_0:
    - 'LOGOS-SPEC/00_META/agent-guide.md'
    - 'LOGOS-SPEC/00_META/system-map.md'
    - 'LOGOS-SPEC/02_DOMAIN/glossary.md'
    - 'LOGOS-SPEC/05_CONTRACTS/module-dependency-map.md'
  phase_specific:
    - 'LOGOS-SPEC/04_MODULES/prompt-assembler.md'
    - 'LOGOS-SPEC/05_CONTRACTS/prompt-object-schema.yaml'
    - 'LOGOS-SPEC/05_CONTRACTS/orchestrator-input-output.md'
    - 'LOGOS-SPEC/03_ORCHESTRATION/runtime-loop.md'
    - 'LOGOS-SPEC/02_DOMAIN/state-model.md'
estimated_tokens:
  phase_0: 4500
  phase_specific: 9000
  total: 13500
---

# Phase 04: Prompt Assembler

## Objective

Implement the Prompt Assembler -- the single output gate for all generation requests. This module takes the outputs of all upstream control modules (WorldBase, Memory, Boundaries, Director Note) and assembles them into a `PromptObject` that exactly matches `prompt-object-schema.yaml`. It enforces the 4-layer structure (L1 World -> L2 History -> L3 Narrative -> L4 Director Note) and handles the optional `generationControl` attachment for rewrite paths.

## Spec Context

| File                                        | Tokens | Purpose                             |
| ------------------------------------------- | ------ | ----------------------------------- |
| `00_META/agent-guide.md`                    | ~2,800 | Blocker protocol                    |
| `00_META/system-map.md`                     | ~1,000 | Architecture                        |
| `02_DOMAIN/glossary.md`                     | ~1,100 | Prompt Assembler definition         |
| `05_CONTRACTS/module-dependency-map.md`     | ~900   | Assembler is sole output gate       |
| `04_MODULES/prompt-assembler.md`            | ~1,600 | 4-layer structure, recency priority |
| `05_CONTRACTS/prompt-object-schema.yaml`    | ~2,500 | Exact field structure               |
| `05_CONTRACTS/orchestrator-input-output.md` | ~1,000 | Module I/O names, naming alignment  |
| `03_ORCHESTRATION/runtime-loop.md`          | ~2,500 | Assembler position in loop          |
| `02_DOMAIN/state-model.md`                  | ~1,400 | State fields feeding into assembler |

## Deliverables

1. **Prompt Assembler module** (`src/engine/modules/prompt-assembler.ts`)
   - Exports: `assemblePromptObject(input: PromptAssemblerInput): PromptObject`
   - Exports: `assembleRewritePromptObject(input: PromptAssemblerInput, rewriteContext: RewriteContext): PromptObject`
   - `PromptAssemblerInput` aggregates all upstream module outputs
   - Output `PromptObject` matches `prompt-object-schema.yaml` exactly

2. **Input type** (`PromptAssemblerInput`):

   ```typescript
   interface PromptAssemblerInput {
     readonly worldBase: WorldBase;
     readonly precedingBeats: readonly HistoryEntry[];
     readonly mainAxis: string;
     readonly endLine: string;
     readonly phaseGoal: string;
     readonly alpha: string;
     readonly beta: string;
     readonly directorNote: DirectorNote;
   }
   ```

3. **Rewrite context type** (`RewriteContext`):

   ```typescript
   interface RewriteContext {
     readonly retryCount: number;
     readonly rewriteFeedback: string;
     readonly previousDraft: PreviousDraft;
   }
   ```

4. **Unit tests** with >= 80% coverage

## Dependencies

- Phase 00 types: `PromptObject`, `WorldBase`, `HistoryEntry`, `Narrative`, `DirectorNote`, `GenerationControl`
- Phase 00 schema validator: `validatePromptObject`
- Phase 01: `getHistoryWindow` (produces `precedingBeats`)
- Phase 02: `CollapseResponse` (provides alpha/beta)
- Phase 03: `buildDirectorNote` (produces DirectorNote)

## Acceptance Criteria

- [ ] `assemblePromptObject` returns a `PromptObject` that passes `validatePromptObject` schema check
- [ ] Layer 1 (`worldBase`): contains `mainCharacters`, `locationPatch`, optional `npcCharacters`
- [ ] Layer 2 (`history`): contains `precedingBeats` as-is (HistoryEntry array)
- [ ] Layer 3 (`narrative`): contains `mainAxis`, `endLine`, `phaseGoal`, `alpha`, `beta`
- [ ] Layer 4 (`directorNote`): contains `volume`, `router`, `verbLexicon`, `beatConstraints`, `optionConstraints`
- [ ] Normal path: `generationControl` is absent from the output
- [ ] Rewrite path: `assembleRewritePromptObject` includes `generationControl` with `isRewrite: true`, `retryCount`, `rewriteFeedback`, `previousDraft`
- [ ] Output is immutable (deep readonly)
- [ ] No field names deviate from prompt-object-schema.yaml
- [ ] All tests pass, coverage >= 80%
