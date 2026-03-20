# Phase 03 Fix Plan

## Pre-flight

### 1. Branch Setup
- [ ] Verify Phase 01 PR is merged to `main`
- [ ] Verify Phase 02 PR is merged to `main`
- [ ] `git pull origin main`
- [ ] `git checkout -b phase/03-director-options`

### 2. Dependency Verification
- [ ] Verify `src/engine/modules/memory-placeholder.ts` exports `getHistoryWindow`
- [ ] Verify `src/engine/modules/phase-gradient.ts` exports `getCurrentVolume`, `buildVolumeSequence`
- [ ] Verify `src/engine/modules/light-cone-collapse.ts` exports `createLightConeCollapse`
- [ ] Verify `src/engine/modules/narrative-router.ts` exports `selectRouter`, `getVerbLexicon`, `RouterSelection`
- [ ] Verify `src/types/index.ts` exports `DirectorNote`, `RoundState`, `SceneState`, `WorldBase`
- [ ] Run `npm test` -- all Phase 00, 01, 02 tests pass

### 3. Spec Context Load
- [ ] Load Phase 0 context (~4,500 tokens)
- [ ] Load phase-specific context (~12,000 tokens): director-note-layer.md, option-generator.md, runtime-loop.md, prompt-object-schema.yaml, state-snapshot-schema.yaml, control-primitives.md
- [ ] Confirm total ~16,500 tokens <= 40,000 budget

---

## Tasks

### Task 1: Director Note Layer

#### 1.1 RED -- Write Tests
- Create `src/engine/modules/__tests__/director-note-layer.test.ts`

**Basic output structure tests:**
- Test: `buildDirectorNote` returns object with all required DirectorNote fields
- Test: returned `volume` matches `roundState.currentVolume`
- Test: returned `router` matches `roundState.currentRouter`
- Test: returned `verbLexicon` matches `roundState.verbLexicon`
- Test: returned `beatConstraints` is a non-empty string
- Test: returned `optionConstraints` is a non-empty string

**beatConstraints content tests:**
- Test: when volume is "High", beatConstraints mentions slow-motion/sensory detail/time stretching
- Test: when volume is "Low", beatConstraints mentions montage/summary/accelerated time
- Test: when volume is "Med", beatConstraints mentions standard pacing/real-time
- Test: beatConstraints references Alpha/Beta boundaries from sceneState
- Test: beatConstraints references phaseGoal from roundState

**optionConstraints content tests:**
- Test: optionConstraints references the verb lexicon entries
- Test: optionConstraints mentions Anti-OOC character consistency check
- Test: optionConstraints mentions Alpha/Beta boundary compliance
- Test: optionConstraints mentions volume-appropriate formatting

**Edge case tests:**
- Test: with minimal RoundState (only required fields), still produces valid output
- Test: output is immutable (readonly)
- Test: input RoundState is not mutated

- Expected: all tests FAIL

#### 1.2 GREEN -- Implement
- Create `src/engine/modules/director-note-layer.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/director-note-layer.md`
- Implementation:
  ```typescript
  import { DirectorNote, RoundState, SceneState, WorldBase } from '@/types';

  export function buildDirectorNote(
    roundState: RoundState,
    sceneState: SceneState,
    worldBase: WorldBase
  ): DirectorNote {
    return {
      volume: roundState.currentVolume,
      router: roundState.currentRouter,
      verbLexicon: [...roundState.verbLexicon],
      beatConstraints: buildBeatConstraints(roundState, sceneState),
      optionConstraints: buildOptionConstraints(roundState, sceneState, worldBase.mainCharacters),
    };
  }
  ```

- **`buildBeatConstraints`** (internal helper):
  - Assembles constraint text based on Volume (from control-primitives.md):
    - `Low` -> "Use narrative montage. Accelerate time flow. Focus on results and consequences, not moment-by-moment action."
    - `Med` -> "Maintain real-time pacing. Balance dialogue and action. Keep causal chain clear."
    - `High` -> "Use slow-motion lens. Stretch time. Focus on sensory fragments: heartbeat, micro-expressions, textures, subtext."
  - Includes boundary constraints: "Generated content must stay within Alpha boundary ({alpha}) and Beta boundary ({beta})."
  - Includes phase goal: "This Beat should advance the current Phase goal: {phaseGoal}."

- **`buildOptionConstraints`** (exported, implements Option Generator 3-step pipeline):
  - Step 1 - Route Locking: "Select 4 orthogonal action directions from this verb lexicon: [{verbs}]. Each option must map to a distinct verb."
  - Step 2 - Anti-OOC CoT: "Before writing each option, perform a Chain-of-Thought check: given the character profile ({characterSummary}), verify this action is psychologically plausible within Alpha ({alpha}) / Beta ({beta}) boundaries."
  - Step 3 - Volume Formatting: "Format each option at {volume} grain: [High -> micro-sensory, Med -> standard action, Low -> broad strokes]."

#### 1.3 IMPROVE
- Extract volume-to-constraint text mapping into a constant object (not inline strings)
- Ensure constraint templates use interpolation from input data, never hardcode story content
- Add JSDoc with spec references
- Verify all field names match `prompt-object-schema.yaml` `directorNote` properties exactly

---

### Task 2: Option Generator Constraint Builder

#### 2.1 RED -- Write Tests
- Create `src/engine/modules/__tests__/option-generator.test.ts`

**3-step pipeline encoding tests:**
- Test: `buildOptionConstraints` output mentions all verbs from verbLexicon
- Test: `buildOptionConstraints` output mentions character profile
- Test: `buildOptionConstraints` output mentions Alpha and Beta boundaries
- Test: `buildOptionConstraints` output mentions the current Volume
- Test: `buildOptionConstraints` output instructs model to generate exactly 4 options
- Test: `buildOptionConstraints` output mentions orthogonality requirement
- Test: `buildOptionConstraints` output mentions Anti-OOC / Chain-of-Thought

**Edge case tests:**
- Test: with 4-verb lexicon, all 4 verbs appear in output
- Test: with 6-verb lexicon, instruction says "select 4 from these 6"
- Test: empty character profile string -> still produces valid constraints (with placeholder note)

- Expected: all tests FAIL

#### 2.2 GREEN -- Implement
- The `buildOptionConstraints` function is already defined in Task 1 as part of director-note-layer.ts.
- This task writes dedicated tests to ensure the 3-step pipeline is correctly encoded.
- Per spec (`option-generator.md`): Option Generator is a "design-time module" not a "runtime independent call." Its logic flows through `optionConstraints` into `PromptObject.directorNote`.

#### 2.3 IMPROVE
- Consider extracting the 3-step template assembly into its own module file for clarity
- Verify the 3 steps match `option-generator.md` exactly:
  1. Context & Router (verb lexicon locking)
  2. Anti-OOC Engine (CoT with character personality + Alpha/Beta)
  3. Volume Formatting (grain size per volume level)

---

## Post-flight

### 1. Quality Gate
- [ ] `npm test` -- all tests pass (Phase 00 + 01 + 02 + 03)
- [ ] `npm run test:coverage` -- >= 80% coverage on director-note-layer.ts
- [ ] `npm run lint` -- zero errors
- [ ] `npm run format:check` -- zero issues

### 2. Commit and PR
- [ ] Stage: `src/engine/modules/director-note-layer.ts`, test files
- [ ] `git commit -m "feat: add DirectorNoteLayer with 3-step option constraint pipeline"`
- [ ] `git push -u origin phase/03-director-options`
- [ ] Create PR against `main` with title: "Phase 03: Director Note Layer + Option Generator"

### 3. STOP
Do not proceed to Phase 04 until this PR is reviewed and merged.
