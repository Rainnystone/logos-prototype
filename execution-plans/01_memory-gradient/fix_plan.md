# Phase 01 Fix Plan

## Pre-flight

### 1. Branch Setup
- [ ] Verify Phase 00 PR is merged to `main`
- [ ] `git pull origin main`
- [ ] `git checkout -b phase/01-memory-gradient`

### 2. Dependency Verification
- [ ] Verify `src/types/index.ts` exports `HistoryEntry`, `Volume`, `GradientType`, `PhasePlan`
- [ ] Verify `src/types/state-snapshot.ts` defines `HistoryEntry` with `role` and `content`
- [ ] Verify `src/types/phase-plan.ts` defines `GradientType` with all 7 enum values
- [ ] Run `npm test` -- all Phase 00 tests pass

### 3. Spec Context Load
- [ ] Load Phase 0 context (~4,500 tokens)
- [ ] Load phase-specific context (~12,500 tokens): memory-placeholder.md, phase-gradient.md, control-primitives.md, state-model.md, scene-phase-beat-lifecycle.md, state-snapshot-schema.yaml, phase-plan-schema.yaml
- [ ] Confirm total ~17,000 tokens <= 40,000 budget

---

## Tasks

### Task 1: Memory Placeholder

#### 1.1 RED -- Write Tests
- Create `src/engine/modules/__tests__/memory-placeholder.test.ts`
- Test: `getHistoryWindow` with 10-item history returns last 5 items
- Test: `getHistoryWindow` with 3-item history returns all 3 items
- Test: `getHistoryWindow` with empty history returns empty array
- Test: `getHistoryWindow` with exactly 5 items returns all 5
- Test: `getHistoryWindow` with custom window size of 3 returns last 3
- Test: `getHistoryWindow` does NOT mutate the input array (verify via Object.freeze on input)
- Test: `getHistoryWindow` returns items in chronological order (oldest first, newest last)
- Test: returned entries have `role: "user" | "assistant"` and non-empty `content`
- All test data uses generic placeholder text (no scene-specific narrative)
- Expected: all tests FAIL

#### 1.2 GREEN -- Implement
- Create `src/engine/modules/memory-placeholder.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/memory-placeholder.md`
- Implementation:
  ```typescript
  const DEFAULT_WINDOW_SIZE = 5;

  export function getHistoryWindow(
    acceptedHistory: readonly HistoryEntry[],
    windowSize: number = DEFAULT_WINDOW_SIZE
  ): readonly HistoryEntry[] {
    // Return the last `windowSize` entries from acceptedHistory
    // If history has fewer entries, return all of them
    // Never mutate -- return a new array
  }
  ```
- Key constraints:
  - Only accepted history enters (no failed drafts) -- enforced by type, documented in JSDoc
  - Window size is configurable but defaults to 5
  - Return type is `readonly HistoryEntry[]` (immutable)
  - Output is what downstream consumers call `precedingBeats`

#### 1.3 IMPROVE -- Refactor
- Add JSDoc with spec reference: `@see LOGOS-SPEC/04_MODULES/memory-placeholder.md`
- Extract `DEFAULT_WINDOW_SIZE` as a named constant
- Verify no mutation: use `Object.freeze` in tests to prove input is not modified
- Verify function is pure (same input always produces same output)

---

### Task 2: Phase Gradient

#### 2.1 RED -- Write Tests
- Create `src/engine/modules/__tests__/phase-gradient.test.ts`
- **Volume Sequence tests (one per gradient type)**:
  - Test: `buildVolumeSequence("Rising")` returns `["Low", "Med", "Med", "High"]`
  - Test: `buildVolumeSequence("Falling")` returns `["High", "Med", "Med", "Low"]`
  - Test: `buildVolumeSequence("Static High")` returns `["High", "High", "High", "High"]`
  - Test: `buildVolumeSequence("U-Shape")` returns `["High", "Low", "Low", "High"]`
  - Test: `buildVolumeSequence("Arch")` returns `["Low", "High", "High", "Low"]`
  - Test: `buildVolumeSequence("Pulse")` returns `["High", "Low", "High", "Low"]`
  - Test: `buildVolumeSequence("Steady")` returns `["Med", "Med", "Med", "Med"]`
  - Test: every sequence has exactly 4 elements
  - Test: every element is one of `"Low"`, `"Med"`, `"High"`
- **getCurrentVolume tests**:
  - Test: `getCurrentVolume("Rising", 0)` returns `"Low"`
  - Test: `getCurrentVolume("Rising", 3)` returns `"High"`
  - Test: `getCurrentVolume("Static High", 2)` returns `"High"`
  - Test: `getCurrentVolume("Pulse", 1)` returns `"Low"`
  - Test: `getCurrentVolume("Rising", -1)` throws error
  - Test: `getCurrentVolume("Rising", 4)` throws error (max index is 3)
  - Test: `getCurrentVolume("InvalidType" as any, 0)` throws error
- **Immutability tests**:
  - Test: `buildVolumeSequence` returns a new array each call (different reference)
  - Test: returned array cannot be modified (readonly)
- Expected: all tests FAIL

#### 2.2 GREEN -- Implement
- Create `src/engine/modules/phase-gradient.ts`
- Spec reference: `LOGOS-SPEC/04_MODULES/phase-gradient.md` + `LOGOS-SPEC/02_DOMAIN/control-primitives.md` (gradient mapping table)
- Implementation:
  ```typescript
  import { GradientType, Volume } from '@/types';

  const GRADIENT_MAP: Readonly<Record<GradientType, readonly Volume[]>> = {
    "Rising":      ["Low", "Med", "Med", "High"],
    "Falling":     ["High", "Med", "Med", "Low"],
    "Static High": ["High", "High", "High", "High"],
    "U-Shape":     ["High", "Low", "Low", "High"],
    "Arch":        ["Low", "High", "High", "Low"],
    "Pulse":       ["High", "Low", "High", "Low"],
    "Steady":      ["Med", "Med", "Med", "Med"],
  } as const;

  export function buildVolumeSequence(gradientType: GradientType): readonly Volume[] {
    const sequence = GRADIENT_MAP[gradientType];
    if (!sequence) {
      throw new Error(`Unknown gradient type: ${gradientType}`);
    }
    return [...sequence]; // Return new array, immutable via type
  }

  export function getCurrentVolume(gradientType: GradientType, beatIndex: number): Volume {
    if (beatIndex < 0 || beatIndex > 3) {
      throw new Error(`Beat index must be 0-3, got: ${beatIndex}`);
    }
    const sequence = GRADIENT_MAP[gradientType];
    if (!sequence) {
      throw new Error(`Unknown gradient type: ${gradientType}`);
    }
    return sequence[beatIndex]!;
  }
  ```
- Key constraints:
  - Gradient map is `readonly` and defined as a module-level constant
  - Beat index is 0-based (0 = first beat, 3 = last beat in 4-beat Phase)
  - No hardcoded narrative content
  - Pure functions only

#### 2.3 IMPROVE -- Refactor
- Add JSDoc with spec references for each function
- Consider adding a `BEAT_COUNT = 4` constant shared with types
- Verify the gradient map exactly matches `control-primitives.md` table
- Ensure returned arrays are truly new copies (not references to the shared constant)

---

## Post-flight

### 1. Quality Gate
- [ ] `npm test` -- all tests pass (including Phase 00 tests)
- [ ] `npm run test:coverage` -- >= 80% coverage on `memory-placeholder.ts` and `phase-gradient.ts`
- [ ] `npm run lint` -- zero errors
- [ ] `npm run format:check` -- zero issues

### 2. Commit and PR
- [ ] Stage: `src/engine/modules/memory-placeholder.ts`, `src/engine/modules/phase-gradient.ts`, test files
- [ ] `git commit -m "feat: add MemoryPlaceholder (5-beat window) and PhaseGradient (7 gradient types)"`
- [ ] `git push -u origin phase/01-memory-gradient`
- [ ] Create PR against `main` with title: "Phase 01: Memory Placeholder + Phase Gradient"

### 3. STOP
Do not proceed to Phase 03 until both Phase 01 and Phase 02 PRs are merged.
