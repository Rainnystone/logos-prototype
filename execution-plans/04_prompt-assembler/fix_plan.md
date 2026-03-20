# Phase 04 Fix Plan

## Pre-flight

### 1. Branch Setup

- [ ] Verify Phase 03 PR is merged to `main`
- [ ] `git pull origin main`
- [ ] `git checkout -b phase/04-prompt-assembler`

### 2. Dependency Verification

- [ ] Verify `src/engine/modules/director-note-layer.ts` exports `buildDirectorNote`
- [ ] Verify `src/engine/modules/memory-placeholder.ts` exports `getHistoryWindow`
- [ ] Verify `src/engine/modules/narrative-router.ts` exports `selectRouter`, `getVerbLexicon`
- [ ] Verify `src/engine/modules/light-cone-collapse.ts` exports `createLightConeCollapse`
- [ ] Verify `src/types/index.ts` exports `PromptObject`, `WorldBase`, `Narrative`, `DirectorNote`, `GenerationControl`, `PreviousDraft`
- [ ] Verify `src/engine/schema-validator.ts` exports `validatePromptObject`
- [ ] Run `npm test` -- all prior phase tests pass

### 3. Spec Context Load

- [ ] Load Phase 0 context (~4,500 tokens)
- [ ] Load phase-specific context (~9,000 tokens): prompt-assembler.md, prompt-object-schema.yaml, orchestrator-input-output.md, runtime-loop.md, state-model.md
- [ ] Confirm total ~13,500 tokens <= 40,000 budget

---

## Tasks

### Task 1: Prompt Assembler -- Normal Path

#### 1.1 RED -- Write Tests

- Create `src/engine/modules/__tests__/prompt-assembler.test.ts`

**Schema conformance tests:**

- Test: `assemblePromptObject` output passes `validatePromptObject` schema validation
- Test: output has all 4 required top-level fields: `worldBase`, `history`, `narrative`, `directorNote`
- Test: output does NOT have `generationControl` on normal path

**Layer 1 (worldBase) tests:**

- Test: `output.worldBase.mainCharacters` matches input `worldBase.mainCharacters`
- Test: `output.worldBase.locationPatch` matches input `worldBase.locationPatch`
- Test: `output.worldBase.npcCharacters` is empty string when not provided in input

**Layer 2 (history) tests:**

- Test: `output.history` matches input `precedingBeats` exactly
- Test: `output.history` is a new array (not same reference as input)
- Test: empty precedingBeats -> `output.history` is empty array

**Layer 3 (narrative) tests:**

- Test: `output.narrative.mainAxis` matches input
- Test: `output.narrative.endLine` matches input
- Test: `output.narrative.phaseGoal` matches input
- Test: `output.narrative.alpha` matches input
- Test: `output.narrative.beta` matches input

**Layer 4 (directorNote) tests:**

- Test: `output.directorNote.volume` matches input DirectorNote volume
- Test: `output.directorNote.router` matches input DirectorNote router
- Test: `output.directorNote.verbLexicon` matches input DirectorNote verbLexicon
- Test: `output.directorNote.beatConstraints` matches input DirectorNote beatConstraints
- Test: `output.directorNote.optionConstraints` matches input DirectorNote optionConstraints

**Immutability tests:**

- Test: modifying the returned object does not affect internal state
- Test: input PromptAssemblerInput is not mutated

- Expected: all tests FAIL

#### 1.2 GREEN -- Implement

- Create `src/engine/modules/prompt-assembler.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/prompt-assembler.md`
- Implementation:

  ```typescript
  import { PromptObject, WorldBase, HistoryEntry, DirectorNote, GenerationControl } from '@/types';
  import { validatePromptObject } from '@/engine/schema-validator';

  export interface PromptAssemblerInput {
    readonly worldBase: WorldBase;
    readonly precedingBeats: readonly HistoryEntry[];
    readonly mainAxis: string;
    readonly endLine: string;
    readonly phaseGoal: string;
    readonly alpha: string;
    readonly beta: string;
    readonly directorNote: DirectorNote;
  }

  export interface RewriteContext {
    readonly retryCount: number;
    readonly rewriteFeedback: string;
    readonly previousDraft: { readonly beatText: string; readonly options: readonly string[] };
  }

  export function assemblePromptObject(input: PromptAssemblerInput): PromptObject {
    const promptObject: PromptObject = {
      // Layer 1: World Base
      worldBase: {
        mainCharacters: input.worldBase.mainCharacters,
        npcCharacters: input.worldBase.npcCharacters ?? '',
        locationPatch: input.worldBase.locationPatch,
      },
      // Layer 2: History (Memory)
      history: [...input.precedingBeats],
      // Layer 3: Narrative Boundaries
      narrative: {
        mainAxis: input.mainAxis,
        endLine: input.endLine,
        phaseGoal: input.phaseGoal,
        alpha: input.alpha,
        beta: input.beta,
      },
      // Layer 4: Director Note (highest recency priority)
      directorNote: {
        volume: input.directorNote.volume,
        router: input.directorNote.router,
        verbLexicon: [...input.directorNote.verbLexicon],
        beatConstraints: input.directorNote.beatConstraints,
        optionConstraints: input.directorNote.optionConstraints,
      },
    };

    return validatePromptObject(promptObject);
  }
  ```

#### 1.3 IMPROVE

- Add JSDoc referencing `LOGOS-SPEC/04_MODULES/prompt-assembler.md`
- Verify field names match prompt-object-schema.yaml exactly (case-sensitive)
- Ensure the output `PromptObject` is a completely new object tree (deep copy)

---

### Task 2: Prompt Assembler -- Rewrite Path

#### 2.1 RED -- Write Tests

- Add to `src/engine/modules/__tests__/prompt-assembler.test.ts`

**Rewrite path tests:**

- Test: `assembleRewritePromptObject` output passes `validatePromptObject` schema validation
- Test: output has `generationControl` with `isRewrite: true`
- Test: output `generationControl.retryCount` matches input
- Test: output `generationControl.rewriteFeedback` matches input
- Test: output `generationControl.previousDraft.beatText` matches input
- Test: output `generationControl.previousDraft.options` has exactly 4 strings
- Test: all 4 layers (worldBase, history, narrative, directorNote) still present and correct
- Test: `assembleRewritePromptObject` with retryCount 0 still works
- Test: `assembleRewritePromptObject` with retryCount 3 still works

- Expected: all tests FAIL

#### 2.2 GREEN -- Implement

- Add to `src/engine/modules/prompt-assembler.ts`:
  ```typescript
  export function assembleRewritePromptObject(
    input: PromptAssemblerInput,
    rewriteContext: RewriteContext,
  ): PromptObject {
    const baseObject = assemblePromptObject(input);
    return validatePromptObject({
      ...baseObject,
      generationControl: {
        isRewrite: true,
        retryCount: rewriteContext.retryCount,
        rewriteFeedback: rewriteContext.rewriteFeedback,
        previousDraft: {
          beatText: rewriteContext.previousDraft.beatText,
          options: [...rewriteContext.previousDraft.options],
        },
      },
    });
  }
  ```

#### 2.3 IMPROVE

- Verify that `generationControl` is truly optional in the PromptObject type (not required)
- Verify `previousDraft.options` always has exactly 4 items (validate)
- Document that `generationControl` is NOT a 5th semantic layer, only a retry control overlay

---

## Post-flight

### 1. Quality Gate

- [ ] `npm test` -- all tests pass (Phase 00-04)
- [ ] `npm run test:coverage` -- >= 80% coverage on prompt-assembler.ts
- [ ] `npm run lint` -- zero errors
- [ ] `npm run format:check` -- zero issues

### 2. Commit and PR

- [ ] Stage: `src/engine/modules/prompt-assembler.ts`, test files
- [ ] `git commit -m "feat: add PromptAssembler with 4-layer structure and rewrite path support"`
- [ ] `git push -u origin phase/04-prompt-assembler`
- [ ] Create PR against `main` with title: "Phase 04: Prompt Assembler"

### 3. STOP -- HUMAN REVIEW CHECKPOINT (M2)

This is a milestone checkpoint. The PromptObject output must be verified against `prompt-object-schema.yaml` before proceeding.
Do not proceed to Phase 05 until this PR is reviewed and merged.
